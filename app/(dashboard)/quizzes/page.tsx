'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Quiz {
  id: string
  title: string
  description: string
  is_active: boolean
  created_at: string
  quiz_questions: any[]
  quiz_submissions: { count: number }[]
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadQuizzes() }, [])

  const loadQuizzes = async () => {
    setLoading(true)
    const res = await fetch('/api/quizzes')
    const data = await res.json()
    setQuizzes(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const deleteQuiz = async (id: string) => {
    if (!confirm('Удалить квиз?')) return
    await fetch(`/api/quizzes?id=${id}`, { method: 'DELETE' })
    loadQuizzes()
  }

  const copyEmbedCode = (id: string) => {
    const code = `<script src="${window.location.origin}/quiz/${id}/widget.js"><\/script>`
    navigator.clipboard.writeText(code)
    alert('Код скопирован!')
  }

  return (
    <>
      <style>{`
        @keyframes bgShimmer { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .qz-card {
          position:relative;overflow:hidden;border-radius:12px;padding:20px;
          border:1px solid rgba(99,102,241,0.2);
          background:linear-gradient(135deg,#0d1424 0%,#1a1040 40%,#0f2040 70%,#151030 100%);
          background-size:300% 300%;animation:bgShimmer 10s ease-in-out infinite;
          transition:border-color .25s,box-shadow .25s;
        }
        .qz-card:hover { border-color:rgba(99,102,241,.5);box-shadow:0 0 24px rgba(59,130,246,.15); }
        .qz-btn { padding:10px 18px;background:linear-gradient(135deg,#3b82f6,#4f46e5);color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;transition:all .2s;text-decoration:none;display:inline-flex;align-items:center;gap:8px; }
        .qz-btn:hover { opacity:.85;transform:translateY(-1px); }
        .qz-btn-sm { padding:6px 12px;font-size:13px; }
        .qz-btn-outline { background:transparent;border:1px solid rgba(99,102,241,.4);color:#a5b4fc; }
        .qz-btn-outline:hover { background:rgba(99,102,241,.15);transform:none; }
        .qz-btn-red { background:rgba(239,68,68,.2);border:1px solid rgba(239,68,68,.3);color:#fca5a5; }
        .qz-btn-red:hover { background:rgba(239,68,68,.3);transform:none; }
        .qz-btn-green { background:linear-gradient(135deg,#16a34a,#15803d); }
        .orb1 { position:absolute;top:-40px;right:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,#3b82f6 0%,transparent 70%);opacity:.18;pointer-events:none; }
        .orb2 { position:absolute;bottom:-30px;left:-30px;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,#7c3aed 0%,transparent 70%);opacity:.15;pointer-events:none; }
        .qz-anim { animation:fadeIn .35s ease; }
        .qz-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px; }
        .qz-badge { display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600; }
      `}</style>

      {/* Заголовок */}
      <div className="qz-card" style={{ marginBottom:24 }}>
        <div className="orb1" /><div className="orb2" />
        <div style={{ position:'relative',zIndex:1,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12 }}>
          <div>
            <h1 style={{ fontSize:26,fontWeight:700,color:'#f1f5f9',marginBottom:6 }}>📋 Квизы</h1>
            <p style={{ color:'#94a3b8',fontSize:14 }}>Создавайте квизы и встраивайте их на сайты</p>
          </div>
          <Link href="/quizzes/new" className="qz-btn qz-btn-green">+ Создать квиз</Link>
        </div>
      </div>

      {/* Список */}
      {loading && (
        <div style={{ textAlign:'center',padding:'60px 0',color:'#64748b' }}>Загрузка...</div>
      )}

      {!loading && quizzes.length === 0 && (
        <div className="qz-card" style={{ textAlign:'center',padding:'60px 20px' }} >
          <div className="orb1" /><div className="orb2" />
          <div style={{ position:'relative',zIndex:1 }}>
            <div style={{ fontSize:48,marginBottom:16 }}>📋</div>
            <p style={{ color:'#94a3b8',fontSize:16,marginBottom:20 }}>Квизов пока нет</p>
            <Link href="/quizzes/new" className="qz-btn qz-btn-green">+ Создать первый квиз</Link>
          </div>
        </div>
      )}

      {!loading && quizzes.length > 0 && (
        <div className="qz-grid qz-anim">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="qz-card">
              <div className="orb1" />
              <div style={{ position:'relative',zIndex:1 }}>
                {/* Статус */}
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
                  <span className="qz-badge" style={{
                    background: quiz.is_active ? 'rgba(34,197,94,.15)' : 'rgba(100,116,139,.15)',
                    color: quiz.is_active ? '#22c55e' : '#64748b',
                    border: `1px solid ${quiz.is_active ? 'rgba(34,197,94,.3)' : 'rgba(100,116,139,.3)'}`,
                  }}>
                    {quiz.is_active ? '● Активен' : '○ Выключен'}
                  </span>
                  <span style={{ color:'#475569',fontSize:12 }}>
                    {quiz.quiz_questions?.length || 0} вопр.
                  </span>
                </div>

                {/* Название */}
                <h3 style={{ color:'#f1f5f9',fontSize:16,fontWeight:600,marginBottom:6 }}>{quiz.title}</h3>
                {quiz.description && (
                  <p style={{ color:'#64748b',fontSize:13,marginBottom:12 }}>{quiz.description}</p>
                )}

                {/* Статистика */}
                <div style={{ display:'flex',gap:16,marginBottom:16,padding:'10px 0',borderTop:'1px solid rgba(255,255,255,.06)',borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                  <div>
                    <div style={{ color:'#f1f5f9',fontSize:18,fontWeight:700 }}>
                      {quiz.quiz_submissions?.[0]?.count || 0}
                    </div>
                    <div style={{ color:'#64748b',fontSize:11 }}>Заявок</div>
                  </div>
                  <div>
                    <div style={{ color:'#f1f5f9',fontSize:18,fontWeight:700 }}>
                      {quiz.quiz_questions?.length || 0}
                    </div>
                    <div style={{ color:'#64748b',fontSize:11 }}>Вопросов</div>
                  </div>
                </div>

                {/* Действия */}
                <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                  <Link href={`/quizzes/${quiz.id}`} className="qz-btn qz-btn-sm qz-btn-outline">✏️ Редактировать</Link>
                  <button className="qz-btn qz-btn-sm qz-btn-outline" onClick={() => copyEmbedCode(quiz.id)}>📋 Код</button>
                  <a href={`/quiz/${quiz.id}`} target="_blank" className="qz-btn qz-btn-sm qz-btn-outline">👁 Preview</a>
                  <button className="qz-btn qz-btn-sm qz-btn-red" onClick={() => deleteQuiz(quiz.id)}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
