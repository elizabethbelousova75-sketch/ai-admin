import { NextRequest, NextResponse } from 'next/server'

const AMO_DOMAIN = process.env.AMO_DOMAIN
const AMO_TOKEN  = process.env.AMO_TOKEN
const BOT_NAME   = 'FormTestBot'

export async function POST(request: NextRequest) {
  try {
    // CF7 отправляет данные как form-urlencoded
    const contentType = request.headers.get('content-type') || ''
    let data: Record<string, string> = {}

    if (contentType.includes('application/json')) {
      data = await request.json()
    } else {
      const text = await request.text()
      for (const pair of text.split('&')) {
        const [k, v] = pair.split('=')
        if (k) data[decodeURIComponent(k)] = decodeURIComponent(v || '')
      }
    }

    // Найти имя в любом поле
    const nameValue = data['your-name'] || data['name'] || data['Name'] || data['имя'] || ''

    // Триггер — только FormTestBot
    if (!nameValue.includes(BOT_NAME)) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Ждём 5 сек чтобы лид появился в AmoCRM
    await new Promise(r => setTimeout(r, 5000))

    // Ищем лид
    const since = Math.floor(Date.now() / 1000) - 30
    const amoRes = await fetch(
      `https://${AMO_DOMAIN}/api/v4/leads?filter[created_at][from]=${since}&limit=10&order[created_at]=desc`,
      { headers: { Authorization: `Bearer ${AMO_TOKEN}` } }
    )

    if (!amoRes.ok) {
      return NextResponse.json({ ok: false, error: `AmoCRM: ${amoRes.status}` })
    }

    const amoData = await amoRes.json()
    const lead = amoData._embedded?.leads?.[0]

    if (!lead) {
      return NextResponse.json({ ok: false, message: 'Лид не найден' })
    }

    // Помечаем и закрываем
    await fetch(`https://${AMO_DOMAIN}/api/v4/leads/${lead.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AMO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status_id: 143,
        tags_to_add: [{ name: 'проверка удалить' }],
      }),
    })

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      leadUrl: `https://${AMO_DOMAIN}/leads/detail/${lead.id}`,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}

// CF7 иногда шлёт GET для верификации
export async function GET() {
  return NextResponse.json({ ok: true, webhook: 'active' })
}
