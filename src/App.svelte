<script>
  import { CONFIG } from "./lib/config.js";
  import { ABAS, CONTROLE, PREFIXO_ID } from "./lib/abas.js";
  import * as sheets from "./lib/sheets.js";
  import * as p from "./lib/planilha.js";
  import * as icones from "./lib/icones.js";
  import { Plus, LogOut, RefreshCw } from "./lib/icones.js";

  import Entrada from "./componentes/Entrada.svelte";
  import Abas from "./componentes/Abas.svelte";
  import Card from "./componentes/Card.svelte";
  import Aviso from "./componentes/Aviso.svelte";

  // Salva sozinho, 1,2s após a última tecla. Sem botão "salvar" pra esquecer
  // de apertar — mas com aviso na tela dizendo que salvou.
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

  let relogioSalvar;

  const def = $derived(ABAS[abaAtual]);
  const linhas = $derived(dados[abaAtual] ?? []);
  const cabecalho = $derived(p.cabecalhoDe(linhas));
  const corpo = $derived(p.corpoDe(linhas, cabecalho));

  function avisar(texto, tipo, some = 0) {
    aviso = { texto, tipo };
    if (some) setTimeout(() => { if (aviso.texto === texto) aviso = { texto: "", tipo: "" }; }, some);
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
  // renovado sem aparecer nada.
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
      if (e.message !== "sessao_expirada") avisar("Não consegui ler a planilha.", "erro");
    } finally {
      carregando = false;
    }
  }

  function agendarSalvar() {
    clearTimeout(relogioSalvar);
    relogioSalvar = setTimeout(salvar, ESPERA_SALVAR);
  }

  async function salvar() {
    const aba = abaAtual;
    if (!p.mudou(original[aba], dados[aba])) return;
    avisar("Salvando…", "trabalhando");
    try {
      await sheets.salvarAba(CONFIG.SHEET_ID, aba, dados[aba]);
      original[aba] = structuredClone($state.snapshot(dados[aba]));
      avisar("Salvo", "ok", 1600);
    } catch (e) {
      if (e.message !== "sessao_expirada") avisar("Não consegui salvar.", "erro");
    }
  }

  // ---- edição ------------------------------------------------------------

  /** O índice REAL da linha no array da planilha, a partir da posição visível.
   *
   * As duas não são a mesma coisa: o corpo esconde o cabeçalho e as linhas
   * marcadas como inativas. Escrever na posição visível gravaria no lugar
   * errado assim que existisse uma regra desativada. */
  function indiceReal(visivel) {
    const alvo = corpo[visivel];
    return linhas.indexOf(alvo);
  }

  function editar(visivel, campo, valor) {
    const i = indiceReal(visivel);
    const c = cabecalho.indexOf(campo);
    if (i < 0 || c < 0) return;
    const def_ = def.campos.find((x) => x.campo === campo);
    dados[abaAtual][i][c] = p.paraPlanilha(valor, def_?.tipo);
    agendarSalvar();
  }

  function adicionar() {
    const nova = cabecalho.map((c) =>
      c === "id" ? p.novoId(abaAtual, PREFIXO_ID, cabecalho, linhas.slice(1))
      : c === "ativo" ? "sim" : "");
    dados[abaAtual] = [...linhas, nova];
    agendarSalvar();
  }

  /** Remover é marcar como inativo, nunca apagar.
   *
   * O id liga a regra ao histórico; apagar a linha deslocaria todas abaixo e
   * duas edições ao mesmo tempo se atropelariam. Regra removida vira "nao" e
   * fica na planilha. */
  function remover(visivel) {
    const i = indiceReal(visivel);
    const c = cabecalho.indexOf("ativo");
    if (i < 0) return;
    if (c >= 0) dados[abaAtual][i][c] = "nao";
    else dados[abaAtual] = linhas.filter((_, n) => n !== i);
    agendarSalvar();
  }

  function tituloDo(linha, n) {
    const primeiro = def.campos.find((c) => !CONTROLE.includes(c.campo));
    const i = cabecalho.indexOf(primeiro?.campo);
    const v = i >= 0 ? String(linha[i] ?? "").trim() : "";
    return v || `${def.nomeCard} ${n + 1}`;
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
    <p class="ajuda">{def.ajuda}</p>

    {#if carregando && corpo.length === 0}
      {#each [0, 1, 2] as n}<div class="esqueleto"></div>{/each}
    {:else}
      <div class="cards">
        {#each corpo as linha, n (linha)}
          <Card def={def} {cabecalho} {linha} titulo={tituloDo(linha, n)}
                onchange={(campo, v) => editar(n, campo, v)}
                onremover={() => remover(n)} />
        {/each}
      </div>

      <button type="button" class="adicionar" onclick={adicionar}>
        <Plus size={20} strokeWidth={2.4} />
        Adicionar {def.nomeCard}
      </button>
    {/if}
  </main>

  <Abas abas={ABAS} atual={abaAtual} onescolher={(c) => { salvar(); abaAtual = c; }} />
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
    display: grid;
    place-items: center;
    width: 38px; height: 38px;
    border-radius: 11px;
    background: var(--acento-fraco);
    color: var(--acento-forte);
  }

  .titulos { min-width: 0; }
  h1 {
    font-size: var(--t-base);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .conta {
    font-size: var(--t-pp);
    color: var(--texto-fraquinho);
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
    /* Espaço pra barra de abas não cobrir o último card. */
    padding-bottom: calc(var(--toque) + var(--e7));
    max-width: 640px;
    margin-inline: auto;
    display: grid;
    gap: var(--e3);
  }

  .sub { font-size: var(--t-p); color: var(--texto-fraco); }
  .ajuda {
    font-size: var(--t-p);
    color: var(--texto-fraco);
    background: var(--acento-fraco);
    border-left: 3px solid var(--acento);
    padding: var(--e3) var(--e4);
    border-radius: 0 var(--raio) var(--raio) 0;
    line-height: 1.5;
  }

  .cards { display: grid; gap: var(--e4); margin-top: var(--e2); }

  .adicionar {
    min-height: var(--toque);
    display: flex; align-items: center; justify-content: center; gap: var(--e2);
    margin-top: var(--e2);
    border: 1.5px dashed var(--borda-forte);
    border-radius: var(--raio-g);
    background: none;
    color: var(--texto-fraco);
    font-size: var(--t-p);
    font-weight: 600;
    cursor: pointer;
    transition: border-color var(--rapido) var(--curva),
                color var(--rapido) var(--curva),
                background var(--rapido) var(--curva);
  }
  .adicionar:active {
    border-color: var(--acento);
    color: var(--acento-forte);
    background: var(--acento-fraco);
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
</style>
