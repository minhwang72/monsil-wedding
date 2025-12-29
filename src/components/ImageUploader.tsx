'use client'

import { useState, useRef, useCallback } from 'react'

interface ImageUploaderProps {
  onUploadSuccess: (fileUrl: string) => void
  targetId?: string
  accept?: string
  maxSize?: number
  className?: string
  disabled?: boolean
}

interface UploadProgress {
  percent: number
  stage: string
}

// 디바이스 감지
const isMobile = () => {
  if (typeof window !== 'undefined') {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }
  return false
}

export default function ImageUploader({
  onUploadSuccess,
  targetId,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  maxSize = 10 * 1024 * 1024, // 10MB
  className = "",
  disabled = false
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress>({ percent: 0, stage: '' })
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const deviceType = isMobile() ? 'mobile' : 'desktop'

  // 이미지 압축 함수 (Canvas 사용)
  const compressImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      console.log('🔍 [DEBUG] Starting image compression:', file.name, file.size)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          try {
            // 5MB 이상만 압축 적용
            if (file.size < 5 * 1024 * 1024) {
              console.log('✅ [DEBUG] File size under 5MB, skipping compression')
              resolve(file)
              return
            }

            console.log('🔍 [DEBUG] Original image dimensions:', img.width, 'x', img.height)
            
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            
            if (!ctx) {
              reject(new Error('Canvas context not available'))
              return
            }
            
            // 최대 해상도: 1200x1200px, 비율 유지
            let { width, height } = img
            const maxDimension = 1200
            
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = (height * maxDimension) / width
                width = maxDimension
              } else {
                width = (width * maxDimension) / height
                height = maxDimension
              }
            }
            
            console.log('🔍 [DEBUG] Compressed image dimensions:', width, 'x', height)
            
            canvas.width = width
            canvas.height = height
            
            // 이미지를 캔버스에 그리기
            ctx.drawImage(img, 0, 0, width, height)
            
            // JPEG 품질 0.8로 압축
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }
              
              // Blob → File 변환 (iOS 대응)
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              
              console.log('✅ [DEBUG] Image compressed:', file.size, '→', compressedFile.size)
              resolve(compressedFile)
            }, 'image/jpeg', 0.8)
          } catch (error) {
            console.error('❌ [DEBUG] Compression error:', error)
            reject(error)
          }
        }
        
        img.onerror = () => reject(new Error('Failed to load image'))
        
        if (typeof e.target?.result === 'string') {
          img.src = e.target.result
        } else {
          reject(new Error('Failed to read file'))
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }, [])

  // 파일 처리 및 업로드
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return
    
    console.log('🔍 [DEBUG] Starting file upload:', file.name, file.type, file.size)
    setError(null)
    setUploading(true)
    setProgress({ percent: 10, stage: 'Validating file...' })
    
    try {
      // 파일 크기 체크
      if (file.size > maxSize) {
        throw new Error(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`)
      }
      
      // HEIC 파일 거부 (가장 안정적인 전략)
      const isHeicFile = file.name.toLowerCase().includes('.heic') || file.type === 'image/heic'
      if (isHeicFile) {
        console.log('❌ [DEBUG] HEIC file detected, rejecting for stability')
        throw new Error('HEIC 이미지는 지원되지 않습니다. 사진 앱에서 JPG 또는 PNG로 변환하여 업로드해 주세요.')
      }
      
      // 지원되는 형식만 처리 (JPEG, PNG, WebP)
      const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!supportedTypes.includes(file.type)) {
        throw new Error('지원되지 않는 파일 형식입니다. JPG, PNG, WebP 파일만 업로드 가능합니다.')
      }
      
      setProgress({ percent: 30, stage: 'Processing image...' })
      
      let processedFile = file
      
      // 이미지 압축 (JPEG, PNG, WebP만)
      setProgress({ percent: 50, stage: 'Compressing image...' })
      processedFile = await compressImage(processedFile)
      
      // 프리뷰 생성
      setProgress({ percent: 70, stage: 'Generating preview...' })
      const previewUrl = URL.createObjectURL(processedFile)
      setPreview(previewUrl)
      
      // 서버로 업로드
      setProgress({ percent: 80, stage: 'Uploading to server...' })
      
      const formData = new FormData()
      formData.append('file', processedFile)
      if (targetId) {
        formData.append('targetId', targetId)
      }
      
      console.log('🔍 [DEBUG] Starting server upload:', {
        fileName: processedFile.name,
        fileSize: processedFile.size,
        fileSizeInMB: (processedFile.size / 1024 / 1024).toFixed(2) + 'MB',
        fileType: processedFile.type,
        targetId: targetId,
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => [
          key, 
          value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value
        ])
      })
      
      // 타임아웃 설정 (60초 - 파일 업로드는 시간이 걸릴 수 있음)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        signal: controller.signal,
        body: formData,
      })
      clearTimeout(timeoutId)
      
      console.log('🔍 [DEBUG] Upload response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }
      
      setProgress({ percent: 100, stage: 'Upload complete!' })
      console.log('✅ [DEBUG] Upload successful:', result.data.fileUrl)
      
      // 성공 콜백 호출
      onUploadSuccess(result.data.fileUrl)
      
      // 상태 초기화
      setTimeout(() => {
        setProgress({ percent: 0, stage: '' })
      }, 1000)
      
    } catch (error) {
      console.error('❌ [DEBUG] Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }, [maxSize, targetId, onUploadSuccess, compressImage])

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  // 드래그 앤 드롭 핸들러 (데스크톱용)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  // 클릭 핸들러
  const handleClick = () => {
    if (disabled || uploading) return
    fileInputRef.current?.click()
  }

  return (
    <div className={`relative ${className}`}>
      {/* 파일 입력 (숨김) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />
      
      {/* 업로드 영역 */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors
          ${dragOver ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {preview ? (
          // 프리뷰 표시
          <div className="text-center">
            <img
              src={preview}
              alt="Preview"
              className="max-w-full max-h-48 mx-auto rounded-lg mb-4"
            />
            {!uploading && (
              <p className="text-sm text-gray-600">
                Click to change image
              </p>
            )}
          </div>
        ) : (
          // 기본 업로드 UI
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                {deviceType === 'mobile' ? (
                  <>Tap to select image</>
                ) : (
                  <>Click to select or drag and drop image</>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, WebP up to {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </div>
          </div>
        )}
        
        {/* 업로드 진행률 */}
        {uploading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4">
                <svg className="animate-spin h-16 w-16 text-purple-600" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
              <div className="w-48 bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{progress.stage}</p>
              <p className="text-xs text-gray-500">{progress.percent}%</p>
            </div>
          </div>
        )}
      </div>
      
      {/* 에러 메시지 */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
} 