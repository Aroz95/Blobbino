import { useGame } from '../store.js';
import { state, unseenStickers } from '../game/state.js';
import { pickTab, tab as activeTab } from '../legacy/interface.js';

const TABS = [
  {id: 'casa', label: 'Casa', icon: 'M12 3.2 2.5 11h2.6v9.3h5.2v-5.6h3.4v5.6h5.2V11h2.6z'},
  {id: 'negozio', label: 'Negozio', icon: 'M6 7V6a6 6 0 0 1 12 0v1h3l-1.3 13.2A2 2 0 0 1 17.7 22H6.3a2 2 0 0 1-2-1.8L3 7zm2 0h8V6a4 4 0 0 0-8 0z'},
  {id: 'album', label: 'Album', icon: 'M4 3.5h11a3 3 0 0 1 3 3V21H7a3 3 0 0 1-3-3zm16 3h.5V21H19V6.5zM8 7.5v2h7v-2z'},
];

export default function TabBar(){
  const tab = useGame(() => activeTab);
  // pallino giallo: un desiderio da esaudire in casa, figurine nuove nell'album
  const wish = useGame(() => !!(state && state.wish));
  const newStickers = useGame(() => unseenStickers);
  const dot = {casa: wish, album: newStickers};

  return (
    <nav className="tabbar" role="tablist" aria-label="Sezioni">
      {TABS.map(t => (
        <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => pickTab(t.id)}>
          <svg viewBox="0 0 24 24"><path d={t.icon}/></svg>
          {t.label}
          {dot[t.id] && tab !== t.id && <span className="dot"/>}
        </button>
      ))}
    </nav>
  );
}
