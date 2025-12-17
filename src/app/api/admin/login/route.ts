import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyPassword } from '@/lib/encryption'

// OPTIONS 요청 처리 (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [DEBUG] Login request received')
    console.log('🔍 [DEBUG] Request method:', request.method)
    console.log('🔍 [DEBUG] Request URL:', request.url)
    console.log('🔍 [DEBUG] Request headers:', Object.fromEntries(request.headers.entries()))

    // 요청 본문 파싱
    let body
    try {
      body = await request.json()
      console.log('🔍 [DEBUG] Request body parsed:', { username: body.username, hasPassword: !!body.password })
    } catch (parseError) {
      console.error('❌ [DEBUG] Failed to parse request body:', parseError)
      return NextResponse.json(
        { success: false, message: '요청 본문을 파싱할 수 없습니다.' },
        { status: 400 }
      )
    }

    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '사용자명과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 사용자명으로 admin 조회
    const [rows] = await pool.query(
      'SELECT id, username, password FROM admin WHERE username = ?',
      [username]
    )
    
    const adminRows = rows as { id: number; username: string; password: string }[]
    
    if (adminRows.length === 0) {
      return NextResponse.json(
        { success: false, message: '잘못된 사용자명 또는 비밀번호입니다.' },
        { status: 401 }
      )
    }

    const admin = adminRows[0]
    
    // 저장된 해시된 비밀번호를 검증
    if (!verifyPassword(password, admin.password)) {
      return NextResponse.json(
        { success: false, message: '잘못된 사용자명 또는 비밀번호입니다.' },
        { status: 401 }
      )
    }

    // 세션 생성 (24시간)
    const sessionId = `admin_${admin.id}_${Date.now()}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간

    const response = NextResponse.json({
      success: true,
      message: '로그인에 성공했습니다.',
      admin: {
        id: admin.id,
        username: admin.username
      }
    })

    // httpOnly 쿠키 설정
    response.cookies.set('admin_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 