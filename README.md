# Blobbino

Il tuo blob virtuale da nutrire, coccolare e far crescere. È una web app: si installa sull'iPhone dalla schermata Home, si apre a tutto schermo e funziona anche offline.

## Sviluppo

Serve [Node.js](https://nodejs.org/) (versione 20 o più recente).

```sh
npm install            # la prima volta
npm run dev            # app in locale su http://localhost:5173, si ricarica a ogni modifica
npm run build          # build della versione vera in dist/
npm run build:staging  # build della versione di prova in dist/
npm run preview        # apre la build di dist/ come sarà online
```

Com'è organizzato il codice:

- `src/main.jsx`: avvio dell'app (prima il gioco con `boot.js`, poi React)
- `src/boot.js`: avvio del gioco (collega pulsanti ed eventi, carica il salvataggio, fa partire l'animazione)
- `src/game/`: dati e regole (blob, catalogo, stato, evoluzione, casa, salvataggi, testi, amicizia, desideri)
- `src/room/`: la cameretta (scena, tocchi, cibo, sorprese, comportamento del blob, fisica, ospiti, canestro, animazione)
- `src/draw/`: il disegno di blob, accessori e mobili
- `src/walk/`: la passeggiata
- `src/places/`: la vista della casa e la Valle dei Blob
- `src/minigames.js`: i minigiochi
- `src/ui/`: le parti già convertite in componenti React (`App`, `TabBar`, `Album`)
- `src/store.js`: il ponte tra il gioco e React (`useGame`)
- `src/legacy/`: le parti dell'interfaccia non ancora convertite in React (finestre, negozio, pulsanti, codici, trasferimento)
- `index.html`: la struttura delle parti non ancora convertite
- `src/styles/app.css`: lo stile
- `src/config.js`: le chiavi di salvataggio
- `pwa/`: il manifest e il service worker (versione ed elenco dei file li aggiunge la build)
- `public/`: le icone

Due regole per i moduli:

- **Al caricamento un modulo definisce soltanto** funzioni e dati. Quello che deve partire all'avvio (collegare un pulsante, un evento…) va nella sua funzione `init…()`, che `boot.js` chiama quando tutti i moduli sono pronti.
- **Una variabile di un altro modulo si legge ma non si riassegna**: JavaScript non lo permette. Per cambiarla si usa la funzione `set…()` che il modulo proprietario mette in fondo al file (per esempio `setWorld(...)`).

## Versione vera e versione di prova

Le due versioni stanno sullo stesso dominio (`aroz95.github.io`), quindi nello stesso browser condividono la memoria. Per questo usano chiavi di salvataggio diverse:

| | Repository | Chiavi | Nome sulla Home |
|---|---|---|---|
| Vera | `Aroz95/Blobbino` | `blobbino-*` (`.env`) | Blobbino |
| Prova | qualunque altro | `blobbino-react-*` (`.env.staging`) | Blobbino β |

Le sceglie da sola la GitHub Action in base al nome del repository: la versione di prova non può toccare i blob veri. Per provarla con il tuo blob, usa **Trasferisci** nella versione vera e importa il codice in quella di prova: lavori su una copia.

**Non cambiare mai `VITE_STORAGE_PREFIX` in `.env`:** i blob salvati non verrebbero più trovati.

## Metterla online con GitHub Pages

1. In **Settings → Pages**, alla voce "Build and deployment", scegli come Source **GitHub Actions**.
2. Fai push sul branch `main`: la GitHub Action costruisce l'app e la pubblica da sola.
3. Dopo un paio di minuti l'app è su `https://<tuo-utente>.github.io/<nome-repository>/`.

L'app installata si aggiorna da sola alla prima apertura con internet. Non c'è più nessuna versione da cambiare a mano in `sw.js`.

## Passare la nuova versione sul repository principale

Da fare quando la versione di prova è stata testata:

1. Su `Aroz95/Blobbino`, in **Settings → Pages**, cambia la Source in **GitHub Actions** *prima* del push. Altrimenti GitHub pubblica i file sorgente e l'app non parte.
2. Aumenta `APP_VERSION` in `src/legacy/app.js` e il numero in "Versione …" in `index.html`. Alla prima apertura dopo l'aggiornamento l'app fa da sola una copia di sicurezza del salvataggio.
3. Fai merge su `main` e push.

## Installarla sull'iPhone

1. Apri il link con **Safari** (con altri browser non si installa a tutto schermo).
2. Tocca il pulsante **Condividi** (il quadrato con la freccia in su).
3. Scegli **Aggiungi alla schermata Home**, poi **Aggiungi**.
4. Apri Blobbino dall'icona sulla Home.

## Da sapere

- Il blob è salvato solo sull'iPhone su cui lo installi. Non è collegato alla versione che hai provato dentro Claude.
- Se elimini l'icona dalla Home, cancelli anche il blob.
- Il tempo scorre anche ad app chiusa: quando la riapri, i bisogni vengono ricalcolati.
