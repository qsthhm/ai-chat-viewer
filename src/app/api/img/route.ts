import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Image proxy for Google CDN images that block direct access.
 * Usage: /api/img?url=https://lh3.googleusercontent.com/...
 *
 * Gemini exports often contain URLs like:
 *   https://lh3.googleusercontent.com/gg/...  (generated content, may expire)
 *   https://lh3.googleusercontent.com/a/...   (profile pics, usually stable)
 *
 * We try multiple strategies to fetch the image.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
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

  // Try multiple User-Agent / header combos to get past Google's restrictions
  const strategies: Array<{ headers: Record<string, string> }> = [
    {
      // Strategy 1: Full Chrome browser headers with Gemini referer
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://gemini.google.com/',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Ch-Ua': '"Chromium";v="125", "Not_A Brand";v="99", "Google Chrome";v="125"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
      },
    },
    {
      // Strategy 2: Googlebot (sometimes whitelisted)
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'image/*,*/*;q=0.8',
      },
    },
    {
      // Strategy 3: Safari with minimal headers
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
        'Accept': '*/*',
      },
    },
  ];

  for (const strategy of strategies) {
    try {
      const resp = await fetch(url, {
        headers: strategy.headers,
        redirect: 'follow',
      });

      if (resp.ok) {
        const ct = resp.headers.get('content-type') || 'image/jpeg';
        const body = await resp.arrayBuffer();

        // Verify we actually got image data (not an HTML error page)
        if (body.byteLength < 100 && ct.includes('text/html')) {
          continue; // Try next strategy
        }

        return new NextResponse(body, {
          headers: {
            'Content-Type': ct,
            'Cache-Control': 'public, max-age=604800, immutable',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // 403/404 likely means expired or restricted — try next strategy
      continue;
    } catch {
      continue;
    }
  }

  // All strategies failed — return a placeholder SVG so the page doesn't show broken images
  const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
  <rect width="400" height="260" rx="12" fill="#F5F3F0"/>
  <g transform="translate(200,110)" text-anchor="middle">
    <svg x="-20" y="-36" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" stroke-width="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>
    <text y="28" font-family="system-ui,sans-serif" font-size="13" fill="#A8A29E">图片已过期或无法加载</text>
    <text y="48" font-family="system-ui,sans-serif" font-size="11" fill="#C4C0BC">Gemini 导出的图片链接可能已失效</text>
  </g>
</svg>`;

  return new NextResponse(placeholderSvg, {
    status: 200, // Return 200 so the <img> tag doesn't show broken image icon
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
