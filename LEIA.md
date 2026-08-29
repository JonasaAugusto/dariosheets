# Cópia do site `dariosheets`

Este diretório é **espelho** do repositório
[`JonasaAugusto/dariosheets`](https://github.com/JonasaAugusto/dariosheets),
que é onde o GitHub Pages publica.

## Publicar

O site agora tem build (Vite + Svelte), então o `dist/` **não é versionado** —
quem constrói é o GitHub Actions, no push para a `main`.

```bash
cd site-precos
git init && git branch -M main
git remote add origin https://github.com/JonasaAugusto/dariosheets.git
git add -A && git commit -m "feat: interface nova, sem emoji e com build"
git push -u origin main
```

Depois, em **Settings → Pages → Source**, escolher **GitHub Actions** (não
"Deploy from a branch" — o que vai pro ar é o `dist/`, que não existe no repo).

## Mexer nele aqui

```bash
npm install
npm run dev      # abre na rede local, dá pra ver no celular
npm run build
```
