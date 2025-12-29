import { NextRequest, NextResponse } from 'next/server'
import { readFile, access } from 'fs/promises'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const uploadsDir = process.env.UPLOAD_DIR || '/app/public/uploads'
    const filePath = join(uploadsDir, ...path)
    
    // 파일 존재 확인
    try {
      await access(filePath)
    } catch {
      return new NextResponse('File not found', { status: 404 })
    }

    // 파일 읽기
    const fileBuffer = await readFile(filePath)
    
    // 파일 확장자에 따른 Content-Type 설정
    const ext = path[path.length - 1].split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'webp':
        contentType = 'image/webp'
        break
      case 'gif':
        contentType = 'image/gif'
        break
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 1년 캐시
      },
    })
  } catch (error) {
    console.error('Error serving upload file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 