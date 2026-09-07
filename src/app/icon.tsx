
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#82c91e',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0a0d14',
          borderRadius: 8,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 0-4.95 1.83" />
          <path d="M12 2a10 10 0 0 1 4.95 1.83" />
          <path d="m5 5 2.5 10" />
          <path d="m19 5-2.5 10" />
          <path d="m22 12-5.5-2.5" />
          <path d="m2 12 5.5-2.5" />
          <path d="m12 22 2.5-5.5" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
