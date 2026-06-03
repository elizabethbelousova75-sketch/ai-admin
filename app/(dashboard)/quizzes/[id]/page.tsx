'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

type QuestionType = 'single' | 'multiple' | 'text' | 'phone' | 'email'

interface Question {
  id?: string
  question_text: string
  question_type: QuestionType
  options: string[]
  is_required: boolean
}

interface QuizForm {
  title: string
  description: string
  button_color: string
  button_text_color: string
  button_animation: string
  thank_you_url: string
  questions: Question[]
}

const defaultQuestion = (): Question => ({
  question_text: '',
  question_type: 'single',
  options: ['', ''],
  is_required: true,
})

const ANIMATIONS = ['none', 'pulse', 'bounce', 'shake', 'glow']
const TYPE_LABELS: Record<QuestionType, string> = {
  single: '☑ Один вариант',
  multiple: '☑☑ Несколько вариантов',
  text: '✏️ Свободный текст',
  phone: '📞 Телефон',
  email: '📧 Email',
}

export default function QuizEditorPage() {
  const router = useRouter()
  const params = useParams()
  const isNew = params.id === 'new'

  const [form, setForm] = useState<QuizForm>({
    title: '',
    description: '',
    button_color: '#3b82f6',
    button_text_color: '#ffffff',
    button_animation: 'pulse',
    thank_you_url: '',
    questions: [defaultQuestion()],
  })
  const [saving, setSaving] = useState(false)
  const [activeQ, setActiveQ] = useState(0)

  useEffect(() => {
    if (!isNew) loadQuiz()
  }, [])

  const loadQuiz = async () => {
    const res = await fetch('/api/quizzes')
    const data = await res.json()
    const quiz = data.find((q: any) => q.id === params.id)
    if (quiz) {
      setForm({
        title: quiz.title,
        description: quiz.description || '',
        button_color: quiz.button_color || '#3b82f6',
        button_text_color: quiz.button_text_color || '#ffffff',
        button_animation: quiz.button_animation || 'pulse',
        thank_you_url: quiz.thank_you_url || '',
        questions: quiz.quiz_questions?.sort((a: any, b: any) => a.order_num - b.order_num).map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || ['', ''],
          is_required: q.is_required,
        })) || [defaultQuestion()],
      })
    }
  }

  const save = async () => {
    if (!form.title.trim()) return alert('Введите название квиза')
    setSaving(true)
    const method = isNew ? 'POST' : 'PUT'
    const body = isNew ? form : { ...form, id: params.id }
    const res = await fetch('/api/quizzes', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) router.push('/quizzes')
    else alert('Ошибка сохранения')
  }

  const updateQ = (i: number, patch: Partial<Question>) => {
    const qs = [...form.questions]
    qs[i] = { ...qs[i], ...patch }
    setForm({ ...form, questions: qs })
  }

  const addOption = (i: number) => {
    const qs = [...form.questions]
    qs[i].options = [...qs[i].options, '']
    setForm({ ...form, questions: qs })
  }

  const removeOption = (qi: number, oi: number) => {
    const qs = [...form.questions]
    qs[qi].options = qs[qi].options.filter((_: any, i: number) => i !== oi)
    setForm({ ...form, questions: qs })
  }

  const updateOption = (qi: number, oi: number, val: string) => {
    const qs = [...form.questions]
    qs[qi].options[oi] = val
    setForm({ ...form, questions: qs })
  }

  const addQuestion = () => {
    setForm({ ...form, questions: [...form.questions, defaultQuestion()] })
    setActiveQ(form.questions.length)
  }

  const removeQuestion = (i: number) => {
    if (form.questions.length === 1) return
    const qs = form.questions.filter((_, idx) => idx !== i)
    setForm({ ...form, questions: qs })
    setActiveQ(Math.min(activeQ, qs.length - 1))
  }

  const moveQuestion = (i: number, dir: -1 | 1) => {
    const qs = [...form.questions]
    const j = i + dir
    if (j < 0 || j >= qs.length) return
    ;[qs[i], qs[j]] = [qs[j], qs[i]]
    setForm({ ...form, questions: qs })
    setActiveQ(j)
  }

  const q = form.questions[activeQ]

  return (
    <>
      <style>{`
        @keyframes bgShimmer { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .qz-card { position:relative;overflow:hidden;border-radius:12px;padding:20px;border:1px solid rgba(99,102,241,0.2);background:linear-gradient(135deg,#0d1424 0%,#1a1040 40%,#0f2040 70%,#151030 100%);background-size:300% 300%;animation:bgShimmer 10s ease-in-out infinite; }
        .qz-input { background:rgba(255,255,255,.06);border:1px solid rgba(99,102,241,.3);border-radius:8px;color:#f1f5f9;padding:10px 14px;font-size:14px;outline:none;transition:border-color .2s;width:100%; }
        .qz-input:focus { border-color:rgba(99,102,241,.7); }
        .qz-btn { padding:10px 18px;background:linear-gradient(135deg,#3b82f6,#4f46e5);color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;transition:all .2s; }
        .qz-btn:hover { opacity:.85; }
        .qz-btn:disabled { opacity:.4;cursor:not-allowed; }
        .qz-btn-sm { padding:6px 12px;font-size:13px; }
        .qz-btn-outline { background:transparent;border:1px solid rgba(99,102,241,.4);color:#a5b4fc; }
        .qz-btn-green { background:linear-gradient(135deg,#16a34a,#15803d); }
        .qz-btn-red { background:rgba(239,68,68,.2);border:1px solid rgba(239,68,68,.3);color:#fca5a5; }
        .qz-q-item { padding:10px 14px;border-radius:8px;cursor:pointer;border:1px solid transparent;transition:all .2s;margin-bottom:6px;display:flex;align-items:center;gap:10px; }
        .qz-q-item:hover { background:rgba(255,255,255,.05); }
        .qz-q-item.active { background:rgba(59,130,246,.18);border-color:rgba(99,102,241,.4); }
        .qz-label { color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;display:block; }
        .qz-select { background:rgba(255,255,255,.06);border:1px solid rgba(99,102,241,.3);border-radius:8px;color:#f1f5f9;padding:10px 14px;font-size:14px;outline:none;width:100%; }
        .qz-option-row { display:flex;gap:8px;margin-bottom:8px;align-items:center; }
        .orb1 { position:absolute;top:-40px;right:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,#3b82f6 0%,transparent 70%);opacity:.18;pointer-events:none; }
        .orb2 { position:absolute;bottom:-30px;left:-30px;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,#7c3aed 0%,transparent 70%);opacity:.15;pointer-events:none; }
      `}</style>

      {/* Заголовок */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12 }}>
        <div>
          <h1 style={{ color:'#f1f5f9',fontSize:24,fontWeight:700 }}>{isNew ? '+ Новый квиз' : '✏️ Редактировать квиз'}</h1>
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <button className="qz-btn qz-btn-sm qz-btn-outline" onClick={() => router.push('/quizzes')}>← Назад</button>
          <button className="qz-btn qz-btn-sm qz-btn-green" onClick={save} disabled={saving}>
            {saving ? 'Сохраняю...' : '💾 Сохранить'}
          </button>
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'280px 1fr',gap:20,alignItems:'start' }}>

        {/* Левая панель — список вопросов */}
        <div>
          <div className="qz-card" style={{ marginBottom:12 }}>
            <div className="orb2" />
            <div style={{ position:'relative',zIndex:1 }}>
              <label className="qz-label">Название квиза</label>
              <input className="qz-input" placeholder="Например: Подбор тарифа" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} />
              <label className="qz-label" style={{ marginTop:12 }}>Описание</label>
              <input className="qz-input" placeholder="Краткое описание (необязательно)" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          <div className="qz-card" style={{ marginBottom:12 }}>
            <div className="orb1" />
            <div style={{ position:'relative',zIndex:1 }}>
              <p style={{ color:'#94a3b8',fontSize:12,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:12 }}>Вопросы</p>
              {form.questions.map((q, i) => (
                <div key={i} className={`qz-q-item${activeQ === i ? ' active' : ''}`} onClick={() => setActiveQ(i)}>
                  <span style={{ color:'#475569',fontSize:12,minWidth:20 }}>{i + 1}</span>
                  <span style={{ color: activeQ === i ? '#f1f5f9' : '#94a3b8',fontSize:13,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                    {q.question_text || 'Без названия'}
                  </span>
                  <button onClick={e => { e.stopPropagation(); removeQuestion(i) }}
                    style={{ background:'none',border:'none',color:'#ef4444',cursor:'pointer',padding:'0 4px',fontSize:14 }}>✕</button>
                </div>
              ))}
              <button className="qz-btn qz-btn-sm qz-btn-outline" style={{ width:'100%',marginTop:8,justifyContent:'center' }} onClick={addQuestion}>
                + Добавить вопрос
              </button>
            </div>
          </div>
        </div>

        {/* Правая панель — редактор вопроса + настройки */}
        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>

          {/* Редактор текущего вопроса */}
          <div className="qz-card">
            <div className="orb1" />
            <div style={{ position:'relative',zIndex:1 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
                <p style={{ color:'#f1f5f9',fontWeight:600 }}>Вопрос {activeQ + 1}</p>
                <div style={{ display:'flex',gap:6 }}>
                  <button className="qz-btn qz-btn-sm qz-btn-outline" onClick={() => moveQuestion(activeQ, -1)} disabled={activeQ === 0}>↑</button>
                  <button className="qz-btn qz-btn-sm qz-btn-outline" onClick={() => moveQuestion(activeQ, 1)} disabled={activeQ === form.questions.length - 1}>↓</button>
                </div>
              </div>

              <label className="qz-label">Текст вопроса</label>
              <input className="qz-input" style={{ marginBottom:14 }} placeholder="Введите вопрос..."
                value={q.question_text} onChange={e => updateQ(activeQ, { question_text: e.target.value })} />

              <label className="qz-label">Тип вопроса</label>
              <select className="qz-select" style={{ marginBottom:14 }} value={q.question_type}
                onChange={e => updateQ(activeQ, { question_type: e.target.value as QuestionType })}>
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>

              {/* Варианты ответов */}
              {(q.question_type === 'single' || q.question_type === 'multiple') && (
                <div>
                  <label className="qz-label">Варианты ответов</label>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="qz-option-row">
                      <input className="qz-input" placeholder={`Вариант ${oi + 1}`} value={opt}
                        onChange={e => updateOption(activeQ, oi, e.target.value)} />
                      {q.options.length > 2 && (
                        <button className="qz-btn qz-btn-sm qz-btn-red" style={{ flexShrink:0 }}
                          onClick={() => removeOption(activeQ, oi)}>✕</button>
                      )}
                    </div>
                  ))}
                  <button className="qz-btn qz-btn-sm qz-btn-outline" onClick={() => addOption(activeQ)}>
                    + Добавить вариант
                  </button>
                </div>
              )}

              <div style={{ display:'flex',alignItems:'center',gap:10,marginTop:14 }}>
                <input type="checkbox" id="req" checked={q.is_required}
                  onChange={e => updateQ(activeQ, { is_required: e.target.checked })} />
                <label htmlFor="req" style={{ color:'#94a3b8',fontSize:14,cursor:'pointer' }}>Обязательный вопрос</label>
              </div>
            </div>
          </div>

          {/* Настройки дизайна */}
          <div className="qz-card">
            <div className="orb2" />
            <div style={{ position:'relative',zIndex:1 }}>
              <p style={{ color:'#94a3b8',fontSize:12,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:16 }}>🎨 Дизайн кнопок</p>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:16 }}>
                <div>
                  <label className="qz-label">Цвет кнопок</label>
                  <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                    <input type="color" value={form.button_color}
                      onChange={e => setForm({ ...form, button_color: e.target.value })}
                      style={{ width:40,height:40,border:'none',borderRadius:8,cursor:'pointer',background:'none' }} />
                    <input className="qz-input" value={form.button_color}
                      onChange={e => setForm({ ...form, button_color: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="qz-label">Цвет текста</label>
                  <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                    <input type="color" value={form.button_text_color}
                      onChange={e => setForm({ ...form, button_text_color: e.target.value })}
                      style={{ width:40,height:40,border:'none',borderRadius:8,cursor:'pointer',background:'none' }} />
                    <input className="qz-input" value={form.button_text_color}
                      onChange={e => setForm({ ...form, button_text_color: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="qz-label">Анимация кнопки</label>
                  <select className="qz-select" value={form.button_animation}
                    onChange={e => setForm({ ...form, button_animation: e.target.value })}>
                    {ANIMATIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              {/* Превью кнопки */}
              <div style={{ marginBottom:16,padding:'16px',background:'rgba(255,255,255,.04)',borderRadius:8,textAlign:'center' }}>
                <style>{`
                  @keyframes qz-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
                  @keyframes qz-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
                  @keyframes qz-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
                  @keyframes qz-glow { 0%,100%{box-shadow:0 0 8px currentColor} 50%{box-shadow:0 0 20px currentColor} }
                `}</style>
                <p style={{ color:'#64748b',fontSize:12,marginBottom:10 }}>Превью кнопки:</p>
                <button style={{
                  background: form.button_color,
                  color: form.button_text_color,
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  animation: form.button_animation !== 'none' ? `qz-${form.button_animation} 1.5s ease-in-out infinite` : 'none',
                }}>
                  Далее →
                </button>
              </div>

              <label className="qz-label">URL страницы «Спасибо»</label>
              <input className="qz-input" placeholder="https://сайт.ru/thanks"
                value={form.thank_you_url} onChange={e => setForm({ ...form, thank_you_url: e.target.value })} />
              <p style={{ color:'#475569',fontSize:12,marginTop:6 }}>
                После заполнения квиза пользователь будет перенаправлен на эту страницу
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
