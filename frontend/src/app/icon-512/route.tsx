import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          borderRadius: 96,
          background: '#25D366',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="300"
          height="300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 6V2H8" />
          <path d="M8 18l-4 4V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z" />
          <path d="M2 12h2" />
          <path d="M9 11v2" />
          <path d="M15 11v2" />
          <path d="M20 12h2" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 },
  )
}
