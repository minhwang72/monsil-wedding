import { NextResponse } from 'next/server'

/**
 * 간단한 헬스체크 엔드포인트
 * 데이터베이스 접근 없이 빠르게 응답하여 Docker health check에 사용
 */
export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { status: 200 }
  )
}

