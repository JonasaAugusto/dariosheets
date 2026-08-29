<script>
  import { X, Trash2, Pencil } from "../lib/icones.js";
  import { paraTela } from "../lib/planilha.js";

  let { def, cabecalho, corpo, aberto = false, onfechar, oneditar, onremover } = $props();

  /** O resumo de uma linha: "Belo Horizonte = R$ 2.000,00". */
  function resumo(linha) {
    const campos = def.resumo || def.campos.slice(0, 2).map((c) => c.campo);
    const partes = campos.map((nome) => {
      const i = cabecalho.indexOf(nome);
      const bruto = i < 0 ? "" : linha[i];
      const tipo = def.campos.find((c) => c.campo === nome)?.tipo;
      const texto = paraTela(bruto, tipo);
      return tipo === "dinheiro" && texto ? `R$ ${texto}` : texto;
    }).filter(Boolean);
    return { titulo: partes[0] || "(sem nome)", valor: partes.slice(1).join(" · ") };
  }
</script>

{#if aberto}
  <!-- O fundo escurecido fecha ao toque: é o gesto que a pessoa tenta antes
       de procurar o X, e não achar nada ali é o que faz alguém se sentir
       preso numa tela. -->
  <div class="fundo" onclick={onfechar} role="presentation"></div>

  <div class="folha" role="dialog" aria-modal="true" aria-label="{def.nomeCard}s salvas">
    <header>
      <h2>{def.nomeCard}s salvas</h2>
      <button type="button" class="fechar" onclick={onfechar} aria-label="Fechar">
        <X size={22} strokeWidth={2.2} />
      </button>
    </header>

    {#if corpo.length === 0}
      <p class="vazio">Nada salvo ainda. Preencha o formulário e toque em salvar.</p>
    {:else}
      <ul>
        {#each corpo as linha, n (linha)}
          {@const r = resumo(linha)}
          <li>
            <div class="texto">
              <span class="titulo">{r.titulo}</span>
              {#if r.valor}<span class="valor">{r.valor}</span>{/if}
            </div>
            <button type="button" class="acao" onclick={() => oneditar(n)}
                    aria-label="Editar {r.titulo}">
              <Pencil size={18} strokeWidth={2} />
            </button>
            <button type="button" class="acao perigo" onclick={() => onremover(n)}
                    aria-label="Apagar {r.titulo}">
              <Trash2 size={18} strokeWidth={2} />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .fundo {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgb(21 21 15 / 0.4);
    animation: aparecer var(--normal) var(--curva);
  }

  /* Sobe de baixo, não do centro: é de onde o polegar alcança, e é o gesto
     que o celular inteiro já usa. */
  .folha {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 41;
    max-height: 80dvh;
    display: flex;
    flex-direction: column;
    background: var(--fundo);
    border-radius: var(--raio-g) var(--raio-g) 0 0;
    padding-bottom: env(safe-area-inset-bottom);
    animation: subir var(--normal) var(--curva);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--e2);
    padding: var(--e4) var(--e3) var(--e3) var(--e5);
    border-bottom: 1px solid var(--borda);
  }
  h2 { font-size: var(--t-g); }

  .fechar {
    width: var(--toque); height: var(--toque);
    display: grid; place-items: center;
    border: 0; background: none; border-radius: var(--raio);
    color: var(--texto-fraco); cursor: pointer;
  }
  .fechar:active { background: var(--superficie-2); }

  ul { margin: 0; padding: var(--e3) var(--e4) var(--e5); list-style: none; overflow-y: auto; }

  li {
    display: flex;
    align-items: center;
    gap: var(--e2);
    padding: var(--e2) var(--e2) var(--e2) var(--e4);
    background: var(--superficie);
    border: 1px solid var(--borda);
    border-radius: var(--raio);
    margin-bottom: var(--e2);
  }

  .texto { flex: 1; min-width: 0; display: grid; }
  .titulo {
    font-weight: 600;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .valor {
    font-size: var(--t-p);
    color: var(--texto-fraco);
    font-variant-numeric: tabular-nums;
  }

  .acao {
    flex: 0 0 auto;
    width: var(--toque); height: var(--toque);
    display: grid; place-items: center;
    border: 0; background: none; border-radius: var(--raio);
    color: var(--texto-fraco); cursor: pointer;
    transition: background var(--rapido) var(--curva), color var(--rapido) var(--curva);
  }
  .acao:active { background: var(--superficie-2); }
  .perigo:active { color: var(--perigo); background: var(--perigo-fraco); }

  .vazio {
    padding: var(--e6) var(--e5) var(--e7);
    text-align: center;
    color: var(--texto-fraco);
    font-size: var(--t-p);
  }

  @keyframes aparecer { from { opacity: 0; } to { opacity: 1; } }
  @keyframes subir { from { transform: translateY(100%); } to { transform: none; } }
</style>
