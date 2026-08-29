/**
 * As regras de tratamento da planilha, longe da tela.
 *
 * Ficaram aqui, e não dentro de um componente, porque nenhuma delas é sobre
 * aparência: são sobre o que é um id válido, o que é um número em reais e o
 * que conta como alteração. Trocar o desenho da tela não pode mexer nisso.
 */

/**
 * Id que ainda não existe nesta aba.
 *
 * Sequencial, não aleatório: quem abrir a planilha direto consegue ler
 * `cid_004` e entender do que se trata. E é o id, não a posição da linha, que
 * liga a regra ao histórico — apagar uma linha deslocaria todas abaixo, e duas
 * edições ao mesmo tempo se atropelariam.
 */
export function novoId(aba, prefixos, cabecalho, corpo) {
  const prefixo = prefixos[aba] || aba.slice(0, 3);
  const iId = cabecalho.indexOf("id");
  const usados = new Set(corpo.map((l) => (l[iId] || "").trim()));
  for (let n = 1; n < 1000; n++) {
    const id = `${prefixo}_${String(n).padStart(3, "0")}`;
    if (!usados.has(id)) return id;
  }
  return `${prefixo}_${Date.now()}`;
}

/**
 * O valor pronto para ler: `1.234,56` em vez de `1234.56`.
 *
 * O `R$` fica FORA do campo, num rótulo ao lado. Dentro, ele entraria junto
 * quando o Dário copiasse o valor, e voltaria para a planilha como texto.
 */
export function paraTela(valor, tipo) {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";
  if (tipo !== "dinheiro") return texto;

  const n = parseFloat(texto.replace(/\./g, "").replace(",", "."));
  if (Number.isNaN(n)) return texto;
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** O que volta para a planilha: ponto decimal, sem separador de milhar. */
export function paraPlanilha(valor, tipo) {
  const texto = String(valor ?? "").trim();
  if (!texto || tipo === "texto" || tipo === "escolha") return texto;
  const n = parseFloat(texto.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(n) ? texto : String(n);
}

/** Passo do `−`/`+`. Dinheiro anda de 5 em 5; contagem, de 1 em 1. */
export function passo(tipo) {
  return tipo === "dinheiro" ? 5 : 1;
}

export function somar(valor, delta, tipo) {
  const n = parseFloat(String(valor ?? "0").replace(/\./g, "").replace(",", "."));
  const base = Number.isNaN(n) ? 0 : n;
  const novo = Math.max(0, base + delta);
  return tipo === "dinheiro" ? novo.toFixed(2).replace(".", ",") : String(novo);
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
