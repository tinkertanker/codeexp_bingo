import { useEffect, useRef, useState } from 'react'
import { prepareImageForUpload } from '../lib/image'

export type PhotoCaptureProps = {
  onChange: (file: File | null) => void
}

export default function PhotoCapture({ onChange }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFile = async (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (!file) {
      setPreviewUrl(null)
      setFileName(null)
      onChange(null)
      return
    }
    // Convert HEIC -> JPEG (and downscale) so the photo renders everywhere.
    setProcessing(true)
    onChange(null)
    let prepared = file
    try {
      prepared = await prepareImageForUpload(file)
    } finally {
      setProcessing(false)
    }
    setPreviewUrl(URL.createObjectURL(prepared))
    setFileName(prepared.name)
    onChange(prepared)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { void handleFile(e.target.files?.[0] ?? null) }}
      />
      {processing ? (
        <div className="w-full py-3 text-center text-sm text-bh-dim ring-1 ring-bh-line rounded-md">
          Processing photo…
        </div>
      ) : previewUrl ? (
        <div className="space-y-2">
          <img src={previewUrl} alt="preview" className="w-full rounded-md ring-1 ring-bh-line" />
          <div className="text-xs text-bh-dim truncate font-mono">{fileName}</div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={processing}
            className="w-full py-2 rounded-md bg-bh-panel text-bh-dim ring-1 ring-bh-line hover:text-white text-sm disabled:opacity-50"
          >
            Choose a different photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="bh-btn-primary w-full"
        >
          Take or choose a photo
        </button>
      )}
    </div>
  )
}
