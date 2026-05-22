'use client'

export default function DashboardPage() {
  return (
    <div>
      <div className="header">
        <h1>Дашборд</h1>
        <p style={{ color: '#94a3b8', marginTop: '8px' }}>Добро пожаловать в AI Admin</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-3">
        <div className="stat-card">
          <div className="stat-card-title">Всего сайтов</div>
          <div className="stat-card-value">12</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>↑ 3 за последний месяц</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-title">Лиды</div>
          <div className="stat-card-value">248</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>↑ 45 за последний месяц</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-card-title">Посты</div>
          <div className="stat-card-value">89</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>↑ 12 за последний месяц</div>
        </div>
      </div>

      {/* Блоки с функциями */}
      <div style={{ marginTop: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#f1f5f9' }}>
          🚀 Быстрые действия
        </h2>
        <div className="grid grid-2">
          <div className="stat-card">
            <h3 style={{ color: '#f1f5f9', marginBottom: '12px' }}>Создать сайт</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>
              Начните создавать новый сайт
            </p>
            <a href="/sites" className="btn">Перейти →</a>
          </div>

          <div className="stat-card">
            <h3 style={{ color: '#f1f5f9', marginBottom: '12px' }}>Добавить лид</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>
              Внесите новую заявку
            </p>
            <a href="/leads" className="btn">Перейти →</a>
          </div>

          <div className="stat-card">
            <h3 style={{ color: '#f1f5f9', marginBottom: '12px' }}>Создать пост</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>
              Запланируйте публикацию
            </p>
            <a href="/posts" className="btn">Перейти →</a>
          </div>

          <div className="stat-card">
            <h3 style={{ color: '#f1f5f9', marginBottom: '12px' }}>Подключить домен</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>
              Управляйте доменами сайтов
            </p>
            <a href="/domains" className="btn">Перейти →</a>
          </div>
        </div>
      </div>
    </div>
  )
}