import { useEffect, useRef, useState } from 'react'

export type PhotoCaptureProps = {
  onChange: (file: File | null) => void
}

export default function PhotoCapture({ onChange }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFile = (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (!file) {
      setPreviewUrl(null)
      setFileName(null)
      onChange(null)
      return
    }
    setPreviewUrl(URL.createObjectURL(file))
    setFileName(file.name)
    onChange(file)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {previewUrl ? (
        <div className="space-y-2">
          <img src={previewUrl} alt="preview" className="w-full rounded-lg shadow" />
          <div className="text-xs text-slate-500 truncate">{fileName}</div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full py-2 rounded-lg bg-white text-slate-700 ring-1 ring-slate-300 text-sm"
          >
            Choose a different photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-3 rounded-lg bg-slate-800 text-white font-semibold"
        >
          Take or choose a photo
        </button>
      )}
    </div>
  )
}
