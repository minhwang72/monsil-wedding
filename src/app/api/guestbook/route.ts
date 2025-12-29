import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/encryption'
import type { ApiResponse, Guestbook } from '@/types'

// API 응답용 타입 (created_at이 string으로 포맷됨)
interface GuestbookResponse {
  id: number
  name: string
  content: string
  created_at: string // 포맷된 문자열
}

export async function GET() {
  try {
    // DB 쿼리 타임아웃 설정 (10초)
    const queryPromise = pool.query(
      'SELECT id, name, content, created_at FROM guestbook WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 50'
    )
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 10000)
    })
    
    const [rows] = await Promise.race([queryPromise, timeoutPromise]) as [unknown[], unknown]
    const guestbookRows = rows as Guestbook[]
    
    // DB에서 가져온 시간을 원하는 형식으로 포맷팅
    const formattedGuestbook: GuestbookResponse[] = guestbookRows.map(row => {
      // MySQL DATETIME을 Date 객체로 변환
      const dbDate = new Date(row.created_at)
      
      // 한국 시간 형식으로 포맷팅 (YYYY. MM. DD HH:mm)
      const year = dbDate.getFullYear()
      const month = String(dbDate.getMonth() + 1).padStart(2, '0')
      const day = String(dbDate.getDate()).padStart(2, '0')
      const hours = String(dbDate.getHours()).padStart(2, '0')
      const minutes = String(dbDate.getMinutes()).padStart(2, '0')
      const formattedDate = `${year}. ${month}. ${day} ${hours}:${minutes}`
      
      return {
        id: row.id,
        name: row.name,
        content: row.content,
        created_at: formattedDate
      }
    })
    
    const response = NextResponse.json<ApiResponse<GuestbookResponse[]>>({
      success: true,
      data: formattedGuestbook,
    })

    // 캐싱 헤더 제거 - 관리자 수정사항이 바로 반영되도록
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Error fetching guestbook:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to fetch guestbook',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, password, content } = body

    // 이름과 내용은 평문으로 저장, 비밀번호만 해시화
    const hashedPassword = hashPassword(password)

    // 한국 시간으로 현재 시간 생성
    const koreaTime = new Date(Date.now() + (9 * 60 * 60 * 1000)) // UTC + 9시간
    const formattedTime = koreaTime.toISOString().slice(0, 19).replace('T', ' ')

    await pool.query(
      'INSERT INTO guestbook (name, password, content, created_at) VALUES (?, ?, ?, ?)',
      [name, hashedPassword, content, formattedTime]
    )

    return NextResponse.json<ApiResponse<null>>({
      success: true,
    })
  } catch (error) {
    console.error('Error creating guestbook entry:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to create guestbook entry',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    const password = url.searchParams.get('password')

    if (!id || !password) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'ID와 비밀번호가 필요합니다.',
        },
        { status: 400 }
      )
    }

    // 저장된 비밀번호 확인
    const [passwordRows] = await pool.query(
      'SELECT password FROM guestbook WHERE id = ? AND deleted_at IS NULL',
      [id]
    )

    if (!Array.isArray(passwordRows) || passwordRows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: '메시지를 찾을 수 없습니다.',
        },
        { status: 404 }
      )
    }

    const storedPassword = (passwordRows[0] as { password: string }).password
    
    // 비밀번호 검증 (해시된 비밀번호와 평문 비밀번호 모두 지원)
    let passwordMatch = false
    
    if (storedPassword.includes(':')) {
      // 해시된 비밀번호로 검증
      passwordMatch = verifyPassword(password, storedPassword)
    } else {
      // 평문 비밀번호로 검증 (기존 데이터 호환성)
      passwordMatch = password === storedPassword
      
      // 평문 비밀번호가 일치하면 이 기회에 해시화
      if (passwordMatch) {
        try {
          const hashedPassword = hashPassword(password)
          await pool.query(
            'UPDATE guestbook SET password = ? WHERE id = ?',
            [hashedPassword, id]
          )
          console.log(`Password hashed for guestbook entry ${id}`)
        } catch (hashError) {
          console.error('Failed to hash password during deletion:', hashError)
          // 해시화 실패해도 삭제는 진행
        }
      }
    }
    
    if (!passwordMatch) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: '비밀번호가 일치하지 않습니다.',
        },
        { status: 401 }
      )
    }

    // 한국 시간으로 현재 시간 생성하여 deleted_at에 설정
    const koreaTime = new Date(Date.now() + (9 * 60 * 60 * 1000)) // UTC + 9시간
    const formattedTime = koreaTime.toISOString().slice(0, 19).replace('T', ' ')

    await pool.query(
      'UPDATE guestbook SET deleted_at = ? WHERE id = ?',
      [formattedTime, id]
    )

    return NextResponse.json<ApiResponse<null>>({
      success: true,
    })
  } catch (error) {
    console.error('Error deleting guestbook entry:', error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: '메시지 삭제에 실패했습니다.',
      },
      { status: 500 }
    )
  }
} 