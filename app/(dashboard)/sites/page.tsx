'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type BlockType = 'hero' | 'text' | 'features' | 'cta' | 'contacts' | 'html' | 'gallery' | 'form' | 'reviews' | 'video' | 'pricing' | 'stats' | 'faq' | 'team'| 'quiz'

type Block = {
  id: string
  type: BlockType
  variant: number
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

const BLOCKS: Record<BlockType, { label: string; icon: string; variants: string[]; defaultContent: Record<string, string> }> = {
  hero: {
    label: 'Заголовок (Hero)', icon: '🎯',
    variants: ['Центр с градиентом', 'Тёмный с картинкой', 'Светлый минимализм'],
    defaultContent: { title: 'Заголовок сайта', subtitle: 'Описание вашего продукта или услуги', buttonText: 'Начать', buttonUrl: '#', bgColor: '#1e3a8a' }
  },
  text: {
    label: 'Текст', icon: '📝',
    variants: ['Обычный текст', 'Текст с иконкой', 'Цитата'],
    defaultContent: { title: 'Заголовок раздела', text: 'Напишите ваш текст здесь. Расскажите о вашем продукте или услуге подробнее.' }
  },
  features: {
    label: 'Преимущества', icon: '⭐',
    variants: ['3 колонки', '2 колонки с иконками', 'Список с галочками'],
    defaultContent: { title: 'Наши преимущества', f1: 'Преимущество 1', d1: 'Описание первого преимущества вашей компании', f2: 'Преимущество 2', d2: 'Описание второго преимущества вашей компании', f3: 'Преимущество 3', d3: 'Описание третьего преимущества вашей компании', f4: 'Преимущество 4', d4: 'Описание четвёртого преимущества', icon1: '✅', icon2: '🚀', icon3: '💡', icon4: '🎯' }
  },
  cta: {
    label: 'Призыв к действию', icon: '🚀',
    variants: ['Фиолетовый', 'Тёмный', 'С фоном'],
    defaultContent: { title: 'Готовы начать?', subtitle: 'Свяжитесь с нами сегодня и получите бесплатную консультацию', buttonText: 'Получить консультацию', buttonUrl: '#' }
  },
  contacts: {
    label: 'Контакты', icon: '📞',
    variants: ['Простой список', '3 карточки', 'С картой'],
    defaultContent: { title: 'Свяжитесь с нами', phone: '+7 (999) 000-00-00', email: 'info@example.com', address: 'г. Москва, ул. Примерная, д. 1', workTime: 'Пн-Пт: 9:00 - 18:00' }
  },
  gallery: {
    label: 'Галерея', icon: '🖼️',
    variants: ['Сетка 3 колонки', 'Сетка 2 колонки', 'Горизонтальная лента'],
    defaultContent: { title: 'Наши работы', img1: 'https://picsum.photos/400/300?random=1', img2: 'https://picsum.photos/400/300?random=2', img3: 'https://picsum.photos/400/300?random=3', img4: 'https://picsum.photos/400/300?random=4', img5: 'https://picsum.photos/400/300?random=5', img6: 'https://picsum.photos/400/300?random=6' }
  },
  form: {
    label: 'Форма заявки', icon: '📋',
    variants: ['Простая форма', 'Форма с фоном', 'Компактная'],
    defaultContent: { title: 'Оставьте заявку', subtitle: 'Мы свяжемся с вами в течение 30 минут', buttonText: 'Отправить заявку', namePlaceholder: 'Ваше имя', phonePlaceholder: 'Ваш телефон', messagePlaceholder: 'Ваш вопрос (необязательно)' }
  },
  reviews: {
    label: 'Отзывы', icon: '💬',
    variants: ['Карточки', 'Цитаты', 'Список'],
    defaultContent: { title: 'Отзывы клиентов', name1: 'Иван Иванов', text1: 'Отличный сервис! Очень доволен результатом работы. Рекомендую всем!', rating1: '5', name2: 'Мария Петрова', text2: 'Профессиональный подход, быстро и качественно выполнили работу.', rating2: '5', name3: 'Алексей Сидоров', text3: 'Обращался несколько раз, всегда остаюсь доволен. Спасибо!', rating3: '5' }
  },
  video: {
    label: 'Видео', icon: '🎥',
    variants: ['По центру', 'С текстом справа', 'Полная ширина'],
    defaultContent: { title: 'Посмотрите наше видео', subtitle: 'Узнайте больше о нашей компании', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
  },
  pricing: {
    label: 'Цены/Тарифы', icon: '💰',
    variants: ['3 тарифа', '2 тарифа', 'Таблица цен'],
    defaultContent: { title: 'Наши тарифы', p1name: 'Базовый', p1price: '1 000', p1period: 'мес', p1f1: 'Функция 1', p1f2: 'Функция 2', p1f3: 'Функция 3', p1btn: 'Выбрать', p2name: 'Стандарт', p2price: '3 000', p2period: 'мес', p2f1: 'Всё из Базового', p2f2: 'Функция 4', p2f3: 'Функция 5', p2f4: 'Функция 6', p2btn: 'Выбрать', p2popular: 'true', p3name: 'Премиум', p3price: '7 000', p3period: 'мес', p3f1: 'Всё из Стандарта', p3f2: 'Функция 7', p3f3: 'Функция 8', p3f4: 'Приоритетная поддержка', p3btn: 'Выбрать' }
  },
  stats: {
    label: 'Статистика', icon: '📊',
    variants: ['4 числа', '3 числа с иконками', 'Прогресс бары'],
    defaultContent: { title: 'Наши результаты', n1: '500+', l1: 'Клиентов', n2: '10', l2: 'Лет опыта', n3: '99%', l3: 'Довольных клиентов', n4: '24/7', l4: 'Поддержка' }
  },
  faq: {
    label: 'FAQ (Вопросы)', icon: '❓',
    variants: ['Аккордеон', '2 колонки', 'Простой список'],
    defaultContent: { title: 'Часто задаваемые вопросы', q1: 'Как начать работу?', a1: 'Просто свяжитесь с нами и мы всё расскажем и покажем.', q2: 'Сколько стоят ваши услуги?', a2: 'Стоимость зависит от объёма работ. Свяжитесь с нами для расчёта.', q3: 'Как долго ждать результата?', a3: 'Обычно от 3 до 7 рабочих дней в зависимости от сложности задачи.', q4: 'Есть ли гарантия?', a4: 'Да, мы предоставляем гарантию качества на все наши услуги.' }
  },
  team: {
    label: 'Команда', icon: '👥',
    variants: ['Карточки 3 в ряд', 'Карточки 4 в ряд', 'Список'],
    defaultContent: { title: 'Наша команда', name1: 'Иван Иванов', role1: 'Директор', img1: 'https://i.pravatar.cc/150?img=1', name2: 'Мария Петрова', role2: 'Менеджер', img2: 'https://i.pravatar.cc/150?img=5', name3: 'Алексей Сидоров', role3: 'Специалист', img3: 'https://i.pravatar.cc/150?img=3' }
  },
  html: {
    label: 'Свой HTML код', icon: '💻',
    variants: ['HTML блок'],
    defaultContent: { code: '<div style="padding:40px;text-align:center;background:#1e293b;border-radius:8px;">\n  <h2 style="color:white;">Ваш HTML здесь</h2>\n  <p style="color:#94a3b8;">Вставьте любой код</p>\n</div>' }
  },
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
  const [showBlockPicker, setShowBlockPicker] = useState(false)
  const [newSiteName, setNewSiteName] = useState('')
  const [newSiteDesc, setNewSiteDesc] = useState('')
  const [newPageName, setNewPageName] = useState('')
  const [editingBlock, setEditingBlock] = useState<Block | null>(null)
  const [preview, setPreview] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [loading, setLoading] = useState(true)

  const showSaved = () => { setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000) }

  useEffect(() => { loadSites() }, [])

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
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const createSite = async () => {
    if (!newSiteName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data: site } = await supabase.from('sites').insert({ name: newSiteName, description: newSiteDesc, status: 'draft', user_id: user?.id, yandex_metrika: '', custom_head: '', domain: '', amo_subdomain: '', amo_token: '', amo_pipeline_id: '', amo_status_id: '', amo_enabled: false }).select().single()
    if (site) {
      const { data: page } = await supabase.from('pages').insert({ site_id: site.id, name: 'Главная', slug: '/', blocks: [] }).select().single()
      setSites([{ ...site, pages: page ? [page] : [] }, ...sites])
    }
    setNewSiteName(''); setNewSiteDesc(''); setShowNewSite(false)
  }

  const createPage = async () => {
    if (!activeSite || !newPageName.trim()) return
    const slug = '/' + newPageName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const { data: page } = await supabase.from('pages').insert({ site_id: activeSite.id, name: newPageName, slug, blocks: [] }).select().single()
    if (page) {
      const updated = { ...activeSite, pages: [...activeSite.pages, page] }
      setActiveSite(updated); setSites(sites.map(s => s.id === updated.id ? updated : s))
    }
    setNewPageName(''); setShowNewPage(false)
  }

  const deletePage = async (pageId: string) => {
    if (!activeSite || activeSite.pages.length <= 1) return
    await supabase.from('pages').delete().eq('id', pageId)
    const updated = { ...activeSite, pages: activeSite.pages.filter(p => p.id !== pageId) }
    setActiveSite(updated); setSites(sites.map(s => s.id === updated.id ? updated : s))
  }

  const updateSiteSettings = async () => {
    if (!activeSite) return
    await supabase.from('sites').update({ name: activeSite.name, description: activeSite.description, status: activeSite.status, domain: activeSite.domain, yandex_metrika: activeSite.yandex_metrika, custom_head: activeSite.custom_head, amo_subdomain: activeSite.amo_subdomain, amo_token: activeSite.amo_token, amo_pipeline_id: activeSite.amo_pipeline_id, amo_status_id: activeSite.amo_status_id, amo_enabled: activeSite.amo_enabled }).eq('id', activeSite.id)
    setSites(sites.map(s => s.id === activeSite.id ? activeSite : s)); showSaved()
  }

  const deleteSite = async (id: string) => {
    await supabase.from('pages').delete().eq('site_id', id)
    await supabase.from('sites').delete().eq('id', id)
    setSites(sites.filter(s => s.id !== id))
  }

  const savePageBlocks = async (page: Page, blocks: Block[]) => {
    await supabase.from('pages').update({ blocks }).eq('id', page.id)
  }

  const addBlock = async (type: BlockType, variant: number = 0) => {
    if (!activeSite || !activePage) return
    const block: Block = { id: Date.now().toString(), type, variant, content: { ...BLOCKS[type].defaultContent } }
    const updatedBlocks = [...(activePage.blocks || []), block]
    await savePageBlocks(activePage, updatedBlocks)
    const updatedPage = { ...activePage, blocks: updatedBlocks }
    const updatedSite = { ...activeSite, pages: activeSite.pages.map(p => p.id === updatedPage.id ? updatedPage : p) }
    setActivePage(updatedPage); setActiveSite(updatedSite); setSites(sites.map(s => s.id === updatedSite.id ? updatedSite : s))
    setShowBlockPicker(false)
  }

  const deleteBlock = async (blockId: string) => {
    if (!activeSite || !activePage) return
    const updatedBlocks = activePage.blocks.filter(b => b.id !== blockId)
    await savePageBlocks(activePage, updatedBlocks)
    const updatedPage = { ...activePage, blocks: updatedBlocks }
    const updatedSite = { ...activeSite, pages: activeSite.pages.map(p => p.id === updatedPage.id ? updatedPage : p) }
    setActivePage(updatedPage); setActiveSite(updatedSite); setSites(sites.map(s => s.id === updatedSite.id ? updatedSite : s)); setEditingBlock(null)
  }

  const updateBlock = async (blockId: string, field: string, value: string) => {
    if (!activeSite || !activePage) return
    const updatedBlocks = activePage.blocks.map(b => b.id === blockId ? { ...b, content: { ...b.content, [field]: value } } : b)
    await savePageBlocks(activePage, updatedBlocks)
    const updatedPage = { ...activePage, blocks: updatedBlocks }
    const updatedSite = { ...activeSite, pages: activeSite.pages.map(p => p.id === updatedPage.id ? updatedPage : p) }
    setActivePage(updatedPage); setActiveSite(updatedSite); setSites(sites.map(s => s.id === updatedSite.id ? updatedSite : s))
    if (editingBlock?.id === blockId) setEditingBlock({ ...editingBlock, content: { ...editingBlock.content, [field]: value } })
  }

  const changeVariant = async (blockId: string, variant: number) => {
    if (!activeSite || !activePage) return
    const updatedBlocks = activePage.blocks.map(b => b.id === blockId ? { ...b, variant } : b)
    await savePageBlocks(activePage, updatedBlocks)
    const updatedPage = { ...activePage, blocks: updatedBlocks }
    const updatedSite = { ...activeSite, pages: activeSite.pages.map(p => p.id === updatedPage.id ? updatedPage : p) }
    setActivePage(updatedPage); setActiveSite(updatedSite); setSites(sites.map(s => s.id === updatedSite.id ? updatedSite : s))
    if (editingBlock?.id === blockId) setEditingBlock({ ...editingBlock, variant })
  }

  const moveBlock = async (blockId: string, dir: 'up' | 'down') => {
    if (!activeSite || !activePage) return
    const blocks = [...activePage.blocks]
    const idx = blocks.findIndex(b => b.id === blockId)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === blocks.length - 1) return
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    [blocks[idx], blocks[swap]] = [blocks[swap], blocks[idx]]
    await savePageBlocks(activePage, blocks)
    const updatedPage = { ...activePage, blocks }
    const updatedSite = { ...activeSite, pages: activeSite.pages.map(p => p.id === updatedPage.id ? updatedPage : p) }
    setActivePage(updatedPage); setActiveSite(updatedSite); setSites(sites.map(s => s.id === updatedSite.id ? updatedSite : s))
  }

  const toggleStatus = async () => {
    if (!activeSite) return
    const newStatus = activeSite.status === 'draft' ? 'published' : 'draft'
    await supabase.from('sites').update({ status: newStatus }).eq('id', activeSite.id)
    const updated = { ...activeSite, status: newStatus as 'draft' | 'published' }
    setActiveSite(updated); setSites(sites.map(s => s.id === updated.id ? updated : s)); showSaved()
  }

  const renderBlock = (block: Block) => {
    const c = block.content
    const v = block.variant || 0

    if (block.type === 'hero') {
      if (v === 0) return (
        <div style={{ background: `linear-gradient(135deg, ${c.bgColor || '#1e3a8a'}, #3b82f6)`, padding: '80px 40px', textAlign: 'center', borderRadius: '8px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: '800', color: 'white', marginBottom: '20px', lineHeight: '1.2' }}>{c.title}</h1>
          <p style={{ fontSize: '20px', color: '#bfdbfe', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px' }}>{c.subtitle}</p>
          <a href={c.buttonUrl || '#'} style={{ display: 'inline-block', background: 'white', color: '#1e3a8a', padding: '14px 32px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', fontSize: '16px' }}>{c.buttonText}</a>
        </div>
      )
      if (v === 1) return (
        <div style={{ background: '#f8fafc', padding: '80px 40px', textAlign: 'center', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '14px', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>Добро пожаловать</div>
          <h1 style={{ fontSize: '48px', fontWeight: '800', color: 'white', marginBottom: '20px', lineHeight: '1.1' }}>{c.title}</h1>
          <p style={{ fontSize: '18px', color: '#64748b', marginBottom: '40px' }}>{c.subtitle}</p>
          <a href={c.buttonUrl || '#'} style={{ display: 'inline-block', background: '#3b82f6', color: 'white', padding: '14px 32px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}>{c.buttonText}</a>
        </div>
      )
      if (v === 2) return (
        <div style={{ background: 'white', padding: '80px 40px', textAlign: 'left', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '40px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '42px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', lineHeight: '1.2' }}>{c.title}</h1>
            <p style={{ fontSize: '18px', color: '#64748b', marginBottom: '32px' }}>{c.subtitle}</p>
            <a href={c.buttonUrl || '#'} style={{ display: 'inline-block', background: '#f8fafc', color: 'white', padding: '14px 32px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}>{c.buttonText}</a>
          </div>
          <div style={{ flex: 1, height: '200px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🖼️</div>
        </div>
      )
    }

    if (block.type === 'text') {
      if (v === 0) return (
        <div style={{ padding: '60px 40px', background: 'white', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', marginBottom: '20px' }}>{c.title}</h2>
          <p style={{ color: '#64748b', lineHeight: '1.8', fontSize: '16px' }}>{c.text}</p>
        </div>
      )
      if (v === 1) return (
        <div style={{ padding: '60px 40px', background: '#f8fafc', borderRadius: '8px', display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '48px' }}>💡</div>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px' }}>{c.title}</h2>
            <p style={{ color: '#64748b', lineHeight: '1.8', fontSize: '16px' }}>{c.text}</p>
          </div>
        </div>
      )
      if (v === 2) return (
        <div style={{ padding: '60px 40px', background: 'white', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '32px', color: '#3b82f6', marginBottom: '16px' }}>"</div>
          <p style={{ color: '#0f172a', lineHeight: '1.8', fontSize: '20px', fontStyle: 'italic', marginBottom: '16px' }}>{c.text}</p>
          <p style={{ color: '#64748b', fontSize: '14px' }}>— {c.title}</p>
        </div>
      )
    }

    if (block.type === 'features') {
      if (v === 0) return (
        <div style={{ padding: '60px 40px', background: '#f8fafc', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '40px' }}>{c.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[[c.f1, c.d1, c.icon1], [c.f2, c.d2, c.icon2], [c.f3, c.d3, c.icon3]].map(([f, d, icon], i) => (
              <div key={i} style={{ background: 'white', padding: '28px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '16px' }}>{icon}</div>
                <h3 style={{ color: '#0f172a', fontWeight: '600', marginBottom: '8px', fontSize: '16px' }}>{f}</h3>
                <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      )
      if (v === 1) return (
        <div style={{ padding: '60px 40px', background: 'white', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '40px' }}>{c.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {[[c.f1, c.d1, c.icon1], [c.f2, c.d2, c.icon2], [c.f3, c.d3, c.icon3], [c.f4, c.d4, c.icon4]].map(([f, d, icon], i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ fontSize: '28px', flexShrink: 0 }}>{icon}</div>
                <div>
                  <h3 style={{ color: '#0f172a', fontWeight: '600', marginBottom: '6px' }}>{f}</h3>
                  <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
      if (v === 2) return (
        <div style={{ padding: '60px 40px', background: '#f8fafc', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', marginBottom: '32px' }}>{c.title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[[c.f1, c.d1], [c.f2, c.d2], [c.f3, c.d3], [c.f4, c.d4]].map(([f, d], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'white', borderRadius: '8px' }}>
                <div style={{ width: '24px', height: '24px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', flexShrink: 0 }}>✓</div>
                <div>
                  <span style={{ color: '#0f172a', fontWeight: '600' }}>{f}</span>
                  <span style={{ color: '#64748b', fontSize: '14px' }}> — {d}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (block.type === 'reviews') {
      if (v === 0) return (
        <div style={{ padding: '60px 40px', background: '#f8fafc', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '40px' }}>{c.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {[[c.name1, c.text1, c.rating1], [c.name2, c.text2, c.rating2], [c.name3, c.text3, c.rating3]].map(([name, text, rating], i) => (
              <div key={i} style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#f59e0b', fontSize: '18px', marginBottom: '12px' }}>{'⭐'.repeat(parseInt(rating || '5'))}</div>
                <p style={{ color: '#1e293b', fontSize: '15px', lineHeight: '1.7', marginBottom: '16px', fontStyle: 'italic' }}>"{text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>{(name || 'А')[0]}</div>
                  <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '14px' }}>{name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
      if (v === 1) return (
        <div style={{ padding: '60px 40px', background: 'white', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '40px' }}>{c.title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {[[c.name1, c.text1, c.rating1], [c.name2, c.text2, c.rating2], [c.name3, c.text3, c.rating3]].map(([name, text, rating], i) => (
              <div key={i} style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '24px' }}>
                <p style={{ color: '#1e293b', fontSize: '18px', lineHeight: '1.7', marginBottom: '12px', fontStyle: 'italic' }}>"{text}"</p>
                <div style={{ color: '#f59e0b', fontSize: '14px', marginBottom: '4px' }}>{'⭐'.repeat(parseInt(rating || '5'))}</div>
                <span style={{ color: '#64748b', fontSize: '14px' }}>— {name}</span>
              </div>
            ))}
          </div>
        </div>
      )
      if (v === 2) return (
        <div style={{ padding: '60px 40px', background: '#f8fafc', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', marginBottom: '32px' }}>{c.title}</h2>
          {[[c.name1, c.text1, c.rating1], [c.name2, c.text2, c.rating2], [c.name3, c.text3, c.rating3]].map(([name, text, rating], i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', padding: '20px 0', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ width: '48px', height: '48px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', flexShrink: 0 }}>{(name || 'А')[0]}</div>
              <div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: '#0f172a', fontWeight: '600' }}>{name}</span>
                  <span style={{ color: '#f59e0b', fontSize: '13px' }}>{'⭐'.repeat(parseInt(rating || '5'))}</span>
                </div>
                <p style={{ color: '#64748b', lineHeight: '1.6' }}>{text}</p>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (block.type === 'pricing') {
      const plans = [
        { name: c.p1name, price: c.p1price, period: c.p1period, features: [c.p1f1, c.p1f2, c.p1f3], btn: c.p1btn, popular: false },
        { name: c.p2name, price: c.p2price, period: c.p2period, features: [c.p2f1, c.p2f2, c.p2f3, c.p2f4], btn: c.p2btn, popular: c.p2popular === 'true' },
        { name: c.p3name, price: c.p3price, period: c.p3period, features: [c.p3f1, c.p3f2, c.p3f3, c.p3f4], btn: c.p3btn, popular: false },
      ]
      if (v === 0) return (
        <div style={{ padding: '60px 40px', background: '#f8fafc', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '40px' }}>{c.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {plans.map((plan, i) => (
              <div key={i} style={{ background: plan.popular ? '#1e3a8a' : '#1e293b', padding: '32px 24px', borderRadius: '8px', border: plan.popular ? '2px solid #3b82f6' : '1px solid #334155', position: 'relative', textAlign: 'center' }}>
                {plan.popular && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#3b82f6', color: 'white', padding: '4px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>Популярный</div>}
                <h3 style={{ color: '#0f172a', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>{plan.name}</h3>
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#0f172a' }}>{plan.price}</span>
                  <span style={{ color: '#64748b', fontSize: '14px' }}> руб/{plan.period}</span>
                </div>
                <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                  {plan.features.filter(Boolean).map((f, j) => (
                    <div key={j} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ color: '#34d399' }}>✓</span>
                      <span style={{ color: '#1e293b', fontSize: '14px' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button style={{ width: '100%', padding: '10px', background: plan.popular ? 'white' : '#334155', color: plan.popular ? '#1e3a8a' : '#e2e8f0', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>{plan.btn}</button>
              </div>
            ))}
          </div>
        </div>
      )
      if (v === 1) return (
        <div style={{ padding: '60px 40px', background: 'white', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '40px' }}>{c.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', maxWidth: '700px', margin: '0 auto' }}>
            {plans.slice(0, 2).map((plan, i) => (
              <div key={i} style={{ background: i === 1 ? 'linear-gradient(135deg, #1e3a8a, #3b82f6)' : '#0f172a', padding: '32px 24px', borderRadius: '12px', textAlign: 'center' }}>
                <h3 style={{ color: '#0f172a', fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>{plan.name}</h3>
                <div style={{ fontSize: '40px', fontWeight: 'bold', color: 'white', marginBottom: '20px' }}>{plan.price}<span style={{ fontSize: '16px', color: '#64748b' }}> руб</span></div>
                {plan.features.filter(Boolean).map((f, j) => (
                  <div key={j} style={{ color: '#1e293b', fontSize: '14px', marginBottom: '8px' }}>✓ {f}</div>
                ))}
                <button style={{ marginTop: '20px', width: '100%', padding: '12px', background: i === 1 ? 'white' : '#3b82f6', color: i === 1 ? '#1e3a8a' : 'white', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>{plan.btn}</button>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (block.type === 'stats') {
      const items = [[c.n1, c.l1], [c.n2, c.l2], [c.n3, c.l3], [c.n4, c.l4]]
      if (v === 0) return (
        <div style={{ padding: '60px 40px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: '48px' }}>{c.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
            {items.map(([n, l], i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '44px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>{n}</div>
                <div style={{ color: '#bfdbfe', fontSize: '15px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )
      if (v === 1) return (
        <div style={{ padding: '60px 40px', background: '#f8fafc', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '40px' }}>{c.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {items.slice(0, 3).map(([n, l], i) => (
              <div key={i} style={{ background: 'white', padding: '32px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '48px', fontWeight: '800', color: '#3b82f6', marginBottom: '8px' }}>{n}</div>
                <div style={{ color: '#64748b', fontSize: '15px' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (block.type === 'faq') {
      if (v === 0) return (
        <div style={{ padding: '60px 40px', background: '#f8fafc', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '40px' }}>{c.title}</h2>
          <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[[c.q1, c.a1], [c.q2, c.a2], [c.q3, c.a3], [c.q4, c.a4]].map(([q, a], i) => (
              <div key={i} style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '15px' }}>{q}</span>
                  <span style={{ color: '#3b82f6', fontSize: '20px' }}>+</span>
                </div>
                <div style={{ padding: '0 20px 18px', color: '#64748b', fontSize: '14px', lineHeight: '1.7' }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      )
      if (v === 1) return (
        <div style={{ padding: '60px 40px', background: 'white', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '40px' }}>{c.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            {[[c.q1, c.a1], [c.q2, c.a2], [c.q3, c.a3], [c.q4, c.a4]].map(([q, a], i) => (
              <div key={i} style={{ padding: '24px', background: '#f8fafc', borderRadius: '8px' }}>
                <h3 style={{ color: '#3b82f6', fontWeight: '600', marginBottom: '10px', fontSize: '15px' }}>{q}</h3>
                <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.7' }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (block.type === 'team') {
      if (v === 0) return (
        <div style={{ padding: '60px 40px', background: '#f8fafc', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '40px' }}>{c.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[[c.name1, c.role1, c.img1], [c.name2, c.role2, c.img2], [c.name3, c.role3, c.img3]].map(([name, role, img], i) => (
              <div key={i} style={{ background: 'white', padding: '28px', borderRadius: '8px', textAlign: 'center' }}>
                <img src={img} alt={name} style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '16px', objectFit: 'cover' }} />
                <h3 style={{ color: '#0f172a', fontWeight: '600', marginBottom: '4px' }}>{name}</h3>
                <p style={{ color: '#64748b', fontSize: '14px' }}>{role}</p>
              </div>
            ))}
          </div>
        </div>
      )
      if (v === 1) return (
        <div style={{ padding: '60px 40px', background: 'white', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '40px' }}>{c.title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[[c.name1, c.role1, c.img1], [c.name2, c.role2, c.img2], [c.name3, c.role3, c.img3]].map(([name, role, img], i) => (
              <div key={i} style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>
                <img src={img} alt={name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <div>
                  <h3 style={{ color: '#0f172a', fontWeight: '600', marginBottom: '4px' }}>{name}</h3>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (block.type === 'gallery') {
      const imgs = [c.img1, c.img2, c.img3, c.img4, c.img5, c.img6].filter(Boolean)
      if (v === 0) return (
        <div style={{ padding: '60px 40px', background: '#f8fafc', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '32px' }}>{c.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {imgs.map((img, i) => <img key={i} src={img} alt="" style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px' }} />)}
          </div>
        </div>
      )
      if (v === 1) return (
        <div style={{ padding: '60px 40px', background: 'white', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '32px' }}>{c.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {imgs.slice(0, 4).map((img, i) => <img key={i} src={img} alt="" style={{ width: '100%', height: '260px', objectFit: 'cover', borderRadius: '8px' }} />)}
          </div>
        </div>
      )
      if (v === 2) return (
        <div style={{ padding: '40px 0', background: '#f8fafc', borderRadius: '8px', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '24px', padding: '0 40px' }}>{c.title}</h2>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 40px' }}>
            {imgs.map((img, i) => <img key={i} src={img} alt="" style={{ height: '220px', width: '320px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />)}
          </div>
        </div>
      )
    }

    if (block.type === 'form') {
      if (v === 0) return (
        <div style={{ padding: '60px 40px', background: 'white', borderRadius: '8px' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>{c.title}</h2>
            <p style={{ color: '#64748b', marginBottom: '32px' }}>{c.subtitle}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input placeholder={c.namePlaceholder} style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '14px' }} />
              <input placeholder={c.phonePlaceholder} style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '14px' }} />
              <textarea placeholder={c.messagePlaceholder} rows={3} style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '14px', resize: 'none' }} />
              <button style={{ padding: '14px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>{c.buttonText}</button>
            </div>
          </div>
        </div>
      )
      if (v === 1) return (
        <div style={{ padding: '60px 40px', background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)', borderRadius: '8px' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '12px' }}>{c.title}</h2>
            <p style={{ color: '#bfdbfe', marginBottom: '32px' }}>{c.subtitle}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input placeholder={c.namePlaceholder} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '14px' }} />
              <input placeholder={c.phonePlaceholder} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '14px' }} />
              <button style={{ padding: '14px', background: 'white', border: 'none', borderRadius: '8px', color: '#1e3a8a', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>{c.buttonText}</button>
            </div>
          </div>
        </div>
      )
      if (v === 2) return (
        <div style={{ padding: '40px', background: '#f8fafc', borderRadius: '8px' }}>
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>{c.title}</h2>
              <p style={{ color: '#64748b', marginBottom: '0' }}>{c.subtitle}</p>
            </div>
            <div style={{ flex: 1, display: 'flex', gap: '12px' }}>
              <input placeholder={c.phonePlaceholder} style={{ flex: 1, padding: '12px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '14px' }} />
              <button style={{ padding: '12px 20px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>{c.buttonText}</button>
            </div>
          </div>
        </div>
      )
    }

    if (block.type === 'video') {
      if (v === 0) return (
        <div style={{ padding: '60px 40px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>{c.title}</h2>
          <p style={{ color: '#64748b', marginBottom: '32px' }}>{c.subtitle}</p>
          <div style={{ maxWidth: '700px', margin: '0 auto', borderRadius: '8px', overflow: 'hidden', aspectRatio: '16/9' }}>
            <iframe src={c.videoUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
          </div>
        </div>
      )
      if (v === 1) return (
        <div style={{ padding: '40px', background: 'white', borderRadius: '8px', display: 'flex', gap: '40px', alignItems: 'center' }}>
          <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', aspectRatio: '16/9' }}>
            <iframe src={c.videoUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>{c.title}</h2>
            <p style={{ color: '#64748b', lineHeight: '1.7' }}>{c.subtitle}</p>
          </div>
        </div>
      )
    }

    if (block.type === 'cta') {
      if (v === 0) return (
        <div style={{ background: '#7c3aed', padding: '60px 40px', textAlign: 'center', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '12px' }}>{c.title}</h2>
          <p style={{ color: '#ddd6fe', marginBottom: '28px', fontSize: '16px' }}>{c.subtitle}</p>
          <a href={c.buttonUrl || '#'} style={{ display: 'inline-block', background: 'white', color: '#7c3aed', padding: '14px 32px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', fontSize: '16px' }}>{c.buttonText}</a>
        </div>
      )
      if (v === 1) return (
        <div style={{ background: '#f8fafc', padding: '60px 40px', textAlign: 'center', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', marginBottom: '12px' }}>{c.title}</h2>
          <p style={{ color: '#64748b', marginBottom: '28px' }}>{c.subtitle}</p>
          <a href={c.buttonUrl || '#'} style={{ display: 'inline-block', background: '#3b82f6', color: 'white', padding: '14px 32px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}>{c.buttonText}</a>
        </div>
      )
      if (v === 2) return (
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #7c3aed)', padding: '60px 40px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '40px' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>{c.title}</h2>
            <p style={{ color: '#bfdbfe' }}>{c.subtitle}</p>
          </div>
          <a href={c.buttonUrl || '#'} style={{ display: 'inline-block', background: 'white', color: '#1e3a8a', padding: '14px 32px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>{c.buttonText}</a>
        </div>
      )
    }

    if (block.type === 'contacts') {
      if (v === 0) return (
        <div style={{ padding: '60px 40px', background: 'white', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', marginBottom: '32px' }}>{c.title}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[['📞', c.phone], ['✉️', c.email], ['📍', c.address], ['🕐', c.workTime]].map(([icon, val], i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '20px' }}>{icon}</span>
                <span style={{ color: '#1e293b', fontSize: '16px' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )
      if (v === 1) return (
        <div style={{ padding: '60px 40px', background: '#f8fafc', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: '40px' }}>{c.title}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {[['📞', 'Телефон', c.phone], ['✉️', 'Email', c.email], ['📍', 'Адрес', c.address]].map(([icon, label, val], i) => (
              <div key={i} style={{ background: 'white', padding: '24px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>{label}</div>
                <div style={{ color: '#0f172a', fontWeight: '600' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (block.type === 'html') return (
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '8px', right: '8px', background: '#334155', color: '#64748b', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', zIndex: 1 }}>💻 HTML</div>
        <div dangerouslySetInnerHTML={{ __html: c.code }} />
      </div>
    )

    return <div style={{ padding: '40px', background: 'white', borderRadius: '8px', color: '#64748b', textAlign: 'center' }}>Блок: {block.type} (вариант {v + 1})</div>
  }

  const fieldLabels: Record<string, string> = {
    title: 'Заголовок', subtitle: 'Подзаголовок', text: 'Текст', buttonText: 'Текст кнопки', buttonUrl: 'Ссылка кнопки', bgColor: 'Цвет фона (hex)', phone: 'Телефон', email: 'Email', address: 'Адрес', workTime: 'Время работы', videoUrl: 'Ссылка YouTube (embed)', f1: 'Пункт 1', d1: 'Описание 1', f2: 'Пункт 2', d2: 'Описание 2', f3: 'Пункт 3', d3: 'Описание 3', f4: 'Пункт 4', d4: 'Описание 4', icon1: 'Иконка 1', icon2: 'Иконка 2', icon3: 'Иконка 3', icon4: 'Иконка 4', name1: 'Имя 1', text1: 'Текст 1', rating1: 'Оценка 1', name2: 'Имя 2', text2: 'Текст 2', rating2: 'Оценка 2', name3: 'Имя 3', text3: 'Текст 3', rating3: 'Оценка 3', img1: 'Фото 1 (URL)', img2: 'Фото 2 (URL)', img3: 'Фото 3 (URL)', img4: 'Фото 4 (URL)', img5: 'Фото 5 (URL)', img6: 'Фото 6 (URL)', role1: 'Должность 1', role2: 'Должность 2', role3: 'Должность 3', namePlaceholder: 'Поле Имя', phonePlaceholder: 'Поле Телефон', messagePlaceholder: 'Поле Сообщение', q1: 'Вопрос 1', a1: 'Ответ 1', q2: 'Вопрос 2', a2: 'Ответ 2', q3: 'Вопрос 3', a3: 'Ответ 3', q4: 'Вопрос 4', a4: 'Ответ 4', n1: 'Число 1', l1: 'Подпись 1', n2: 'Число 2', l2: 'Подпись 2', n3: 'Число 3', l3: 'Подпись 3', n4: 'Число 4', l4: 'Подпись 4', p1name: 'Тариф 1 название', p1price: 'Тариф 1 цена', p1period: 'Тариф 1 период', p1f1: 'Тариф 1 функция 1', p1f2: 'Тариф 1 функция 2', p1f3: 'Тариф 1 функция 3', p1btn: 'Тариф 1 кнопка', p2name: 'Тариф 2 название', p2price: 'Тариф 2 цена', p2period: 'Тариф 2 период', p2f1: 'Тариф 2 функция 1', p2f2: 'Тариф 2 функция 2', p2f3: 'Тариф 2 функция 3', p2f4: 'Тариф 2 функция 4', p2btn: 'Тариф 2 кнопка', p2popular: 'Популярный (true/false)', p3name: 'Тариф 3 название', p3price: 'Тариф 3 цена', p3period: 'Тариф 3 период', p3f1: 'Тариф 3 функция 1', p3f2: 'Тариф 3 функция 2', p3f3: 'Тариф 3 функция 3', p3f4: 'Тариф 3 функция 4', p3btn: 'Тариф 3 кнопка', code: 'HTML код'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '40px' }}>⏳</div>
      <p style={{ color: '#64748b' }}>Загружаем сайты...</p>
    </div>
  )

  const btnStyle = (extra?: React.CSSProperties) => ({ padding: '9px 16px', background: '#3b82f6', border: 'none', borderRadius: '7px', color: 'white', fontWeight: '600' as const, cursor: 'pointer', fontSize: '13px', ...extra })

  if (view === 'list') return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f1f5f9' }}>🌐 Сайты</h1>
          <p style={{ color: '#94a3b8', marginTop: '4px' }}>Создавайте и управляйте сайтами</p>
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
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px' }}>{s.description || 'Без описания'}</p>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: s.status === 'published' ? '#064e3b' : '#0f172a', color: s.status === 'published' ? '#34d399' : '#94a3b8', border: '1px solid #e2e8f0' }}>{s.status === 'published' ? '● Опубликован' : '○ Черновик'}</span>
                <span style={{ fontSize: '11px', color: '#475569' }}>{s.pages?.length || 0} стр.</span>
                {s.domain && <span style={{ fontSize: '11px', color: '#60a5fa' }}>🔗 {s.domain}</span>}
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
          <div style={{ background: 'white', borderRadius: '12px', padding: '32px', width: '440px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '24px' }}>Новый сайт</h2>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Название *</label>
            <input value={newSiteName} onChange={e => setNewSiteName(e.target.value)} placeholder="Например: Лендинг для кафе" style={{ width: '100%', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '14px', marginBottom: '14px' }} />
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Описание</label>
            <input value={newSiteDesc} onChange={e => setNewSiteDesc(e.target.value)} placeholder="Краткое описание..." style={{ width: '100%', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '14px', marginBottom: '24px' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={createSite} style={btnStyle({ flex: 1 })}>Создать</button>
              <button onClick={() => setShowNewSite(false)} style={btnStyle({ flex: 1, background: '#475569' })}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (view === 'pages' && activeSite) return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', margin: '-28px', padding: '0' }}>
      {/* Топбар как в Tilda */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 32px', display: 'flex', alignItems: 'center', gap: '0', height: '52px' }}>
        <button onClick={() => setView('list')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px 0 0', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '14px', borderRight: '1px solid #e2e8f0', height: '100%' }}>
          ← Назад
        </button>
        <div style={{ padding: '0 20px', flex: 1 }}>
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{activeSite.name}</span>
          {activeSite.domain && <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '12px' }}>🔗 {activeSite.domain}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={async () => { const s = activeSite.status === 'draft' ? 'published' : 'draft'; await supabase.from('sites').update({ status: s }).eq('id', activeSite.id); setActiveSite({ ...activeSite, status: s as 'draft' | 'published' }); setSites(sites.map(x => x.id === activeSite.id ? { ...x, status: s as 'draft' | 'published' } : x)) }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: activeSite.status === 'published' ? '#dcfce7' : '#f1f5f9', border: `1px solid ${activeSite.status === 'published' ? '#86efac' : '#e2e8f0'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: activeSite.status === 'published' ? '#16a34a' : '#64748b', fontWeight: '600' }}>
            {activeSite.status === 'published' ? '● Опубликован' : '○ Черновик'}
          </button>
          <button onClick={() => setView('settings')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#64748b' }}>
            ⚙️ Настройки
          </button>
          <button onClick={() => setShowNewPage(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: '600' }}>
            + Создать страницу
          </button>
        </div>
      </div>

      {/* Список страниц */}
      <div style={{ padding: '32px', maxWidth: '900px' }}>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Страницы сайта:</p>

        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {activeSite.pages.map((page, idx) => (
            <div key={page.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: idx < activeSite.pages.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.15s' }}
              onMouseOver={e => e.currentTarget.style.background = '#fafafa'}
              onMouseOut={e => e.currentTarget.style.background = 'white'}
            >
              {/* Превью миниатюра */}
              <div onClick={() => { setActivePage(page); setView('editor') }} style={{ width: '72px', height: '54px', background: page.blocks?.length ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#f1f5f9', borderRadius: '6px', marginRight: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, border: '1px solid #e2e8f0', overflow: 'hidden', position: 'relative' }}>
                {page.blocks?.length ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '3px', padding: '6px' }}>
                    <div style={{ height: '12px', background: 'rgba(255,255,255,0.6)', borderRadius: '2px' }} />
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.4)', borderRadius: '2px', width: '70%' }} />
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', width: '50%' }} />
                  </div>
                ) : (
                  <span style={{ fontSize: '20px' }}>📄</span>
                )}
              </div>

              {/* Инфо страницы */}
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setActivePage(page); setView('editor') }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', margin: 0 }}>{page.name}</h3>
                  {idx === 0 && <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>Главная</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{page.slug}</span>
                  <span style={{ fontSize: '12px', color: '#475569' }}>•</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{page.blocks?.length || 0} блоков</span>
                </div>
              </div>

              {/* Кнопки */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => { setActivePage(page); setView('editor') }} style={{ padding: '6px 14px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  Редактировать
                </button>
                {activeSite.pages.length > 1 && (
                  <button onClick={() => deletePage(page.id)} style={{ padding: '6px 10px', background: 'none', border: '1px solid #fee2e2', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Кнопка добавить страницу */}
        <button onClick={() => setShowNewPage(true)} style={{ marginTop: '12px', width: '100%', padding: '14px', background: 'white', border: '2px dashed #e2e8f0', borderRadius: '12px', color: '#64748b', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6' }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8' }}
        >
          + Добавить страницу
        </button>
      </div>
      {showNewPage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '32px', width: '400px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '20px' }}>Новая страница</h2>
            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Название *</label>
            <input value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Например: О нас" style={{ width: '100%', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '14px', marginBottom: '8px' }} />
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

  if (view === 'settings' && activeSite) return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => setView('pages')} style={btnStyle({ background: 'white', border: '1px solid #e2e8f0', color: '#64748b' })}>← Назад</button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>⚙️ Настройки сайта</h1>
          <p style={{ color: '#64748b', fontSize: '13px' }}>{activeSite.name}</p>
        </div>
      </div>
      {savedMsg && <div style={{ padding: '12px 16px', background: '#064e3b', border: '1px solid #065f46', borderRadius: '8px', color: '#34d399', marginBottom: '20px', fontSize: '14px' }}>✅ Сохранено!</div>}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '16px' }}>📋 Основное</h2>
        <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Название</label>
        <input value={activeSite.name} onChange={e => setActiveSite({ ...activeSite, name: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '14px', marginBottom: '14px' }} />
        <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Описание</label>
        <input value={activeSite.description} onChange={e => setActiveSite({ ...activeSite, description: e.target.value })} style={{ width: '100%', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '14px', marginBottom: '14px' }} />
        <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>Статус</label>
        <select value={activeSite.status} onChange={e => setActiveSite({ ...activeSite, status: e.target.value as 'draft' | 'published' })} style={{ width: '100%', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '14px' }}>
          <option value="draft">○ Черновик</option>
          <option value="published">● Опубликован</option>
        </select>
      </div>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>🔗 Домен</h2>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Привяжите свой домен</p>
        <input value={activeSite.domain} onChange={e => setActiveSite({ ...activeSite, domain: e.target.value })} placeholder="example.com" style={{ width: '100%', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '14px', marginBottom: '12px' }} />
        {activeSite.domain && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', fontWeight: '600' }}>DNS записи:</p>
            <div style={{ background: 'white', padding: '8px 12px', borderRadius: '6px', marginBottom: '6px', display: 'flex', gap: '16px' }}>
              <span style={{ fontSize: '12px', color: '#60a5fa', width: '50px', fontWeight: '600' }}>A</span>
              <span style={{ fontSize: '12px', color: '#0f172a', width: '40px' }}>@</span>
              <span style={{ fontSize: '12px', color: '#34d399', fontFamily: 'monospace' }}>76.76.21.21</span>
            </div>
            <div style={{ background: 'white', padding: '8px 12px', borderRadius: '6px', display: 'flex', gap: '16px' }}>
              <span style={{ fontSize: '12px', color: '#60a5fa', width: '50px', fontWeight: '600' }}>CNAME</span>
              <span style={{ fontSize: '12px', color: '#0f172a', width: '40px' }}>www</span>
              <span style={{ fontSize: '12px', color: '#34d399', fontFamily: 'monospace' }}>cname.vercel-dns.com</span>
            </div>
          </div>
        )}
      </div>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>📊 Яндекс Метрика</h2>
        <input value={activeSite.yandex_metrika} onChange={e => setActiveSite({ ...activeSite, yandex_metrika: e.target.value })} placeholder="Номер счётчика: 12345678" style={{ width: '100%', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '14px' }} />
      </div>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>🔌 amoCRM</h2>
          <button onClick={() => setActiveSite({ ...activeSite, amo_enabled: !activeSite.amo_enabled })} style={{ padding: '5px 14px', background: activeSite.amo_enabled ? '#064e3b' : '#334155', border: 'none', borderRadius: '20px', color: activeSite.amo_enabled ? '#34d399' : '#94a3b8', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
            {activeSite.amo_enabled ? '● Включено' : '○ Выключено'}
          </button>
        </div>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Лиды автоматически отправляются в amoCRM</p>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
          <input value={activeSite.amo_subdomain} onChange={e => setActiveSite({ ...activeSite, amo_subdomain: e.target.value })} placeholder="yourcompany" style={{ flex: 1, padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px 0 0 6px', color: '#0f172a', fontSize: '14px', borderRight: 'none' }} />
          <span style={{ padding: '10px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '0 6px 6px 0', color: '#64748b', fontSize: '13px' }}>.amocrm.ru</span>
        </div>
        <input value={activeSite.amo_token} onChange={e => setActiveSite({ ...activeSite, amo_token: e.target.value })} placeholder="API токен" type="password" style={{ width: '100%', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '14px', marginBottom: '14px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <input value={activeSite.amo_pipeline_id} onChange={e => setActiveSite({ ...activeSite, amo_pipeline_id: e.target.value })} placeholder="ID воронки" style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '14px' }} />
          <input value={activeSite.amo_status_id} onChange={e => setActiveSite({ ...activeSite, amo_status_id: e.target.value })} placeholder="ID статуса" style={{ padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '14px' }} />
        </div>
      </div>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>💻 Свой код в &lt;head&gt;</h2>
        <textarea value={activeSite.custom_head} onChange={e => setActiveSite({ ...activeSite, custom_head: e.target.value })} placeholder="<!-- Вставьте любой код -->" rows={5} style={{ width: '100%', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical' }} />
      </div>
      <button onClick={updateSiteSettings} style={{ width: '100%', padding: '14px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '15px' }}>💾 Сохранить настройки</button>
    </div>
  )

  if (view === 'editor' && activeSite && activePage) return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', marginLeft: '-28px', marginTop: '-28px' }}>
      {/* Левая панель */}
      <div style={{ width: '260px', background: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <button onClick={() => setView('pages')} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', marginBottom: '8px', display: 'block' }}>← К страницам</button>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{activeSite.name}</h2>
          <p style={{ fontSize: '12px', color: '#60a5fa' }}>{activePage.name} <span style={{ color: '#475569' }}>{activePage.slug}</span></p>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Страницы</p>
          {activeSite.pages.map(page => (
            <button key={page.id} onClick={() => setActivePage(page)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', background: activePage.id === page.id ? '#1e3a8a' : 'transparent', color: activePage.id === page.id ? 'white' : '#94a3b8', marginBottom: '2px' }}>
              📄 {page.name}
            </button>
          ))}
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <button onClick={() => setShowBlockPicker(true)} style={{ width: '100%', padding: '10px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            + Добавить блок
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Блоки ({activePage.blocks?.length || 0})</p>
          {activePage.blocks?.map(block => (
            <div key={block.id} onClick={() => setEditingBlock(editingBlock?.id === block.id ? null : block)} style={{ padding: '7px 10px', background: editingBlock?.id === block.id ? '#1e3a8a' : '#1e293b', border: `1px solid ${editingBlock?.id === block.id ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#1e293b' }}>{BLOCKS[block.type]?.icon} {BLOCKS[block.type]?.label}</span>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button onClick={e => { e.stopPropagation(); moveBlock(block.id, 'up') }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '10px' }}>▲</button>
                <button onClick={e => { e.stopPropagation(); moveBlock(block.id, 'down') }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '10px' }}>▼</button>
                <button onClick={e => { e.stopPropagation(); deleteBlock(block.id) }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}>✕</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px', borderTop: '1px solid #e2e8f0' }}>
          {savedMsg && <p style={{ fontSize: '12px', color: '#34d399', textAlign: 'center', marginBottom: '6px' }}>✅ Сохранено!</p>}
          <button onClick={toggleStatus} style={{ width: '100%', padding: '9px', background: activeSite.status === 'published' ? '#064e3b' : '#1e3a8a', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
            {activeSite.status === 'published' ? '⏸ Снять' : '🚀 Опубликовать'}
          </button>
        </div>
      </div>

      {/* Центр - канвас */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
        <div style={{ padding: '10px 20px', background: 'white', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setPreview(false)} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', background: !preview ? '#3b82f6' : '#334155', color: 'white' }}>✏️ Редактор</button>
            <button onClick={() => setPreview(true)} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', background: preview ? '#3b82f6' : '#334155', color: 'white' }}>👁 Превью</button>
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{activePage.blocks?.length || 0} блоков</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {!activePage.blocks?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569' }}>
              <div style={{ fontSize: '56px', marginBottom: '16px' }}>🧩</div>
              <h3 style={{ fontSize: '18px', color: '#64748b', marginBottom: '8px' }}>Страница пуста</h3>
              <p style={{ fontSize: '14px', marginBottom: '24px' }}>Нажмите "+ Добавить блок" в левой панели</p>
              <button onClick={() => setShowBlockPicker(true)} style={{ padding: '12px 24px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: '600' }}>+ Добавить первый блок</button>
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

      {/* Правая панель */}
      {editingBlock && !preview && (
        <div style={{ width: '300px', background: '#f8fafc', borderLeft: '1px solid #e2e8f0', overflowY: 'auto' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{BLOCKS[editingBlock.type]?.icon} {BLOCKS[editingBlock.type]?.label}</h3>
            <button onClick={() => setEditingBlock(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' }}>✕</button>
          </div>

          {/* Выбор варианта */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase' }}>Вариант дизайна</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {BLOCKS[editingBlock.type]?.variants.map((variant, i) => (
                <button key={i} onClick={() => changeVariant(editingBlock.id, i)} style={{ padding: '8px 12px', background: (editingBlock.variant || 0) === i ? '#1e3a8a' : '#1e293b', border: `1px solid ${(editingBlock.variant || 0) === i ? '#3b82f6' : '#334155'}`, borderRadius: '6px', color: (editingBlock.variant || 0) === i ? 'white' : '#94a3b8', cursor: 'pointer', fontSize: '13px', textAlign: 'left' }}>
                  {(editingBlock.variant || 0) === i ? '✓ ' : ''}{variant}
                </button>
              ))}
            </div>
          </div>

          {/* Поля редактирования */}
          <div style={{ padding: '16px' }}>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', textTransform: 'uppercase' }}>Содержимое</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(editingBlock.content).map(([field, value]) => (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>
                    {fieldLabels[field] || field}
                  </label>
                  {field === 'text' || field === 'code' || field.startsWith('a') ? (
                    <textarea value={value} onChange={e => updateBlock(editingBlock.id, field, e.target.value)} rows={field === 'code' ? 6 : 3} style={{ width: '100%', padding: '8px 10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '12px', resize: 'vertical', fontFamily: field === 'code' ? 'monospace' : 'inherit' }} />
                  ) : (
                    <input value={value} onChange={e => updateBlock(editingBlock.id, field, e.target.value)} style={{ width: '100%', padding: '8px 10px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', fontSize: '12px' }} />
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => deleteBlock(editingBlock.id)} style={{ marginTop: '20px', width: '100%', padding: '10px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '6px', color: '#fca5a5', cursor: 'pointer', fontSize: '13px' }}>🗑️ Удалить блок</button>
          </div>
        </div>
      )}

      {/* Выбор блока */}
      {showBlockPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '700px', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>Выберите блок</h2>
              <button onClick={() => setShowBlockPicker(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '24px' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {(Object.entries(BLOCKS) as [BlockType, typeof BLOCKS[BlockType]][]).map(([type, info]) => (
                <div key={type}>
                  <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', textAlign: 'center' }}>{info.icon} {info.label}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {info.variants.map((variant, i) => (
                      <button key={i} onClick={() => addBlock(type, i)} style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#1e293b', cursor: 'pointer', fontSize: '12px', textAlign: 'left', transition: 'all 0.15s' }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#1e3a8a'; e.currentTarget.style.color = 'white' }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#1e293b' }}
                      >
                        {variant}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return null
}
