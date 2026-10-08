import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../store.js';
import { tab as activeTab } from '../legacy/interface.js';
import TabBar from './TabBar.jsx';
import Album from './Album.jsx';

// Per ora React disegna solo alcune parti: il resto della pagina è ancora in index.html e nei moduli di src/legacy.
// Ogni parte già convertita viene agganciata al suo posto nella pagina con createPortal.
const albumRoot = document.getElementById('tab-album');

export default function App(){
  const tab = useGame(() => activeTab);
  const [dexStage, setDexStage] = useState('baby'); // resta quello scelto anche se cambi scheda

  return (
    <>
      <TabBar/>
      {tab === 'album' && createPortal(<Album stage={dexStage} onStage={setDexStage}/>, albumRoot)}
    </>
  );
}
