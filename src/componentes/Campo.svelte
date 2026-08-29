<script>
  import { Minus, Plus } from "../lib/icones.js";
  import { paraTela, passo, somar } from "../lib/planilha.js";

  let { def, valor = "", onchange } = $props();

  const numerico = $derived(def.tipo === "numero" || def.tipo === "dinheiro");
  const mostrado = $derived(paraTela(valor, def.tipo));

  function ajustar(sinal) {
    onchange(somar(valor, sinal * passo(def.tipo), def.tipo));
    // Feedback tátil. Ajustar preço com o polegar, em pé, sem olhar o número
    // a cada toque, é a diferença entre corrigir na hora e deixar pra depois.
    navigator.vibrate?.(8);
  }
</script>

<label class="campo">
  <span class="rotulo">{def.rotulo}</span>

  {#if def.tipo === "escolha"}
    <select value={valor} onchange={(e) => onchange(e.currentTarget.value)}>
      {#each def.opcoes as [v, texto]}
        <option value={v}>{texto}</option>
      {/each}
    </select>
  {:else}
    <div class="linha" class:com-botoes={numerico}>
      {#if numerico}
        <button type="button" onclick={() => ajustar(-1)}
                aria-label="Diminuir {def.rotulo}">
          <Minus size={22} strokeWidth={2.6} />
        </button>
      {/if}

      <div class="entrada">
        {#if def.tipo === "dinheiro"}
          <!-- O R$ fica FORA do campo. Dentro, ele iria junto quando o Dário
               copiasse o valor, e voltaria pra planilha como texto. -->
          <span class="moeda" aria-hidden="true">R$</span>
        {/if}
        <input
          value={mostrado}
          type={numerico ? "text" : "text"}
          inputmode={numerico ? "decimal" : "text"}
          enterkeyhint="done"
          onblur={(e) => onchange(e.currentTarget.value)}
          onchange={(e) => onchange(e.currentTarget.value)} />
      </div>

      {#if numerico}
        <button type="button" onclick={() => ajustar(1)}
                aria-label="Aumentar {def.rotulo}">
          <Plus size={22} strokeWidth={2.6} />
        </button>
      {/if}
    </div>
  {/if}

  {#if def.dica}<span class="dica">{def.dica}</span>{/if}
</label>

<style>
  .campo { display: grid; gap: var(--e2); }
  .rotulo { font-size: var(--t-p); font-weight: 600; color: var(--texto-fraco); }
  .dica { font-size: var(--t-pp); color: var(--texto-fraquinho); line-height: 1.45; }

  .linha { display: flex; gap: var(--e2); align-items: stretch; }

  .entrada {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--e1);
    padding: 0 var(--e3);
    min-height: var(--toque);
    background: var(--superficie);
    border: 1.5px solid var(--borda);
    border-radius: var(--raio);
    transition: border-color var(--rapido) var(--curva),
                box-shadow var(--rapido) var(--curva);
  }
  .entrada:focus-within {
    border-color: var(--acento);
    box-shadow: 0 0 0 3px var(--acento-fraco);
  }

  .moeda {
    font-size: var(--t-p);
    font-weight: 600;
    color: var(--texto-fraquinho);
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    padding: 0;
    font-size: var(--t-base);
    font-variant-numeric: tabular-nums;
  }
  input:focus { outline: none; }

  /* Os botões − e +.
     Ajustar um preço sem abrir o teclado é a diferença entre corrigir na hora
     e deixar pra depois. O alvo é o do dedo, não o do cursor. */
  button {
    flex: 0 0 var(--toque);
    width: var(--toque);
    min-height: var(--toque);
    display: grid;
    place-items: center;
    background: var(--superficie-2);
    border: 1.5px solid var(--borda);
    border-radius: var(--raio);
    color: var(--texto-fraco);
    cursor: pointer;
    transition: background var(--rapido) var(--curva),
                transform var(--rapido) var(--curva);
  }
  button:active {
    background: var(--acento-fraco);
    border-color: var(--acento);
    color: var(--acento-forte);
    transform: scale(0.94);
  }

  select {
    min-height: var(--toque);
    padding: 0 var(--e3);
    background: var(--superficie);
    border: 1.5px solid var(--borda);
    border-radius: var(--raio);
    font-size: var(--t-base);
  }
</style>
