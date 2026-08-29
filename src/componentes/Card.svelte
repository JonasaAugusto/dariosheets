<script>
  import { Trash2 } from "../lib/icones.js";
  import Campo from "./Campo.svelte";

  let { def, cabecalho, linha, titulo, onchange, onremover } = $props();

  function valorDe(campo) {
    const i = cabecalho.indexOf(campo);
    return i < 0 ? "" : (linha[i] ?? "");
  }
</script>

<article class="card">
  <header>
    <h3>{titulo}</h3>
    <button type="button" class="remover" onclick={onremover}
            aria-label="Remover {def.nomeCard} {titulo}">
      <Trash2 size={19} strokeWidth={2} />
    </button>
  </header>

  <div class="campos">
    {#each def.campos as campo (campo.campo)}
      <Campo def={campo}
             valor={valorDe(campo.campo)}
             onchange={(v) => onchange(campo.campo, v)} />
    {/each}
  </div>
</article>

<style>
  /* CARD POR REGRA, NÃO TABELA.
     Tabela em tela estreita obriga a rolar de lado, e foi exatamente isso que
     reprovou a planilha crua. Esta decisão não muda. */
  .card {
    background: var(--superficie);
    border: 1px solid var(--borda);
    border-radius: var(--raio-g);
    box-shadow: var(--sombra);
    overflow: hidden;
    animation: entrar var(--normal) var(--curva) backwards;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--e2);
    padding: var(--e3) var(--e3) var(--e3) var(--e4);
    background: var(--superficie-2);
    border-bottom: 1px solid var(--borda);
  }

  h3 {
    font-size: var(--t-p);
    font-weight: 650;
    color: var(--texto-fraco);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remover {
    flex: 0 0 auto;
    width: var(--toque);
    height: var(--toque);
    display: grid;
    place-items: center;
    margin: calc(var(--e2) * -1) calc(var(--e1) * -1);
    border: 0;
    background: none;
    border-radius: var(--raio);
    color: var(--texto-fraquinho);
    cursor: pointer;
    transition: color var(--rapido) var(--curva),
                background var(--rapido) var(--curva);
  }
  .remover:active { color: var(--perigo); background: var(--perigo-fraco); }

  .campos { display: grid; gap: var(--e4); padding: var(--e4); }

  @keyframes entrar {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: none; }
  }
</style>
