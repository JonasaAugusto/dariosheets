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

/**
 * Qualquer coisa que veio da planilha (número ou texto) vira centavos.
 *
 * ## Por que não é `Math.round(valor * 100)`
 *
 * Porque erra, e erra em dinheiro:
 *
 *     Math.round(1.005 * 100)  ->  100   (o certo é 101)
 *
 * `1.005` não existe em IEEE-754: o que existe é `1.00499999999999989...`, e
 * multiplicar por 100 dá `100.49999999999999`. Um centavo some, em silêncio,
 * numa tabela de onde sai cobrança.
 *
 * O conserto é não multiplicar float nenhum. A representação decimal do
 * número em texto é exata (`(1.005).toString() === "1.005"`), então basta
 * mover a vírgula duas casas e arredondar a terceira à mão.
 */
export function paraCentavos(valor) {
  if (valor === null || valor === undefined || valor === "") return null;

  let s;
  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) return null;
    // Notação científica (1e-7, 1e21) não tem vírgula para mover.
    s = Math.abs(valor) < 1e21 && Math.abs(valor) >= 1e-6
      ? valor.toFixed(10).replace(/0+$/, "").replace(/\.$/, "")
      : String(valor);
    if (s.includes("e") || s.includes("E")) return Math.round(valor * 100);
  } else {
    s = String(valor).trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
    if (!s) return null;
    // A vírgula manda quando existe: "1.234,56" é pt-BR, "1234.56" é en.
    s = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  }

  const casa = /^(-?)(\d*)(?:\.(\d*))?$/.exec(s);
  if (!casa) return null;
  const [, sinal, inteiro, decimal = ""] = casa;
  if (!inteiro && !decimal) return null;

  const centavos = Number.parseInt((inteiro || "0") + decimal.slice(0, 2).padEnd(2, "0"), 10);
  if (Number.isNaN(centavos)) return null;

  // A terceira casa decide, e "meio para cima" é a regra que o resto do
  // sistema usa (ver `dario/dominio/dinheiro.py`).
  const terceira = Number.parseInt(decimal[2] ?? "0", 10) || 0;
  const arredondado = centavos + (terceira >= 5 ? 1 : 0);
  return sinal === "-" ? -arredondado : arredondado;
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
