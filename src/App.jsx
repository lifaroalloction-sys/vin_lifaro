import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const STORAGE_BUCKET = 'memories'
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024
const ADMIN_EMAIL = 'lifaro.alloction@gmail.com'

async function removeAlbumFiles(albumIds) {
  if (!albumIds.length) return null
  const { data, error } = await supabase.from('media').select('storage_path').in('album_id', albumIds)
  if (error) return error
  const paths = data.map(item => item.storage_path)
  if (!paths.length) return null
  const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove(paths)
  return storageError
}

function AddForm({ placeholder, onAdd, withIcon }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📁')
  function submit(event) {
    event.preventDefault()
    if (!name.trim()) return
    onAdd(name.trim(), icon)
    setName('')
  }
  return (
    <form className="add" onSubmit={submit}>
      {withIcon && <input className="icon-in" value={icon} onChange={event => setIcon(event.target.value)} maxLength={4} aria-label="Category icon" />}
      <input required placeholder={placeholder} value={name} onChange={event => setName(event.target.value)} />
      <button className="primary">Add</button>
    </form>
  )
}

function useAdminSession() {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let active = true
    if (!session) {
      setIsAdmin(false)
      return () => { active = false }
    }
    supabase.rpc('is_admin').then(({ data }) => {
      if (active) setIsAdmin(data === true)
    })
    return () => { active = false }
  }, [session])

  async function signIn(event) {
    event.preventDefault()
    setAuthMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: adminPassword })
    if (error) {
      setAuthMessage(`Admin sign-in failed: ${error.message}`)
      return
    }
    const { data, error: roleError } = await supabase.rpc('is_admin')
    if (roleError || data !== true) {
      await supabase.auth.signOut()
      setAuthMessage('This account is not configured as the admin.')
      return
    }
    setAdminPassword('')
    setShowAdminLogin(false)
    setAuthMessage('')
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, isAdmin, authMessage, signIn, signOut, showAdminLogin, setShowAdminLogin, adminPassword, setAdminPassword }
}

function Home({ onOpen, isAdmin }) {
  const [cats, setCats] = useState([])
  const [error, setError] = useState('')
  const load = async () => {
    const { data, error: loadError } = await supabase.from('categories').select('*, albums(count)').order('created_at')
    setCats(data || [])
    setError(loadError ? 'Could not load memories. Public read access may not be enabled yet.' : '')
  }
  useEffect(() => { load() }, [])
  async function add(name, icon) {
    const { error: addError } = await supabase.from('categories').insert({ name, icon })
    if (addError) { setError(addError.message); return }
    await load()
  }
  async function remove(category) {
    if (!confirm(`Delete "${category.name}" and its albums?`)) return
    const { data: albums, error: albumsError } = await supabase.from('albums').select('id').eq('category_id', category.id)
    if (albumsError) { setError(albumsError.message); return }
    const mediaError = await removeAlbumFiles(albums.map(album => album.id))
    if (mediaError) { setError(mediaError.message); return }
    const { error: deleteError } = await supabase.from('categories').delete().eq('id', category.id)
    if (deleteError) { setError(deleteError.message); return }
    await load()
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
            {isAdmin && <button className="x" aria-label={`Delete ${c.name}`} onClick={event => { event.stopPropagation(); remove(c) }}>Delete</button>}
          </div>
        ))}
      </div>
      {isAdmin && <><h3>Add a category</h3><AddForm withIcon placeholder="Category name" onAdd={add} /></>}
      {error && <p className="note">{error}</p>}
      {!cats.length && !error && <p className="muted">No categories yet.</p>}
    </>
  )
}

function Category({ cat, onBack, isAdmin }) {
  const [albums, setAlbums] = useState([])
  const [error, setError] = useState('')
  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const load = async () => {
    const { data, error: loadError } = await supabase.from('albums').select('*').eq('category_id', cat.id).order('created_at')
    setAlbums(data || [])
    setError(loadError ? 'Could not load albums. Public read access may not be enabled yet.' : '')
  }
  useEffect(() => { load() }, [cat.id])
  async function add(name) {
    const { error: addError } = await supabase.from('albums').insert({ name, category_id: cat.id })
    if (addError) { setError(addError.message); return }
    await load()
  }
  async function remove(album) {
    if (!confirm(`Delete album "${album.name}" and its media?`)) return
    const mediaError = await removeAlbumFiles([album.id])
    if (mediaError) { setError(mediaError.message); return }
    const { error: deleteError } = await supabase.from('albums').delete().eq('id', album.id)
    if (deleteError) { setError(deleteError.message); return }
    if (selectedAlbum?.id === album.id) setSelectedAlbum(null)
    await load()
  }

  if (selectedAlbum) return <AlbumView album={selectedAlbum} isAdmin={isAdmin} onBack={() => setSelectedAlbum(null)} />

  return (
    <>
      <button className="link" onClick={onBack}>Back to all memories</button>
      <h2>{cat.icon} {cat.name}</h2>
      <div className="grid">
        {albums.map(album => (
          <div key={album.id} className="tile" onClick={() => setSelectedAlbum(album)} role="button" tabIndex={0} onKeyDown={event => event.key === 'Enter' && setSelectedAlbum(album)}>
            <strong>{album.name}</strong>
            {isAdmin && <button className="x" aria-label={`Delete ${album.name}`} onClick={event => { event.stopPropagation(); remove(album) }}>Delete</button>}
          </div>
        ))}
      </div>
      {isAdmin && <><h3>Add an album</h3><AddForm placeholder="Album name" onAdd={add} /></>}
      {error && <p className="note">{error}</p>}
      {!albums.length && !error && <p className="muted">No albums yet.</p>}
    </>
  )
}

function AlbumView({ album, onBack, isAdmin }) {
  const [media, setMedia] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data, error: loadError } = await supabase.from('media').select('*').eq('album_id', album.id).order('created_at', { ascending: false })
    setMedia(data || [])
    setError(loadError ? 'Media storage is not set up yet. Run supabase/media_uploads.sql in the project SQL Editor.' : '')
  }
  useEffect(() => { load() }, [album.id])

  async function upload(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    setBusy(true)
    setError('')
    for (const file of files) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        setError(`${file.name} is not an image or video.`)
        continue
      }
      if (file.size > MAX_UPLOAD_SIZE) {
        setError(`${file.name} is larger than the 50 MB limit.`)
        continue
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${album.id}/${crypto.randomUUID()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file, { contentType: file.type })
      if (uploadError) { setError(uploadError.message); continue }
      const { error: rowError } = await supabase.from('media').insert({
        album_id: album.id,
        file_name: file.name,
        storage_path: storagePath,
        media_type: file.type.startsWith('video/') ? 'video' : 'image',
        mime_type: file.type
      })
      if (rowError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
        setError(rowError.message)
      }
    }
    setBusy(false)
    await load()
  }

  async function remove(item) {
    if (!confirm(`Delete "${item.file_name}"?`)) return
    const { error: rowError } = await supabase.from('media').delete().eq('id', item.id)
    if (rowError) { setError(rowError.message); return }
    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([item.storage_path])
    if (storageError) setError(`Media record deleted, but its file could not be removed: ${storageError.message}`)
    await load()
  }

  return (
    <section>
      <button className="link" onClick={onBack}>Back to albums</button>
      <h2>{album.name}</h2>
      {isAdmin && <label className="upload-button primary">{busy ? 'Uploading…' : 'Upload photos or videos'}<input type="file" accept="image/*,video/*" multiple disabled={busy} onChange={upload} /></label>}
      {error && <p className="note">{error}</p>}
      {!media.length && !error && <p className="muted">No photos or videos yet.</p>}
      <div className="media-grid">
        {media.map(item => {
          const url = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(item.storage_path).data.publicUrl
          return (
            <figure className="media-item" key={item.id}>
              {item.media_type === 'video' ? <video src={url} controls preload="metadata" /> : <img src={url} alt={item.file_name} loading="lazy" />}
              <figcaption>{item.file_name}{isAdmin && <button className="x" onClick={() => remove(item)}>Delete</button>}</figcaption>
            </figure>
          )
        })}
      </div>
    </section>
  )
}

export default function App() {
  const [cat, setCat] = useState(null)
  const { session, isAdmin, authMessage, signIn, signOut, showAdminLogin, setShowAdminLogin, adminPassword, setAdminPassword } = useAdminSession()
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
        <nav>{isAdmin ? <button onClick={signOut}>Admin sign out</button> : <button onClick={() => setShowAdminLogin(open => !open)}>Admin sign in</button>}</nav>
      </header>
      {showAdminLogin && !isAdmin && (
        <form className="admin-login" onSubmit={signIn}>
          <input type="email" value={ADMIN_EMAIL} readOnly aria-label="Admin email" />
          <input type="password" value={adminPassword} onChange={event => setAdminPassword(event.target.value)} placeholder="Admin password" autoComplete="current-password" required />
          <button className="primary">Sign in</button>
        </form>
      )}
      {authMessage && <p className="note">{authMessage}</p>}
      {session && !isAdmin && <p className="muted">Browsing publicly. Only the configured admin can make changes.</p>}
      <main>
        {cat ? <Category cat={cat} onBack={() => setCat(null)} isAdmin={isAdmin} /> : <Home onOpen={setCat} isAdmin={isAdmin} />}
      </main>
    </div>
  )
}
