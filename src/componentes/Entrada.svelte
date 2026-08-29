<script>
  import { Truck, Loader2 } from "../lib/icones.js";

  let { erro = "", entrando = false, onentrar } = $props();
</script>

<main>
  <div class="selo"><Truck size={30} strokeWidth={1.8} /></div>

  <h2>Preços do Frete</h2>
  <p class="sub">Aqui você ajusta os valores que o Dário usa para fazer os orçamentos.</p>

  <button type="button" class="entrar" onclick={onentrar} disabled={entrando}>
    {#if entrando}
      <span class="girando"><Loader2 size={20} strokeWidth={2.4} /></span>
      Entrando…
    {:else}
      Entrar com o Google
    {/if}
  </button>

  {#if erro}<p class="erro" role="alert">{erro}</p>{/if}

  <p class="rodape">Seus dados ficam na sua planilha. Este site não guarda nada.</p>
</main>

<style>
  main {
    min-height: 100dvh;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: var(--e4);
    padding: var(--e6) var(--e5);
    text-align: center;
    max-width: 420px;
    margin-inline: auto;
  }

  .selo {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    border-radius: 20px;
    background: var(--acento-fraco);
    color: var(--acento-forte);
    margin-bottom: var(--e1);
  }

  .sub { color: var(--texto-fraco); font-size: var(--t-p); max-width: 30ch; }

  .entrar {
    width: 100%;
    min-height: var(--toque);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--e2);
    margin-top: var(--e2);
    padding: 0 var(--e5);
    border: 0;
    border-radius: var(--raio);
    background: var(--texto);
    color: var(--fundo);
    font-size: var(--t-base);
    font-weight: 650;
    cursor: pointer;
    transition: transform var(--rapido) var(--curva), opacity var(--rapido);
  }
  .entrar:active { transform: scale(0.98); }
  .entrar:disabled { opacity: 0.7; cursor: default; }

  .erro {
    color: var(--perigo);
    background: var(--perigo-fraco);
    padding: var(--e3) var(--e4);
    border-radius: var(--raio);
    font-size: var(--t-p);
    font-weight: 600;
  }

  .rodape {
    margin-top: var(--e5);
    font-size: var(--t-pp);
    color: var(--texto-fraquinho);
    max-width: 34ch;
  }

  .girando { display: grid; place-items: center; animation: girar 1s linear infinite; }
  @keyframes girar { to { transform: rotate(360deg); } }
</style>
