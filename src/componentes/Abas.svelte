<script>
  import * as icones from "../lib/icones.js";

  let { abas, atual, onescolher } = $props();
</script>

<nav aria-label="Seções da tabela de preços">
  {#each Object.entries(abas) as [chave, def] (chave)}
    {@const Icone = icones[def.icone] ?? icones.Circle}
    <button type="button"
            class:atual={chave === atual}
            aria-current={chave === atual ? "page" : undefined}
            onclick={() => onescolher(chave)}>
      <Icone size={22} strokeWidth={chave === atual ? 2.4 : 1.9} />
      <span>{def.nomeCard}</span>
    </button>
  {/each}
</nav>

<style>
  /* Barra fixa embaixo: é onde o polegar chega sem trocar a mão de posição.
     Em pé, com o celular numa mão só, o topo da tela é o lugar mais difícil. */
  nav {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 20;
    display: flex;
    background: color-mix(in srgb, var(--superficie) 92%, transparent);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--borda);
    padding-bottom: env(safe-area-inset-bottom);
  }

  button {
    flex: 1;
    min-width: 0;
    min-height: var(--toque);
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 2px;
    padding: var(--e2) var(--e1);
    border: 0;
    background: none;
    color: var(--texto-fraquinho);
    cursor: pointer;
    transition: color var(--rapido) var(--curva);
  }

  button span {
    font-size: 11px;
    font-weight: 600;
    text-transform: capitalize;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .atual { color: var(--acento-forte); }

  /* A marca da aba atual. Fininha e no topo do botão, para não competir com
     o ícone nem roubar altura da área de toque. */
  .atual::before {
    content: "";
    position: absolute;
    top: 0;
    width: 32px;
    height: 3px;
    border-radius: 0 0 3px 3px;
    background: var(--acento);
  }
  button { position: relative; }
</style>
