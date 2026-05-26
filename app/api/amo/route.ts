import { NextRequest, NextResponse } from 'next/server'

const AMO_DOMAIN = process.env.AMO_DOMAIN
const AMO_TOKEN  = process.env.AMO_TOKEN

const TEST = {
  name:  'Тест Проверка',
  phone: '+70000000000',
  email: 'test@check.ru',
  msg:   'Тестовая заявка — проверка формы. Удалить.',
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (body.action === 'submit_form') return submitForm(body.siteUrl)
  if (body.action === 'find_lead')   return findLead(body.since)
  if (body.action === 'close_lead')  return closeLead(body.leadId)

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// ── Шаг 1: отправить тестовую форму ──────────────────────────────────────────
async function submitForm(siteUrl: string) {
  try {
    const res  = await fetch(siteUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) })
    const html = await res.text()

    // Найти action формы
    const actionMatch = html.match(/<form[^>]*action=["']([^"']*)["'][^>]*>/i)
    const rawAction   = actionMatch?.[1] || ''
    const formAction  = rawAction.startsWith('http') ? rawAction : new URL(rawAction || '/', siteUrl).href

    // Собрать поля
    const fieldNames = [
      ...[...html.matchAll(/<input[^>]*name=["']([^"']+)["'][^>]*/gi)].map(m => m[1]),
      ...[...html.matchAll(/<textarea[^>]*name=["']([^"']+)["'][^>]*/gi)].map(m => m[1]),
    ]

    const formData: Record<string, string> = {}
    for (const f of fieldNames) {
      const l = f.toLowerCase()
      if (l.includes('name') || l.includes('имя') || l.includes('fio') || l.includes('фио'))
        formData[f] = TEST.name
      else if (l.includes('phone') || l.includes('tel') || l.includes('телефон') || l.includes('моб'))
        formData[f] = TEST.phone
      else if (l.includes('email') || l.includes('mail') || l.includes('почта'))
        formData[f] = TEST.email
      else if (l.includes('message') || l.includes('text') || l.includes('сообщ') || l.includes('comment') || l.includes('вопрос'))
        formData[f] = TEST.msg
      else
        formData[f] = 'test'
    }

    const submittedAt = Math.floor(Date.now() / 1000)

    // Отправить форму (не ждём ответа долго)
    await fetch(formAction, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Referer': siteUrl,
      },
      body: new URLSearchParams(formData).toString(),
      signal: AbortSignal.timeout(4000),
    }).catch(() => null)

    return NextResponse.json({
      ok: true,
      submittedAt,
      formAction,
      fieldsFound: fieldNames.length,
      testData: { name: TEST.name, phone: TEST.phone, email: TEST.email },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}

// ── Шаг 2: найти лид в AmoCRM ────────────────────────────────────────────────
async function findLead(since: number) {
  try {
    const res = await fetch(
      `https://${AMO_DOMAIN}/api/v4/leads?filter[created_at][from]=${since}&limit=10&order[created_at]=desc`,
      { headers: { Authorization: `Bearer ${AMO_TOKEN}` }, signal: AbortSignal.timeout(6000) }
    )

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ ok: false, error: `AmoCRM: ${res.status} ${err}` })
    }

    const data = await res.json()
    const lead = data._embedded?.leads?.[0]

    if (!lead) return NextResponse.json({ ok: false, message: 'Лид не найден' })

    return NextResponse.json({
      ok: true,
      lead: { id: lead.id, name: lead.name, createdAt: lead.created_at },
      leadUrl: `https://${AMO_DOMAIN}/leads/detail/${lead.id}`,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}

// ── Шаг 3: пометить и закрыть лид ───────────────────────────────────────────
async function closeLead(leadId: number) {
  try {
    const res = await fetch(`https://${AMO_DOMAIN}/api/v4/leads/${leadId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AMO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status_id: 143, // AmoCRM: «Не реализовано» (закрыто)
        tags_to_add: [{ name: 'проверка удалить' }],
      }),
      signal: AbortSignal.timeout(6000),
    })

    return NextResponse.json({ ok: res.ok, status: res.status })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
