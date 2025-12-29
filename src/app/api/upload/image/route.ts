import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { writeFile, mkdir, access } from 'fs/promises'
import sharp from 'sharp'
import type { ApiResponse } from '@/types'

// Next.js API Route 설정 - 파일 업로드 제한 설정
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 파일 크기 제한 설정
export const maxDuration = 60 // 60초 타임아웃

// 최대 파일 크기 설정 (50MB) - 상수로 선언
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [DEBUG] New image upload API called')
    console.log('🔍 [DEBUG] Request headers:', Object.fromEntries(request.headers.entries()))
    console.log('🔍 [DEBUG] Request method:', request.method)
    console.log('🔍 [DEBUG] Request URL:', request.url)
    
    // FormData에서 파일과 targetId 추출
    let formData: FormData
    try {
      formData = await request.formData()
      console.log('🔍 [DEBUG] FormData parsed successfully')
    } catch (formDataError) {
      console.error('❌ [DEBUG] Failed to parse FormData:', formDataError)
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `Failed to parse form data: ${formDataError instanceof Error ? formDataError.message : 'Unknown error'}`,
        },
        { status: 400 }
      )
    }
    
    const fileData = formData.get('file')
    const targetId = formData.get('targetId') as string
    
    if (!fileData || typeof fileData === 'string') {
      console.error('❌ [DEBUG] No valid file provided in request or file is string')
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: '유효한 파일이 아닙니다.',
        },
        { status: 400 }
      )
    }
    
    // 이제 fileData는 File | Blob 타입임이 보장됨
    const filename = (fileData as { name?: string }).name || 'uploaded.jpg'
    
    console.log('🔍 [DEBUG] Upload info:', {
      filename,
      size: fileData.size,
      sizeInMB: (fileData.size / 1024 / 1024).toFixed(2) + 'MB',
      type: (fileData as { type?: string }).type,
      targetId,
      hasFile: true
    })

    // 파일 크기 체크 (50MB 제한으로 증가)
    console.log('🔍 [DEBUG] File size check:', {
      fileSize: fileData.size,
      maxSize: MAX_FILE_SIZE,
      fileSizeInMB: (fileData.size / 1024 / 1024).toFixed(2) + 'MB',
      maxSizeInMB: (MAX_FILE_SIZE / 1024 / 1024).toFixed(2) + 'MB',
      exceedsLimit: fileData.size > MAX_FILE_SIZE
    })
    
    if (fileData.size > MAX_FILE_SIZE) {
      console.error('❌ [DEBUG] File size exceeds limit')
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `File size exceeds 50MB limit. Current size: ${(fileData.size / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 400 }
      )
    }

    // 지원되는 파일 형식 체크 (클라이언트에서 HEIC 변환됨)
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const fileType = (fileData as { type?: string }).type || ''
    
    if (!supportedTypes.includes(fileType)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Unsupported file type. Only JPG, PNG, and WebP are allowed. HEIC files should be converted on the client side.',
        },
        { status: 400 }
      )
    }

    // 파일명 생성 (targetId가 있으면 사용, 없으면 timestamp)
    const timestamp = Date.now()
    const fileExtension = '.jpg' // 항상 JPEG로 변환하여 저장
    const fileName = targetId ? `${targetId}${fileExtension}` : `${timestamp}${fileExtension}`
    
    // images 폴더 구조로 변경 (환경변수 사용)
    const uploadsDir = process.env.UPLOAD_DIR || '/app/public/uploads'
    const imagesDir = join(uploadsDir, 'images')
    const filePath = join(imagesDir, fileName)
    const fileUrl = `/uploads/images/${fileName}` // 올바른 URL 경로

    console.log('🔍 [DEBUG] File paths:', {
      uploadsDir,
      imagesDir,
      fileName, 
      filePath,
      fileUrl
    })

    // uploads/images 디렉토리 생성 확인 (권한 오류 무시)
    try {
      await access(imagesDir)
      console.log('✅ [DEBUG] Images directory already exists')
    } catch {
      try {
        await mkdir(imagesDir, { recursive: true })
        console.log('✅ [DEBUG] Created images directory')
      } catch (mkdirError) {
        // 권한 오류 등으로 디렉토리 생성 실패 시, 이미 존재한다고 가정하고 계속 진행
        console.log('ℹ️ [DEBUG] Could not create directory (assuming it exists):', mkdirError)
      }
    }

    // 기존 파일이 있으면 삭제 (동일 targetId인 경우)
    if (targetId) {
      try {
        // 기존 물리 파일들 삭제는 gallery 테이블을 통해 처리하므로 images 테이블 관련 코드 제거
        console.log('ℹ️ [DEBUG] File replacement handling moved to gallery table')
      } catch (error) {
        console.log('⚠️ [DEBUG] Could not delete existing files:', error)
      }
    }

    // 파일을 버퍼로 읽기
    const buffer = Buffer.from(await fileData.arrayBuffer())
    console.log('🔍 [DEBUG] File buffer size:', buffer.length)

    // Sharp를 사용하여 이미지 처리 및 저장 (성능 최적화)
    const quality = 85
    const outputBuffer = await sharp(buffer)
      .rotate() // EXIF 방향 정보에 따라 자동 회전
      .jpeg({ 
        quality,
        progressive: true,
        mozjpeg: true // mozjpeg 압축 사용 (더 빠름)
      })
      .resize(1920, null, { // 1920 → 1200으로 낮춰서 처리 속도 향상
        withoutEnlargement: true,
        fit: 'inside',
        kernel: sharp.kernel.nearest // 빠른 리사이징 알고리즘
      })
      .toBuffer()

    // 처리된 이미지를 파일로 저장
    await writeFile(filePath, outputBuffer)
    console.log('✅ [DEBUG] File saved to:', filePath)

    // images 테이블 저장 코드 제거 - gallery 테이블만 사용
    console.log('✅ [DEBUG] File uploaded successfully:', fileUrl)

    return NextResponse.json<ApiResponse<{ fileUrl: string; fileName: string }>>({
      success: true,
      data: { 
        fileUrl,
        fileName 
      },
    })
  } catch (error) {
    console.error('❌ [DEBUG] Error uploading file:', error)
    
    // 413 오류 특별 처리
    if (error instanceof Error && error.message.includes('413')) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: '파일 크기가 너무 큽니다. 서버 제한을 초과했습니다. 파일을 압축하거나 더 작은 파일을 업로드해주세요.',
        },
        { status: 413 }
      )
    }
    
    // FormData 파싱 오류 처리
    if (error instanceof Error && (
      error.message.includes('FormData') || 
      error.message.includes('Request Entity Too Large')
    )) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: '요청 크기가 너무 큽니다. 파일 크기를 50MB 이하로 줄여주세요.',
        },
        { status: 413 }
      )
    }
    
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: `파일 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      },
      { status: 500 }
    )
  }
} 