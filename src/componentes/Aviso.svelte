<script>
  import { CircleCheck, TriangleAlert, Loader2 } from "../lib/icones.js";

  let { texto = "", tipo = "" } = $props();

  const ICONE = { ok: CircleCheck, erro: TriangleAlert, trabalhando: Loader2 };

  // Em runes, componente é dinâmico por padrão: basta a variável começar com
  // maiúscula. O `<svelte:component>` virou legado no Svelte 5.
  const Icone = $derived(ICONE[tipo] ?? CircleCheck);
</script>

{#if texto}
  <!-- `role="status"` e não `alert`: leitor de tela anuncia sem interromper.
       Um "Salvo!" não é urgência. -->
  <div class="aviso {tipo}" role="status" aria-live="polite">
    {#key texto}
      <span class="icone" class:girando={tipo === "trabalhando"}>
        <Icone size={20} strokeWidth={2.2} />
      </span>
    {/key}
    <span>{texto}</span>
  </div>
{/if}

<style>
  /* Fixo no rodapé, acima da barra de abas. No topo ele cobriria o campo que
     o Dário acabou de editar, que é justamente o que ele quer conferir. */
  .aviso {
    position: fixed;
    left: 50%;
    bottom: calc(var(--e7) + var(--e5) + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    z-index: 30;
    display: flex;
    align-items: center;
    gap: var(--e2);
    padding: var(--e3) var(--e4);
    border-radius: 999px;
    background: var(--superficie);
    border: 1px solid var(--borda);
    box-shadow: var(--sombra-2);
    font-size: var(--t-p);
    font-weight: 600;
    /* Não empurra o layout: aparece por cima, some sem deixar buraco. */
    animation: subir var(--normal) var(--curva);
    max-width: calc(100vw - var(--e5));
  }
  .aviso.ok { color: var(--ok); background: var(--ok-fraco); border-color: transparent; }
  .aviso.erro { color: var(--perigo); background: var(--perigo-fraco); border-color: transparent; }
  .aviso.trabalhando { color: var(--texto-fraco); }

  .icone { display: grid; place-items: center; }
  .girando { animation: girar 1s linear infinite; }

  @keyframes subir {
    from { opacity: 0; transform: translateX(-50%) translateY(8px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  @keyframes girar { to { transform: rotate(360deg); } }
</style>
