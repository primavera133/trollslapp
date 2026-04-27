import type { VercelRequest, VercelResponse } from '@vercel/node'

const GITHUB_BASE =
  'https://github.com/primavera133/trollslapp/releases/download/data-latest'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const segments = req.query.path
  const file = Array.isArray(segments) ? segments.join('/') : segments
  if (!file) return res.status(400).send('Missing path')

  const url = `${GITHUB_BASE}/${file}`
  const upstream = await fetch(url, { redirect: 'follow' })

  if (!upstream.ok) {
    return res.status(upstream.status).send('Upstream error')
  }

  const buf = Buffer.from(await upstream.arrayBuffer())
  res.setHeader(
    'Content-Type',
    upstream.headers.get('content-type') || 'application/octet-stream',
  )
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')
  res.send(buf)
}
