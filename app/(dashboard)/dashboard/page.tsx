'use client'

export default function DashboardPage() {
  return (
    <>
      <style>{`
        @keyframes cardFloat1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.20; }
          33%       { transform: translate(15px, -20px) scale(1.1); opacity: 0.32; }
          66%       { transform: translate(-10px, 14px) scale(0.9); opacity: 0.14; }
        }
        @keyframes cardFloat2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); opacity: 0.16; }
          50%       { transform: translate(-18px, 18px) scale(1.15); opacity: 0.28; }
        }
        @keyframes bgShimmer {
          0%   { background-position: 0% 50% }
          50%  { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        @keyframes lightBeam {
          0%   { left: -60%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { left: 120%; opacity: 0; }
        }
        .dash-card {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid rgba(99, 102, 241, 0.25);
          background: linear-gradient(135deg, #0d1424 0%, #1a1040 40%, #0f2040 70%, #151030 100%);
          background-size: 300% 300%;
          animation: bgShimmer 10s ease-in-out infinite;
          transition: border-color 0.3s, box-shadow 0.3s;
          margin-bottom: 0;
        }
        .dash-card:hover {
          border-color: rgba(99, 102, 241, 0.55);
          box-shadow: 0 0 28px rgba(59, 130, 246, 0.18);
        }
        .dash-card-orb1 {
          position: absolute;
          top: -40px; right: -40px;
          width: 130px; height: 130px;
          border-radius: 50%;
          pointer-events: none;
        }
        .dash-card-orb2 {
          position: absolute;
          bottom: -30px; left: -30px;
          width: 100px; height: 100px;
          border-radius: 50%;
          pointer-events: none;
        }
        .dash-card-beam {
          position: absolute;
          top: 0; bottom: 0;
          width: 40%;
          background: linear-gradient(to right, transparent, rgba(148,130,255,0.07), transparent);
          transform: skewX(-12deg);
          animation: lightBeam 6s ease-in-out infinite;
          pointer-events: none;
        }
      `}</style>

      {/* Заголовок */}
      <div style={{
        background: 'linear-gradient(135deg, #0d1424 0%, #1a1040 50%, #0f2040 100%)',
        backgroundSize: '300% 300%',
        animation: 'bgShimmer 10s ease-in-out infinite',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-50px', right: '-50px',
          width: '180px', height: '180px', borderRadius: '50%',
          background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
          opacity: 0.2, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-40px', left: '20%',
          width: '140px', height: '140px', borderRadius: '50%',
          background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
          opacity: 0.15, pointerEvents: 'none',
        }} />
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f1f5f9', position: 'relative', zIndex: 1 }}>
          Дашборд
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '6px', position: 'relative', zIndex: 1 }}>
          Добро пожаловать в AI Admin
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-3">
        {[
          { title: 'Всего сайтов', value: '12', sub: '↑ 3 за последний месяц', orb1: '#3b82f6', orb2: '#0ea5e9' },
          { title: 'Лиды', value: '248', sub: '↑ 45 за последний месяц', orb1: '#7c3aed', orb2: '#4f46e5' },
          { title: 'Посты', value: '89', sub: '↑ 12 за последний месяц', orb1: '#0ea5e9', orb2: '#3b82f6' },
        ].map(card => (
          <div key={card.title} className="dash-card">
            <div className="dash-card-orb1" style={{
              background: `radial-gradient(circle, ${card.orb1} 0%, transparent 70%)`,
              animation: 'cardFloat1 8s ease-in-out infinite',
            }} />
            <div className="dash-card-orb2" style={{
              background: `radial-gradient(circle, ${card.orb2} 0%, transparent 70%)`,
              animation: 'cardFloat2 11s ease-in-out infinite',
            }} />
            <div className="dash-card-beam" />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                {card.title}
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#f1f5f9' }}>{card.value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Быстрые действия */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#f1f5f9' }}>
          🚀 Быстрые действия
        </h2>
        <div className="grid grid-2">
          {[
            { title: 'Создать сайт',       desc: 'Начните создавать новый сайт',    href: '/sites',    orb1: '#3b82f6', orb2: '#4f46e5', delay: '0s' },
            { title: 'Добавить лид',       desc: 'Внесите новую заявку',            href: '/leads',    orb1: '#7c3aed', orb2: '#0ea5e9', delay: '1.5s' },
            { title: 'Создать пост',       desc: 'Запланируйте публикацию',         href: '/posts',    orb1: '#0ea5e9', orb2: '#3b82f6', delay: '3s' },
            { title: 'Подключить домен',   desc: 'Управляйте доменами сайтов',      href: '/domains',  orb1: '#4f46e5', orb2: '#7c3aed', delay: '4.5s' },
          ].map(card => (
            <div key={card.title} className="dash-card" style={{ animationDelay: card.delay }}>
              <div className="dash-card-orb1" style={{
                background: `radial-gradient(circle, ${card.orb1} 0%, transparent 70%)`,
                animation: `cardFloat1 9s ease-in-out infinite ${card.delay}`,
              }} />
              <div className="dash-card-orb2" style={{
                background: `radial-gradient(circle, ${card.orb2} 0%, transparent 70%)`,
                animation: `cardFloat2 12s ease-in-out infinite ${card.delay}`,
              }} />
              <div className="dash-card-beam" style={{ animationDelay: card.delay }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h3 style={{ color: '#f1f5f9', marginBottom: '10px', fontSize: '16px', fontWeight: 600 }}>
                  {card.title}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '14px' }}>
                  {card.desc}
                </p>
                <a href={card.href} className="btn">Перейти →</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
