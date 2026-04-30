import { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export type QRScannerProps = {
  onScan: (text: string) => void
  onError?: (msg: string) => void
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const reactId = useId()
  const containerId = `qr-scanner-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (cancelled) return
          onScan(decodedText)
        },
        () => {
          // Per-frame parse failures are normal; ignore.
        },
      )
      .catch((e: unknown) => {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : String(e)
        setPermissionError(msg)
        onError?.(msg)
      })

    return () => {
      cancelled = true
      const s = scannerRef.current
      if (s) {
        // isScanning is sync; stop returns a promise
        if (s.isScanning) {
          s.stop().catch(() => {})
        }
      }
    }
  }, [containerId, onScan, onError])

  if (permissionError) {
    return (
      <div className="p-4 rounded-md ring-1 ring-bh-magenta/40 bg-bh-magenta/10 text-bh-magenta text-sm">
        Camera access blocked: {permissionError}. Check browser permissions and reload.
      </div>
    )
  }

  return (
    <div className="relative">
      <div id={containerId} className="w-full max-w-md mx-auto rounded-md overflow-hidden bg-black aspect-square ring-1 ring-bh-lime/40 shadow-neon-lime" />
      <p className="text-xs text-bh-dim text-center mt-2">Hold your phone steady — QR will auto-detect.</p>
    </div>
  )
}
