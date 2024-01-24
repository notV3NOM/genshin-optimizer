Forked from https://github.com/frzyc/genshin-optimizer

Dev Setup :

```bash
git clone --recursive https://github.com/notV3NOM/genshin-optimizer.git
yarn
npx nx serve frontend
```

Tests :

```bash
npx nx run frontend:test
```

Lint :

```bash
npx nx format write
```

Production Build :

```bash
npx nx run frontend:build-webpack:production
```

Changelog :

- Hide lesser used pages
- Dark Mode
- Additional sort on generated builds by any target
