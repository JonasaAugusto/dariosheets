/**
 * OAuth do Google e leitura/escrita da planilha.
 *
 * ## Isto NÃO foi reescrito
 *
 * Este arquivo é a camada do `app.js` antigo, extraída como módulo. Ela
 * funciona, está auditada, e o `README.md` explica por que não existe chave
 * privada aqui: o site pede um token ao Google, o Dário autoriza com a conta
 * dele, e o token vale cerca de uma hora. Quem decide o que ele alcança é o
 * compartilhamento da própria planilha.
 *
 * Reescrever isso junto com o redesenho seria trocar duas coisas de uma vez e
 * não saber qual quebrou. O redesenho é da interface.
 */
const API = "https://sheets.googleapis.com/v4/spreadsheets";
const ESCOPO = "https://www.googleapis.com/auth/spreadsheets";

let token = null;
let clienteToken = null;

export class SessaoExpirada extends Error {
  constructor() {
    super("sessao_expirada");
  }
}

/** Espera o script do Google terminar de carregar. */
function esperarGoogle() {
  return new Promise((resolve, reject) => {
    let tentativas = 0;
    const olhar = () => {
      if (window.google?.accounts?.oauth2) return resolve();
      if ((tentativas += 1) > 40) return reject(new Error("google_nao_carregou"));
      setTimeout(olhar, 300);
    };
    olhar();
  });
}

/**
 * Tenta entrar. `silencioso` primeiro: se ele já tem sessão do Google no
 * celular, o token é renovado sem aparecer nada na tela.
 */
export async function entrar({ clientId, silencioso = true }) {
  if (!clientId || clientId.startsWith("COLE_")) {
    throw new Error("falta_client_id");
  }
  await esperarGoogle();

  return new Promise((resolve, reject) => {
    if (!clienteToken) {
      clienteToken = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: ESCOPO,
        callback: (resp) => {
          if (resp.error) return reject(new Error(resp.error));
          token = resp.access_token;
          resolve(token);
        },
        error_callback: (err) => reject(new Error(err?.type || "falhou")),
      });
    } else {
      clienteToken.callback = (resp) => {
        if (resp.error) return reject(new Error(resp.error));
        token = resp.access_token;
        resolve(token);
      };
    }
    clienteToken.requestAccessToken({ prompt: silencioso ? "" : "consent" });
  });
}

async function chamar(sheetId, caminho, opcoes = {}) {
  const r = await fetch(`${API}/${sheetId}${caminho}`, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opcoes.headers || {}),
    },
  });
  if (r.status === 401) {
    // Token expirou. Renova em silêncio e o Dário nem percebe.
    token = null;
    clienteToken?.requestAccessToken({ prompt: "" });
    throw new SessaoExpirada();
  }
  if (!r.ok) throw new Error(`Google respondeu ${r.status}`);
  return r.json();
}

/**
 * O NOME da planilha, não o e-mail.
 *
 * Pegar o e-mail exigiria o escopo `userinfo.email`, e escopo novo obriga o
 * Dário a autorizar tudo de novo. O nome vem com o escopo que já temos e
 * responde melhor à pergunta que ele faria: "estou mexendo na planilha certa?"
 */
export async function nomeDaPlanilha(sheetId) {
  try {
    const r = await chamar(sheetId, "?fields=properties.title");
    return r.properties?.title || "";
  } catch {
    return "";       // nome é conveniência: se falhar, o app segue
  }
}

/**
 * Os nomes das abas que EXISTEM na planilha.
 *
 * Precisa existir porque o `batchGet` é tudo-ou-nada: se uma única faixa
 * apontar para uma aba que não existe, a requisição inteira falha com 400 e o
 * app mostra "Não consegui ler a planilha" — mesmo estando tudo certo com as
 * outras cinco.
 *
 * Foi exatamente o que aconteceu ao nascer a aba de viagens: ela ainda não
 * existia na planilha do Dário, e o site parou de ler qualquer coisa.
 */
export async function abasQueExistem(sheetId) {
  const r = await chamar(sheetId, "?fields=sheets.properties.title");
  return new Set((r.sheets || [])
    .map((s) => String(s.properties?.title || "").trim())
    .filter(Boolean));
}

export async function lerTudo(sheetId, abas) {
  // Só as que existem. Pedir uma aba ausente derruba a leitura INTEIRA.
  const existentes = await abasQueExistem(sheetId);
  const pedir = abas.filter((a) => existentes.has(a));
  if (pedir.length === 0) return Object.fromEntries(abas.map((a) => [a, []]));

  const faixas = pedir
    .map((a) => `ranges=${encodeURIComponent(a)}!A1:Z200`)
    .join("&");
  // UNFORMATTED_VALUE: número volta como NÚMERO, não como texto formatado.
  //
  // Sem isto o Sheets devolve "R$ 2,50" quando a célula está formatada como
  // moeda, e aí o app tem que adivinhar se o ponto é decimal ou milhar. Foi
  // essa adivinhação que fazia R$ 2,50 virar R$ 25,00 na tela.
  //
  // Adivinhar formato de dinheiro é errar metade das vezes. Melhor não ter
  // o que adivinhar.
  const r = await chamar(
    sheetId, `/values:batchGet?${faixas}&valueRenderOption=UNFORMATTED_VALUE`);
  // Aba que não existe volta VAZIA, não ausente: o app trata "vazia" como
  // "ainda não preenchida", que é a verdade, e o Dário consegue cadastrar a
  // primeira linha por lá.
  const fora = Object.fromEntries(abas.map((a) => [a, []]));
  pedir.forEach((aba, i) => {
    fora[aba] = r.valueRanges[i]?.values || [];
  });
  return fora;
}

/**
 * Cria a aba, se ela ainda não existir.
 *
 * O Dário não deve precisar abrir o Google Sheets para começar a usar uma aba
 * nova: ele abre o site, preenche e salva. Sem isto, a primeira gravação numa
 * aba inexistente falharia com 400 e ele veria "não consegui salvar" sem
 * nenhuma pista do motivo.
 */
export async function garantirAba(sheetId, aba) {
  const existentes = await abasQueExistem(sheetId);
  if (existentes.has(aba)) return true;
  await chamar(sheetId, ":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: aba } } }],
    }),
  });
  return true;
}

export async function salvarAba(sheetId, aba, linhas) {
  // USER_ENTERED com número de verdade no payload: o Sheets guarda número.
  // Se fosse string, ele reinterpretaria conforme o idioma da planilha, e uma
  // célula numérica viraria texto sem ninguém pedir.
  await chamar(
    sheetId,
    `/values/${encodeURIComponent(aba)}!A1:Z200?valueInputOption=USER_ENTERED`,
    { method: "PUT", body: JSON.stringify({ values: linhas }) },
  );
  // Limpa o resto, senão apagar uma linha deixa o dado velho lá embaixo.
  await chamar(
    sheetId,
    `/values/${encodeURIComponent(aba)}!A${linhas.length + 1}:Z200:clear`,
    { method: "POST", body: "{}" },
  );
}
