# Blobbino

Il tuo blob virtuale da nutrire, coccolare e far crescere. È una web app: si installa sull'iPhone dalla schermata Home, si apre a tutto schermo e funziona anche offline.

## Metterla online con GitHub Pages

1. Su github.com crea un nuovo repository pubblico chiamato `blobbino`.
2. Nella pagina del repository tocca **Add file → Upload files** e trascina tutti i file di questa cartella (anche `.nojekyll`). Poi **Commit changes**.
3. Vai in **Settings → Pages**. In "Build and deployment" scegli **Deploy from a branch**, branch `main`, cartella `/ (root)`, e salva.
4. Dopo un paio di minuti l'app è su `https://<tuo-utente>.github.io/blobbino/`.

## Installarla sull'iPhone

1. Apri il link con **Safari** (con altri browser non si installa a tutto schermo).
2. Tocca il pulsante **Condividi** (il quadrato con la freccia in su).
3. Scegli **Aggiungi alla schermata Home**, poi **Aggiungi**.
4. Apri Blobbino dall'icona sulla Home.

## Da sapere

- Il blob è salvato solo sull'iPhone su cui lo installi. Non è collegato alla versione che hai provato dentro Claude.
- Se elimini l'icona dalla Home, cancelli anche il blob.
- Il tempo scorre anche ad app chiusa: quando la riapri, i bisogni vengono ricalcolati.

## Aggiornare l'app

Carica i file nuovi nel repository e cambia `VERSION` in `sw.js` (per esempio `blobbino-v2`). L'app si aggiorna da sola alla prima apertura con internet.

