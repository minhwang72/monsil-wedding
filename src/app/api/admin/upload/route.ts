import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import sharp from 'sharp'
import pool from '@/lib/db'
import type { ApiResponse } from '@/types'

// Next.js API Route 설정 - 파일 업로드 제한 설정
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 바디 파서 설정
export const config = {
  api: {
    bodyParser: false, // FormData 처리를 위해 비활성화
    responseLimit: false,
    externalResolver: true,
  },
}

// 최대 파일 크기 설정 (50MB) - 상수로 선언
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [DEBUG] Admin upload request started')
    console.log('🔍 [DEBUG] Request headers:', Object.fromEntries(request.headers.entries()))
    
    // Check admin session
    const sessionToken = request.cookies.get('admin_session')?.value
    console.log('🔍 [DEBUG] Admin session:', sessionToken)

    if (!sessionToken || !sessionToken.startsWith('admin_')) {
      console.log('❌ [DEBUG] Unauthorized upload attempt')
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      )
    }

    // FormData로 파일 직접 받기 (base64 대신)
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
    const image_type = formData.get('image_type') as string || 'gallery'
    
    if (!fileData || typeof fileData === 'string') {
      console.log('❌ [DEBUG] No valid file provided or file is string')
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
      image_type,
      hasFile: true
    })

    // 파일 크기 체크 (50MB 제한)
    if (fileData.size > MAX_FILE_SIZE) {
      console.log('❌ [DEBUG] File too large:', fileData.size)
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'File size exceeds 50MB limit',
        },
        { status: 400 }
      )
    }

    // 파일을 버퍼로 읽기
    const buffer = Buffer.from(await fileData.arrayBuffer())
    console.log('🔍 [DEBUG] File buffer size:', buffer.length)

    // Generate paths and filename - images 폴더로 통합 (환경변수 사용)
    const uploadsDir = process.env.UPLOAD_DIR || '/app/public/uploads'
    const imagesDir = join(uploadsDir, 'images')
    
    // images 디렉토리 확인 및 생성 (권한 오류 무시)
    try {
      await import('fs/promises').then(async (fs) => {
        try {
          await fs.access(imagesDir)
          console.log('✅ [DEBUG] Images directory already exists')
        } catch {
          try {
            await fs.mkdir(imagesDir, { recursive: true })
            console.log('✅ [DEBUG] Created images directory')
          } catch (mkdirError) {
            // 권한 오류 등으로 디렉토리 생성 실패 시, 이미 존재한다고 가정하고 계속 진행
            console.log('ℹ️ [DEBUG] Could not create directory (assuming it exists):', mkdirError)
          }
        }
      })
    } catch (dirError) {
      // 디렉토리 처리 실패해도 계속 진행 (Docker 볼륨 마운트에서는 이미 존재)
      console.log('ℹ️ [DEBUG] Directory access/creation failed (continuing anyway):', dirError)
    }
    
    // 파일명 생성 로직 개선 (랜덤 문자열 사용)
    let dbFilename: string
    
    if (image_type === 'main') {
      // 메인 이미지는 main_cover.jpg로 저장
      dbFilename = 'main_cover.jpg'
    } else {
      // 갤러리 이미지인 경우 - 랜덤 문자열 사용 (순서 혼동 방지)
      const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const timestamp = Date.now()
      dbFilename = `gallery_${timestamp}_${randomString}.jpg`
    }
    
    const filepath = join(imagesDir, dbFilename)
    const dbPath = `images/${dbFilename}` // DB에 저장할 상대 경로
    
    console.log('🔍 [DEBUG] File paths:', {
      imagesDir,
      dbFilename,
      filepath,
      dbPath,
      image_type
    })

    // Handle main image type - delete existing main image and remove physical files
    if (image_type === 'main') {
      console.log('🔍 [DEBUG] Processing main image upload - deleting existing')
      
      // Get existing main images to delete physical files
      const [existingRows] = await pool.query(
        'SELECT filename FROM gallery WHERE image_type = "main"'
      )
      const existingImages = existingRows as { filename: string }[]
      console.log('🔍 [DEBUG] Existing main images to delete:', existingImages)
      
      // Delete existing main images from database
      await pool.query(
        'DELETE FROM gallery WHERE image_type = "main"'
      )
      
      // Delete physical files
      for (const image of existingImages) {
        if (image.filename) {
          const uploadsDir = process.env.UPLOAD_DIR || '/app/public/uploads'
          const oldFilePath = join(uploadsDir, image.filename)
          try {
            await import('fs/promises').then(async fs => {
              try {
                await fs.unlink(oldFilePath)
                console.log('✅ [DEBUG] Deleted physical file:', oldFilePath)
              } catch (unlinkError: unknown) {
                const error = unlinkError as { code?: string }
                if (error.code !== 'ENOENT') {
                  console.log('⚠️ [DEBUG] Failed to delete file:', unlinkError)
                } else {
                  console.log('ℹ️ [DEBUG] File not found (already deleted):', oldFilePath)
                }
              }
            })
          } catch (error) {
            console.log('ℹ️ [DEBUG] File deletion wrapper error:', error)
          }
        }
      }
    }

    // Sharp를 사용하여 이미지 처리 (성능 최적화)
    console.log('🔍 [DEBUG] Processing image with Sharp (optimized)...')
    try {
      // 성능 최적화된 Sharp 설정
      const outputBuffer = await sharp(buffer)
        .rotate() // EXIF 방향 정보에 따라 자동 회전
        .jpeg({ 
          quality: 75, // 85 → 75로 낮춰서 처리 속도 향상
          progressive: true,
          mozjpeg: true // mozjpeg 압축 사용 (더 빠름)
        })
        .resize(1200, null, { // 1920 → 1200으로 낮춰서 처리 속도 향상
          withoutEnlargement: true,
          fit: 'inside',
          kernel: sharp.kernel.nearest // 빠른 리사이징 알고리즘
        })
        .toBuffer()

      // 처리된 이미지를 파일로 저장 (fs/promises 사용)
      await import('fs/promises').then(async (fs) => {
        await fs.writeFile(filepath, outputBuffer)
      })
      
      console.log('✅ [DEBUG] Image processed and saved with Sharp (optimized)')
    } catch (sharpError) {
      console.error('❌ [DEBUG] Sharp processing failed:', sharpError)
      
      // HEIC 파일 특별 처리
      const isHeicFile = filename.toLowerCase().includes('.heic') || (fileData as { type?: string }).type === 'image/heic'
      
      if (isHeicFile) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'HEIC 파일 처리에 실패했습니다. 클라이언트에서 JPEG로 변환된 파일을 사용하거나, 다른 형식(JPG, PNG)으로 변환하여 업로드해주세요.',
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `이미지 처리에 실패했습니다: ${sharpError instanceof Error ? sharpError.message : '알 수 없는 오류'}`,
        },
        { status: 500 }
      )
    }

    // Save to database with file path
    const koreaTime = new Date(Date.now() + (9 * 60 * 60 * 1000))
    const formattedTime = koreaTime.toISOString().slice(0, 19).replace('T', ' ')
    
    console.log('🔍 [DEBUG] Inserting to database:', {
      filename: dbPath,
      image_type,
      formattedTime
    })

    // 갤러리 이미지인 경우 order_index 설정
    let insertResult: unknown
    if (image_type === 'gallery') {
      // 현재 최대 order_index 조회
      const [maxOrderResult] = await pool.query(
        'SELECT MAX(order_index) as max_order FROM gallery WHERE image_type = "gallery"'
      )
      const maxOrder = (maxOrderResult as { max_order: number | null }[])[0]?.max_order || 0
      const nextOrderIndex = maxOrder + 1
      
      console.log('🔍 [DEBUG] Gallery order_index:', { maxOrder, nextOrderIndex })
      
      insertResult = await pool.query(
        'INSERT INTO gallery (filename, image_type, order_index, created_at) VALUES (?, ?, ?, ?)',
        [dbPath, image_type, nextOrderIndex, formattedTime]
      )
      
      console.log('✅ [DEBUG] Database insert result:', insertResult)
    } else {
      // 메인 이미지인 경우 order_index 없이 저장
      insertResult = await pool.query(
        'INSERT INTO gallery (filename, image_type, created_at) VALUES (?, ?, ?)',
        [dbPath, image_type, formattedTime]
      )
      
      console.log('✅ [DEBUG] Database insert result:', insertResult)
    }

    return NextResponse.json<ApiResponse<{ filename: string }>>({
      success: true,
      data: { filename: dbPath },
    })
  } catch (error) {
    console.error('❌ [DEBUG] Error uploading file:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to upload file',
      },
      { status: 500 }
    )
  }
} 