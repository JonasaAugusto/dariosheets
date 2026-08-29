/**
 * As regras de tratamento da planilha, longe da tela.
 *
 * ## O bug que originou este arquivo do jeito que ele está
 *
 * A primeira versão tinha `paraTela` e `paraPlanilha` que não eram inversas:
 *
 *     Dário digita | ia pra planilha | voltava pra tela NA HORA
 *     R$ 2,50      | "2.5"           | R$ 25,00     <- ponto lido como milhar
 *     R$ 1.234,56  | "1234.56"       | R$ 123.456,00
 *
 * Só valor redondo sobrevivia. E isto corrompe a tabela de onde o robô tira
 * orçamento: o Dário digitava 2,50 e o cliente recebia dez vezes isso.
 *
 * ## O conserto de raiz: nunca adivinhar o formato
 *
 * A causa não era a conversão — era a AMBIGUIDADE. `"2.5"` pode ser dois e
 * meio ou dois mil e quinhentos, e qualquer regra que decida isso vai errar
 * metade das vezes.
 *
 * Então o número nunca vira string ambígua:
 *
 *   - a leitura pede `UNFORMATTED_VALUE`, e o Sheets devolve NÚMERO;
 *   - dentro do app o dinheiro vive em CENTAVOS INTEIROS;
 *   - a escrita manda número, não texto.
 *
 * String com ponto e vírgula só existe na borda da tela, onde é para gente
 * ler.
 */

/**
 * Id que ainda não existe nesta aba.
 *
 * Sequencial, não aleatório: quem abrir a planilha direto consegue ler
 * `cid_004` e entender do que se trata. E é o id, não a posição da linha, que
 * liga a regra ao histórico.
 */
export function novoId(aba, prefixos, cabecalho, corpo) {
  const prefixo = prefixos[aba] || aba.slice(0, 3);
  const iId = cabecalho.indexOf("id");
  const usados = new Set(corpo.map((l) => String(l[iId] ?? "").trim()));
  for (let n = 1; n < 1000; n++) {
    const id = `${prefixo}_${String(n).padStart(3, "0")}`;
    if (!usados.has(id)) return id;
  }
  return `${prefixo}_${Date.now()}`;
}

// ---------------------------------------------------------------------------
// DINHEIRO
//
// Tudo em centavos inteiros. Float para dinheiro soma errado, e aqui a soma
// vira cobrança de verdade.

/** Qualquer coisa que veio da planilha (número ou texto) vira centavos. */
export function paraCentavos(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "number") return Math.round(valor * 100);

  let s = String(valor).trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!s) return null;
  // A vírgula manda quando existe: "1.234,56" é pt-BR, "1234.56" é en.
  s = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number.parseFloat(s);
  return Number.isNaN(n) ? null : Math.round(n * 100);
}

/** Centavos viram "1.234,56". Sem o "R$": ele fica fora do campo. */
export function centavosParaTela(centavos) {
  if (centavos === null || centavos === undefined) return "";
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * A MÁSCARA: o que o Dário vê enquanto digita.
 *
 * Só os dígitos importam, e o último par é sempre os centavos. Digitar `250`
 * mostra `2,50`; digitar mais um `0` mostra `25,00`. É o mesmo comportamento
 * de aplicativo de banco, e é o único que não exige acertar a vírgula com o
 * polegar, em pé, no sol.
 *
 * Isso também elimina a classe inteira de erro de digitação: não existe
 * "esqueci a vírgula" nem "pus dois pontos".
 */
export function mascaraDinheiro(digitado) {
  const digitos = String(digitado ?? "").replace(/\D/g, "").slice(0, 11);
  if (!digitos) return { texto: "", centavos: null };
  const centavos = Number.parseInt(digitos, 10);
  return { texto: centavosParaTela(centavos), centavos };
}

/** Máscara de contagem: só dígitos, sem casa decimal. */
export function mascaraInteiro(digitado) {
  const digitos = String(digitado ?? "").replace(/\D/g, "").slice(0, 9);
  return { texto: digitos, numero: digitos ? Number.parseInt(digitos, 10) : null };
}

// ---------------------------------------------------------------------------

/** O que aparece no campo, a partir do que está guardado. */
export function paraTela(valor, tipo) {
  if (tipo === "dinheiro") return centavosParaTela(paraCentavos(valor));
  if (tipo === "numero") return valor === null || valor === undefined ? "" : String(valor);
  return String(valor ?? "");
}

/**
 * O que vai para a célula.
 *
 * NÚMERO para os campos numéricos, não string. É isto que impede o Sheets de
 * adivinhar o formato — e adivinhar é o que produzia o erro de 10x.
 */
export function paraPlanilha(valor, tipo) {
  if (tipo === "dinheiro") {
    const c = paraCentavos(valor);
    return c === null ? "" : c / 100;
  }
  if (tipo === "numero") {
    const n = Number.parseInt(String(valor ?? "").replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? "" : n;
  }
  return String(valor ?? "").trim();
}

export function mudou(antes, agora) {
  return JSON.stringify(antes || []) !== JSON.stringify(agora || []);
}

/** Cabeçalho normalizado: a planilha real tem espaço e maiúscula sobrando. */
export function cabecalhoDe(linhas) {
  return (linhas[0] || []).map((c) => String(c).trim().toLowerCase());
}

/** As linhas visíveis: sem o cabeçalho e sem o que foi marcado como inativo. */
export function corpoDe(linhas, cabecalho) {
  const iAtivo = cabecalho.indexOf("ativo");
  return linhas.slice(1).filter((l) => {
    if (iAtivo < 0) return true;
    const v = String(l[iAtivo] ?? "").trim().toLowerCase();
    return v !== "nao" && v !== "não" && v !== "0" && v !== "false";
  });
}
