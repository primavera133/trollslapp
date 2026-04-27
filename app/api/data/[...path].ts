import type { VercelRequest, VercelResponse } from '@vercel/node'

const GITHUB_BASE =
  'https://github.com/primavera133/trollslapp/releases/download/data-latest'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const match = (req.url ?? '').match(/\/data\/(.+?)(?:\?|$)/)
  const file = match?.[1]
  if (!file) return res.status(400).json({ error: 'Missing path', url: req.url })

  const upstream = await fetch(`${GITHUB_BASE}/${file}`, { redirect: 'follow' })
  if (!upstream.ok) {
    return res.status(upstream.status).json({ error: 'Upstream error', status: upstream.status, file })
  }

  const buf = Buffer.from(await upstream.arrayBuffer())
  res.setHeader(
    'Content-Type',
    upstream.headers.get('content-type') || 'application/octet-stream',
  )
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')
  res.send(buf)
}
