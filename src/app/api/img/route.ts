import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Increase timeout for Netlify serverless functions
export const maxDuration = 15;

/**
 * Image proxy for Google CDN images.
 * Usage: /api/img?url=https://lh3.googleusercontent.com/...
 *
 * Debug: /api/img?url=...&debug=1 returns JSON diagnostics instead of image
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const debug = req.nextUrl.searchParams.get('debug') === '1';

  if (!url) return new NextResponse('Missing url', { status: 400 });

  // Only proxy Google image CDN
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('.googleusercontent.com')) {
      return new NextResponse('Domain not allowed', { status: 403 });
    }
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  const logs: string[] = [];
  const log = (msg: string) => { logs.push(msg); console.log(`[img-proxy] ${msg}`); };

  log(`Proxying: ${url.slice(0, 120)}...`);

  // Headers that mimic a real browser
  const browserHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity', // Don't compress - simpler to handle
    'Connection': 'keep-alive',
  };

  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const resp = await fetch(url, {
      headers: browserHeaders,
      redirect: 'follow',
      signal: controller.signal,
      // Explicitly tell Next.js NOT to cache this fetch
      cache: 'no-store',
    });

    clearTimeout(timeout);

    log(`Status: ${resp.status} ${resp.statusText}`);
    log(`Content-Type: ${resp.headers.get('content-type')}`);
    log(`Content-Length: ${resp.headers.get('content-length')}`);

    if (debug) {
      const headers: Record<string, string> = {};
      resp.headers.forEach((v, k) => { headers[k] = v; });
      return NextResponse.json({
        url: url.slice(0, 150),
        status: resp.status,
        statusText: resp.statusText,
        headers,
        logs,
      });
    }

    if (!resp.ok) {
      log(`Upstream returned ${resp.status}, trying to read body for details...`);
      const errorBody = await resp.text().catch(() => '(unreadable)');
      log(`Error body (first 200 chars): ${errorBody.slice(0, 200)}`);

      return returnPlaceholder(`Upstream ${resp.status}`);
    }

    const ct = resp.headers.get('content-type') || 'image/jpeg';

    // If Google returned an HTML page instead of an image, it's likely an error/login page
    if (ct.includes('text/html')) {
      log('Got HTML instead of image — likely auth required');
      return returnPlaceholder('Auth required');
    }

    const body = await resp.arrayBuffer();
    log(`Got ${body.byteLength} bytes of ${ct}`);

    if (body.byteLength === 0) {
      log('Empty response body');
      return returnPlaceholder('Empty response');
    }

    return new NextResponse(body, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=604800, immutable',
        'Access-Control-Allow-Origin': '*',
        'X-Proxy-Status': 'ok',
      },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Fetch error: ${msg}`);

    if (debug) {
      return NextResponse.json({ error: msg, logs });
    }

    return returnPlaceholder(msg);
  }
}

function returnPlaceholder(reason: string) {
  console.log(`[img-proxy] Returning placeholder: ${reason}`);

  const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
  <rect width="400" height="260" rx="12" fill="#F5F3F0"/>
  <g transform="translate(200,110)" text-anchor="middle">
    <svg x="-20" y="-36" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" stroke-width="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
    <text y="28" font-family="system-ui,sans-serif" font-size="13" fill="#A8A29E">图片无法加载</text>
    <text y="48" font-family="system-ui,sans-serif" font-size="11" fill="#C4C0BC">${escXml(reason)}</text>
  </g>
</svg>`;

  return new NextResponse(placeholderSvg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'X-Proxy-Status': 'placeholder',
      'X-Proxy-Reason': reason,
    },
  });
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
