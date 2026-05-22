'use client'
import { useState, useEffect } from 'react'

interface Site { id: string; url: string; name: string }
interface LinkResult { url: string; status: number; ok: boolean }
interface HtmlResult {
  ok: boolean; httpStatus?: number; error?: string
  meta?: { title: string | null; description: string | null; h1: string | null; h1Count: number }
  social?: { links: string[]; results: LinkResult[] }
  links?: { checked: LinkResult[]; total: number; internalCount: number }
  images?: { count: number }
  forms?: { count: number; hasAmoCRM: boolean }
}
interface SpeedResult { score: number; fcp: string; lcp: string; tbt: string; cls: string; screenshot?: string }
interface CheckState {
  loading: { html: boolean; mobile: boolean; desktop: boolean }
  html?: HtmlResult; mobile?: SpeedResult; desktop?: SpeedResult; checkedAt?: string
}

const PSI = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

async function fetchSpeed(url: string, strategy: 'mobile' | 'desktop'): Promise<SpeedResult | null> {
  try {
    const res = await fetch(`${PSI}?url=${encodeURIComponent(url)}&strategy=${strategy}`)
    if (!res.ok) return null
    const d = await res.json()
    const lr = d.lighthouseResult
    if (!lr) return null
    return {
      score:      Math.round((lr.categories?.performance?.score || 0) * 100),
      fcp:        lr.audits?.['first-contentful-paint']?.displayValue || '—',
      lcp:        lr.audits?.['largest-contentful-paint']?.displayValue || '—',
      tbt:        lr.audits?.['total-blocking-time']?.displayValue || '—',
      cls:        lr.audits?.['cumulative-layout-shift']?.displayValue || '—',
      screenshot: lr.audits?.['final-screenshot']?.details?.data,
    }
  } catch { return null }
}

const scoreColor = (s: number) => s >= 90 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444'
const scoreLabel = (s: number) => s >= 90 ? 'Отлично' : s >= 50 ? 'Улучшить' : 'Плохо'
const statusColor = (s: number) => s < 400 ? '#22c55e' : '#ef4444'

export default function CheckerPage() {
  const [sites, setSites]       = useState<Site[]>([])
  const [newUrl, setNewUrl]     = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checks, setChecks]     = useState<Record<string, CheckState>>({})
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    try { const s = localStorage.getItem('checker-sites'); if (s) setSites(JSON.parse(s)) } catch {}
  }, [])

  const persist = (list: Site[]) => {
    setSites(list)
    localStorage.setItem('checker-sites', JSON.stringify(list))
  }

  const addSite = () => {
    let u = newUrl.trim()
    if (!u) return
    if (!u.startsWith('http')) u = 'https://' + u
    try {
      const site: Site = { id: Date.now().toString(), url: u, name: new URL(u).hostname }
      persist([...sites, site])
      setNewUrl('')
      setSelectedId(site.id)
    } catch { alert('Неверный URL') }
  }

  const removeSite = (id: string) => {
    persist(sites.filter(s => s.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const runCheck = async (site: Site) => {
    setSelectedId(site.id)
    setActiveTab('overview')
    setChecks(prev => ({ ...prev, [site.id]: { loading: { html: true, mobile: true, desktop: true }, checkedAt: new Date().toISOString() } }))

    const upd = (id: string, patch: Partial<CheckState>) =>
      setChecks(prev => ({ ...prev, [id]: { ...prev[id], ...patch, loading: { ...prev[id]?.loading, ...patch.loading } } }))

    fetch(`/api/check?url=${encodeURIComponent(site.url)}`)
      .then(r => r.json())
      .then(data => upd(site.id, { html: data, loading: { html: false } as any }))
      .catch(() => upd(site.id, { html: { ok: false, error: 'Ошибка подключения' }, loading: { html: false } as any }))

    fetchSpeed(site.url, 'mobile').then(data =>
      upd(site.id, { mobile: data || undefined, loading: { mobile: false } as any }))

    fetchSpeed(site.url, 'desktop').then(data =>
      upd(site.id, { desktop: data || undefined, loading: { desktop: false } as any }))
  }

  const sel   = sites.find(s => s.id === selectedId)
  const check = selectedId ? checks[selectedId] : null
  const busy  = check ? Object.values(check.loading).some(Boolean) : false

  const tabs = ['overview', 'speed', 'links', 'social', 'forms']
  const tabLabel: Record<string, string> = { overview: '📊 Обзор', speed: '⚡ Скорость', links: '🔗 Ссылки', social: '🌐 Соцсети', forms: '📋 Формы' }

  return (
    <>
      <style>{`
        @keyframes bgShimmer { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .ch-card {
          position: relative; overflow: hidden; border-radius: 12px; padding: 20px;
          border: 1px solid rgba(99,102,241,0.2);
          background: linear-gradient(135deg,#0d1424 0%,#1a1040 40%,#0f2040 70%,#151030 100%);
          background-size: 300% 300%; animation: bgShimmer 10s ease-in-out infinite;
          transition: border-color .25s, box-shadow .25s;
        }
        .ch-card:hover { border-color: rgba(99,102,241,.5); box-shadow: 0 0 24px rgba(59,130,246,.15); }
        .ch-site-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px; border-radius: 10px; cursor: pointer;
          border: 1px solid transparent; transition: all .2s; margin-bottom: 6px;
        }
        .ch-site-item:hover { background: rgba(255,255,255,.06); border-color: rgba(99,102,241,.3); }
        .ch-site-item.active { background: rgba(59,130,246,.18); border-color: rgba(99,102,241,.5); }
        .ch-tab { padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all .2s; border: 1px solid transparent; }
        .ch-tab:hover { background: rgba(255,255,255,.07); }
        .ch-tab.active { background: rgba(59,130,246,.25); border-color: rgba(99,102,241,.4); color: white; }
        .ch-spin { width:20px;height:20px;border:2px solid rgba(99,102,241,.3);border-top-color:#6366f1;border-radius:50%;animation:spin .8s linear infinite;display:inline-block; }
        .ch-row { display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06); }
        .ch-row:last-child { border-bottom: none; }
        .ch-badge { display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600; }
        .ch-input { background:rgba(255,255,255,.06);border:1px solid rgba(99,102,241,.3);border-radius:8px;color:#f1f5f9;padding:10px 14px;font-size:14px;outline:none;transition:border-color .2s; }
        .ch-input:focus { border-color:rgba(99,102,241,.7); }
        .ch-btn { padding:10px 18px;background:linear-gradient(135deg,#3b82f6,#4f46e5);color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;transition:all .2s; }
        .ch-btn:hover { opacity:.85;transform:translateY(-1px); }
        .ch-btn:disabled { opacity:.4;cursor:not-allowed;transform:none; }
        .ch-anim { animation: fadeIn .35s ease; }
        .orb1 { position:absolute;top:-40px;right:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,#3b82f6 0%,transparent 70%);opacity:.18;pointer-events:none; }
        .orb2 { position:absolute;bottom:-30px;left:-30px;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,#7c3aed 0%,transparent 70%);opacity:.15;pointer-events:none; }
      `}</style>

      {/* Заголовок */}
      <div className="ch-card" style={{ marginBottom: 24 }}>
        <div className="orb1" /><div className="orb2" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>🔍 Проверка сайтов</h1>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Скорость, ссылки, соцсети, формы и интеграция с AmoCRM</p>
        </div>
      </div>

      {/* Добавить сайт */}
      <div className="ch-card" style={{ marginBottom: 24 }}>
        <div className="orb1" style={{ background: 'radial-gradient(circle,#0ea5e9 0%,transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Добавить сайт</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="ch-input"
              style={{ flex: 1 }}
              placeholder="https://example.com"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSite()}
            />
            <button className="ch-btn" onClick={addSite}>+ Добавить</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Список сайтов */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <p style={{ color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            Сайты ({sites.length})
          </p>
          {sites.length === 0 && (
            <div style={{ color: '#475569', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>
              Нет добавленных сайтов
            </div>
          )}
          {sites.map(site => {
            const c = checks[site.id]
            const isBusy = c ? Object.values(c.loading).some(Boolean) : false
            const isDone = c && !isBusy
            const hasError = isDone && c.html && !c.html.ok
            return (
              <div key={site.id} className={`ch-site-item${selectedId === site.id ? ' active' : ''}`} onClick={() => setSelectedId(site.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {site.name}
                  </div>
                  <div style={{ color: '#475569', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {site.url}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, flexShrink: 0 }}>
                  {isBusy && <span className="ch-spin" />}
                  {isDone && !hasError && <span style={{ color: '#22c55e', fontSize: 16 }}>✓</span>}
                  {hasError && <span style={{ color: '#ef4444', fontSize: 16 }}>✗</span>}
                  <button
                    onClick={e => { e.stopPropagation(); runCheck(site) }}
                    disabled={isBusy}
                    style={{ padding: '4px 10px', background: 'rgba(59,130,246,.25)', border: '1px solid rgba(99,102,241,.4)', borderRadius: 6, color: '#93c5fd', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                  >
                    {isBusy ? '...' : '▶'}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); removeSite(site.id) }}
                    style={{ padding: '4px 8px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 6, color: '#fca5a5', fontSize: 12, cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Результаты */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!sel && (
            <div className="ch-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <p style={{ color: '#64748b', fontSize: 15 }}>Выберите сайт и нажмите ▶ для проверки</p>
            </div>
          )}

          {sel && (
            <div className="ch-anim">
              {/* Заголовок сайта */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 600 }}>{sel.name}</h2>
                  <a href={sel.url} target="_blank" rel="noopener" style={{ color: '#6366f1', fontSize: 13 }}>{sel.url}</a>
                </div>
                <button className="ch-btn" onClick={() => runCheck(sel)} disabled={busy}>
                  {busy ? <><span className="ch-spin" style={{ marginRight: 8 }} />Проверяю...</> : '▶ Проверить сейчас'}
                </button>
              </div>

              {/* Tabs */}
              {check && (
                <>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                    {tabs.map(t => (
                      <button key={t} className={`ch-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)} style={{ color: activeTab === t ? 'white' : '#94a3b8' }}>
                        {tabLabel[t]}
                      </button>
                    ))}
                  </div>

                  {/* ── ОБЗОР ── */}
                  {activeTab === 'overview' && (
                    <div className="ch-anim">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
                        {/* HTTP статус */}
                        <div className="ch-card" style={{ padding: 16 }}>
                          <div className="orb2" />
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            <p style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>HTTP статус</p>
                            {check.loading.html
                              ? <div className="ch-spin" style={{ marginTop: 10 }} />
                              : <div style={{ fontSize: 28, fontWeight: 700, color: check.html?.httpStatus && check.html.httpStatus < 400 ? '#22c55e' : '#ef4444', marginTop: 6 }}>
                                  {check.html?.httpStatus || (check.html?.ok === false ? '✗' : '—')}
                                </div>
                            }
                            <p style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                              {check.html?.httpStatus === 200 ? 'Доступен' : check.html?.httpStatus ? 'Проблема' : check.loading.html ? 'Проверяю...' : '—'}
                            </p>
                          </div>
                        </div>
                        {/* Скорость мобилка */}
                        <div className="ch-card" style={{ padding: 16 }}>
                          <div className="orb1" />
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            <p style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📱 Мобилка</p>
                            {check.loading.mobile
                              ? <div className="ch-spin" style={{ marginTop: 10 }} />
                              : check.mobile
                                ? <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor(check.mobile.score), marginTop: 6 }}>{check.mobile.score}</div>
                                : <div style={{ color: '#475569', marginTop: 6 }}>—</div>
                            }
                            <p style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{check.mobile ? scoreLabel(check.mobile.score) : check.loading.mobile ? 'Проверяю...' : 'Нет данных'}</p>
                          </div>
                        </div>
                        {/* Скорость десктоп */}
                        <div className="ch-card" style={{ padding: 16 }}>
                          <div className="orb1" style={{ background: 'radial-gradient(circle,#7c3aed 0%,transparent 70%)' }} />
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            <p style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🖥️ Десктоп</p>
                            {check.loading.desktop
                              ? <div className="ch-spin" style={{ marginTop: 10 }} />
                              : check.desktop
                                ? <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor(check.desktop.score), marginTop: 6 }}>{check.desktop.score}</div>
                                : <div style={{ color: '#475569', marginTop: 6 }}>—</div>
                            }
                            <p style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{check.desktop ? scoreLabel(check.desktop.score) : check.loading.desktop ? 'Проверяю...' : 'Нет данных'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Meta */}
                      {!check.loading.html && check.html?.meta && (
                        <div className="ch-card ch-anim">
                          <div className="orb2" />
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            <p style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>SEO & Мета</p>
                            {[
                              { label: 'Title', value: check.html.meta.title },
                              { label: 'Description', value: check.html.meta.description },
                              { label: 'H1', value: check.html.meta.h1 },
                            ].map(row => (
                              <div key={row.label} className="ch-row">
                                <span style={{ color: '#64748b', fontSize: 13, width: 100 }}>{row.label}</span>
                                <span style={{ color: row.value ? '#f1f5f9' : '#475569', fontSize: 13, flex: 1, textAlign: 'right' }}>
                                  {row.value || '— не найдено'}
                                </span>
                              </div>
                            ))}
                            <div className="ch-row">
                              <span style={{ color: '#64748b', fontSize: 13, width: 100 }}>Кол-во H1</span>
                              <span style={{ color: (check.html.meta.h1Count || 0) === 1 ? '#22c55e' : '#f59e0b', fontSize: 13 }}>
                                {check.html.meta.h1Count || 0} {(check.html.meta.h1Count || 0) !== 1 && '⚠ рекомендуется 1'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Быстрые итоги */}
                      {!check.loading.html && check.html?.ok && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 14 }} className="ch-anim">
                          {[
                            { label: 'Ссылок найдено', value: check.html.links?.total ?? '—', icon: '🔗' },
                            { label: 'Изображений', value: check.html.images?.count ?? '—', icon: '🖼' },
                            { label: 'Форм', value: check.html.forms?.count ?? '—', icon: '📋' },
                            { label: 'AmoCRM', value: check.html.forms?.hasAmoCRM ? '✅ Да' : '❌ Нет', icon: '🤝', color: check.html.forms?.hasAmoCRM ? '#22c55e' : '#ef4444' },
                          ].map(item => (
                            <div key={item.label} className="ch-card" style={{ padding: 14, textAlign: 'center' }}>
                              <div style={{ fontSize: 22 }}>{item.icon}</div>
                              <div style={{ fontSize: 22, fontWeight: 700, color: (item as any).color || '#f1f5f9', marginTop: 4 }}>{item.value}</div>
                              <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{item.label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── СКОРОСТЬ ── */}
                  {activeTab === 'speed' && (
                    <div className="ch-anim">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {(['mobile', 'desktop'] as const).map(type => {
                          const data = check[type]
                          const loading = check.loading[type]
                          const label = type === 'mobile' ? '📱 Мобилка' : '🖥️ Десктоп'
                          return (
                            <div key={type} className="ch-card">
                              <div className="orb1" />
                              <div style={{ position: 'relative', zIndex: 1 }}>
                                <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>{label}</p>
                                {loading && <div style={{ display:'flex',alignItems:'center',gap:10,color:'#64748b',fontSize:13 }}><span className="ch-spin" />Анализирую (10–30 сек)...</div>}
                                {!loading && !data && <p style={{ color: '#475569' }}>Нет данных</p>}
                                {!loading && data && (
                                  <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                                      <div style={{ fontSize: 52, fontWeight: 700, color: scoreColor(data.score), lineHeight: 1 }}>{data.score}</div>
                                      <div>
                                        <span className="ch-badge" style={{ background: `${scoreColor(data.score)}22`, color: scoreColor(data.score), border: `1px solid ${scoreColor(data.score)}44` }}>
                                          {scoreLabel(data.score)}
                                        </span>
                                        <p style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Performance score</p>
                                      </div>
                                    </div>
                                    {[
                                      { label: 'FCP (первый контент)', value: data.fcp },
                                      { label: 'LCP (крупный контент)', value: data.lcp },
                                      { label: 'TBT (блокировка)', value: data.tbt },
                                      { label: 'CLS (сдвиги)', value: data.cls },
                                    ].map(m => (
                                      <div key={m.label} className="ch-row">
                                        <span style={{ color: '#64748b', fontSize: 13 }}>{m.label}</span>
                                        <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 500 }}>{m.value}</span>
                                      </div>
                                    ))}
                                    {data.screenshot && (
                                      <div style={{ marginTop: 14 }}>
                                        <p style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>Скриншот</p>
                                        <img src={data.screenshot} alt="screenshot" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(99,102,241,.3)' }} />
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── ССЫЛКИ ── */}
                  {activeTab === 'links' && (
                    <div className="ch-anim">
                      {check.loading.html
                        ? <div className="ch-card" style={{ display:'flex',alignItems:'center',gap:12,color:'#64748b' }}><span className="ch-spin" />Проверяю ссылки...</div>
                        : check.html?.links
                          ? (
                            <div className="ch-card">
                              <div className="orb1" /><div className="orb2" />
                              <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                                  <div><span style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700 }}>{check.html.links.total}</span><span style={{ color: '#64748b', fontSize: 13, marginLeft: 6 }}>всего ссылок</span></div>
                                  <div><span style={{ color: '#22c55e', fontSize: 20, fontWeight: 700 }}>{check.html.links.checked.filter(l => l.ok).length}</span><span style={{ color: '#64748b', fontSize: 13, marginLeft: 6 }}>работают</span></div>
                                  <div><span style={{ color: '#ef4444', fontSize: 20, fontWeight: 700 }}>{check.html.links.checked.filter(l => !l.ok).length}</span><span style={{ color: '#64748b', fontSize: 13, marginLeft: 6 }}>битых</span></div>
                                </div>
                                {check.html.links.checked.map((link, i) => (
                                  <div key={i} className="ch-row" style={{ gap: 10 }}>
                                    <span className="ch-badge" style={{ background: link.ok ? '#22c55e22' : '#ef444422', color: statusColor(link.status), border: `1px solid ${statusColor(link.status)}44`, flexShrink: 0 }}>
                                      {link.status || '✗'}
                                    </span>
                                    <span style={{ color: '#94a3b8', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                      {link.url}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                          : <div className="ch-card" style={{ color: '#475569' }}>Нет данных — запустите проверку</div>
                      }
                    </div>
                  )}

                  {/* ── СОЦСЕТИ ── */}
                  {activeTab === 'social' && (
                    <div className="ch-anim">
                      {check.loading.html
                        ? <div className="ch-card" style={{ display:'flex',alignItems:'center',gap:12,color:'#64748b' }}><span className="ch-spin" />Ищу ссылки на соцсети...</div>
                        : (
                          <div className="ch-card">
                            <div className="orb1" style={{ background: 'radial-gradient(circle,#0ea5e9 0%,transparent 70%)' }} />
                            <div style={{ position: 'relative', zIndex: 1 }}>
                              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 14 }}>
                                Найдено ссылок на соцсети: <strong style={{ color: '#f1f5f9' }}>{check.html?.social?.links.length ?? 0}</strong>
                              </p>
                              {(!check.html?.social?.links.length) && (
                                <p style={{ color: '#475569', fontSize: 14 }}>Ссылки на соцсети не найдены</p>
                              )}
                              {check.html?.social?.results.map((r, i) => {
                                const domain = (() => { try { return new URL(r.url).hostname.replace('www.','') } catch { return r.url } })()
                                return (
                                  <div key={i} className="ch-row" style={{ gap: 10 }}>
                                    <span className="ch-badge" style={{ background: r.ok ? '#22c55e22' : '#ef444422', color: r.ok ? '#22c55e' : '#ef4444', border: `1px solid ${r.ok ? '#22c55e' : '#ef4444'}44`, flexShrink: 0 }}>
                                      {r.ok ? '✓' : '✗'} {r.status || 'err'}
                                    </span>
                                    <a href={r.url} target="_blank" rel="noopener" style={{ color: '#6366f1', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{domain}</a>
                                    <span style={{ color: r.ok ? '#22c55e' : '#ef4444', fontSize: 12, flexShrink: 0 }}>{r.ok ? 'Работает' : 'Недоступна'}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      }
                    </div>
                  )}

                  {/* ── ФОРМЫ ── */}
                  {activeTab === 'forms' && (
                    <div className="ch-anim">
                      {check.loading.html
                        ? <div className="ch-card" style={{ display:'flex',alignItems:'center',gap:12,color:'#64748b' }}><span className="ch-spin" />Проверяю формы...</div>
                        : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="ch-card">
                              <div className="orb2" />
                              <div style={{ position: 'relative', zIndex: 1 }}>
                                <p style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Формы на странице</p>
                                <div className="ch-row">
                                  <span style={{ color: '#64748b', fontSize: 14 }}>Найдено форм</span>
                                  <span style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>{check.html?.forms?.count ?? '—'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="ch-card">
                              <div className="orb1" style={{ background: 'radial-gradient(circle,#f59e0b 0%,transparent 70%)' }} />
                              <div style={{ position: 'relative', zIndex: 1 }}>
                                <p style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Интеграция с AmoCRM / Kommo</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <span style={{ fontSize: 36 }}>{check.html?.forms?.hasAmoCRM ? '✅' : '❌'}</span>
                                  <div>
                                    <p style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600 }}>
                                      {check.html?.forms?.hasAmoCRM ? 'Интеграция обнаружена' : 'Интеграция не найдена'}
                                    </p>
                                    <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
                                      {check.html?.forms?.hasAmoCRM
                                        ? 'На странице найдены следы кода AmoCRM/Kommo'
                                        : 'Код AmoCRM/Kommo не обнаружен в HTML'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {!check.html?.forms?.hasAmoCRM && (check.html?.forms?.count ?? 0) > 0 && (
                              <div className="ch-card" style={{ borderColor: 'rgba(245,158,11,.3)' }}>
                                <p style={{ color: '#f59e0b', fontSize: 13 }}>
                                  ⚠️ На сайте есть формы, но интеграция с AmoCRM не найдена. Возможно, данные форм не попадают в CRM.
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      }
                    </div>
                  )}
                </>
              )}

              {/* Пустое состояние — ещё не запускали */}
              {!check && (
                <div className="ch-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>▶</div>
                  <p style={{ color: '#64748b' }}>Нажмите «Проверить сейчас» чтобы начать</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
