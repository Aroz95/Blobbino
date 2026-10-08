// Ponte tra il codice di gioco e React.
// Il gioco modifica i suoi dati sul posto e, alla fine di ogni render(), chiama notify().
// I componenti leggono con useGame(selettore): si ridisegnano solo se il valore restituito cambia.
import { useSyncExternalStore } from 'react';

const listeners = new Set();

export function notify(){
  for (const l of listeners) l();
}

function subscribe(l){
  listeners.add(l);
  return () => listeners.delete(l);
}

// Il selettore deve restituire un valore semplice (stringa, numero, booleano):
// un oggetto nuovo a ogni chiamata farebbe ridisegnare il componente all'infinito.
export function useGame(select){
  return useSyncExternalStore(subscribe, select);
}
