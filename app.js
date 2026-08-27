/* Preços do Frete — edita a planilha de regras do robô Dário.
 *
 * Segurança, em uma frase: não existe chave privada aqui. O site pede um token
 * ao Google, o Dário autoriza com a conta dele, e o token vale ~1h. Se este
 * arquivo vazar inteiro, ninguém consegue nada com ele.
 *
 * A alternativa seria guardar a chave da service account no navegador. Aí
 * qualquer um que abrisse "ver código-fonte" passaria a escrever na planilha —
 * por isso não se faz.
 */

const API = "https://sheets.googleapis.com/v4/spreadsheets";
const ESCOPO = "https://www.googleapis.com/auth/spreadsheets";

let token = null;
let clienteToken = null;
let dados = {};          // { aba: [ [linha], ... ] }  incluindo cabeçalho
let abaAtual = "precos_cidade";

/* ------------------------------------------------------------------ *
 * Estrutura das abas. O `campo` casa com o cabeçalho da planilha; o
 * `rotulo` é o que o Dário lê. Os dois são diferentes de propósito:
 * "por_andar" é bom para o código e ruim para gente.
 * ------------------------------------------------------------------ */
const ABAS = {
  precos_cidade: {
    titulo: "Frete dentro da cidade",
    ajuda: "Some tudo: o valor de partida, mais cada item, mais cada andar sem elevador.",
    nomeCard: "cidade",
    campos: [
      { campo: "cidade",    rotulo: "Cidade",           tipo: "texto" },
      { campo: "base",      rotulo: "Valor de partida", tipo: "dinheiro", passo: 10 },
      { campo: "por item",  rotulo: "Cada item",        tipo: "dinheiro", passo: 1 },
      { campo: "por andar", rotulo: "Cada andar",       tipo: "dinheiro", passo: 5,
        dica: "Só conta quando não tem elevador." },
    ],
  },
  precos_km: {
    titulo: "Frete para outra cidade",
    ajuda: "Uma linha por faixa de distância. Se uma vai até 100 km, a próxima começa em 100 — sem buraco entre elas.",
    nomeCard: "faixa",
    campos: [
      { campo: "km min", rotulo: "De (km)",        tipo: "numero",   passo: 10 },
      { campo: "km max", rotulo: "Até (km)",       tipo: "numero",   passo: 10 },
      { campo: "por km", rotulo: "Cada quilômetro", tipo: "dinheiro", passo: 0.5 },
      { campo: "mínimo", rotulo: "Valor mínimo",   tipo: "dinheiro", passo: 10,
        dica: "Se a conta der menos, cobra isto. Sem mínimo? Deixe 0." },
    ],
  },
  caminhoes: {
    titulo: "Meus caminhões",
    ajuda: "Escolho sempre o menor caminhão que dá conta da carga.",
    nomeCard: "caminhão",
    campos: [
      { campo: "caminhão",  rotulo: "Nome",           tipo: "texto" },
      { campo: "máx itens", rotulo: "Cabe até",       tipo: "numero", passo: 5, sufixo: "itens" },
      { campo: "obs",       rotulo: "Observação",     tipo: "texto" },
    ],
  },
  fragilidade: {
    titulo: "Coisa que quebra fácil",
    ajuda: "Cobrança extra para carga delicada. Pode ser uma porcentagem do total ou um valor fixo.",
    nomeCard: "nível",
    campos: [
      { campo: "nível", rotulo: "Nível",  tipo: "texto" },
      { campo: "tipo",  rotulo: "Cobrar como", tipo: "escolha",
        opcoes: [["percentual", "Porcentagem"], ["fixo", "Valor fixo"]] },
      { campo: "valor", rotulo: "Quanto", tipo: "numero", passo: 5,
        dica: "Porcentagem: escreva 10. Valor fixo: escreva 50,00." },
    ],
  },
  nao_transporto: {
    titulo: "O que eu não levo",
    ajuda: "Recuso antes de falar preço. O motivo é o que eu digo ao cliente.",
    nomeCard: "item",
    campos: [
      { campo: "termo",  rotulo: "O que é",  tipo: "texto",
        dica: "A palavra que o cliente usaria." },
      { campo: "motivo", rotulo: "Por quê",  tipo: "texto" },
    ],
  },
};

/* ------------------------------------------------------------------ *
 * Entrada
 * ------------------------------------------------------------------ */
function iniciarLogin() {
  if (!window.google || !google.accounts) {
    return setTimeout(iniciarLogin, 300);   // o script do Google ainda carregando
  }
  if (CONFIG.CLIENT_ID.startsWith("COLE_")) {
    document.getElementById("erro-entrada").textContent =
      "Falta configurar o CLIENT_ID em config.js.";
    return;
  }
  clienteToken = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: ESCOPO,
    callback: (resp) => {
      if (resp.error) return falhaLogin(resp.error);
      token = resp.access_token;
      entrou();
    },
  });
  // Silencioso primeiro: se ele já tem sessão do Google no celular, o token é
  // renovado sem aparecer nada. Só se falhar é que mostramos o botão.
  clienteToken.requestAccessToken({ prompt: "" });
}

function falhaLogin(erro) {
  document.getElementById("entrada").classList.remove("escondido");
  if (erro && erro !== "immediate_failed" && !String(erro).includes("suppressed")) {
    document.getElementById("erro-entrada").textContent =
      "Não consegui entrar. Toque no botão para tentar de novo.";
  }
}

document.getElementById("btn-entrar").onclick = () => {
  if (!clienteToken) return iniciarLogin();
  clienteToken.requestAccessToken({ prompt: "consent" });
};

async function entrou() {
  document.getElementById("entrada").classList.add("escondido");
  document.getElementById("app").classList.remove("escondido");
  await carregarTudo();
}

/* ------------------------------------------------------------------ *
 * Planilha
 * ------------------------------------------------------------------ */
async function chamar(caminho, opcoes = {}) {
  const r = await fetch(`${API}/${CONFIG.SHEET_ID}${caminho}`, {
    ...opcoes,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json",
               ...(opcoes.headers || {}) },
  });
  if (r.status === 401) {
    // Token expirou. Renova em silêncio e o Dário nem percebe.
    token = null;
    clienteToken.requestAccessToken({ prompt: "" });
    throw new Error("sessao_expirada");
  }
  if (!r.ok) throw new Error(`Google respondeu ${r.status}`);
  return r.json();
}

async function carregarTudo() {
  avisar("Carregando…", "trabalhando");
  try {
    const faixas = Object.keys(ABAS).map((a) => `ranges=${encodeURIComponent(a)}!A1:Z200`).join("&");
    const r = await chamar(`/values:batchGet?${faixas}`);
    Object.keys(ABAS).forEach((aba, i) => { dados[aba] = r.valueRanges[i].values || []; });
    esconderAviso();
    desenhar();
  } catch (e) {
    if (e.message !== "sessao_expirada") avisar("Não consegui ler a planilha.", "erro");
  }
}

async function salvarAba(aba) {
  avisar("Salvando…", "trabalhando");
  try {
    const linhas = dados[aba];
    await chamar(
      `/values/${encodeURIComponent(aba)}!A1:Z200?valueInputOption=USER_ENTERED`,
      { method: "PUT", body: JSON.stringify({ values: linhas }) },
    );
    // Limpa o resto, senão apagar uma linha deixa o dado velho lá embaixo.
    await chamar(`/values/${encodeURIComponent(aba)}!A${linhas.length + 1}:Z200:clear`,
                 { method: "POST", body: "{}" });
    avisar("Salvo!", "ok");
    setTimeout(esconderAviso, 1600);
  } catch (e) {
    if (e.message !== "sessao_expirada") avisar("Não consegui salvar.", "erro");
  }
}

/* ------------------------------------------------------------------ *
 * Tela
 * ------------------------------------------------------------------ */
function desenhar() {
  const def = ABAS[abaAtual];
  const linhas = dados[abaAtual] || [];
  const cabecalho = (linhas[0] || []).map((c) => String(c).trim().toLowerCase());
  const corpo = linhas.slice(1).filter((l) => l.some((c) => String(c || "").trim()));

  const el = document.getElementById("conteudo");
  el.innerHTML = `
    <p class="titulo-secao">${def.titulo}</p>
    <div class="ajuda">${def.ajuda}</div>
    <div id="cards"></div>
    <button class="btn secundario" id="btn-add">+ Adicionar ${def.nomeCard}</button>
  `;

  const cards = el.querySelector("#cards");
  corpo.forEach((linha, i) => cards.appendChild(montarCard(def, cabecalho, linha, i)));

  el.querySelector("#btn-add").onclick = () => {
    dados[abaAtual].push(new Array(cabecalho.length).fill(""));
    desenhar();
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };
}

function montarCard(def, cabecalho, linha, indice) {
  const card = document.createElement("div");
  card.className = "card";

  const primeiro = def.campos[0];
  const iPrim = cabecalho.indexOf(primeiro.campo);
  const nome = (linha[iPrim] || "").trim() || `Novo ${def.nomeCard}`;

  const h = document.createElement("h3");
  h.textContent = nome;
  card.appendChild(h);

  def.campos.forEach((campo) => {
    const i = cabecalho.indexOf(campo.campo);
    if (i < 0) return;
    card.appendChild(montarLinha(campo, linha, i, indice, h, def));
  });

  const apagar = document.createElement("button");
  apagar.className = "btn perigo";
  apagar.textContent = `Apagar ${def.nomeCard}`;
  apagar.onclick = () => {
    if (!confirm(`Apagar "${nome}"?`)) return;
    dados[abaAtual].splice(indice + 1, 1);
    salvarAba(abaAtual).then(desenhar);
  };
  card.appendChild(apagar);
  return card;
}

function montarLinha(campo, linha, i, indice, titulo, def) {
  const div = document.createElement("div");
  div.className = "linha";

  const lab = document.createElement("label");
  lab.innerHTML = campo.rotulo + (campo.dica ? `<span class="dica">${campo.dica}</span>` : "");
  div.appendChild(lab);

  const gravar = (valor) => {
    dados[abaAtual][indice + 1][i] = valor;
    if (campo === def.campos[0]) titulo.textContent = valor.trim() || `Novo ${def.nomeCard}`;
    agendarSalvar();
  };

  if (campo.tipo === "texto") {
    const inp = document.createElement("input");
    inp.className = "texto"; inp.value = linha[i] || "";
    inp.oninput = () => gravar(inp.value);
    div.style.flexDirection = "column"; div.style.alignItems = "stretch";
    div.appendChild(inp);
    return div;
  }

  if (campo.tipo === "escolha") {
    const sel = document.createElement("select");
    campo.opcoes.forEach(([v, r]) => {
      const o = document.createElement("option");
      o.value = v; o.textContent = r;
      o.selected = String(linha[i] || "").toLowerCase() === v;
      sel.appendChild(o);
    });
    sel.onchange = () => gravar(sel.value);
    div.appendChild(sel);
    return div;
  }

  // número e dinheiro: botões − e + para não precisar do teclado
  const passo = campo.passo || 1;
  const box = document.createElement("div");
  box.className = "stepper";
  const menos = document.createElement("button"); menos.textContent = "−";
  const inp = document.createElement("input");
  inp.inputMode = "decimal";
  inp.value = linha[i] || "";
  const mais = document.createElement("button"); mais.textContent = "+";

  const numero = () => {
    const n = parseFloat(String(inp.value).replace(/[^\d,.-]/g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  };
  const escrever = (n) => {
    const texto = campo.tipo === "dinheiro"
      ? n.toFixed(2).replace(".", ",")
      : String(Math.round(n));
    inp.value = texto; gravar(texto);
  };
  menos.onclick = () => escrever(Math.max(0, numero() - passo));
  mais.onclick = () => escrever(numero() + passo);
  inp.onchange = () => escrever(numero());

  box.append(menos, inp, mais);
  div.appendChild(box);
  return div;
}

/* Salva sozinho, mas não a cada tecla: 1,2s depois da última mudança. */
let timerSalvar = null;
function agendarSalvar() {
  clearTimeout(timerSalvar);
  timerSalvar = setTimeout(() => salvarAba(abaAtual), 1200);
}

function avisar(texto, tipo) {
  const a = document.getElementById("aviso");
  a.textContent = texto; a.className = tipo;
}
function esconderAviso() { document.getElementById("aviso").className = ""; }

document.querySelectorAll("#abas button").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll("#abas button")
      .forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    abaAtual = b.dataset.aba;
    desenhar();
    window.scrollTo({ top: 0 });
  };
});

window.addEventListener("load", iniciarLogin);
