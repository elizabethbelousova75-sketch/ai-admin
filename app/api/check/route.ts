import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  try {
    // Fetch HTML
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SiteChecker/1.0)' },
      signal: AbortSignal.timeout(7000),
    })
    const httpStatus = response.status
    const html = await response.text()
    const baseUrl = new URL(url)

    // Extract all hrefs, srcs, forms
    const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1])
    const srcs  = [...html.matchAll(/src=["']([^"']+)["']/gi)].map(m => m[1])
    const forms = [...html.matchAll(/<form[^>]*>/gi)]

    // Social links
    const socialDomains = ['facebook.com','fb.com','instagram.com','twitter.com','x.com','vk.com','t.me','telegram.me','youtube.com','tiktok.com','linkedin.com','ok.ru','whatsapp.com','viber.com']
    const socialLinks = [...new Set(hrefs.filter(h => socialDomains.some(d => h.includes(d))))]

    // Resolve relative URLs
    const resolve = (href: string) => {
      try { return new URL(href, baseUrl.origin).href } catch { return null }
    }

    // Internal links
    const internalLinks = [...new Set(
      hrefs
        .filter(h => !h.startsWith('http') || h.includes(baseUrl.hostname))
        .filter(h => !h.startsWith('mailto:') && !h.startsWith('tel:') && !h.startsWith('#'))
        .map(resolve).filter(Boolean) as string[]
    )].slice(0, 12)

    // Images
    const images = [...new Set(
      srcs.filter(s => /\.(jpg|jpeg|png|gif|webp|svg|ico)(\?.*)?$/i.test(s))
        .map(resolve).filter(Boolean) as string[]
    )]

    // Meta
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const descMatch  = html.match(/name=["']description["'][^>]*content=["']([^"']{0,300})["']/i)
                    || html.match(/content=["']([^"']{0,300})["'][^>]*name=["']description["']/i)
    const h1s        = [...html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi)].map(m => m[1].trim())

    // AmoCRM / Kommo detection
    const hasAmoCRM = html.includes('amocrm') || html.includes('kommo') || html.includes('amoforms') || html.includes('amo-forms')

    // Check social links (HEAD requests)
    const socialResults = await Promise.allSettled(
      socialLinks.slice(0, 6).map(async link => {
        try {
          const r = await fetch(link, { method: 'HEAD', signal: AbortSignal.timeout(3500), redirect: 'follow' })
          return { url: link, status: r.status, ok: r.status < 400 }
        } catch {
          return { url: link, status: 0, ok: false }
        }
      })
    )

    // Check internal links
    const linkResults = await Promise.allSettled(
      internalLinks.map(async link => {
        try {
          const r = await fetch(link, { method: 'HEAD', signal: AbortSignal.timeout(2500), redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } })
          return { url: link, status: r.status, ok: r.status < 400 }
        } catch {
          return { url: link, status: 0, ok: false }
        }
      })
    )

    return NextResponse.json({
      ok: true,
      httpStatus,
      meta: {
        title:       titleMatch?.[1]?.trim() || null,
        description: descMatch?.[1]?.trim()  || null,
        h1:          h1s[0] || null,
        h1Count:     h1s.length,
      },
      social: {
        links:   socialLinks,
        results: socialResults.map(r => r.status === 'fulfilled' ? r.value : { url: '', ok: false, status: 0 }),
      },
      links: {
        checked:       linkResults.map(r => r.status === 'fulfilled' ? r.value : { url: '', ok: false, status: 0 }),
        total:         hrefs.length,
        internalCount: internalLinks.length,
      },
      images:  { count: images.length },
      forms:   { count: forms.length, hasAmoCRM },
    })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message })
  }
}
