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

/* Nada é salvo sozinho.
 *
 * A primeira versão salvava 1,2s depois da última tecla. Num aplicativo de
 * preço isso é perigoso: um toque sem querer no "−" viraria desconto real no
 * próximo orçamento, sem ninguém ver acontecer. Agora a alteração fica aqui
 * até o Dário confirmar.
 *
 * `original` guarda como a aba estava ao carregar, para saber o que mudou e
 * para conseguir desfazer. */
let alterado = false;
let original = {};

/* ------------------------------------------------------------------ *
 * Estrutura das abas. O `campo` casa com o cabeçalho da planilha; o
 * `rotulo` é o que o Dário lê. Os dois são diferentes de propósito:
 * "por_andar" é bom para o código e ruim para gente.
 * ------------------------------------------------------------------ */
/* Colunas de controle: existem para a máquina, não para o Dário.
 *
 * `id` identifica a linha independente da posição — sem ele, apagar um card
 * deslocaria todos abaixo e duas edições ao mesmo tempo se atropelariam.
 * `ativo` substitui apagar: regra removida vira "nao" e fica no histórico.
 *
 * O app preenche as duas sozinho e NÃO as mostra. Um campo "id" na tela seria
 * um convite para alguém editar e quebrar a referência. */
const CONTROLE = ["id", "ativo"];

const PREFIXO_ID = {
  precos_cidade: "cid", precos_km: "km", caminhoes: "cam",
  fragilidade: "fra", nao_transporto: "nao",
};

const ABAS = {
  precos_cidade: {
    titulo: "Dentro da cidade",
    sub: "Quando a retirada e a entrega são na mesma cidade.",
    icone: "🏙️",
    ajuda: "O valor final soma tudo: partida + cada item + cada andar sem elevador.",
    nomeCard: "cidade",
    campos: [
      { campo: "cidade",    rotulo: "Cidade",           tipo: "texto" },
      { campo: "preco_base", rotulo: "Valor de partida", tipo: "dinheiro", passo: 10 },
      { campo: "preco_por_item", rotulo: "Cada item",   tipo: "dinheiro", passo: 1 },
      { campo: "preco_por_andar", rotulo: "Cada andar",  tipo: "dinheiro", passo: 5,
        dica: "Só conta quando não tem elevador." },
    ],
  },
  precos_km: {
    titulo: "Para outra cidade",
    sub: "Cobrança por quilômetro rodado, em faixas.",
    icone: "🛣️",
    ajuda: "Se uma faixa vai até 100 km, a próxima começa em 100. Sem buraco entre elas, senão um frete daquela distância fica sem preço.",
    nomeCard: "faixa",
    campos: [
      { campo: "km_min", rotulo: "De (km)",        tipo: "numero",   passo: 10 },
      { campo: "km_max", rotulo: "Até (km)",       tipo: "numero",   passo: 10 },
      { campo: "preco_por_km", rotulo: "Cada quilômetro", tipo: "dinheiro", passo: 0.5 },
      { campo: "preco_minimo", rotulo: "Valor mínimo", tipo: "dinheiro", passo: 10,
        dica: "Se a conta der menos, cobra isto. Sem mínimo? Deixe 0." },
    ],
  },
  caminhoes: {
    titulo: "Meus caminhões",
    sub: "Qual veículo dá conta de quantos itens.",
    icone: "🚚",
    ajuda: "O Dário escolhe sempre o menor caminhão que comporta a carga.",
    nomeCard: "caminhão",
    campos: [
      { campo: "caminhao",  rotulo: "Nome",           tipo: "texto" },
      { campo: "max_itens", rotulo: "Cabe até",       tipo: "numero", passo: 5, sufixo: "itens" },
      { campo: "observacao", rotulo: "Observação",    tipo: "texto" },
    ],
  },
  fragilidade: {
    titulo: "Coisa que quebra fácil",
    sub: "Adicional para carga delicada.",
    icone: "🥂",
    ajuda: "Pode ser uma porcentagem do total ou um valor fixo em reais.",
    nomeCard: "nível",
    campos: [
      { campo: "nivel", rotulo: "Nível",  tipo: "texto" },
      { campo: "tipo",  rotulo: "Cobrar como", tipo: "escolha",
        opcoes: [["percentual", "Porcentagem"], ["fixo", "Valor fixo"]] },
      { campo: "valor", rotulo: "Quanto", tipo: "numero", passo: 5,
        dica: "Porcentagem: escreva 10. Valor fixo: escreva 50,00." },
    ],
  },
  nao_transporto: {
    titulo: "O que eu não levo",
    sub: "Cargas que o Dário recusa.",
    icone: "🚫",
    ajuda: "A recusa acontece ANTES de falar qualquer preço — cotar e voltar atrás é pior, porque o cliente já ancorou no valor.",
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
  mostrarPlanilha();
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

async function mostrarPlanilha() {
  /* Mostra o NOME da planilha, não o e-mail.
   *
   * Pegar o e-mail exigiria o escopo `userinfo.email`, e escopo novo obriga o
   * Dário a autorizar tudo de novo. O nome da planilha vem com o escopo que já
   * temos e responde melhor à pergunta que ele faria: "estou mexendo na
   * planilha certa?" */
  try {
    const r = await chamar("?fields=properties.title");
    document.getElementById("conta").textContent = r.properties?.title || "";
  } catch { /* nome é conveniência: se falhar, o app segue */ }
}

async function carregarTudo() {
  esqueleto();
  avisar("Carregando…", "trabalhando");
  try {
    const faixas = Object.keys(ABAS).map((a) => `ranges=${encodeURIComponent(a)}!A1:Z200`).join("&");
    const r = await chamar(`/values:batchGet?${faixas}`);
    Object.keys(ABAS).forEach((aba, i) => {
      dados[aba] = r.valueRanges[i].values || [];
      original[aba] = JSON.parse(JSON.stringify(dados[aba]));
    });
    alterado = false;
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
  const iAtivo = cabecalho.indexOf("ativo");
  const corpo = linhas.slice(1).filter((l) => {
    if (!l.some((c) => String(c || "").trim())) return false;
    if (iAtivo < 0) return true;
    return !["nao", "não", "n", "0"].includes(String(l[iAtivo] || "").trim().toLowerCase());
  });

  const el = document.getElementById("conteudo");
  el.innerHTML = `
    <h2 class="secao-titulo">${def.titulo}</h2>
    <p class="secao-sub">${def.sub}</p>
    <div class="ajuda"><span class="icone">💡</span><span>${def.ajuda}</span></div>
    <div id="cards"></div>
    <button class="btn btn-contorno" id="btn-add">
      <span>＋</span><span>Adicionar ${def.nomeCard}</span>
    </button>
    <div id="barra-salvar" class="escondido">
      <p class="aviso-alterado">
        Você mudou algo nesta aba. Nada foi salvo ainda.
      </p>
      <button class="btn btn-primario" id="btn-salvar">Salvar alterações</button>
      <button class="btn btn-contorno" id="btn-desfazer">Desfazer</button>
    </div>
  `;

  const cards = el.querySelector("#cards");
  if (corpo.length === 0) {
    cards.innerHTML = `
      <div class="vazio">
        <div class="icone">${def.icone}</div>
        <p>Nenhum${def.nomeCard === "cidade" || def.nomeCard === "faixa" ? "a" : ""}
           ${def.nomeCard} cadastrad${def.nomeCard === "cidade" || def.nomeCard === "faixa" ? "a" : "o"} ainda.</p>
      </div>`;
  } else {
    corpo.forEach((linha, i) => cards.appendChild(montarCard(def, cabecalho, linha, i)));
  }

  el.querySelector("#btn-salvar").onclick = async () => {
    await salvarAba(abaAtual);
    original[abaAtual] = JSON.parse(JSON.stringify(dados[abaAtual]));
    atualizarBarraSalvar();
  };

  el.querySelector("#btn-desfazer").onclick = () => {
    if (!confirm("Desfazer as alterações desta aba?")) return;
    dados[abaAtual] = JSON.parse(JSON.stringify(original[abaAtual] || []));
    desenhar();
  };

  atualizarBarraSalvar();

  el.querySelector("#btn-add").onclick = () => {
    const nova = new Array(Math.max(cabecalho.length, 2)).fill("");
    const iId = cabecalho.indexOf("id");
    const iAtivo = cabecalho.indexOf("ativo");
    if (iId >= 0) nova[iId] = novoId(cabecalho, corpo);
    if (iAtivo >= 0) nova[iAtivo] = "sim";
    dados[abaAtual].push(nova);
    desenhar();
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };
}

function esqueleto() {
  document.getElementById("conteudo").innerHTML =
    '<div class="esqueleto"></div><div class="esqueleto"></div><div class="esqueleto"></div>';
}

/* Id que ainda não existe nesta aba. Sequencial, não aleatório: quem abrir a
 * planilha direto consegue ler "cid_004" e entender do que se trata. */
function novoId(cabecalho, corpo) {
  const prefixo = PREFIXO_ID[abaAtual] || abaAtual.slice(0, 3);
  const iId = cabecalho.indexOf("id");
  const usados = new Set(corpo.map((l) => (l[iId] || "").trim()));
  for (let n = 1; n < 1000; n++) {
    const id = `${prefixo}_${String(n).padStart(3, "0")}`;
    if (!usados.has(id)) return id;
  }
  return `${prefixo}_${Date.now()}`;
}

function montarCard(def, cabecalho, linha, indice) {
  const card = document.createElement("div");
  card.className = "card";

  const primeiro = def.campos[0];
  const iPrim = cabecalho.indexOf(primeiro.campo);
  const nome = (linha[iPrim] || "").trim() || `Nov${def.nomeCard === "cidade" || def.nomeCard === "faixa" ? "a" : "o"} ${def.nomeCard}`;

  const topo = document.createElement("div");
  topo.className = "card-topo";
  topo.innerHTML = `<div class="numero">${indice + 1}</div><h3></h3>`;
  const h = topo.querySelector("h3");
  h.textContent = nome;
  card.appendChild(topo);

  const corpo = document.createElement("div");
  corpo.className = "card-corpo";
  def.campos.forEach((campo) => {
    if (CONTROLE.includes(campo.campo)) return;   // id e ativo não vão para a tela
    const i = cabecalho.indexOf(campo.campo);
    if (i < 0) return;
    corpo.appendChild(montarLinha(campo, linha, i, indice, h, def));
  });

  const apagar = document.createElement("button");
  apagar.className = "btn btn-apagar";
  apagar.textContent = `Remover ${def.nomeCard}`;
  apagar.onclick = () => {
    if (!confirm(`Remover "${nome}"?\n\nEla sai das regras mas continua guardada.`)) return;
    /* Desativa em vez de apagar a linha.
     *
     * Apagar deslocaria todas as linhas abaixo, e um preço removido por engano
     * seria perda definitiva. Com `ativo: nao`, o robô ignora e o histórico
     * fica — dá para voltar atrás editando a planilha. */
    const iAtivo = cabecalho.indexOf("ativo");
    if (iAtivo >= 0) {
      dados[abaAtual][indice + 1][iAtivo] = "nao";
    } else {
      dados[abaAtual].splice(indice + 1, 1);
    }
    marcarAlterado();
    desenhar();
  };
  corpo.appendChild(apagar);
  card.appendChild(corpo);
  return card;
}

function montarLinha(campo, linha, i, indice, titulo, def) {
  const div = document.createElement("div");
  div.className = "campo";

  const lab = document.createElement("label");
  lab.innerHTML = campo.rotulo
    + (campo.tipo === "dinheiro" ? ' <span class="dica" style="display:inline">(em reais)</span>' : "")
    + (campo.dica ? `<span class="dica">${campo.dica}</span>` : "");
  div.appendChild(lab);

  const gravar = (valor) => {
    dados[abaAtual][indice + 1][i] = valor;
    if (campo === def.campos[0]) titulo.textContent = valor.trim() || `Novo ${def.nomeCard}`;
    marcarAlterado();
  };

  if (campo.tipo === "texto") {
    const inp = document.createElement("input");
    inp.className = "texto"; inp.value = linha[i] || "";
    inp.oninput = () => gravar(inp.value);
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

function marcarAlterado() {
  alterado = true;
  atualizarBarraSalvar();
}

function contarAlteracoes() {
  const antes = JSON.stringify(original[abaAtual] || []);
  const agora = JSON.stringify(dados[abaAtual] || []);
  return antes === agora ? 0 : 1;
}

function atualizarBarraSalvar() {
  const barra = document.getElementById("barra-salvar");
  if (!barra) return;
  const mudou = contarAlteracoes() > 0;
  barra.classList.toggle("escondido", !mudou);
  alterado = mudou;
}

const ICONE_AVISO = { ok: "✅", erro: "⚠️", trabalhando: "⏳" };

function avisar(texto, tipo) {
  const a = document.getElementById("aviso");
  a.innerHTML = `<span>${ICONE_AVISO[tipo] || ""}</span><span>${texto}</span>`;
  a.className = `${tipo} mostrando`;
}
function esconderAviso() { document.getElementById("aviso").className = ""; }

document.querySelectorAll("#abas button").forEach((b) => {
  b.onclick = () => {
    /* Sair da aba com alteração pendente perderia a mudança sem aviso — e o
     * Dário não teria como saber que perdeu. */
    if (alterado && !confirm("Você tem alterações não salvas nesta aba.\n\nSair mesmo assim?")) {
      return;
    }
    if (alterado) dados[abaAtual] = JSON.parse(JSON.stringify(original[abaAtual] || []));
    document.querySelectorAll("#abas button")
      .forEach((x) => x.setAttribute("aria-selected", String(x === b)));
    abaAtual = b.dataset.aba;
    desenhar();
    window.scrollTo({ top: 0 });
  };
});

document.getElementById("btn-sair").onclick = () => {
  if (!confirm("Sair da sua conta?")) return;
  if (token && google?.accounts?.oauth2) google.accounts.oauth2.revoke(token, () => {});
  token = null;
  document.getElementById("app").classList.add("escondido");
  document.getElementById("entrada").classList.remove("escondido");
};

/* O navegador mostra o aviso padrão dele. Não dá para escolher o texto, mas
 * dá para impedir que a alteração suma sem ninguém perceber. */
window.addEventListener("beforeunload", (e) => {
  if (!alterado) return;
  e.preventDefault();
  e.returnValue = "";
});

window.addEventListener("load", iniciarLogin);
