import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {mountGame} from './canvas.js';
import {createApi, jsonBody} from './api.js';
import './style.css';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const request = createApi(apiUrl);

function App() {
  const canvas = useRef(null);
  const game = useRef(null);
  const [state, setState] = useState(null);
  const [player, setPlayer] = useState('');
  const [scores, setScores] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    game.current = mountGame(canvas.current, setState);
    return () => { game.current.destroy(); game.current = null; };
  }, []);

  async function loadScores(signal) {
    setLoading(true);
    try {
      const rows = await request('/scores/', {signal});
      setScores(rows);
      setError('');
    } catch (error) {
      if (error.name !== 'AbortError') setError(error.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadScores(controller.signal);
    return () => controller.abort();
  }, []);

  async function save(event) {
    event.preventDefault();
    if (!state || state.status === 'playing' || saved || saving) return;
    setSaving(true);
    setError('');
    try {
      await request('/scores/', jsonBody('POST', {
        player,
        points: state.score,
        red_monsters_killed: state.redMonstersKilled,
        blue_monsters_killed: state.blueMonstersKilled,
        golden_apples: state.goldenApples,
      }));
      setSaved(true);
      await loadScores();
    } catch (error) { setError(`${error.message} Rechargez le classement avant de réessayer.`); }
    finally { setSaving(false); }
  }

  function restart() {
    setSaved(false);
    setError('');
    game.current.restart();
  }

  const finished = state && state.status !== 'playing';
  return <main>
    <p className="eyebrow">ECM · PROJET DE RÉFÉRENCE</p>
    <h1>Tatooine Fighter</h1>
    <p>Flèches pour bouger, espace pour tirer. Défoncez les clones.</p>
    <div className="game-layout"><section aria-label="Le jeu">
      <canvas ref={canvas} width="640" height="400" tabIndex="0" aria-label="Jeu de tir : flèches gauche et droite, espace pour tirer." />
      <div className="controls">
        {['left', 'fire', 'right'].map((key, i) => <button key={key}
          onPointerDown={event => {event.currentTarget.setPointerCapture(event.pointerId); game.current.setInput(key, true);}}
          onPointerUp={() => game.current.setInput(key, false)} onPointerCancel={() => game.current.setInput(key, false)}>
          {['← Gauche', 'Tirer', 'Droite →'][i]}</button>)}
        <button onClick={() => game.current.pause()}>Pause</button>
        <button onClick={() => game.current.resume()}>Reprendre</button>
        <button onClick={restart}>Rejouer</button>
      </div>
      <p className="hint">Percuter un clone met fin à la partie. Sautez par dessus les clones et tirez leur dessus pour atteindre le Faucon Millenium.</p>
      <p role="status">{finished ? `${state.status === 'won' ? 'Victoire' : 'Partie terminée'} : ${state.score} points · ${state.blueMonstersKilled} supertroopers tués · ${state.goldenApples} pommes trouvées · ${state.redArrowStock} super-flèches restantes.` : 'Partie en cours.'}</p>
      {finished && <form onSubmit={save}>
        <label htmlFor="player">Votre pseudo</label>
        <div className="input-row"><input id="player" maxLength={24} value={player} onChange={event => setPlayer(event.target.value)} disabled={saving || saved} required />
        <button disabled={!player.trim() || saving || saved}>{saved ? 'Score enregistré' : saving ? 'Enregistrement…' : 'Enregistrer mon score'}</button></div>
      </form>}
    </section><aside>
      <div className="list-heading"><h2>Top 10</h2><button className="secondary" disabled={saving || loading} onClick={() => loadScores()}>Recharger</button></div>
      {loading ? <p>Chargement…</p> : scores.length === 0 ? <p>Aucun score pour le moment.</p> : <table className="leaderboard">
        <thead><tr><th>Joueur</th><th>Supertroopers tués</th><th>Pommes</th><th>Points</th></tr></thead>
        <tbody>{scores.map(score => <tr key={score.id}><td>{score.player}</td><td>{score.blue_monsters_killed}</td><td>{score.golden_apples}</td><td><strong>{score.points}</strong></td></tr>)}</tbody>
      </table>}
      <p className="hint">Ce classement de démonstration accepte les scores déclarés par le client.</p>
    </aside></div>
    {error && <p role="alert" className="error">{error}</p>}
    <footer>Backend : <code>{apiUrl}</code></footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
