/**
 * As abas da planilha, como o Dário as vê.
 *
 * Movido do `app.js` antigo sem mudar uma vírgula do conteúdo: os títulos, as
 * dicas e a ordem foram escritos com ele e são o que faz a tela ser
 * entendível. O que mudou foi só o `icone`, que era emoji e virou nome de
 * ícone do Lucide.
 *
 * A ordem é a que ele pediu: a primeira aba é a que ele mais mexe.
 */
export const ABAS = {
  /* Ordem pedida pelo Dário. A primeira aba é a que ele mais mexe. */
  precos_km: {
    titulo: "Preço por quilômetro",
    sub: "Frete para fora da cidade, cobrado por distância.",
    icone: "Route",
    ajuda: "Uma linha por faixa de distância. Se uma vai até 100 km, a próxima começa em 100 — sem buraco entre elas, senão um frete daquela distância fica sem preço.",
    nomeCard: "faixa",
    campos: [
      { campo: "km_min", rotulo: "De quantos km", tipo: "numero" },
      { campo: "km_max", rotulo: "Até quantos km", tipo: "numero" },
      { campo: "preco_por_km", rotulo: "Preço de cada km", tipo: "dinheiro" },
      { campo: "preco_minimo", rotulo: "Valor mínimo", tipo: "dinheiro",
        dica: "Se a conta der menos que isto, cobra isto. Sem mínimo? Deixe 0." },
    ],
  },

  nao_transporto: {
    titulo: "O que eu não levo",
    sub: "Cargas que você recusa.",
    icone: "Ban",
    ajuda: "A recusa acontece ANTES de falar qualquer preço. Cotar e voltar atrás é pior, porque o cliente já se apegou ao valor.",
    nomeCard: "item",
    campos: [
      { campo: "termo", rotulo: "O que é", tipo: "texto",
        dica: "A palavra que o cliente usaria. Ex: animais vivos" },
      { campo: "motivo", rotulo: "Por que não leva", tipo: "texto",
        dica: "É isto que eu digo ao cliente ao recusar." },
    ],
  },

  precos_cidade: {
    titulo: "Preço dentro da cidade",
    sub: "Quando a retirada e a entrega são na mesma cidade.",
    icone: "Building2",
    ajuda: "O valor final soma tudo: o de partida, mais cada item, mais cada andar sem elevador.",
    nomeCard: "cidade",
    campos: [
      { campo: "cidade", rotulo: "Cidade", tipo: "texto" },
      { campo: "preco_base", rotulo: "Valor de partida", tipo: "dinheiro",
        dica: "Cobrado sempre, antes de somar o resto." },
      { campo: "preco_por_item", rotulo: "Preço de cada item", tipo: "dinheiro" },
      { campo: "preco_por_andar", rotulo: "Preço de cada andar", tipo: "dinheiro",
        dica: "Só conta quando o prédio NÃO tem elevador." },
    ],
  },

  caminhoes: {
    titulo: "Meus caminhões",
    sub: "Qual veículo dá conta de quantos itens.",
    icone: "Truck",
    ajuda: "Escolho sempre o menor caminhão que comporta a carga. Se nenhum comportar, eu não cobro por baixo: aviso que não dá.",
    nomeCard: "caminhão",
    campos: [
      { campo: "caminhao", rotulo: "Nome do caminhão", tipo: "texto",
        dica: "Como você chama ele. Ex: pequeno, baú, 3/4" },
      { campo: "max_itens", rotulo: "Cabe até quantos itens", tipo: "numero" },
      { campo: "observacao", rotulo: "Observação", tipo: "texto",
        dica: "Livre. Só para você lembrar de algo." },
    ],
  },

  /* Esta aba é a mais difícil de entender de fora, então é a que mais
   * explica. O Dário vai reformular o painel com o Jonas; até lá, ela
   * precisa se explicar sozinha. */
  fragilidade: {
    titulo: "Cobrança extra por carga delicada",
    sub: "Quando a mudança tem coisa que quebra fácil.",
    icone: "Wine",
    ajuda: "Cada linha é um nível de cuidado. Quando o cliente diz que tem louça, vidro, TV ou coisa parecida, eu somo esta cobrança no fim da conta. Se você não quer cobrar a mais por nada disso, deixe só uma linha com valor 0.",
    nomeCard: "nível",
    campos: [
      { campo: "nivel", rotulo: "Nome do nível", tipo: "texto",
        dica: "Como você chama esse grau de cuidado. Ex: baixa, media, alta" },
      { campo: "tipo", rotulo: "Cobrar como", tipo: "escolha",
        opcoes: [["percentual", "Porcentagem do total"], ["fixo", "Valor fixo em reais"]],
        dica: "Porcentagem sobe junto com o frete. Valor fixo é sempre o mesmo." },
      { campo: "valor", rotulo: "Quanto cobrar", tipo: "numero",
        dica: "Se escolheu porcentagem, escreva só o número: 10 quer dizer 10%. Se escolheu valor fixo, escreva em reais: 50,00" },
    ],
  },
};

export const CONTROLE = ["id", "ativo"];

export const PREFIXO_ID = {
  precos_cidade: "cid", precos_km: "km", caminhoes: "cam",
  fragilidade: "fra", nao_transporto: "nao",
};

