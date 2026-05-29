import { NextRequest, NextResponse } from 'next/server'

const AMO_DOMAIN = process.env.AMO_DOMAIN
const AMO_TOKEN  = process.env.AMO_TOKEN
const BOT_NAME   = 'FormTestBot'

function randomPhone() {
  const digits = Math.floor(Math.random() * 9000000) + 1000000
  return `+7999${digits}`
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  if (body.action === 'submit_form') return submitForm(body.siteUrl)
  if (body.action === 'find_lead')   return findLead(body.since, body.phone)
  if (body.action === 'close_lead')  return closeLead(body.leadId)
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

async function submitForm(siteUrl: string) {
  try {
    const res  = await fetch(siteUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(4000),
    })
    const html = await res.text()

    const actionMatch = html.match(/<form[^>]*action=["']([^"']*)["'][^>]*>/i)
    const rawAction   = actionMatch?.[1] || ''
    const formAction  = rawAction.startsWith('http') ? rawAction : new URL(rawAction || '/', siteUrl).href

    const fieldNames = [
      ...[...html.matchAll(/<input[^>]*name=["']([^"']+)["'][^>]*/gi)].map(m => m[1]),
      ...[...html.matchAll(/<textarea[^>]*name=["']([^"']+)["'][^>]*/gi)].map(m => m[1]),
    ]

    const phone = randomPhone()
    const formData: Record<string, string> = {}

    for (const f of fieldNames) {
      const l = f.toLowerCase()
      if (l.includes('name') || l.includes('имя') || l.includes('fio') || l.includes('фио') ||
          l.includes('fname') || l.includes('fullname') || l.includes('contact') ||
          l.includes('клиент') || l.includes('user') || l.includes('person') || l.includes('client'))
        formData[f] = BOT_NAME
      else if (l.includes('phone') || l.includes('tel') || l.includes('телефон') || l.includes('моб'))
        formData[f] = phone
      else if (l.includes('email') || l.includes('mail') || l.includes('почта'))
        formData[f] = 'formtestbot@check.ru'
      else if (l.includes('message') || l.includes('text') || l.includes('сообщ') || l.includes('comment'))
        formData[f] = 'Тестовая заявка — проверка формы. Удалить.'
      else
        formData[f] = 'test'
    }

    const submittedAt = Math.floor(Date.now() / 1000)

    await fetch(formAction, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Referer': siteUrl,
      },
      body: new URLSearchParams(formData).toString(),
      signal: AbortSignal.timeout(4000),
    }).catch((e) => console.log('Form fetch error:', e.message))

    return NextResponse.json({
      ok: true,
      submittedAt,
      formAction,
      fieldsFound: fieldNames.length,
      testData: { name: BOT_NAME, phone, email: 'formtestbot@check.ru' },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}

async function findLead(since: number, phone: string) {
  try {
    // Ищем контакт по номеру телефона
    const phoneClean = phone.replace(/\D/g, '')

    const contactRes = await fetch(
      `https://${AMO_DOMAIN}/api/v4/contacts?query=${encodeURIComponent(phone)}&limit=5`,
      { headers: { Authorization: `Bearer ${AMO_TOKEN}` }, signal: AbortSignal.timeout(6000) }
    )

    if (contactRes.ok) {
      const contactData = await contactRes.json()
      const contacts = contactData._embedded?.contacts || []

      console.log('Contacts found:', contacts.length)

      // Ищем контакт с нашим номером
      const contact = contacts.find((c: any) => {
        const fields = c.custom_fields_values || []
        return fields.some((f: any) =>
          f.values?.some((v: any) => v.value?.replace(/\D/g, '').includes(phoneClean))
        )
      })

      if (contact) {
        // Получаем лиды этого контакта
        const leadsRes = await fetch(
          `https://${AMO_DOMAIN}/api/v4/contacts/${contact.id}/links`,
          { headers: { Authorization: `Bearer ${AMO_TOKEN}` }, signal: AbortSignal.timeout(6000) }
        )

        if (leadsRes.ok) {
          const leadsData = await leadsRes.json()
          const leadLink = leadsData._embedded?.links?.find((l: any) => l.to_entity_type === 'leads')

          if (leadLink) {
            return NextResponse.json({
              ok: true,
              lead: { id: leadLink.to_entity_id, name: `FormTestBot (${phone})` },
              leadUrl: `https://${AMO_DOMAIN}/leads/detail/${leadLink.to_entity_id}`,
            })
          }
        }
      }
    }

    // Фолбэк — ищем по времени создания + проверяем контакт по телефону
    const res = await fetch(
      `https://${AMO_DOMAIN}/api/v4/leads?filter[created_at][from]=${since}&limit=20&order[created_at]=desc&with=contacts`,
      { headers: { Authorization: `Bearer ${AMO_TOKEN}` }, signal: AbortSignal.timeout(6000) }
    )

    if (!res.ok) return NextResponse.json({ ok: false, error: `AmoCRM: ${res.status}` })

    const data  = await res.json()
    const leads = data._embedded?.leads || []

    console.log('Leads by time:', leads.length, leads.map((l: any) => l.name))

    // Ищем лид где контакт содержит наш номер телефона
    const lead = leads.find((l: any) => {
      const contacts = l._embedded?.contacts || []
      return contacts.some((c: any) => {
        const fields = c.custom_fields_values || []
        return fields.some((f: any) =>
          f.values?.some((v: any) => v.value?.replace(/\D/g, '').includes(phoneClean))
        )
      })
    }) || leads[0] || null

    if (!lead) return NextResponse.json({ ok: false, message: 'Лид не найден в AmoCRM' })

    return NextResponse.json({
      ok: true,
      lead: { id: lead.id, name: lead.name, createdAt: lead.created_at },
      leadUrl: `https://${AMO_DOMAIN}/leads/detail/${lead.id}`,
    })
  } catch (e: any) {
    console.log('findLead error:', e.message)
    return NextResponse.json({ ok: false, error: e.message })
  }
}

async function closeLead(leadId: number) {
  try {
    const res = await fetch(`https://${AMO_DOMAIN}/api/v4/leads/${leadId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AMO_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status_id: 143,
        tags_to_add: [{ name: 'проверка удалить' }],
      }),
      signal: AbortSignal.timeout(6000),
    })
    return NextResponse.json({ ok: res.ok, status: res.status })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
