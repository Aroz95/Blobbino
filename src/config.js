// Chiavi di salvataggio sul dispositivo. Il prefisso lo sceglie la build (.env, .env.staging):
// la versione di prova vive sullo stesso dominio di quella vera, quindi non deve mai usarne le chiavi.
const P = import.meta.env.VITE_STORAGE_PREFIX;

export const SAVE_KEY = `${P}-v1`;
export const BACKUP_KEY = `${P}-bak`;
export const SOUND_KEY = `${P}-sound`;
