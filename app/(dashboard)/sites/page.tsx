'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Block = {
  id: string
  type: 'hero' | 'text' | 'features' | 'cta' | 'contacts' | 'html'
  content: Record<string, string>
}

type Page = {
  id: string
  site_id: string
  name: string
  slug: string
  blocks: Block[]
}

type Site = {
  id: string
  name: string
  description: string
  status: 'draft' | 'published'
  pages: Page[]
  created_at: string
  yandex_metrika: string
  custom_head: string
  domain: string
  amo_subdomain: string
  amo_token: string
  amo_pipeline_id: string
  amo_status_id: string
  amo_enabled: boolean
}

const BLOCK_TEMPLATES: Record<string, { label: string; icon: string; defaultContent: Record<string, string> }> = {
  hero: { label: 'Заголовок (Hero)', icon: '🎯', defaultContent: { title: 'Заголовок сайта', subtitle: 'Описание вашего продукта', buttonText: 'Начать' } },
  text: { label: 'Текстовый блок', icon: '📝', defaultContent: { title: 'Заголовок раздела', text: 'Напишите ваш текст здесь...' } },
  features: { label: 'Преимущества', icon: '⭐', defaultContent: { title: 'Наши преимущества', feature1: 'Преимущество 1', feature2: 'Преимущество 2', feature3: 'Преимущество 3' } },
  cta: { label: 'Призыв к действию', icon: '🚀', defaultContent: { title: 'Готовы начать?', subtitle: 'Свяжитесь с нами', buttonText: 'Связаться' } },
  contacts: { label: 'Контакты', icon: '📞', defaultContent: { title: 'Контакты', phone: '+7 (999) 000-00-00', email: 'info@example.com', address: 'Ваш адрес' } },
  html: { label: 'Свой HTML код', icon: '💻', defaultContent: { code: '<div style="padding:40px;text-align:center;background:#1e293b;border-radius:8px;">\n  <h2 style="color:white;">Ваш HTML здесь</h2>\n</div>' } },
}

type View = 'list' | 'pages' | 'editor' | 'settings'

export default function SitesPage() {
  const supabase = createClient()
  const [sites, setSites] = useState<Site[]>([])
  const [view, setView] = useState<View>('list')
  const [activeSite, setActiveSite] = useState<Site | null>(null)
  const [activePage, setActivePage] = useState<Page | null>(null)
  const [showNewSite, setShowNewSite] = useState(false)
  const [showNewPage, setShowNewPage] = useState(false)
  const [newSiteName, setNewSiteName] = useState('')
  const [newSiteDesc, setNewSiteDesc] = useState('')
  const [newPageName, setNewPageName] = useState('')
  const [editingBlock, setEditingBlock] = useState<Block | null>(null)
  const [preview, setPreview] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [loading, setLoading] = useState(true)

  const showSaved = () => { setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000) }

  // Загружаем сайты из Supabase
  useEffect(() => {
    loadSites()
  }, [])

  const loadSites = async () => {
    setLoading(true)
    try {
      const { data: sitesData } = await supabase.from('sites').select('*').order('created_at', { ascending: false })
      if (!sitesData) { setLoading(false); return }

      const sitesWithPages = await Promise.all(sitesData.map(async (site) => {
        const { data: pages } = await supabase.from('pages').select('*').eq('site_id', site.id).order('created_at', { ascending: true })
        return { ...site, pages: pages || [] }
      }))

      setSites(sitesWithPages)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const createSite = async () => {
    if (!newSiteName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()

    const { data: site } = await supabase.from('sites').insert({
      name: newSiteName,
      description: newSiteDesc,
      status: 'draft',
      user_id: user?.id,
      yandex_metrika: '',
      custom_head: '',
      domain: '',
      amo_subdomain: '',
      amo_token: '',
      amo_pipeline_id: '',
      amo_status_id: '',
      amo_enabled: false,
    }).select().single()

    if (site) {
      const { data: page } = await supabase.from('pages').insert({
        site_id: site.id,
        name: 'Главная',
        slug: '/',
        blocks: [],
      }).select().single()

      const newSite = { ...site, pages: page ? [page] : [] }
      setSites([newSite, ...sites])
    }

    setNewSiteName(''); setNewSiteDesc(''); setShowNewSite(false)
  }

  const createPage = async () => {
    if (!activeSite || !newPageName.trim()) return
    const slug = '/' + newPageName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const { data: page } = await supabase.from('pages').insert({
      site_id: activeSite.id,
      name: newPageName,
      slug,
      blocks: [],
    }).select().single()

    if (page) {
      const updated = { ...activeSite, pages: [...activeSite.pages, page] }
      setActiveSite(updated)
      setSites(sites.map(s => s.id === updated.id ? updated : s))
    }

    setNewPageName(''); setShowNewPage(false)
  }

  const deletePage = async (pageId: string) => {
    if (!activeSite || activeSite.pages.length <= 1) return
    await supabase.from('pages').delete().eq('id', pageId)
    const updated = { ...activeSite, pages: activeSite.pages.filter(p => p.id !== pageId) }
    setActiveSite(updated)
    setSites(sites.map(s => s.id === updated.id ? updated : s))
  }

  const updateSiteSettings = async () => {
    if (!activeSite) return
    await supabase.from('sites').update({
      name: activeSite.name,
      description: activeSite.description,
      status: activeSite.status,
      domain: activeSite.domain,
      yandex_metrika: activeSite.yandex_metrika,
      custom_head: activeSite.custom_head,
      amo_subdomain: activeSite.amo_subdomain,
      amo_token: activeSite.amo_token,
      amo_pipeline_id: activeSite.amo_pipeline_id,
      amo_status_id: activeSite.amo_status_id,
      amo_enabled: activeSite.amo_enabled,
    }).eq('id', activeSite.id)

    setSites(sites.map(s => s.id === activeSite.id ? activeSite : s))
    showSaved()
  }

  const deleteSite = async (id: string) => {
    await supabase.from('pages').delete().eq('site_id', id)
    await supabase.from('sites').delete().eq('id', id)
    setSites(sites.filter(s => s.id !== id))
  }

  const addBlock = async (type: Block['type']) => {
    if (!activeSite || !activePage) return
    const block: Block = { id: Date.now().toString(), type, content: { ...BLOCK_TEMPLATES[type].defaultContent } }
    const updatedBlocks = [...activePage.blocks, block]
    await supabase.from('pages').update({ blocks: updatedBlocks }).eq('id', activePage.id)
    const updatedPage = { ...activePage, blocks: updatedBlocks }
    const updatedSite = { ...activeSite, pages: activeSite.pages.map(p => p.id === updatedPage.id ? updatedPage : p) }
    setActivePage(updatedPage)
    setActiveSite(updatedSite)
    setSites(sites.map(s => s.id === updatedSite.id ? updatedSite : s))
  }

  const deleteBlock = async (blockId: string) => {
    if (!activeSite || !activePage) return
    const updatedBlocks = activePage.blocks.filter(b => b.id !== blockId)
    await supabase.from('pages').update({ blocks: updatedBlocks }).eq('id', activePage.id)
    const updatedPage = { ...activePage, blocks: updatedBlocks }
    const updatedSite = { ...activeSite, pages: activeSite.pages.map(p => p.id === updatedPage.id ? updatedPage : p) }
    setActivePage(updatedPage)
    setActiveSite(updatedSite)
    setSites(sites.map(s => s.id === updatedSite.id ? updatedSite : s))
    setEditingBlock(null)
  }

  const updateBlock = async (blockId: string, field: string, value: string) => {
    if (!activeSite || !activePage) return
    const updatedBlocks = activePage.blocks.map(b => b.id === blockId ? { ...b, content: { ...b.content, [field]: value } } : b)
    await supabase.from('pages').update({ blocks: updatedBlocks }).eq('id', activePage.id)
    const updatedPage = { ...activePage, blocks: updatedBlocks }
    const updatedSite = { ...activeSite, pages: activeSite.pages.map(p => p.id === updatedPage.id ? updatedPage : p) }
    setActivePage(updatedPage)
    setActiveSite(updatedSite)
    setSites(sites.map(s => s.id === updatedSite.id ? updatedSite : s))
    if (editingBlock?.id === blockId) setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, [field]: value } })
  }

  const moveBlock = async (blockId: string, dir: 'up' | 'down') => {
    if (!activeSite || !activePage) return
    const blocks = [...activePage.blocks]
    const idx = blocks.findIndex(b => b.id === blockId)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === blocks.length - 1) return
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    [blocks[idx], blocks[swap]] = [blocks[swap], blocks[idx]]
    await supabase.from('pages').update({ blocks }).eq('id', activePage.id)
    const updatedPage = { ...activePage, blocks }
    const updatedSite = { ...activeSite, pages: activeSite.pages.map(p => p.id === updatedPage.id ? updatedPage : p) }
    setActivePage(updatedPage)
    setActiveSite(updatedSite)
    setSites(sites.map(s => s.id === updatedSite.id ? updatedSite : s))
  }

  const toggleStatus = async () => {
    if (!activeSite) return
    const newStatus = activeSite.status === 'draft' ? 'published' : 'draft'
    await supabase.from('sites').update({ status: newStatus }).eq('id', activeSite.id)
    const updated = { ...activeSite, status: newStatus as 'draft' | 'published' }
    setActiveSite(updated)
    setSites(sites.map(s => s.id === updated.id ? updated : s))
    showSaved()
  }

  const renderBlock = (block: Block) => {
    const c = block.content
    if (block.type === 'hero') return <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', padding: '60px 40px', textAlign: 'center', borderRadius: '8px' }}><h1 style={{ fontSize: '36px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>{c.title}</h1><p style={{ fontSize: '18px', color: '#bfdbfe', marginBottom: '24px' }}>{c.subtitle}</p><button style={{ background: 'white', color: '#1e3a8a', padding: '12px 28px', borderRadius: '6px', border: 'none', fontWeight: 'bold' }}>{c.buttonText}</button></div>
    if (block.type === 'text') return <div style={{ padding: '40px', background: '#1e293b', borderRadius: '8px' }}><h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '16px' }}>{c.title}</h2><p style={{ color: '#94a3b8', lineHeight: '1.7' }}>{c.text}</p></div>
    if (block.type === 'features') return <div style={{ padding: '40px', background: '#0f172a', borderRadius: '8px' }}><h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1f5f9', textAlign: 'center', marginBottom: '28px' }}>{c.title}</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>{[c.feature1, c.feature2, c.feature3].map((f, i) => <div key={i} style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '28px', marginBottom: '12px' }}>⭐</div><p style={{ color: '#e2e8f0' }}>{f}</p></div>)}</div></div>
    if (block.type === 'cta') return <div style={{ background: '#7c3aed', padding: '50px 40px', textAlign: 'center', borderRadius: '8px' }}><h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '12px' }}>{c.title}</h2><p style={{ color: '#ddd6fe', marginBottom: '24px' }}>{c.subtitle}</p><button style={{ background: 'white', color: '#7c3aed', padding: '12px 28px', borderRadius: '6px', border: 'none', fontWeight: 'bold' }}>{c.buttonText}</button></div>
    if (block.type === 'contacts') return <div style={{ padding: '40px', background: '#1e293b', borderRadius: '8px' }}><h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '20px' }}>{c.title}</h2><div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}><p style={{ color: '#94a3b8' }}>📞 {c.phone}</p><p style={{ color: '#94a3b8' }}>✉️ {c.email}</p><p style={{ color: '#94a3b8' }}>📍 {c.address}</p></div></div>
    if (block.type === 'html') return <div><div style={{ position: 'absolute', top: '8px', right: '8px', background: '#334155', color: '#94a3b8', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>💻 HTML</div><div dangerouslySetInnerHTML={{ __html: c.code }} /></div>
    return null
  }

  const btnStyle = (extra?: React.CSSProperties) => ({ padding: '9px 16px', background: '#3b82f6', border: 'none', borderRadius: '7px', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '13px', ...extra })

  // ===== LOADING =====
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '40px' }}>⏳</div>
      <p style={{ color: '#64748b' }}>Загружаем сайты...</p>
    </div>
  )

  // ===== СПИСОК САЙТОВ =====
  if (view === 'list') return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f1f5f9' }}>🌐 Сайты</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Создавайте и управляйте сайтами</p>
        </div>
        <button onClick={() => setShowNewSite(true)} style={btnStyle()}>+ Создать сайт</button>
      </div>

      {sites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌐</div>
          <h3 style={{ fontSize: '20px', color: '#94a3b8', marginBottom: '8px' }}>Нет сайтов</h3>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>Создайте первый сайт чтобы начать</p>
          <button onClick={() => setShowNewSite(true)} style={btnStyle()}>+ Создать сайт</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '20px' }}>
          {sites.map(s => (
            <div key={s.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
              <div onClick={() => { setActiveSite(s); setView('pages') }} style={{ height: '130px', background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', cursor: 'pointer' }}>🌐</div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9', marginBottom: '4px' }}>{s.name}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>{s.description || 'Без описания'}</p>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: s.status === 'published' ? '#064e3b' : '#0f172a', color: s.status === 'published' ? '#34d399' : '#94a3b8', border: '1px solid #334155' }}>
                  {s.status === 'published' ? '● Опубликован' : '○ Черновик'}
                </span>
                <span style={{ fontSize: '11px', color: '#475569' }}>{s.pages?.length || 0} стр.</span>
                {s.domain && <span style={{ fontSize: '11px', color: '#60a5fa' }}>🔗 {s.domain}</span>}
                {s.yandex_metrika && <span style={{ fontSize: '11px', color: '#f59e0b' }}>📊 Метрика</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setActiveSite(s); setView('pages') }} style={btnStyle({ flex: 1 })}>📄 Страницы</button>
                <button onClick={() => { setActiveSite({ ...s }); setView('settings') }} style={btnStyle({ background: '#334155', padding: '9px 12px' })}>⚙️</button>
                <button onClick={() => deleteSite(s.id)} style={{ padding: '9px 12px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '7px', color: '#fca5a5', cursor: 'pointer' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewSite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '32px', width: '440px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '24px' }}>Новый сайт</h2>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Название *</label>
            <input value={newSiteName} onChange={e => setNewSiteName(e.target.value)} placeholder="Например: Лендинг для кафе" style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '14px', marginBottom: '14px' }} />
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Описание</label>
            <input value={newSiteDesc} onChange={e => setNewSiteDesc(e.target.value)} placeholder="Краткое описание..." style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '14px', marginBottom: '24px' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={createSite} style={btnStyle({ flex: 1 })}>Создать</button>
              <button onClick={() => setShowNewSite(false)} style={btnStyle({ flex: 1, background: '#475569' })}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ===== СТРАНИЦЫ САЙТА =====
  if (view === 'pages' && activeSite) return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => setView('list')} style={btnStyle({ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8' })}>← Назад</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1f5f9' }}>📄 {activeSite.name}</h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>Страницы сайта</p>
        </div>
        <button onClick={() => setView('settings')} style={btnStyle({ background: '#334155' })}>⚙️ Настройки</button>
        <button onClick={() => setShowNewPage(true)} style={btnStyle()}>+ Добавить страницу</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px' }}>
        {activeSite.pages.map(page => (
          <div key={page.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f1f5f9', marginBottom: '4px' }}>{page.name}</h3>
                <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace', background: '#0f172a', padding: '2px 8px', borderRadius: '4px' }}>{page.slug}</span>
              </div>
              {activeSite.pages.length > 1 && (
                <button onClick={() => deletePage(page.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>{page.blocks?.length || 0} блоков</p>
            <button onClick={() => { setActivePage(page); setView('editor') }} style={btnStyle({ width: '100%' })}>✏️ Редактировать</button>
          </div>
        ))}
      </div>

      {showNewPage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '32px', width: '400px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '20px' }}>Новая страница</h2>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Название страницы *</label>
            <input value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Например: О нас" style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '14px', marginBottom: '8px' }} />
            {newPageName && <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>URL: /{newPageName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}</p>}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={createPage} style={btnStyle({ flex: 1 })}>Создать</button>
              <button onClick={() => setShowNewPage(false)} style={btnStyle({ flex: 1, background: '#475569' })}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ===== НАСТРОЙКИ САЙТА =====
  if (view === 'settings' && activeSite) return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => setView('pages')} style={btnStyle({ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8' })}>← Назад</button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1f5f9' }}>⚙️ Настройки сайта</h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>{activeSite.name}</p>
        </div>
      </div>

      {savedMsg && <div style={{ padding: '12px 16px', background: '#064e3b', border: '1px solid #065f46', borderRadius: '8px', color: '#34d399', marginBottom: '20px', fontSize: '14px' }}>✅ Сохранено!</div>}

      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9', marginBottom: '16px' }}>📋 Основное</h2>
        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Название</label>
        <input value={activeSite.name} onChange={e => setActiveSite({ ...activeSite, name: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '14px', marginBottom: '14px' }} />
        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Описание</label>
        <input value={activeSite.description} onChange={e => setActiveSite({ ...activeSite, description: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '14px', marginBottom: '14px' }} />
        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Статус</label>
        <select value={activeSite.status} onChange={e => setActiveSite({ ...activeSite, status: e.target.value as 'draft' | 'published' })} style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '14px' }}>
          <option value="draft">○ Черновик</option>
          <option value="published">● Опубликован</option>
        </select>
      </div>

      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9', marginBottom: '6px' }}>🔗 Домен</h2>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Привяжите свой домен к этому сайту</p>
        <input value={activeSite.domain} onChange={e => setActiveSite({ ...activeSite, domain: e.target.value })} placeholder="example.com" style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '14px', marginBottom: '12px' }} />
        {activeSite.domain && (
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: '600' }}>📋 DNS записи:</p>
            <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '6px', marginBottom: '8px', display: 'flex', gap: '16px' }}>
              <span style={{ fontSize: '12px', color: '#60a5fa', width: '50px', fontWeight: '600' }}>A</span>
              <span style={{ fontSize: '12px', color: '#f1f5f9', width: '60px' }}>@</span>
              <span style={{ fontSize: '12px', color: '#34d399', fontFamily: 'monospace' }}>76.76.21.21</span>
            </div>
            <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: '6px', display: 'flex', gap: '16px' }}>
              <span style={{ fontSize: '12px', color: '#60a5fa', width: '50px', fontWeight: '600' }}>CNAME</span>
              <span style={{ fontSize: '12px', color: '#f1f5f9', width: '60px' }}>www</span>
              <span style={{ fontSize: '12px', color: '#34d399', fontFamily: 'monospace' }}>cname.vercel-dns.com</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9', marginBottom: '6px' }}>📊 Яндекс Метрика</h2>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Номер счётчика из кабинета Яндекс.Метрики</p>
        <input value={activeSite.yandex_metrika} onChange={e => setActiveSite({ ...activeSite, yandex_metrika: e.target.value })} placeholder="Например: 12345678" style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '14px' }} />
      </div>

      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9' }}>🔌 amoCRM</h2>
          <button onClick={() => setActiveSite({ ...activeSite, amo_enabled: !activeSite.amo_enabled })} style={{ padding: '5px 14px', background: activeSite.amo_enabled ? '#064e3b' : '#334155', border: 'none', borderRadius: '20px', color: activeSite.amo_enabled ? '#34d399' : '#94a3b8', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
            {activeSite.amo_enabled ? '● Включено' : '○ Выключено'}
          </button>
        </div>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Лиды с сайта будут автоматически отправляться в amoCRM</p>
        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Поддомен amoCRM</label>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
          <input value={activeSite.amo_subdomain} onChange={e => setActiveSite({ ...activeSite, amo_subdomain: e.target.value })} placeholder="yourcompany" style={{ flex: 1, padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px 0 0 6px', color: '#f1f5f9', fontSize: '14px', borderRight: 'none' }} />
          <span style={{ padding: '10px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '0 6px 6px 0', color: '#64748b', fontSize: '13px' }}>.amocrm.ru</span>
        </div>
        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>API токен</label>
        <input value={activeSite.amo_token} onChange={e => setActiveSite({ ...activeSite, amo_token: e.target.value })} placeholder="Долгосрочный токен" type="password" style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '14px', marginBottom: '14px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>ID воронки</label>
            <input value={activeSite.amo_pipeline_id} onChange={e => setActiveSite({ ...activeSite, amo_pipeline_id: e.target.value })} placeholder="123456" style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '14px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>ID статуса</label>
            <input value={activeSite.amo_status_id} onChange={e => setActiveSite({ ...activeSite, amo_status_id: e.target.value })} placeholder="142" style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '14px' }} />
          </div>
        </div>
        {activeSite.amo_subdomain && activeSite.amo_token && (
          <div style={{ padding: '10px 14px', background: '#064e3b', border: '1px solid #065f46', borderRadius: '8px' }}>
            <p style={{ fontSize: '13px', color: '#34d399' }}>✅ Интеграция настроена!</p>
          </div>
        )}
      </div>

      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9', marginBottom: '6px' }}>💻 Свой код в &lt;head&gt;</h2>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Пиксели, скрипты, стили</p>
        <textarea value={activeSite.custom_head} onChange={e => setActiveSite({ ...activeSite, custom_head: e.target.value })} placeholder={'<!-- Вставьте любой код -->'} rows={5} style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical' }} />
      </div>

      <button onClick={updateSiteSettings} style={{ width: '100%', padding: '14px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>
        💾 Сохранить настройки
      </button>
    </div>
  )

  // ===== РЕДАКТОР =====
  if (view === 'editor' && activeSite && activePage) return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', marginLeft: '-28px', marginTop: '-28px' }}>
      <div style={{ width: '260px', background: '#0f172a', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b' }}>
          <button onClick={() => setView('pages')} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '8px', display: 'block' }}>← К страницам</button>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{activeSite.name}</h2>
          <p style={{ fontSize: '12px', color: '#60a5fa' }}>{activePage.name} <span style={{ color: '#475569' }}>{activePage.slug}</span></p>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
          <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Страницы</p>
          {activeSite.pages.map(page => (
            <button key={page.id} onClick={() => setActivePage(page)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', background: activePage.id === page.id ? '#1e3a8a' : 'transparent', color: activePage.id === page.id ? 'white' : '#94a3b8', marginBottom: '2px' }}>
              📄 {page.name}
            </button>
          ))}
          <button onClick={() => setShowNewPage(true)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: '6px', border: '1px dashed #334155', cursor: 'pointer', fontSize: '12px', background: 'transparent', color: '#64748b', marginTop: '4px' }}>
            + Добавить страницу
          </button>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b' }}>
          <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Добавить блок</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {Object.entries(BLOCK_TEMPLATES).map(([type, tmpl]) => (
              <button key={type} onClick={() => addBlock(type as Block['type'])} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', cursor: 'pointer', fontSize: '12px', textAlign: 'left' }}>
                <span>{tmpl.icon}</span>{tmpl.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Блоки ({activePage.blocks?.length || 0})</p>
          {activePage.blocks?.map(block => (
            <div key={block.id} onClick={() => setEditingBlock(editingBlock?.id === block.id ? null : block)} style={{ padding: '7px 10px', background: editingBlock?.id === block.id ? '#1e3a8a' : '#1e293b', border: `1px solid ${editingBlock?.id === block.id ? '#3b82f6' : '#334155'}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#e2e8f0' }}>{BLOCK_TEMPLATES[block.type].icon} {BLOCK_TEMPLATES[block.type].label}</span>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button onClick={e => { e.stopPropagation(); moveBlock(block.id, 'up') }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '10px' }}>▲</button>
                <button onClick={e => { e.stopPropagation(); moveBlock(block.id, 'down') }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '10px' }}>▼</button>
                <button onClick={e => { e.stopPropagation(); deleteBlock(block.id) }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}>✕</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px', borderTop: '1px solid #1e293b' }}>
          {savedMsg && <p style={{ fontSize: '12px', color: '#34d399', textAlign: 'center', marginBottom: '6px' }}>✅ Сохранено!</p>}
          <button onClick={toggleStatus} style={{ width: '100%', padding: '9px', background: activeSite.status === 'published' ? '#064e3b' : '#1e3a8a', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
            {activeSite.status === 'published' ? '⏸ Снять' : '🚀 Опубликовать'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', overflow: 'hidden' }}>
        <div style={{ padding: '10px 20px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setPreview(false)} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', background: !preview ? '#3b82f6' : '#334155', color: 'white' }}>✏️ Редактор</button>
            <button onClick={() => setPreview(true)} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', background: preview ? '#3b82f6' : '#334155', color: 'white' }}>👁 Превью</button>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{activePage.blocks?.length || 0} блоков • сохраняется в БД ✅</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {!activePage.blocks?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🧩</div>
              <h3 style={{ fontSize: '18px', color: '#64748b', marginBottom: '8px' }}>Страница пуста</h3>
              <p style={{ fontSize: '14px' }}>Добавьте блоки из левой панели</p>
            </div>
          ) : (
            <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activePage.blocks.map(block => (
                <div key={block.id} onClick={() => !preview && setEditingBlock(editingBlock?.id === block.id ? null : block)} style={{ borderRadius: '8px', overflow: 'hidden', cursor: preview ? 'default' : 'pointer', border: `2px solid ${!preview && editingBlock?.id === block.id ? '#3b82f6' : 'transparent'}`, position: 'relative' }}>
                  {renderBlock(block)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editingBlock && !preview && (
        <div style={{ width: '280px', background: '#0f172a', borderLeft: '1px solid #1e293b', padding: '20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{BLOCK_TEMPLATES[editingBlock.type].icon} Настройки</h3>
            <button onClick={() => setEditingBlock(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(editingBlock.content).map(([field, value]) => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                  {field === 'title' ? 'Заголовок' : field === 'subtitle' ? 'Подзаголовок' : field === 'text' ? 'Текст' : field === 'buttonText' ? 'Текст кнопки' : field === 'phone' ? 'Телефон' : field === 'email' ? 'Email' : field === 'address' ? 'Адрес' : field === 'code' ? 'HTML код' : field}
                </label>
                {field === 'text' || field === 'code' ? (
                  <textarea value={value} onChange={e => updateBlock(editingBlock.id, field, e.target.value)} rows={field === 'code' ? 8 : 4} style={{ width: '100%', padding: '8px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: field === 'code' ? '12px' : '13px', resize: 'vertical', fontFamily: field === 'code' ? 'monospace' : 'inherit' }} />
                ) : (
                  <input value={value} onChange={e => updateBlock(editingBlock.id, field, e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', fontSize: '13px' }} />
                )}
              </div>
            ))}
          </div>
          <button onClick={() => deleteBlock(editingBlock.id)} style={{ marginTop: '24px', width: '100%', padding: '10px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '6px', color: '#fca5a5', cursor: 'pointer', fontSize: '13px' }}>🗑️ Удалить блок</button>
        </div>
      )}
    </div>
  )

  return null
}
