import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function Home({ onOpen }) {
  const [cats, setCats] = useState([])
  const [error, setError] = useState('')
  const load = async () => {
    const { data, error: loadError } = await supabase.from('categories').select('*, albums(count)').order('created_at')
    setCats(data || [])
    setError(loadError ? 'Could not load memories. Public read access may not be enabled yet.' : '')
  }
  useEffect(() => { load() }, [])
  return (
    <>
      <h2>Your memories</h2>
      <div className="grid">
        {cats.map(c => (
          <div key={c.id} className="tile" onClick={() => onOpen(c)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen(c)}>
            <span className="emoji">{c.icon}</span>
            <strong>{c.name}</strong>
            <span className="muted">{c.albums?.[0]?.count || 0} albums</span>
          </div>
        ))}
      </div>
      {error && <p className="note">{error}</p>}
      {!cats.length && !error && <p className="muted">No categories yet.</p>}
    </>
  )
}

function Category({ cat, onBack }) {
  const [albums, setAlbums] = useState([])
  const [error, setError] = useState('')
  const load = async () => {
    const { data, error: loadError } = await supabase.from('albums').select('*').eq('category_id', cat.id).order('created_at')
    setAlbums(data || [])
    setError(loadError ? 'Could not load albums. Public read access may not be enabled yet.' : '')
  }
  useEffect(() => { load() }, [cat.id])
  return (
    <>
      <button className="link" onClick={onBack}>Back to all memories</button>
      <h2>{cat.icon} {cat.name}</h2>
      <ul className="list">
        {albums.map(a => <li key={a.id}><span>{a.name}</span></li>)}
      </ul>
      {error && <p className="note">{error}</p>}
      {!albums.length && !error && <p className="muted">No albums yet.</p>}
    </>
  )
}

export default function App() {
  const [cat, setCat] = useState(null)
  if (!supabase) return (
    <main className="login">
      <h1>My Memories</h1>
      <p className="muted">Supabase is not configured for this deployment yet.</p>
    </main>
  )
  return (
    <div className="shell">
      <header>
        <strong className="brand">My Memories</strong>
      </header>
      <main>
        {cat ? <Category cat={cat} onBack={() => setCat(null)} /> : <Home onOpen={setCat} />}
      </main>
    </div>
  )
}
