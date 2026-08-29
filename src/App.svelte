<script>
  import { CONFIG } from "./lib/config.js";
  import { ABAS, CONTROLE, PREFIXO_ID } from "./lib/abas.js";
  import * as sheets from "./lib/sheets.js";
  import * as p from "./lib/planilha.js";
  import * as icones from "./lib/icones.js";
  import { Check, List, RefreshCw } from "./lib/icones.js";

  import Entrada from "./componentes/Entrada.svelte";
  import Abas from "./componentes/Abas.svelte";
  import Campo from "./componentes/Campo.svelte";
  import Salvos from "./componentes/Salvos.svelte";
  import Aviso from "./componentes/Aviso.svelte";

  // A aba de valor único salva sozinha, 1,2s após a última tecla: não há
  // botão para esquecer de apertar. A de lista salva no botão, porque ali a
  // ação é "terminei de cadastrar este", e isso tem um fim claro.
  const ESPERA_SALVAR = 1200;

  let dentro = $state(false);
  let entrando = $state(true);
  let erroEntrada = $state("");
  let nomePlanilha = $state("");

  let dados = $state({});
  let original = {};
  let abaAtual = $state(Object.keys(ABAS)[0]);
  let aviso = $state({ texto: "", tipo: "" });
  let carregando = $state(false);

  // O formulário de cadastro das abas de lista.
  let rascunho = $state({});
  let editando = $state(null);      // índice em `corpo`, ou null para "novo"
  let salvosAberto = $state(false);
  let acabouDeSalvar = $state(false);

  let relogioSalvar;

  const def = $derived(ABAS[abaAtual]);
  const linhas = $derived(dados[abaAtual] ?? []);
  const cabecalho = $derived(p.cabecalhoDe(linhas));
  const corpo = $derived(p.corpoDe(linhas, cabecalho));
  const eLista = $derived(def.tipo === "lista");
  const temRascunho = $derived(
    def.campos.some((c) => String(rascunho[c.campo] ?? "").trim() !== ""));

  function avisar(texto, tipo, some = 0) {
    aviso = { texto, tipo };
    if (some) {
      setTimeout(() => {
        if (aviso.texto === texto) aviso = { texto: "", tipo: "" };
      }, some);
    }
  }

  // ---- entrada -----------------------------------------------------------

  async function entrar(silencioso) {
    entrando = true;
    erroEntrada = "";
    try {
      await sheets.entrar({ clientId: CONFIG.CLIENT_ID, silencioso });
      dentro = true;
      await carregarTudo();
      nomePlanilha = await sheets.nomeDaPlanilha(CONFIG.SHEET_ID);
    } catch (e) {
      if (e.message === "falta_client_id") {
        erroEntrada = "Falta configurar o CLIENT_ID em config.js.";
      } else if (!silencioso) {
        erroEntrada = "Não consegui entrar. Toque no botão para tentar de novo.";
      }
    } finally {
      entrando = false;
    }
  }

  // Silencioso primeiro: se ele já tem sessão do Google no celular, o token é
  // renovado sem aparecer nada na tela.
  $effect(() => { entrar(true); });

  // ---- planilha ----------------------------------------------------------

  async function carregarTudo() {
    carregando = true;
    avisar("Carregando…", "trabalhando");
    try {
      const lidos = await sheets.lerTudo(CONFIG.SHEET_ID, Object.keys(ABAS));
      dados = lidos;
      original = structuredClone(lidos);
      aviso = { texto: "", tipo: "" };
    } catch (e) {
      if (e.message !== "sessao_expirada") {
        avisar("Não consegui ler a planilha.", "erro");
      }
    } finally {
      carregando = false;
    }
  }

  async function gravar(aba) {
    if (!p.mudou(original[aba], dados[aba])) return true;
    avisar("Salvando…", "trabalhando");
    try {
      await sheets.salvarAba(CONFIG.SHEET_ID, aba,
                             $state.snapshot(dados[aba]));
      original[aba] = structuredClone($state.snapshot(dados[aba]));
      return true;
    } catch (e) {
      if (e.message !== "sessao_expirada") {
        avisar("Não consegui salvar. Tente de novo.", "erro");
      }
      return false;
    }
  }

  function agendarSalvar() {
    clearTimeout(relogioSalvar);
    relogioSalvar = setTimeout(async () => {
      if (await gravar(abaAtual)) avisar("Salvo", "ok", 1600);
    }, ESPERA_SALVAR);
  }

  // ---- a aba de valor único ---------------------------------------------

  /** A linha única desta aba, criada na hora se ainda não existir. */
  function garantirLinhaUnica() {
    if (linhas.length === 0) {
      // Sem cabeçalho não dá para saber onde escrever. Monta a aba do zero,
      // com as colunas de controle na frente.
      dados[abaAtual] = [[...CONTROLE, ...def.campos.map((c) => c.campo)]];
    }
    if ((dados[abaAtual] ?? []).length < 2) {
      const cab = p.cabecalhoDe(dados[abaAtual]);
      dados[abaAtual] = [...dados[abaAtual], cab.map((c) =>
        c === "id" ? p.novoId(abaAtual, PREFIXO_ID, cab, [])
        : c === "ativo" ? "sim" : "")];
    }
    return 1;      // a primeira linha depois do cabeçalho
  }

  function valorUnico(campo) {
    const i = cabecalho.indexOf(campo);
    return i < 0 || linhas.length < 2 ? "" : linhas[1][i];
  }

  function editarUnico(campo, valor) {
    const linha = garantirLinhaUnica();
    const cab = p.cabecalhoDe(dados[abaAtual]);
    const c = cab.indexOf(campo);
    if (c < 0) return;
    const tipo = def.campos.find((x) => x.campo === campo)?.tipo;
    dados[abaAtual][linha][c] = p.paraPlanilha(valor, tipo);
    agendarSalvar();
  }

  // ---- as abas de lista --------------------------------------------------

  /** O índice REAL na planilha, a partir da posição visível no modal.
   *
   * As duas não são a mesma coisa: `corpo` esconde o cabeçalho e as linhas
   * marcadas como inativas. Escrever pela posição visível gravaria no lugar
   * errado assim que existisse uma regra desativada. */
  function indiceReal(visivel) {
    return linhas.indexOf(corpo[visivel]);
  }

  function abrirParaEditar(visivel) {
    const linha = corpo[visivel];
    const novo = {};
    for (const c of def.campos) {
      const i = cabecalho.indexOf(c.campo);
      novo[c.campo] = i < 0 ? "" : linha[i];
    }
    rascunho = novo;
    editando = visivel;
    salvosAberto = false;
    acabouDeSalvar = false;
  }

  function limparRascunho() {
    rascunho = {};
    editando = null;
  }

  async function salvarRascunho() {
    if (!temRascunho) return;

    // Sem cabeçalho a aba não existe ainda na planilha. Cria com as colunas
    // certas — é o que permite a aba de viagens nascer vazia e funcionar.
    if (linhas.length === 0) {
      dados[abaAtual] = [[...CONTROLE, ...def.campos.map((c) => c.campo)]];
    }
    const cab = p.cabecalhoDe(dados[abaAtual]);

    const montar = (base) => cab.map((coluna, i) => {
      if (coluna === "id") return base?.[i] || p.novoId(abaAtual, PREFIXO_ID, cab, dados[abaAtual].slice(1));
      if (coluna === "ativo") return "sim";
      const campo = def.campos.find((c) => c.campo === coluna);
      return campo ? p.paraPlanilha(rascunho[coluna], campo.tipo) : (base?.[i] ?? "");
    });

    if (editando === null) {
      dados[abaAtual] = [...dados[abaAtual], montar(null)];
    } else {
      const i = indiceReal(editando);
      if (i >= 0) dados[abaAtual][i] = montar(dados[abaAtual][i]);
    }

    if (await gravar(abaAtual)) {
      limparRascunho();
      acabouDeSalvar = true;
      avisar("Salvo", "ok", 1600);
    }
  }

  /** Remover é marcar como inativo, nunca apagar: o id liga a regra ao
   * histórico, e apagar a linha deslocaria todas abaixo. */
  async function removerSalvo(visivel) {
    const i = indiceReal(visivel);
    if (i < 0) return;
    const c = cabecalho.indexOf("ativo");
    if (c >= 0) dados[abaAtual][i][c] = "nao";
    else dados[abaAtual] = linhas.filter((_, n) => n !== i);
    if (await gravar(abaAtual)) avisar("Apagado", "ok", 1600);
  }

  async function trocarAba(chave) {
    clearTimeout(relogioSalvar);
    await gravar(abaAtual);
    limparRascunho();
    acabouDeSalvar = false;
    salvosAberto = false;
    abaAtual = chave;
  }
</script>

{#if !dentro}
  <Entrada erro={erroEntrada} {entrando} onentrar={() => entrar(false)} />
{:else}
  {@const Icone = icones[def.icone] ?? icones.Circle}

  <header class="topo">
    <div class="marca">
      <span class="selo"><Icone size={20} strokeWidth={2} /></span>
      <div class="titulos">
        <h1>{def.titulo}</h1>
        {#if nomePlanilha}<p class="conta">{nomePlanilha}</p>{/if}
      </div>
    </div>
    <button type="button" class="acao" onclick={carregarTudo}
            disabled={carregando} aria-label="Recarregar da planilha">
      <RefreshCw size={19} strokeWidth={2} />
    </button>
  </header>

  <main>
    <p class="sub">{def.sub}</p>

    {#if eLista}
      <!-- O botão das salvas fica no TOPO: é a primeira pergunta de quem
           abre a aba ("o que já tem aqui?"), e responder isso antes evita
           cadastrar a mesma cidade duas vezes. -->
      <button type="button" class="ver-salvas" onclick={() => (salvosAberto = true)}>
        <List size={19} strokeWidth={2.2} />
        {def.nomeCard === "viagem" ? "Viagens salvas" : `${def.nomeCard}s salvas`}
        <span class="contador">{corpo.length}</span>
      </button>
    {/if}

    <p class="ajuda">{def.ajuda}</p>

    {#if carregando && linhas.length === 0}
      {#each [0, 1] as _}<div class="esqueleto"></div>{/each}
    {:else if eLista}
      {#if acabouDeSalvar && !temRascunho}
        <div class="salvo" role="status">
          <span class="marca-ok"><Check size={20} strokeWidth={2.6} /></span>
          <div>
            <strong>Salvo!</strong>
            <p>Para editar ou apagar, toque em
              <button type="button" class="link" onclick={() => (salvosAberto = true)}
              >{def.nomeCard === "viagem" ? "Viagens salvas" : `${def.nomeCard}s salvas`}</button>.
            </p>
          </div>
        </div>
      {/if}

      <form class="formulario" onsubmit={(e) => { e.preventDefault(); salvarRascunho(); }}>
        <p class="legenda">
          {editando === null ? `Cadastrar ${def.nomeCard}` : `Editando ${def.nomeCard}`}
        </p>

        {#each def.campos as campo (campo.campo)}
          <Campo def={campo}
                 valor={rascunho[campo.campo] ?? ""}
                 onchange={(v) => { rascunho[campo.campo] = v; acabouDeSalvar = false; }} />
        {/each}

        <div class="botoes">
          {#if editando !== null}
            <button type="button" class="secundario" onclick={limparRascunho}>Cancelar</button>
          {/if}
          <button type="submit" class="primario" disabled={!temRascunho}>
            <Check size={19} strokeWidth={2.4} />
            Salvar {def.nomeCard}
          </button>
        </div>
      </form>
    {:else}
      <div class="formulario">
        {#each def.campos as campo (campo.campo)}
          <Campo def={campo}
                 valor={valorUnico(campo.campo)}
                 onchange={(v) => editarUnico(campo.campo, v)} />
        {/each}
        <p class="legenda-fim">Salva sozinho. Não precisa apertar nada.</p>
      </div>
    {/if}
  </main>

  <Salvos {def} {cabecalho} {corpo} aberto={salvosAberto}
          onfechar={() => (salvosAberto = false)}
          oneditar={abrirParaEditar}
          onremover={removerSalvo} />

  <Abas abas={ABAS} atual={abaAtual} onescolher={trocarAba} />
  <Aviso texto={aviso.texto} tipo={aviso.tipo} />
{/if}

<style>
  .topo {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: var(--e3);
    padding: var(--e3) var(--e4);
    background: color-mix(in srgb, var(--fundo) 88%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--borda);
  }

  .marca { flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--e3); }

  .selo {
    flex: 0 0 auto;
    display: grid; place-items: center;
    width: 38px; height: 38px;
    border-radius: 11px;
    background: var(--acento-fraco);
    color: var(--acento-forte);
  }

  .titulos { min-width: 0; }
  h1 { font-size: var(--t-base); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .conta {
    font-size: var(--t-pp); color: var(--texto-fraco);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .acao {
    flex: 0 0 auto;
    width: var(--toque); height: var(--toque);
    display: grid; place-items: center;
    border: 0; background: none; border-radius: var(--raio);
    color: var(--texto-fraco); cursor: pointer;
    transition: background var(--rapido) var(--curva);
  }
  .acao:active { background: var(--superficie-2); }
  .acao:disabled { opacity: 0.4; }

  main {
    padding: var(--e4);
    padding-bottom: calc(var(--toque) + var(--e7));
    max-width: 640px;
    margin-inline: auto;
    display: grid;
    gap: var(--e3);
  }

  .sub { font-size: var(--t-p); color: var(--texto-fraco); }

  .ver-salvas {
    display: flex;
    align-items: center;
    gap: var(--e2);
    min-height: var(--toque);
    padding: 0 var(--e4);
    background: var(--superficie);
    border: 1.5px solid var(--borda);
    border-radius: var(--raio);
    color: var(--texto);
    font-size: var(--t-p);
    font-weight: 650;
    cursor: pointer;
    transition: border-color var(--rapido) var(--curva),
                background var(--rapido) var(--curva);
  }
  .ver-salvas:active { border-color: var(--acento); background: var(--acento-fraco); }

  .contador {
    margin-left: auto;
    min-width: 26px;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--superficie-2);
    color: var(--texto-fraco);
    font-size: var(--t-pp);
    font-variant-numeric: tabular-nums;
  }

  .ajuda {
    font-size: var(--t-p);
    color: var(--texto-fraco);
    background: var(--acento-fraco);
    border-left: 3px solid var(--acento);
    padding: var(--e3) var(--e4);
    border-radius: 0 var(--raio) var(--raio) 0;
    line-height: 1.5;
  }

  .formulario {
    display: grid;
    gap: var(--e4);
    padding: var(--e4);
    background: var(--superficie);
    border: 1px solid var(--borda);
    border-radius: var(--raio-g);
    box-shadow: var(--sombra);
  }

  .legenda {
    font-size: var(--t-pp);
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--texto-fraco);
  }
  .legenda-fim { font-size: var(--t-pp); color: var(--texto-fraco); text-align: center; }

  .botoes { display: flex; gap: var(--e2); }

  .primario {
    flex: 1;
    min-height: var(--toque);
    display: flex; align-items: center; justify-content: center; gap: var(--e2);
    border: 0; border-radius: var(--raio);
    background: var(--texto); color: var(--fundo);
    font-size: var(--t-p); font-weight: 650; cursor: pointer;
    transition: transform var(--rapido) var(--curva), opacity var(--rapido);
  }
  .primario:active { transform: scale(0.98); }
  .primario:disabled { opacity: 0.35; cursor: default; }

  .secundario {
    min-height: var(--toque);
    padding: 0 var(--e4);
    border: 1.5px solid var(--borda);
    border-radius: var(--raio);
    background: none; color: var(--texto-fraco);
    font-size: var(--t-p); font-weight: 600; cursor: pointer;
  }

  .salvo {
    display: flex;
    gap: var(--e3);
    padding: var(--e4);
    background: var(--ok-fraco);
    border-radius: var(--raio);
    animation: entrar var(--normal) var(--curva);
  }
  .salvo p { font-size: var(--t-p); color: var(--texto-fraco); margin-top: 2px; }
  .marca-ok {
    flex: 0 0 auto;
    display: grid; place-items: center;
    width: 32px; height: 32px;
    border-radius: 50%;
    background: var(--ok); color: #fff;
  }

  .link {
    border: 0; background: none; padding: 0;
    color: var(--ok); font: inherit; font-weight: 650;
    text-decoration: underline; cursor: pointer;
  }

  .esqueleto {
    height: 140px;
    border-radius: var(--raio-g);
    background: linear-gradient(90deg,
      var(--superficie-2) 25%, var(--superficie) 50%, var(--superficie-2) 75%);
    background-size: 200% 100%;
    animation: brilhar 1.4s ease-in-out infinite;
  }

  @keyframes brilhar { to { background-position: -200% 0; } }
  @keyframes entrar { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
</style>
