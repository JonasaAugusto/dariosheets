<script>
  import { mascaraDinheiro, mascaraInteiro, paraTela } from "../lib/planilha.js";

  let { def, valor = "", onchange } = $props();

  // `$props.id()` em vez de sortear: estável entre renderizações, e único
  // por instância. Sorteio no corpo do componente muda a cada render e
  // quebraria a ligação `for`/`id` do rótulo.
  const id = $props.id();

  // O que aparece no campo é DERIVADO do valor, sem estado local.
  //
  // Isso só funciona porque a máscara é idempotente: o texto que ela produz,
  // convertido para o valor e formatado de volta, dá exatamente o mesmo
  // texto. Digitar "250" mostra "2,50", guarda 2.5, e 2.5 formata como
  // "2,50".
  //
  // Sem essa propriedade seria preciso estado local, e estado local espelhando
  // prop é a receita de input que dessincroniza: o DOM fica com o texto cru
  // enquanto o app acha que formatou.
  const mostrado = $derived(paraTela(valor, def.tipo));

  function digitou(e) {
    const cru = e.currentTarget.value;
    const numerico = def.tipo === "dinheiro" || def.tipo === "numero";

    if (def.tipo === "dinheiro") {
      // A máscara roda a cada tecla: só os dígitos contam, e o último par é
      // sempre os centavos. É o comportamento de aplicativo de banco, e é o
      // único que não exige acertar a vírgula com o polegar, em pé, no sol.
      const m = mascaraDinheiro(cru);
      onchange(m.centavos === null ? "" : m.centavos / 100);
    } else if (def.tipo === "numero") {
      const m = mascaraInteiro(cru);
      onchange(m.numero === null ? "" : m.numero);
    } else {
      onchange(cru);
    }

    // SÓ NOS CAMPOS COM MÁSCARA.
    //
    // A máscara reescreve o texto a cada tecla, e o cursor não volta sozinho:
    // sem isto ele pula para o começo, porque o texto mudou de tamanho ao
    // ganhar a vírgula. Como a máscara só cresce pela direita, o fim é o
    // lugar certo.
    //
    // Em campo de TEXTO isso seria o oposto de ajudar: quem corrige
    // "Belo Horizonet" posiciona o cursor no meio, e cada tecla o puxaria de
    // volta para o fim. Ficaria impossível editar o que já está escrito.
    if (!numerico) return;

    const campo = e.currentTarget;
    queueMicrotask(() => {
      const n = campo.value.length;
      try { campo.setSelectionRange(n, n); } catch { /* nem todo campo tem */ }
    });
  }
</script>

<div class="campo">
  <!-- O `for`/`id` é explícito, e não `<label>` envolvendo tudo.
       Envolvendo, o rótulo se associa ao PRIMEIRO elemento rotulável dentro
       dele, e tocar no texto do rótulo disparava um clique nesse elemento. -->
  <label class="rotulo" for={id}>{def.rotulo}</label>

  {#if def.tipo === "escolha"}
    <select {id} value={valor} onchange={(e) => onchange(e.currentTarget.value)}>
      {#each def.opcoes as [v, texto]}
        <option value={v}>{texto}</option>
      {/each}
    </select>
  {:else}
    <div class="entrada">
      {#if def.tipo === "dinheiro"}
        <!-- O R$ fica FORA do campo: dentro, iria junto quando o Dário
             copiasse o valor, e voltaria pra planilha como texto. -->
        <span class="moeda" aria-hidden="true">R$</span>
      {/if}
      <input
        {id}
        value={mostrado}
        inputmode={def.tipo === "dinheiro" || def.tipo === "numero" ? "numeric" : "text"}
        enterkeyhint="next"
        autocomplete="off"
        placeholder={def.tipo === "dinheiro" ? "0,00" : ""}
        oninput={digitou} />
    </div>
  {/if}

  {#if def.dica}<p class="dica">{def.dica}</p>{/if}
</div>

<style>
  .campo { display: grid; gap: var(--e2); }
  .rotulo { font-size: var(--t-p); font-weight: 600; color: var(--texto-fraco); }
  .dica { font-size: var(--t-pp); color: var(--texto-fraco); line-height: 1.45; }

  .entrada {
    display: flex;
    align-items: center;
    gap: var(--e2);
    padding: 0 var(--e4);
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
    font-weight: 650;
    color: var(--texto-fraco);
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    padding: 0;
    font-size: var(--t-base);
    /* Dígito de largura fixa: o número não "dança" enquanto a máscara
       recalcula a cada tecla. */
    font-variant-numeric: tabular-nums;
  }
  input:focus { outline: none; }

  select {
    min-height: var(--toque);
    padding: 0 var(--e3);
    background: var(--superficie);
    border: 1.5px solid var(--borda);
    border-radius: var(--raio);
    font-size: var(--t-base);
  }
</style>
