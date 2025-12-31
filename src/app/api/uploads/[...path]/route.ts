import { NextRequest, NextResponse } from 'next/server'
import { readFile, access } from 'fs/promises'
import { join, resolve } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    
    // 보안: 경로 traversal 공격 방지
    const sanitizedPath = path.map(p => p.replace(/\.\./g, '').replace(/[\/\\]/g, ''))
    if (sanitizedPath.some(p => p.includes('..') || p.includes('/') || p.includes('\\'))) {
      return new NextResponse('Invalid path', { status: 400 })
    }
    
    // 보안: 이미지 파일만 허용
    const filename = sanitizedPath[sanitizedPath.length - 1] || ''
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    if (!allowedExtensions.includes(fileExtension)) {
      return new NextResponse('File type not allowed', { status: 403 })
    }
    
    const uploadsDir = process.env.UPLOAD_DIR || '/app/public/uploads'
    const filePath = join(uploadsDir, ...sanitizedPath)
    
    // 보안: uploadsDir 밖으로 나가는 경로 차단
    const resolvedPath = resolve(filePath)
    const resolvedUploadsDir = resolve(uploadsDir)
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      return new NextResponse('Invalid path', { status: 403 })
    }
    
    // 파일 존재 확인
    try {
      await access(filePath)
    } catch {
      return new NextResponse('File not found', { status: 404 })
    }

    // 파일 읽기
    const fileBuffer = await readFile(filePath)
    
    // 파일 확장자에 따른 Content-Type 설정
    const ext = sanitizedPath[sanitizedPath.length - 1].split('.').pop()?.toLowerCase()
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