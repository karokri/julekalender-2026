# 🎄 Karolines julekalender 2026

En julekalender for venner og familie. Hver dag i desember åpnes en luke med quiz, gåte, dingbat, utfordring eller overraskelse. Alle konkurrerer på en felles poengtavle.

Arkitekturen kommer fra Hippo-julekalenderen, og lagringen er den samme som i julebrustesten.

## Innlogging

1. **Fellespassordet** (`APP_PASSWORD`) deler du ut til alle. Det låser opp appen og huskes på enheten.
2. Første gang skriver hver deltaker navnet sitt og **lager sitt eget passord**. Det lagres som en saltet PBKDF2-hash i deltakerens fil.
3. På en ny telefon, eller etter «Logg ut», skriver man navn og sitt eget passord. Da kan ingen andre svare i ditt navn.
4. Har noen glemt passordet, trykker du **Nytt passord** under Admin → Deltakere. Det neste passordet de logger inn med, blir det nye.

## Nissetunet

Øverst på siden ligger et snødekt tun med nisser og reinsdyr (Rudolf også). De går rundt, løper, går på skøyter på isen, kaster snøballer på hverandre og spiser pepperkaker du kaster ut ved å klikke i snøen. Klikker du på dem, kiler du dem. Av og til går nissene i luciatog med lys i håret, og den 13. desember skjer det mye oftere. Du kan også starte et luciatog med knappen. Logikken ligger i `src/ui/components/scene/sceneModel.ts` og er testet.

## Poeng

| | Poeng |
|---|---|
| Riktig svar (quiz, gåte, dingbat) | 2 |
| Svart samme dag som luken åpner | +1 |
| Fartsbonus for de tre første som svarer riktig samme dag | +3 / +2 / +1 |
| Utfordring | 🎯 på poengtavla, ingen poeng |

**Nissevenner:** I tillegg til quizen finnes en egen tavle, som i Hippo-kalenderen. Du får 1 poeng hver gang du kiler en nisse eller et reinsdyr, kaster en pepperkake eller starter et luciatog. Klikkene lagres samlet hvert 15. sekund, og når du bytter side eller lukker den.

Hver luke har bare ett forsøk. Eldre luker kan besvares senere, men gir da ikke bonus. Fritekstsvar rettes tolerant: store og små bokstaver, tegnsetting, mellomrom, «en/ei/et» og små skrivefeil spiller ingen rolle. Reglene ligger i `src/domain/scoring.ts` og `src/domain/answerMatching.ts`.

## Slik henger det sammen

- **Appen** (dette repoet) er Vite + React og deployes til GitHub Pages.
- **Innholdet** redigeres i admin og lagres i data-repoet. Fasiten er AES-kryptert med fellespassordet. `public/doors.json` er startinnholdet.
- **Svarene** ligger i et eget, privat data-repo (`julekalender-2026-data`), med én fil per deltaker i `participants/<navn>.json`. Siden alle bare skriver til sin egen fil, kolliderer ingen.
- **Familiepassordet** låser opp GitHub-tokenet som er kryptert inn i appen, og låser også opp fasiten.

## Oppsett (én gang)

1. **Lag data-repoet.** Opprett et **privat** repo `karokri/julekalender-2026-data` med en README, så `main` finnes.
2. **Lag token.** Gå til GitHub → Settings → Developer settings → Fine-grained tokens → Generate.
   - Repository access: *Only select repositories* → `julekalender-2026-data`
   - Permissions → Repository → **Contents: Read and write**
   - Utløpsdato: f.eks. 31. januar
3. **Publiser innholdet med det ekte passordet:**
   ```bash
   APP_PASSWORD=dittpassord npm run publish-doors
   ```
   Commit `public/doors.json`. (Fila som ligger i repoet nå er kryptert med «testmodus», og deployen stopper til dette er gjort.)
4. **Legg inn secrets** i dette repoet (Settings → Secrets and variables → Actions):
   - `DATA_TOKEN` = tokenet fra steg 2
   - `APP_PASSWORD` = familiepassordet
   - `VITE_ADMIN_CODE_HASH` = utdata fra `node scripts/hash-admin-code.mjs "hemmelig-adminkode"` (standardkoden er `nissefar`)
   - Valgfrie variabler: `TITLE` (navnet på kalenderen), `THEME` (standardbakgrunn: `granskog`, `laaverod` eller `nordlys`; hver deltaker kan selv bytte bakgrunn oppe i hjørnet) og `DATA_REPO` (hvis data-repoet heter noe annet enn `<dette-repoet>-data`)
5. **Skru på Pages** under Settings → Pages → Source: **GitHub Actions**.
6. Push til `main`, så ligger appen på `https://karokri.github.io/julekalender-2026/`.

## Endre innholdet

Gå til **Admin → Luker** (`#admin`). Der ligger alle 24 dagene, og du kan redigere, lage eller tømme en luke:

- **Type:** quiz, gåte, dingbat, utfordring eller overraskelse
- **Innhold:** tittel, spørsmål, tekst, lister (vitser, ingredienser …), bilde og «visste du at»
- **Quiz:** svaralternativer der du krysser av det riktige
- **Gåte og dingbat:** godkjente svar, ett per linje (små skrivefeil godtas uansett)
- **Forhåndsvisning** før du lagrer

Når du trykker **Lagre**, krypteres fasiten i nettleseren med fellespassordet. Lukene lagres som `doors.json` i det private data-repoet med en gang, uten commit eller deploy. Deltakerne ser endringen neste gang de åpner kalenderen. Har noen allerede svart på en luke, får du en advarsel: svarene deres blir ikke rettet på nytt. Bilder legges inn i fila og blir automatisk forminsket til maks ca. 150 kB.

`public/doors.json` er bare startinnholdet, og brukes til admin lagrer første gang. Etter det er det `doors.json` i data-repoet som gjelder. Vil du heller fylle ut alt i en fil, kan du fortsatt redigere `doors.source.json` og kjøre `APP_PASSWORD=… npm run publish-doors`. Det endrer bare startinnholdet.

## Admin

Lenken ligger nederst på siden (`#admin`). Der finner du:

- **Luker** – rediger lukene, og se hvor mange som har åpnet og svart riktig på hver
- **Deltakere** – fjern en deltaker sammen med alle svarene
- **Verktøy** – en tidsmaskin som simulerer en annen dato i din egen nettleser, så du kan teste luker før 1. desember

## Demo

```bash
npm run demo         # http://localhost:5173 – demomodus med kontrollpanel
npm run build:demo   # én selvstendig HTML-fil i dist-demo/index.html
```

Demomodus hopper over fellespassordet, og luciatoget kommer bare når du trykker på knappen. Demoen lagrer alt i nettleseren og starter 8. desember, og panelet nede til høyre lar deg:

- bytte dato (pil eller hurtigknapper, også 13. desember med luciatog)
- åpne dagens luke
- styre Nissetunet: luciatog, snøballkrig, pepperkakeregn, skøytetur og «kile alle»
- fylle poengtavla med seks demodeltakere
- nullstille demoen

## Utvikling

```bash
npm install
npm run dev        # testmodus: alt lagres i nettleseren, hvilket som helst passord
npm test
npm run lint
npm run build
```

Slik tester du mot ekte data lokalt:

```bash
DATA_TOKEN=github_pat_xxx APP_PASSWORD=hemmelig npm run encrypt-token > .env.local
echo "VITE_DATA_REPO=karokri/julekalender-2026-data" >> .env.local
npm run dev
```

## Arkitektur

Clean Architecture, der avhengighetene bare peker innover:

```
src/
├── domain/          Kalender, poeng (inkl. fartsbonus), tolerant retting, navn. Ingen React, ingen I/O.
├── application/     Porter (interfaces) og use cases: svar, kalender, poengtavle, deltakere, admin
├── infrastructure/  GitHub-lagring, nettleserlagring (testmodus), kryptering, doors.json, klokke
├── app/             Composition root (container.ts) og config
└── ui/              React: Root (passord), App, views, nisse og folkekunst
```

## Sikkerhet

Dette er laget for en familiekalender, ikke for hemmeligheter. Den som har passordet og åpner DevTools, kan i prinsippet grave fram fasiten. Tokenet gir bare tilgang til data-repoet. Velg et passord som ikke er helt åpenbart, og la tokenet utløpe etter jul.
