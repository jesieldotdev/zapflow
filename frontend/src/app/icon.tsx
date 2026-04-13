import { ImageResponse } from 'next/og'

export const contentType = 'image/png'

export function generateImageMetadata() {
  return [
    { id: '32',  size: { width: 32,  height: 32  }, contentType: 'image/png' },
    { id: '192', size: { width: 192, height: 192 }, contentType: 'image/png' },
    { id: '512', size: { width: 512, height: 512 }, contentType: 'image/png' },
  ]
}

function AppIcon({ size }: { size: number }) {
  const radius = Math.round(size * 0.18)
  const iconSize = Math.round(size * 0.55)
  const strokeWidth = Math.max(1.5, size * 0.06)

  return (
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
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 6V2H8" />
        <path d="m8 18-4 4V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z" />
        <path d="M2 12h2" />
        <path d="M9 11v2" />
        <path d="M15 11v2" />
        <path d="M20 12h2" />
      </svg>
    </div>
  )
}

export default function Icon({ id }: { id: string }) {
  const size = id === '512' ? 512 : id === '192' ? 192 : 32
  return new ImageResponse(<AppIcon size={size} />, { width: size, height: size })
}
