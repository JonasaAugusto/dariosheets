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
   - Se `metay.com.br` for Google Workspace, escolha **Interno** — assim o
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
index.html     telas e barra de abas
estilo.css     fonte 18px, alvo de toque 48px, paleta dourada
app.js         login, leitura e escrita na planilha
config.js      CLIENT_ID e ID da planilha  <-- o único arquivo a editar
manifest.json  ícone e nome ao instalar no celular
```

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
