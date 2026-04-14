import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params
  const size = sizeParam === '512' ? 512 : sizeParam === '180' ? 180 : 192
  const radius = Math.round(size * 0.18)
  const fontSize = Math.round(size * 0.56)

  return new ImageResponse(
    (
      <div
        style={{
          background: '#25D366',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius,
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize,
            fontWeight: 800,
            lineHeight: 1,
            fontFamily: 'sans-serif',
          }}
        >
          Z
        </span>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  )
}
