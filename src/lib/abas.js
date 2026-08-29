/**
 * As abas da planilha, como o Dário as vê.
 *
 * ## Os nomes das colunas são CONTRATO
 *
 * O site grava a planilha inteira, cabeçalho incluído. Então o que estiver em
 * `campo` aqui é exatamente o que o robô vai procurar em
 * `dario/dominio/tabela.py`. Divergir não dá erro visível: a coluna vira
 * vazia, o preço sai zerado, e ninguém percebe até alguém reclamar da conta.
 *
 * `testes/test_site_e_robo_concordam.py` lê ESTE arquivo e falha se as duas
 * pontas se afastarem.
 *
 * ## Os dois tipos de aba
 *
 *   unico  uma regra só, formulário direto na tela (preço por km)
 *   lista  várias regras: formulário de adicionar + modal com as salvas
 *
 * O `lista` existe porque a tela ficava um paredão de cards. Agora ela mostra
 * o que você está fazendo AGORA, e o que já está salvo fica a um toque.
 */
export const ABAS = {
  /* Ordem pedida pelo Dário: cidade em segundo, "não levo" por último. */
  precos_km: {
    titulo: "Preço por quilômetro",
    sub: "Para cidade que você ainda não cadastrou.",
    icone: "Route",
    tipo: "unico",
    ajuda: "Quando a mudança sai de Juiz de Fora para uma cidade que não está na aba de viagens, eu cobro por quilômetro rodado. Se a cidade estiver lá, o preço de lá vale e este aqui nem é usado.",
    nomeCard: "km",
    campos: [
      { campo: "preco_por_km", rotulo: "Valor de cada km rodado", tipo: "dinheiro" },
      { campo: "preco_minimo", rotulo: "Valor mínimo da viagem", tipo: "dinheiro",
        dica: "Se a conta der menos que isto, cobro isto. Sem mínimo? Deixe zero." },
    ],
  },

  precos_cidade: {
    titulo: "Preço dentro da cidade",
    sub: "Quando a retirada e a entrega são na mesma cidade.",
    icone: "Building2",
    tipo: "lista",
    ajuda: "O valor final soma tudo: o de partida, mais cada item, mais cada andar sem elevador.",
    nomeCard: "cidade",
    resumo: ["cidade", "preco_base"],
    campos: [
      { campo: "cidade", rotulo: "Cidade", tipo: "texto" },
      { campo: "preco_base", rotulo: "Valor de partida", tipo: "dinheiro",
        dica: "Cobrado sempre, antes de somar o resto." },
      { campo: "preco_por_item", rotulo: "Preço de cada item", tipo: "dinheiro" },
      { campo: "preco_por_andar", rotulo: "Preço de cada andar", tipo: "dinheiro",
        dica: "Só conta quando o prédio NÃO tem elevador." },
    ],
  },

  precos_rota: {
    titulo: "Viagens para fora",
    sub: "O preço fechado de Juiz de Fora até cada cidade.",
    icone: "MapPin",
    tipo: "lista",
    ajuda: "Aqui é o preço que você já sabe de cor: Juiz de Fora até Belo Horizonte custa tanto. Vale mais que a conta por quilômetro, porque já tem pedágio, estrada e volta embutidos. Cidade que estiver aqui, eu coto na hora.",
    nomeCard: "viagem",
    resumo: ["destino", "preco"],
    campos: [
      { campo: "destino", rotulo: "Para qual cidade", tipo: "texto",
        dica: "Ex: Belo Horizonte. A saída é sempre de Juiz de Fora." },
      { campo: "preco", rotulo: "Quanto você cobra", tipo: "dinheiro" },
      { campo: "observacao", rotulo: "Observação", tipo: "texto",
        dica: "Livre. Só para você lembrar de algo." },
    ],
  },

  caminhoes: {
    titulo: "Meus caminhões",
    sub: "Qual veículo dá conta de quantos itens.",
    icone: "Truck",
    tipo: "lista",
    ajuda: "Escolho sempre o menor caminhão que comporta a carga. Se nenhum comportar, eu não cobro por baixo: aviso que não dá.",
    nomeCard: "caminhão",
    resumo: ["caminhao", "max_itens"],
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
    titulo: "Cobrança por carga delicada",
    sub: "Quando a mudança tem coisa que quebra fácil.",
    icone: "Wine",
    tipo: "lista",
    ajuda: "Cada linha é um nível de cuidado. Quando o cliente diz que tem louça, vidro, TV ou coisa parecida, eu somo esta cobrança no fim da conta. Se você não quer cobrar a mais por nada disso, deixe só uma linha com valor 0.",
    nomeCard: "nível",
    resumo: ["nivel", "valor"],
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

  nao_transporto: {
    titulo: "O que eu não levo",
    sub: "Cargas que você recusa.",
    icone: "Ban",
    tipo: "lista",
    ajuda: "A recusa acontece ANTES de falar qualquer preço. Cotar e voltar atrás é pior, porque o cliente já se apegou ao valor.",
    nomeCard: "item",
    resumo: ["termo", "motivo"],
    campos: [
      { campo: "termo", rotulo: "O que é", tipo: "texto",
        dica: "A palavra que o cliente usaria. Ex: animais vivos" },
      { campo: "motivo", rotulo: "Por que não leva", tipo: "texto",
        dica: "É isto que eu digo ao cliente ao recusar." },
    ],
  },
};

/* Colunas de controle: o app preenche as duas sozinho e NÃO as mostra.
 *
 * `id` é o que liga a regra ao histórico: apagar uma linha deslocaria todas
 * abaixo e duas edições ao mesmo tempo se atropelariam. `ativo` substitui
 * apagar: regra removida vira "nao" e fica no histórico.
 *
 * Um campo "id" na tela seria um convite para alguém editar e quebrar a
 * referência. */
export const CONTROLE = ["id", "ativo"];

export const PREFIXO_ID = {
  precos_cidade: "cid", precos_km: "km", precos_rota: "rot",
  caminhoes: "cam", fragilidade: "fra", nao_transporto: "nao",
};
