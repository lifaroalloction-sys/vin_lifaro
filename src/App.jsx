import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function Login() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg('')
    const addr = email.trim().toLowerCase()
    const { data } = await supabase.rpc('email_allowed', { e: addr })
    if (!data) { setMsg('This email is not approved. Ask the admin to add it.'); setBusy(false); return }
    const emailRedirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
    const { error } = await supabase.auth.signInWithOtp({ email: addr, options: { emailRedirectTo } })
    setMsg(error ? error.message : 'Check your inbox for the sign-in link.'); setBusy(false)
  }
  return (
    <main className="login">
      <h1>My Memories</h1>
      <p className="muted">A private place for trips, family, and the moments that matter.</p>
      <form onSubmit={submit}>
        <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        <button className="primary" disabled={busy}>Send sign-in link</button>
      </form>
      {msg && <p className="note">{msg}</p>}
    </main>
  )
}

function AddForm({ placeholder, onAdd, withIcon }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📁')
  function go(e) { e.preventDefault(); if (!name.trim()) return; onAdd(name.trim(), icon); setName('') }
  return (
    <form className="add" onSubmit={go}>
      {withIcon && <input className="icon-in" value={icon} onChange={e => setIcon(e.target.value)} maxLength={4} aria-label="Icon" />}
      <input placeholder={placeholder} value={name} onChange={e => setName(e.target.value)} />
      <button className="primary">Add</button>
    </form>
  )
}

function Home({ isAdmin, onOpen }) {
  const [cats, setCats] = useState([])
  const load = async () => {
    const { data } = await supabase.from('categories').select('*, albums(count)').order('created_at')
    setCats(data || [])
  }
  useEffect(() => { load() }, [])
  async function add(name, icon) { await supabase.from('categories').insert({ name, icon }); load() }
  async function del(c) {
    if (!confirm(`Delete "${c.name}" and all its albums?`)) return
    await supabase.from('categories').delete().eq('id', c.id); load()
  }
  return (
    <>
      <h2>Your memories</h2>
      <div className="grid">
        {cats.map(c => (
          <div key={c.id} className="tile" onClick={() => onOpen(c)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen(c)}>
            <span className="emoji">{c.icon}</span>
            <strong>{c.name}</strong>
            <span className="muted">{c.albums?.[0]?.count || 0} albums</span>
            {isAdmin && <button className="x" aria-label={`Delete ${c.name}`} onClick={e => { e.stopPropagation(); del(c) }}>Delete</button>}
          </div>
        ))}
      </div>
      {isAdmin && <><h3>Add a category</h3><AddForm withIcon placeholder="Category name, e.g. Friends" onAdd={add} /></>}
      {!cats.length && <p className="muted">No categories yet.</p>}
    </>
  )
}

function Category({ cat, isAdmin, onBack }) {
  const [albums, setAlbums] = useState([])
  const load = async () => {
    const { data } = await supabase.from('albums').select('*').eq('category_id', cat.id).order('created_at')
    setAlbums(data || [])
  }
  useEffect(() => { load() }, [cat.id])
  async function add(name) { await supabase.from('albums').insert({ name, category_id: cat.id }); load() }
  async function del(a) {
    if (!confirm(`Delete album "${a.name}"?`)) return
    await supabase.from('albums').delete().eq('id', a.id); load()
  }
  return (
    <>
      <button className="link" onClick={onBack}>Back to all memories</button>
      <h2>{cat.icon} {cat.name}</h2>
      <ul className="list">
        {albums.map(a => (
          <li key={a.id}><span>{a.name}</span>{isAdmin && <button className="x" onClick={() => del(a)}>Delete</button>}</li>
        ))}
      </ul>
      {!albums.length && <p className="muted">No albums yet.{isAdmin ? ' Add your first one below.' : ''}</p>}
      {isAdmin && <><h3>Add an album</h3><AddForm placeholder="Album name, e.g. Goa" onAdd={add} /></>}
    </>
  )
}

function Viewers() {
  const [rows, setRows] = useState([])
  const load = async () => { const { data } = await supabase.from('viewers').select('email').order('email'); setRows(data || []) }
  useEffect(() => { load() }, [])
  async function add(email) { await supabase.from('viewers').insert({ email: email.toLowerCase() }); load() }
  async function del(email) { await supabase.from('viewers').delete().eq('email', email); load() }
  return (
    <>
      <h2>Who can view</h2>
      <p className="muted">Only these emails (plus you) can sign in.</p>
      <ul className="list">{rows.map(r => <li key={r.email}><span>{r.email}</span><button className="x" onClick={() => del(r.email)}>Remove</button></li>)}</ul>
      {!rows.length && <p className="muted">No viewers yet.</p>}
      <h3>Add a viewer</h3>
      <AddForm placeholder="friend@example.com" onAdd={add} />
    </>
  )
}

export default function App() {
  if (!supabase) return (
    <main className="login">
      <h1>My Memories</h1>
      <p className="muted">Supabase is not configured for this deployment yet.</p>
    </main>
  )
  return <ConfiguredApp />
}

function ConfiguredApp() {
  const [session, setSession] = useState(undefined)
  const [role, setRole] = useState(null)
  const [tab, setTab] = useState('memories')
  const [cat, setCat] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session) { setRole(null); return }
    Promise.all([supabase.rpc('is_admin'), supabase.rpc('is_member')]).then(([a, m]) =>
      setRole(a.data ? 'admin' : m.data ? 'viewer' : 'none'))
  }, [session])

  if (session === undefined) return <p className="center muted">Loading…</p>
  if (!session) return <Login />
  if (!role) return <p className="center muted">Checking access…</p>
  if (role === 'none') return (
    <main className="login"><h1>No access</h1><p className="muted">{session.user.email} is not on the approved list.</p>
      <button onClick={() => supabase.auth.signOut()}>Sign out</button></main>
  )
  const isAdmin = role === 'admin'
  return (
    <div className="shell">
      <header>
        <strong className="brand">My Memories</strong>
        <nav>
          <button className={tab === 'memories' ? 'on' : ''} onClick={() => { setTab('memories'); setCat(null) }}>Memories</button>
          {isAdmin && <button className={tab === 'viewers' ? 'on' : ''} onClick={() => setTab('viewers')}>Viewers</button>}
          <button onClick={() => supabase.auth.signOut()}>Sign out</button>
        </nav>
      </header>
      <main>
        {tab === 'viewers' && isAdmin ? <Viewers />
          : cat ? <Category cat={cat} isAdmin={isAdmin} onBack={() => setCat(null)} />
          : <Home isAdmin={isAdmin} onOpen={setCat} />}
      </main>
    </div>
  )
}
