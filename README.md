# Preços do Frete

Interface de celular para editar a planilha de regras do robô **Dário**.

O robô lê a mesma planilha. Mudou um preço aqui, vale no próximo orçamento —
sem reiniciar nada, sem avisar ninguém.

## Por que existe

A planilha crua do Google Sheets funciona, mas no celular obriga a rolar de
lado, tem alvo de toque de 21px e mostra `por_andar` cortado no meio. Quem edita
é o Dário, num Samsung linha A, em pé, às vezes no sol. Este site é a mesma
planilha com uma cara que se pode usar com uma mão só.

## Segurança

**Não existe chave privada neste site.** Nem no HTML, nem no JavaScript, nem
escondida em lugar nenhum. Se todo este repositório vazar, ninguém consegue nada
com ele.

O acesso funciona assim: o site pede um token ao Google, o Dário autoriza com a
conta dele, e o token vale cerca de uma hora. Quem decide o que ele pode ver é o
compartilhamento da própria planilha.

O `CLIENT_ID` em `config.js` **não é segredo** — ele aparece na URL de login por
natureza e sozinho não dá acesso a nada.

A alternativa seria guardar a chave da service account aqui. Aí qualquer um que
abrisse "ver código-fonte" passaria a escrever na planilha. Por isso não se faz.

### Recomendação de menor privilégio

O OAuth do Google não tem escopo de "uma planilha só" — um token com escopo
`spreadsheets` alcança todas as planilhas da conta que logar.

Por isso: use uma **conta Google dedicada** para o Dário e compartilhe só esta
planilha com ela. Assim, mesmo no pior caso, o token não alcança nada além do
que já era para alcançar.

## Configurar (uma vez)

Falta só o `CLIENT_ID`. Passo a passo:

1. Abra o [Google Cloud Console](https://console.cloud.google.com/) no projeto
   **dario-frete**.
2. **APIs e serviços → Biblioteca** → ative a **Google Sheets API**.
3. **APIs e serviços → Tela de permissão OAuth**:
   - Se `o dominio da empresa` for Google Workspace, escolha **Interno** — assim o
     Dário **não** vê o aviso de "app não verificado".
   - Se não for, escolha **Externo**, deixe em modo de teste e adicione a conta
     do Dário em *Usuários de teste*. Ele verá o aviso amarelo **uma vez**:
     toque em *Avançado → Ir para o site*. Depois disso não aparece mais.
4. **Credenciais → Criar credenciais → ID do cliente OAuth → Aplicativo da Web**.
5. Em **Origens JavaScript autorizadas**, adicione exatamente:
   ```
   https://jonasaaugusto.github.io
   ```
6. Copie o ID gerado e cole em `config.js`, no lugar de `COLE_O_CLIENT_ID_AQUI`.
7. Commit e push. O GitHub Pages publica sozinho em ~1 minuto.

## Instalar no celular

Abra o site no Chrome → menu (⋮) → **Adicionar à tela inicial**. Fica com ícone
próprio e abre sem barra de navegador, igual aplicativo.

## Estrutura

```
index.html               casca; o Google Identity carrega aqui
src/main.js              monta o app
src/App.svelte           estado, edição e salvamento
src/componentes/         Entrada, Abas, Card, Campo, Aviso
src/lib/config.js        CLIENT_ID e ID da planilha  <-- o único a editar
src/lib/sheets.js        OAuth e Sheets (extraído do app.js antigo, intacto)
src/lib/abas.js          as abas como o Dário as vê
src/lib/planilha.js      id, formato de dinheiro, o que conta como alteração
src/lib/tokens.css       cor, espaçamento, tipografia, alvo de toque
public/                  manifest e ícone
.github/workflows/       build e deploy no Pages
```

Stack: **Vite + Svelte 5 + Lucide**. Svelte pelo runtime pequeno, que importa
num aparelho de entrada: o bundle inteiro dá 26 kB comprimido.

## O redesenho de 28/08/2026

**Zero emoji.** Emoji tem desenho diferente em cada aparelho, muda de tamanho
junto com a fonte e não aceita cor. Nunca foi ícone, só parecia. Todos viraram
Lucide, inclusive o favicon e o ícone de instalar.

**A paleta.** O dourado escuro existia por um motivo certo — o Dário usa isto
em pé, no sol, e dourado claro com cinza some. A conclusão estava certa; a
solução, não: cor saturada em área grande cansa. Agora é fundo claro com texto
quase preto (15:1 de contraste) e a cor reservada para o que precisa ser achado
com o olho.

**O que NÃO mudou**, porque foi decidido por motivo real: card por regra em vez
de tabela, alvo de toque de 48px, fonte 18px, salvar sozinho 1,2s após a última
tecla, e o `−`/`+` para ajustar preço sem abrir o teclado.

**A camada de OAuth e Sheets não foi reescrita.** Ela funciona e está auditada;
virou `src/lib/sheets.js` como estava. Trocar as duas coisas de uma vez seria
não saber qual quebrou.

## Decisões que parecem detalhe e não são

- **Card por regra, não tabela.** Tabela em tela estreita obriga a rolar de
  lado. Foi exatamente o que reprovou a planilha crua.
- **Botões − e + nos números.** Ajustar um preço sem abrir o teclado é a
  diferença entre corrigir na hora e deixar para depois.
- **Alvo de toque de 48px.** É a medida do dedo. O padrão do Sheets é 21px, e
  errar a linha ao tocar significa editar o preço errado sem perceber.
- **Dourado escuro com texto branco.** Dourado claro com cinza fica bonito no
  monitor e some no celular sob luz do dia.
- **Salva sozinho, 1,2s após a última tecla.** Sem botão "salvar" para esquecer
  de apertar — mas com aviso na tela dizendo que salvou.
- **Renovação de token em silêncio.** Se ele já tem sessão do Google no celular,
  o token é renovado sem aparecer nada.
