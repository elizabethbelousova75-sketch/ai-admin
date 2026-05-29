'use client'
import { useState, useEffect, useRef } from 'react'

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
interface FormCheckResult {
  step: 'idle' | 'submitting' | 'waiting' | 'searching' | 'done' | 'error'
  countdown?: number
  submittedAt?: number
  fieldsFound?: number
  formAction?: string
  testData?: { name: string; phone: string; email: string }
  lead?: { id: number; name: string }
  leadUrl?: string
  error?: string
  closed?: boolean
}
interface CheckState {
  loading: { html: boolean; mobile: boolean; desktop: boolean }
  html?: HtmlResult; mobile?: SpeedResult; desktop?: SpeedResult; checkedAt?: string
  formCheck?: FormCheckResult
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
  const [sites, setSites]           = useState<Site[]>([])
  const [newUrl, setNewUrl]         = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checks, setChecks]         = useState<Record<string, CheckState>>({})
  const [activeTab, setActiveTab]   = useState('overview')
  const countdownRef                = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    try { const s = localStorage.getItem('checker-sites'); if (s) setSites(JSON.parse(s)) } catch {}
  }, [])

  const persist = (list: Site[]) => { setSites(list); localStorage.setItem('checker-sites', JSON.stringify(list)) }

  const addSite = () => {
    let u = newUrl.trim()
    if (!u) return
    if (!u.startsWith('http')) u = 'https://' + u
    try {
      const site: Site = { id: Date.now().toString(), url: u, name: new URL(u).hostname }
      persist([...sites, site]); setNewUrl(''); setSelectedId(site.id)
    } catch { alert('Неверный URL') }
  }

  const removeSite = (id: string) => { persist(sites.filter(s => s.id !== id)); if (selectedId === id) setSelectedId(null) }

  const updCheck = (id: string, patch: Partial<CheckState>) =>
    setChecks(prev => ({ ...prev, [id]: { ...prev[id], ...patch, loading: { ...prev[id]?.loading, ...patch.loading } } }))

  const updForm = (id: string, patch: Partial<FormCheckResult>) =>
    setChecks(prev => ({
      ...prev,
      [id]: { ...prev[id], formCheck: { ...prev[id]?.formCheck, ...patch } as FormCheckResult }
    }))

  const runCheck = async (site: Site) => {
    setSelectedId(site.id); setActiveTab('overview')
    setChecks(prev => ({ ...prev, [site.id]: { loading: { html: true, mobile: true, desktop: true }, checkedAt: new Date().toISOString() } }))

    fetch(`/api/check?url=${encodeURIComponent(site.url)}`)
      .then(r => r.json())
      .then(data => {
        updCheck(site.id, { html: data, loading: { html: false } as any })
        // Автозапуск проверки формы после HTML анализа
        if (data.ok && data.forms?.count > 0) {
          runFormCheck(site)
        }
      })
      .catch(() => updCheck(site.id, { html: { ok: false, error: 'Ошибка подключения' }, loading: { html: false } as any }))

    fetchSpeed(site.url, 'mobile').then(data => updCheck(site.id, { mobile: data || undefined, loading: { mobile: false } as any }))
    fetchSpeed(site.url, 'desktop').then(data => updCheck(site.id, { desktop: data || undefined, loading: { desktop: false } as any }))
  }

  const runFormCheck = async (site: Site) => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    updForm(site.id, { step: 'submitting', error: undefined, lead: undefined, leadUrl: undefined, closed: false })

    // Шаг 1: отправить форму
    const submitRes = await fetch('/api/amo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'submit_form', siteUrl: site.url }),
    }).then(r => r.json()).catch(() => ({ ok: false, error: 'Ошибка сети' }))

    if (!submitRes.ok) {
      updForm(site.id, { step: 'error', error: submitRes.error || 'Не удалось отправить форму' })
      return
    }

    const { submittedAt, fieldsFound, formAction, testData } = submitRes

    // Шаг 2: обратный отсчёт 12 секунд
    let countdown = 12
    updForm(site.id, { step: 'waiting', countdown, submittedAt, fieldsFound, formAction, testData })

    await new Promise<void>(resolve => {
      countdownRef.current = setInterval(() => {
        countdown--
        updForm(site.id, { countdown })
        if (countdown <= 0) {
          clearInterval(countdownRef.current!)
          resolve()
        }
      }, 1000)
    })

    // Шаг 3: искать лид в AmoCRM
    updForm(site.id, { step: 'searching' })

    const findRes = await fetch('/api/amo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'find_lead', since: submittedAt, phone: testData?.phone || '' }),
    }).then(r => r.json()).catch(() => ({ ok: false, error: 'Ошибка поиска' }))

    if (!findRes.ok) {
      updForm(site.id, { step: 'error', error: findRes.error || findRes.message || 'Лид не найден в AmoCRM' })
      return
    }

    updForm(site.id, { step: 'done', lead: findRes.lead, leadUrl: findRes.leadUrl })

    // Шаг 4: пометить и закрыть
    await fetch('/api/amo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close_lead', leadId: findRes.lead.id }),
    }).then(r => r.json()).catch(() => null)

    updForm(site.id, { closed: true })
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
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .ch-card { position:relative;overflow:hidden;border-radius:12px;padding:20px;border:1px solid rgba(99,102,241,0.2);background:linear-gradient(135deg,#0d1424 0%,#1a1040 40%,#0f2040 70%,#151030 100%);background-size:300% 300%;animation:bgShimmer 10s ease-in-out infinite;transition:border-color .25s,box-shadow .25s; }
        .ch-card:hover { border-color:rgba(99,102,241,.5);box-shadow:0 0 24px rgba(59,130,246,.15); }
        .ch-site-item { display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:10px;cursor:pointer;border:1px solid transparent;transition:all .2s;margin-bottom:6px; }
        .ch-site-item:hover { background:rgba(255,255,255,.06);border-color:rgba(99,102,241,.3); }
        .ch-site-item.active { background:rgba(59,130,246,.18);border-color:rgba(99,102,241,.5); }
        .ch-tab { padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all .2s;border:1px solid transparent; }
        .ch-tab:hover { background:rgba(255,255,255,.07); }
        .ch-tab.active { background:rgba(59,130,246,.25);border-color:rgba(99,102,241,.4);color:white; }
        .ch-spin { width:20px;height:20px;border:2px solid rgba(99,102,241,.3);border-top-color:#6366f1;border-radius:50%;animation:spin .8s linear infinite;display:inline-block; }
        .ch-row { display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06); }
        .ch-row:last-child { border-bottom:none; }
        .ch-badge { display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600; }
        .ch-input { background:rgba(255,255,255,.06);border:1px solid rgba(99,102,241,.3);border-radius:8px;color:#f1f5f9;padding:10px 14px;font-size:14px;outline:none;transition:border-color .2s; }
        .ch-input:focus { border-color:rgba(99,102,241,.7); }
        .ch-btn { padding:10px 18px;background:linear-gradient(135deg,#3b82f6,#4f46e5);color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;transition:all .2s; }
        .ch-btn:hover { opacity:.85;transform:translateY(-1px); }
        .ch-btn:disabled { opacity:.4;cursor:not-allowed;transform:none; }
        .ch-btn-green { background:linear-gradient(135deg,#16a34a,#15803d); }
        .ch-anim { animation:fadeIn .35s ease; }
        .ch-pulse { animation:pulse 1.5s ease-in-out infinite; }
        .orb1 { position:absolute;top:-40px;right:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,#3b82f6 0%,transparent 70%);opacity:.18;pointer-events:none; }
        .orb2 { position:absolute;bottom:-30px;left:-30px;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,#7c3aed 0%,transparent 70%);opacity:.15;pointer-events:none; }
      `}</style>

      {/* Заголовок */}
      <div className="ch-card" style={{ marginBottom:24 }}>
        <div className="orb1" /><div className="orb2" />
        <div style={{ position:'relative',zIndex:1 }}>
          <h1 style={{ fontSize:26,fontWeight:700,color:'#f1f5f9',marginBottom:6 }}>🔍 Проверка сайтов</h1>
          <p style={{ color:'#94a3b8',fontSize:14 }}>Скорость, ссылки, соцсети, формы и интеграция с AmoCRM</p>
        </div>
      </div>

      {/* Добавить сайт */}
      <div className="ch-card" style={{ marginBottom:24 }}>
        <div className="orb1" style={{ background:'radial-gradient(circle,#0ea5e9 0%,transparent 70%)' }} />
        <div style={{ position:'relative',zIndex:1 }}>
          <p style={{ color:'#94a3b8',fontSize:13,marginBottom:10,textTransform:'uppercase',letterSpacing:'0.5px' }}>Добавить сайт</p>
          <div style={{ display:'flex',gap:10 }}>
            <input className="ch-input" style={{ flex:1 }} placeholder="https://example.com" value={newUrl}
              onChange={e => setNewUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSite()} />
            <button className="ch-btn" onClick={addSite}>+ Добавить</button>
          </div>
        </div>
      </div>

      <div style={{ display:'flex',gap:20,alignItems:'flex-start' }}>
        {/* Список сайтов */}
        <div style={{ width:280,flexShrink:0 }}>
          <p style={{ color:'#64748b',fontSize:12,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10 }}>Сайты ({sites.length})</p>
          {sites.length === 0 && <div style={{ color:'#475569',fontSize:14,textAlign:'center',padding:'32px 0' }}>Нет добавленных сайтов</div>}
          {sites.map(site => {
            const c = checks[site.id]
            const isBusy = c ? Object.values(c.loading).some(Boolean) : false
            const isDone = c && !isBusy
            const hasError = isDone && c.html && !c.html.ok
            return (
              <div key={site.id} className={`ch-site-item${selectedId === site.id ? ' active' : ''}`} onClick={() => setSelectedId(site.id)}>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ color:'#f1f5f9',fontSize:14,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{site.name}</div>
                  <div style={{ color:'#475569',fontSize:11,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{site.url}</div>
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginLeft:8,flexShrink:0 }}>
                  {isBusy && <span className="ch-spin" />}
                  {isDone && !hasError && <span style={{ color:'#22c55e',fontSize:16 }}>✓</span>}
                  {hasError && <span style={{ color:'#ef4444',fontSize:16 }}>✗</span>}
                  <button onClick={e => { e.stopPropagation(); runCheck(site) }} disabled={isBusy}
                    style={{ padding:'4px 10px',background:'rgba(59,130,246,.25)',border:'1px solid rgba(99,102,241,.4)',borderRadius:6,color:'#93c5fd',fontSize:12,cursor:'pointer',fontWeight:600 }}>
                    {isBusy ? '...' : '▶'}
                  </button>
                  <button onClick={e => { e.stopPropagation(); removeSite(site.id) }}
                    style={{ padding:'4px 8px',background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',borderRadius:6,color:'#fca5a5',fontSize:12,cursor:'pointer' }}>✕</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Результаты */}
        <div style={{ flex:1,minWidth:0 }}>
          {!sel && (
            <div className="ch-card" style={{ textAlign:'center',padding:'60px 20px' }}>
              <div style={{ fontSize:48,marginBottom:16 }}>🔍</div>
              <p style={{ color:'#64748b',fontSize:15 }}>Выберите сайт и нажмите ▶ для проверки</p>
            </div>
          )}

          {sel && (
            <div className="ch-anim">
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10 }}>
                <div>
                  <h2 style={{ color:'#f1f5f9',fontSize:18,fontWeight:600 }}>{sel.name}</h2>
                  <a href={sel.url} target="_blank" rel="noopener" style={{ color:'#6366f1',fontSize:13 }}>{sel.url}</a>
                </div>
                <button className="ch-btn" onClick={() => runCheck(sel)} disabled={busy}>
                  {busy ? <><span className="ch-spin" style={{ marginRight:8 }} />Проверяю...</> : '▶ Проверить сейчас'}
                </button>
              </div>

              {check && (
                <>
                  <div style={{ display:'flex',gap:6,marginBottom:20,flexWrap:'wrap' }}>
                    {tabs.map(t => (
                      <button key={t} className={`ch-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)} style={{ color:activeTab === t ? 'white' : '#94a3b8' }}>
                        {tabLabel[t]}
                      </button>
                    ))}
                  </div>

                  {/* ── ОБЗОР ── */}
                  {activeTab === 'overview' && (
                    <div className="ch-anim">
                      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20 }}>
                        {[
                          { label:'HTTP статус', loading:check.loading.html, value:check.html?.httpStatus, ok: check.html?.httpStatus ? check.html.httpStatus < 400 : null, sub: check.html?.httpStatus === 200 ? 'Доступен' : check.html?.httpStatus ? 'Проблема' : '' },
                          { label:'📱 Мобилка',  loading:check.loading.mobile,  value:check.mobile?.score,   ok: check.mobile ? true : null, sub: check.mobile ? scoreLabel(check.mobile.score) : '' },
                          { label:'🖥️ Десктоп', loading:check.loading.desktop, value:check.desktop?.score,  ok: check.desktop ? true : null, sub: check.desktop ? scoreLabel(check.desktop.score) : '' },
                        ].map(card => (
                          <div key={card.label} className="ch-card" style={{ padding:16 }}>
                            <div className="orb2" />
                            <div style={{ position:'relative',zIndex:1 }}>
                              <p style={{ color:'#94a3b8',fontSize:12,textTransform:'uppercase',letterSpacing:'0.5px' }}>{card.label}</p>
                              {card.loading ? <div className="ch-spin" style={{ marginTop:10 }} />
                                : card.value !== undefined
                                  ? <div style={{ fontSize:28,fontWeight:700,color: typeof card.value === 'number' && card.label !== 'HTTP статус' ? scoreColor(card.value as number) : card.ok ? '#22c55e' : '#ef4444',marginTop:6 }}>{card.value}</div>
                                  : <div style={{ color:'#475569',marginTop:6 }}>—</div>}
                              <p style={{ color:'#64748b',fontSize:11,marginTop:4 }}>{card.loading ? 'Проверяю...' : card.sub || '—'}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {!check.loading.html && check.html?.meta && (
                        <div className="ch-card ch-anim" style={{ marginBottom:14 }}>
                          <div className="orb2" />
                          <div style={{ position:'relative',zIndex:1 }}>
                            <p style={{ color:'#94a3b8',fontSize:12,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12 }}>SEO & Мета</p>
                            {[{ label:'Title',value:check.html.meta.title },{ label:'Description',value:check.html.meta.description },{ label:'H1',value:check.html.meta.h1 }].map(row => (
                              <div key={row.label} className="ch-row">
                                <span style={{ color:'#64748b',fontSize:13,width:100 }}>{row.label}</span>
                                <span style={{ color:row.value?'#f1f5f9':'#475569',fontSize:13,flex:1,textAlign:'right' }}>{row.value||'— не найдено'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!check.loading.html && check.html?.ok && (
                        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 }} className="ch-anim">
                          {[
                            { label:'Ссылок найдено',value:check.html.links?.total??'—',icon:'🔗' },
                            { label:'Изображений',value:check.html.images?.count??'—',icon:'🖼' },
                            { label:'Форм',value:check.html.forms?.count??'—',icon:'📋' },
                            { label:'AmoCRM',value:check.html.forms?.hasAmoCRM?'✅ Да':'❌ Нет',icon:'🤝',color:check.html.forms?.hasAmoCRM?'#22c55e':'#ef4444' },
                          ].map(item => (
                            <div key={item.label} className="ch-card" style={{ padding:14,textAlign:'center' }}>
                              <div style={{ fontSize:22 }}>{item.icon}</div>
                              <div style={{ fontSize:22,fontWeight:700,color:(item as any).color||'#f1f5f9',marginTop:4 }}>{item.value}</div>
                              <div style={{ color:'#64748b',fontSize:11,marginTop:2 }}>{item.label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── СКОРОСТЬ ── */}
                  {activeTab === 'speed' && (
                    <div className="ch-anim" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
                      {(['mobile','desktop'] as const).map(type => {
                        const data = check[type]; const loading = check.loading[type]
                        return (
                          <div key={type} className="ch-card">
                            <div className="orb1" />
                            <div style={{ position:'relative',zIndex:1 }}>
                              <p style={{ color:'#94a3b8',fontSize:13,marginBottom:12 }}>{type==='mobile'?'📱 Мобилка':'🖥️ Десктоп'}</p>
                              {loading && <div style={{ display:'flex',alignItems:'center',gap:10,color:'#64748b',fontSize:13 }}><span className="ch-spin" />Анализирую (10–30 сек)...</div>}
                              {!loading && !data && <p style={{ color:'#475569' }}>Нет данных</p>}
                              {!loading && data && (
                                <>
                                  <div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:16 }}>
                                    <div style={{ fontSize:52,fontWeight:700,color:scoreColor(data.score),lineHeight:1 }}>{data.score}</div>
                                    <span className="ch-badge" style={{ background:`${scoreColor(data.score)}22`,color:scoreColor(data.score),border:`1px solid ${scoreColor(data.score)}44` }}>{scoreLabel(data.score)}</span>
                                  </div>
                                  {[['FCP',data.fcp],['LCP',data.lcp],['TBT',data.tbt],['CLS',data.cls]].map(([k,v]) => (
                                    <div key={k} className="ch-row"><span style={{ color:'#64748b',fontSize:13 }}>{k}</span><span style={{ color:'#f1f5f9',fontSize:13,fontWeight:500 }}>{v}</span></div>
                                  ))}
                                  {data.screenshot && <img src={data.screenshot} alt="screenshot" style={{ width:'100%',borderRadius:8,border:'1px solid rgba(99,102,241,.3)',marginTop:14 }} />}
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ── ССЫЛКИ ── */}
                  {activeTab === 'links' && (
                    <div className="ch-anim">
                      {check.loading.html ? <div className="ch-card" style={{ display:'flex',alignItems:'center',gap:12,color:'#64748b' }}><span className="ch-spin" />Проверяю ссылки...</div>
                        : check.html?.links ? (
                          <div className="ch-card">
                            <div className="orb1" /><div className="orb2" />
                            <div style={{ position:'relative',zIndex:1 }}>
                              <div style={{ display:'flex',gap:20,marginBottom:14 }}>
                                <div><span style={{ color:'#f1f5f9',fontSize:20,fontWeight:700 }}>{check.html.links.total}</span><span style={{ color:'#64748b',fontSize:13,marginLeft:6 }}>всего</span></div>
                                <div><span style={{ color:'#22c55e',fontSize:20,fontWeight:700 }}>{check.html.links.checked.filter(l=>l.ok).length}</span><span style={{ color:'#64748b',fontSize:13,marginLeft:6 }}>работают</span></div>
                                <div><span style={{ color:'#ef4444',fontSize:20,fontWeight:700 }}>{check.html.links.checked.filter(l=>!l.ok).length}</span><span style={{ color:'#64748b',fontSize:13,marginLeft:6 }}>битых</span></div>
                              </div>
                              {check.html.links.checked.map((link,i) => (
                                <div key={i} className="ch-row" style={{ gap:10 }}>
                                  <span className="ch-badge" style={{ background:link.ok?'#22c55e22':'#ef444422',color:statusColor(link.status),border:`1px solid ${statusColor(link.status)}44`,flexShrink:0 }}>{link.status||'✗'}</span>
                                  <span style={{ color:'#94a3b8',fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>{link.url}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : <div className="ch-card" style={{ color:'#475569' }}>Нет данных — запустите проверку</div>}
                    </div>
                  )}

                  {/* ── СОЦСЕТИ ── */}
                  {activeTab === 'social' && (
                    <div className="ch-anim">
                      {check.loading.html ? <div className="ch-card" style={{ display:'flex',alignItems:'center',gap:12,color:'#64748b' }}><span className="ch-spin" />Ищу ссылки на соцсети...</div>
                        : (
                          <div className="ch-card">
                            <div className="orb1" style={{ background:'radial-gradient(circle,#0ea5e9 0%,transparent 70%)' }} />
                            <div style={{ position:'relative',zIndex:1 }}>
                              <p style={{ color:'#94a3b8',fontSize:13,marginBottom:14 }}>Найдено: <strong style={{ color:'#f1f5f9' }}>{check.html?.social?.links.length??0}</strong></p>
                              {!check.html?.social?.links.length && <p style={{ color:'#475569',fontSize:14 }}>Ссылки на соцсети не найдены</p>}
                              {check.html?.social?.results.map((r,i) => {
                                const domain = (() => { try { return new URL(r.url).hostname.replace('www.','') } catch { return r.url } })()
                                return (
                                  <div key={i} className="ch-row" style={{ gap:10 }}>
                                    <span className="ch-badge" style={{ background:r.ok?'#22c55e22':'#ef444422',color:r.ok?'#22c55e':'#ef4444',border:`1px solid ${r.ok?'#22c55e':'#ef4444'}44`,flexShrink:0 }}>{r.ok?'✓':'✗'} {r.status||'err'}</span>
                                    <a href={r.url} target="_blank" rel="noopener" style={{ color:'#6366f1',fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>{domain}</a>
                                    <span style={{ color:r.ok?'#22c55e':'#ef4444',fontSize:12,flexShrink:0 }}>{r.ok?'Работает':'Недоступна'}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                  {/* ── ФОРМЫ & AMOCRM ── */}
                  {activeTab === 'forms' && (
                    <div className="ch-anim" style={{ display:'flex',flexDirection:'column',gap:14 }}>

                      {/* Статус форм */}
                      <div className="ch-card">
                        <div className="orb2" />
                        <div style={{ position:'relative',zIndex:1 }}>
                          <p style={{ color:'#94a3b8',fontSize:12,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12 }}>Формы на странице</p>
                          {check.loading.html ? <div className="ch-spin" />
                            : <div className="ch-row"><span style={{ color:'#64748b',fontSize:14 }}>Найдено форм</span><span style={{ color:'#f1f5f9',fontSize:18,fontWeight:700 }}>{check.html?.forms?.count??'—'}</span></div>}
                        </div>
                      </div>

                      {/* AmoCRM детекция */}
                      <div className="ch-card">
                        <div className="orb1" style={{ background:'radial-gradient(circle,#f59e0b 0%,transparent 70%)' }} />
                        <div style={{ position:'relative',zIndex:1 }}>
                          <p style={{ color:'#94a3b8',fontSize:12,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12 }}>Код AmoCRM в HTML</p>
                          {check.loading.html ? <div className="ch-spin" />
                            : <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                                <span style={{ fontSize:32 }}>{check.html?.forms?.hasAmoCRM?'✅':'❌'}</span>
                                <div>
                                  <p style={{ color:'#f1f5f9',fontSize:15,fontWeight:600 }}>{check.html?.forms?.hasAmoCRM?'Интеграция обнаружена':'Не найдена в HTML'}</p>
                                  <p style={{ color:'#64748b',fontSize:13,marginTop:4 }}>{check.html?.forms?.hasAmoCRM?'Код AmoCRM/Kommo присутствует на странице':'Виджет может подключаться через JS — проверьте тестовой отправкой'}</p>
                                </div>
                              </div>}
                        </div>
                      </div>

                      {/* Тестовая отправка формы */}
                      <div className="ch-card" style={{ borderColor:'rgba(99,102,241,.35)' }}>
                        <div className="orb1" style={{ background:'radial-gradient(circle,#6366f1 0%,transparent 70%)' }} />
                        <div style={{ position:'relative',zIndex:1 }}>
                          <p style={{ color:'#94a3b8',fontSize:12,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4 }}>🤖 Тестовая проверка формы → AmoCRM</p>
                          <p style={{ color:'#64748b',fontSize:13,marginBottom:16 }}>Бот отправит заявку с тестовыми данными и проверит, появился ли лид в AmoCRM</p>

                          {/* Состояния проверки */}
                          {(!check.formCheck || check.formCheck.step === 'idle') && (
                            <button className="ch-btn ch-btn-green" onClick={() => runFormCheck(sel)}
                              disabled={!check.html?.ok}>
                              🚀 Проверить форму → AmoCRM
                            </button>
                          )}

                          {check.formCheck?.step === 'submitting' && (
                            <div style={{ display:'flex',alignItems:'center',gap:12,color:'#94a3b8' }}>
                              <span className="ch-spin" />
                              <span>Отправляю тестовую заявку на сайт...</span>
                            </div>
                          )}

                          {check.formCheck?.step === 'waiting' && (
                            <div className="ch-anim">
                              <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}>
                                <div style={{ fontSize:36,fontWeight:700,color:'#6366f1',minWidth:40,textAlign:'center' }} className="ch-pulse">
                                  {check.formCheck.countdown}
                                </div>
                                <div>
                                  <p style={{ color:'#f1f5f9',fontSize:14,fontWeight:600 }}>Форма отправлена ✓</p>
                                  <p style={{ color:'#64748b',fontSize:13 }}>Жду появления лида в AmoCRM...</p>
                                </div>
                              </div>
                              {check.formCheck.testData && (
                                <div style={{ background:'rgba(255,255,255,.04)',borderRadius:8,padding:'10px 14px',fontSize:13 }}>
                                  <p style={{ color:'#64748b',marginBottom:6 }}>Отправленные данные:</p>
                                  <p style={{ color:'#94a3b8' }}>👤 {check.formCheck.testData.name}</p>
                                  <p style={{ color:'#94a3b8' }}>📞 {check.formCheck.testData.phone}</p>
                                  <p style={{ color:'#94a3b8' }}>📧 {check.formCheck.testData.email}</p>
                                  <p style={{ color:'#64748b',marginTop:6 }}>Полей заполнено: {check.formCheck.fieldsFound}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {check.formCheck?.step === 'searching' && (
                            <div style={{ display:'flex',alignItems:'center',gap:12,color:'#94a3b8' }}>
                              <span className="ch-spin" />
                              <span>Ищу лид в AmoCRM...</span>
                            </div>
                          )}

                          {check.formCheck?.step === 'done' && (
                            <div className="ch-anim">
                              <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16,padding:'12px 16px',background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.3)',borderRadius:10 }}>
                                <span style={{ fontSize:28 }}>✅</span>
                                <div>
                                  <p style={{ color:'#22c55e',fontSize:15,fontWeight:700 }}>Форма работает! Лид появился в AmoCRM</p>
                                  <p style={{ color:'#64748b',fontSize:13,marginTop:2 }}>{check.formCheck.closed ? 'Помечен тегом «проверка удалить» и закрыт' : 'Помечаю и закрываю...'}</p>
                                </div>
                              </div>
                              {check.formCheck.leadUrl && (
                                <a href={check.formCheck.leadUrl} target="_blank" rel="noopener"
                                  style={{ display:'inline-flex',alignItems:'center',gap:8,padding:'10px 18px',background:'rgba(99,102,241,.2)',border:'1px solid rgba(99,102,241,.4)',borderRadius:8,color:'#a5b4fc',fontSize:14,textDecoration:'none',fontWeight:600 }}>
                                  🔗 Открыть лид #{check.formCheck.lead?.id} в AmoCRM
                                </a>
                              )}
                              <div style={{ marginTop:12 }}>
                                <button className="ch-btn ch-btn-green" style={{ fontSize:13 }} onClick={() => runFormCheck(sel)}>
                                  🔄 Проверить ещё раз
                                </button>
                              </div>
                            </div>
                          )}

                          {check.formCheck?.step === 'error' && (
                            <div className="ch-anim">
                              <div style={{ padding:'12px 16px',background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',borderRadius:10,marginBottom:12 }}>
                                <p style={{ color:'#ef4444',fontSize:14,fontWeight:600 }}>❌ {check.formCheck.error || 'Ошибка проверки'}</p>
                                <p style={{ color:'#64748b',fontSize:13,marginTop:4 }}>Возможно, форма отправляет данные через JavaScript (AJAX). Проверьте вручную.</p>
                              </div>
                              <button className="ch-btn ch-btn-green" style={{ fontSize:13 }} onClick={() => runFormCheck(sel)}>
                                🔄 Попробовать ещё раз
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!check && (
                <div className="ch-card" style={{ textAlign:'center',padding:'48px 20px' }}>
                  <div style={{ fontSize:40,marginBottom:12 }}>▶</div>
                  <p style={{ color:'#64748b' }}>Нажмите «Проверить сейчас» чтобы начать</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
