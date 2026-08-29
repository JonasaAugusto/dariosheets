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

export async function lerTudo(sheetId, abas) {
  const faixas = abas
    .map((a) => `ranges=${encodeURIComponent(a)}!A1:Z200`)
    .join("&");
  const r = await chamar(sheetId, `/values:batchGet?${faixas}`);
  const fora = {};
  abas.forEach((aba, i) => {
    fora[aba] = r.valueRanges[i].values || [];
  });
  return fora;
}

export async function salvarAba(sheetId, aba, linhas) {
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
