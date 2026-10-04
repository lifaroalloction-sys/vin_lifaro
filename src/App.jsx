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
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
    })
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

  async function sendPasswordReset() {
    setAuthMessage('')
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
    const { error } = await supabase.auth.resetPasswordForEmail(ADMIN_EMAIL, { redirectTo })
    setAuthMessage(error ? error.message : 'Password reset email sent. Open the newest reset email to continue.')
  }

  return { session, isAdmin, authMessage, signIn, signOut, showAdminLogin, setShowAdminLogin, adminPassword, setAdminPassword, sendPasswordReset, passwordRecovery, setPasswordRecovery }
}

function PasswordRecovery({ onComplete }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    if (password.length < 8) { setMessage('Use at least 8 characters for your password.'); return }
    if (password !== confirmPassword) { setMessage('The passwords do not match.'); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) { setMessage(error.message); return }
    onComplete()
  }

  return (
    <main className="login">
      <h1>Set admin password</h1>
      <form onSubmit={submit}>
        <input type="password" autoComplete="new-password" minLength={8} required placeholder="New password" value={password} onChange={event => setPassword(event.target.value)} />
        <input type="password" autoComplete="new-password" minLength={8} required placeholder="Confirm new password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
        <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
      </form>
      {message && <p className="note">{message}</p>}
    </main>
  )
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
  const albumTotal = cats.reduce((total, category) => total + (category.albums?.[0]?.count || 0), 0)
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
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> THE LIFARO ARCHIVE <span className="eyebrow-rule" /> VOL. 01</p>
          <h1>Good days,<br /><em>kept close.</em></h1>
          <p className="hero-caption">Trips, family, celebrations, and all the in-between.</p>
        </div>
        <aside className="archive-stamp" aria-label={`${cats.length} collections in the archive`}>
          <span className="stamp-label">MEMORY INDEX</span>
          <strong>{String(cats.length).padStart(2, '0')}</strong>
          <span className="stamp-footer">COLLECTIONS <span>✳</span></span>
        </aside>
      </section>
      <div className="section-heading">
        <div><p className="eyebrow">SORTED BY FEELING</p><h2>Your memories</h2></div>
        <span className="section-count">{cats.length} collections <span>/</span> {albumTotal} albums</span>
      </div>
      <div className="grid">
        {cats.map((c, index) => (
          <div key={c.id} className="tile" onClick={() => onOpen(c)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen(c)}>
            <span className="tile-index">COLLECTION / {String(index + 1).padStart(2, '0')}</span>
            <span className="emoji" aria-hidden="true">{c.icon}</span>
            <strong className="tile-title">{c.name}</strong>
            <span className="tile-meta">{String(c.albums?.[0]?.count || 0).padStart(2, '0')} albums <span>↗</span></span>
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
      <div className="collection-heading">
        <span className="collection-icon" aria-hidden="true">{cat.icon}</span>
        <div><p className="eyebrow">COLLECTION</p><h1>{cat.name}</h1></div>
        <span className="section-count">{albums.length} albums</span>
      </div>
      <div className="grid">
        {albums.map((album, index) => (
          <div key={album.id} className="tile" onClick={() => setSelectedAlbum(album)} role="button" tabIndex={0} onKeyDown={event => event.key === 'Enter' && setSelectedAlbum(album)}>
            <span className="tile-index">ALBUM / {String(index + 1).padStart(2, '0')}</span>
            <strong className="tile-title">{album.name}</strong>
            <span className="tile-meta">OPEN ALBUM <span>↗</span></span>
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
      <div className="album-heading"><p className="eyebrow">INSIDE THE ALBUM</p><h1>{album.name}</h1></div>
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
  const { session, isAdmin, authMessage, signIn, signOut, showAdminLogin, setShowAdminLogin, adminPassword, setAdminPassword, sendPasswordReset, passwordRecovery, setPasswordRecovery } = useAdminSession()
  if (!supabase) return (
    <main className="login">
      <h1>My Memories</h1>
      <p className="muted">Supabase is not configured for this deployment yet.</p>
    </main>
  )
  if (passwordRecovery) return <PasswordRecovery onComplete={() => setPasswordRecovery(false)} />
  return (
    <div className="shell">
      <header>
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">M</span>
          <div><strong className="brand">My Memories</strong><span className="brand-caption">THE LIFARO ARCHIVE</span></div>
        </div>
        <nav><span className="view-status"><span className="status-dot" /> PUBLIC VIEW</span>{isAdmin ? <button className="admin-button" onClick={signOut}>Admin sign out <span>↗</span></button> : <button className="admin-button" onClick={() => setShowAdminLogin(open => !open)}>Admin sign in <span>↗</span></button>}</nav>
      </header>
      {showAdminLogin && !isAdmin && (
        <form className="admin-login" onSubmit={signIn}>
          <span className="admin-login-title">ADMIN ACCESS</span>
          <input type="email" value={ADMIN_EMAIL} readOnly aria-label="Admin email" />
          <input type="password" value={adminPassword} onChange={event => setAdminPassword(event.target.value)} placeholder="Admin password" autoComplete="current-password" required />
          <button className="primary">Sign in <span>↗</span></button>
          <button className="link" type="button" onClick={sendPasswordReset}>Reset password</button>
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
