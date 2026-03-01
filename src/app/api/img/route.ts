import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Image proxy for Google CDN images that block direct access.
 * Usage: /api/img?url=https://lh3.googleusercontent.com/...
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new NextResponse('Missing url', { status: 400 });

  // Only proxy Google image CDN
  const allowed = ['lh3.googleusercontent.com', 'lh4.googleusercontent.com', 'lh5.googleusercontent.com', 'lh6.googleusercontent.com'];
  try {
    const parsed = new URL(url);
    if (!allowed.some(d => parsed.hostname === d || parsed.hostname.endsWith('.googleusercontent.com'))) {
      return new NextResponse('Domain not allowed', { status: 403 });
    }
  } catch { return new NextResponse('Invalid url', { status: 400 }); }

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)' },
    });
    if (!resp.ok) return new NextResponse('Upstream error', { status: resp.status });

    const ct = resp.headers.get('content-type') || 'image/jpeg';
    const body = await resp.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new NextResponse('Proxy error', { status: 502 });
  }
}
