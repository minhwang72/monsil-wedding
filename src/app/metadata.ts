import { Metadata } from 'next'
import type { Gallery } from '@/types'

export async function generateMetadata(): Promise<Metadata> {
  // 기본 이미지를 실제 존재하는 메인 이미지로 설정
  let imageUrl = 'https://monsil.eungming.com/uploads/images/main_cover.jpg'
  
  try {
    // 캐시 무효화를 위한 타임스탬프 추가
    const timestamp = Date.now()
    
    // 서버 사이드에서는 내부 API 호출 사용 (SSL 인증서 문제 회피)
    const baseUrl = process.env.INTERNAL_API_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'http://127.0.0.1:1108'  // Docker 내부에서는 IPv4 사용 (::1 연결 실패 방지)
        : 'http://localhost:3000')  // 개발 환경
      
    console.log(`[DEBUG] Fetching gallery data from: ${baseUrl}/api/gallery`)
    const response = await fetch(`${baseUrl}/api/gallery?t=${timestamp}`, {
      cache: 'no-store',
      next: { revalidate: 0 }, // ISR 캐시도 무효화
      headers: {
        'User-Agent': 'MonsilBot/1.0 (Wedding Invitation Metadata Generator)',
      }
    })
    
    console.log(`[DEBUG] Gallery API response status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`[DEBUG] Gallery API response data:`, data)
      
      if (data.success) {
        const mainImage = data.data.find((img: Gallery) => img.image_type === 'main')
        console.log(`[DEBUG] Found main image:`, mainImage)
        
        if (mainImage?.url) {
          // URL이 상대 경로인 경우 절대 경로로 변환하고 타임스탬프 추가
          imageUrl = mainImage.url.startsWith('http') 
            ? `${mainImage.url}?v=${timestamp}`
            : `https://monsil.eungming.com${mainImage.url}?v=${timestamp}`
          console.log(`[DEBUG] Final image URL:`, imageUrl)
        }
      }
    } else {
      console.error(`[DEBUG] Gallery API failed with status: ${response.status}`)
    }
  } catch (error) {
    console.error('Error fetching main image for metadata:', error)
    // 오류 발생 시 기본 메인 이미지 사용
    console.log(`[DEBUG] Using fallback image: ${imageUrl}`)
  }

  return {
    title: "Min ♥ EunSol's Wedding",
    description: "2025년 11월 8일 오후 1시, 정동제일교회에서 결혼식을 올립니다. 여러분의 축복으로 더 아름다운 날이 되길 바랍니다.",
    keywords: ["결혼식", "청첩장", "wedding", "invitation", "황민", "이은솔", "정동제일교회"],
    openGraph: {
      title: "Min ♥ EunSol's Wedding",
      description: "2025년 11월 8일 오후 1시\n정동제일교회에서 결혼식을 올립니다.\n여러분의 축복으로 더 아름다운 날이 되길 바랍니다.",
      url: "https://monsil.eungming.com",
      siteName: "황민 ♥ 이은솔 결혼식 청첩장",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "황민 ♥ 이은솔 결혼식 청첩장",
        },
      ],
      locale: "ko_KR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Min ♥ EunSol's Wedding",
      description: "2025년 11월 8일 오후 1시, 정동제일교회에서 결혼식을 올립니다. 여러분의 축복으로 더 아름다운 날이 되길 바랍니다.",
      images: [imageUrl],
    },
    icons: {
      icon: '/favicon.svg',
      shortcut: '/favicon.svg',
      apple: '/favicon.svg',
    },
    other: {
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:type': 'image/jpeg',
      'og:image:secure_url': imageUrl,
      'og:updated_time': new Date().toISOString(), // 메타데이터 갱신 시간
      // 카카오톡 전용 메타데이터
      'al:web:url': 'https://monsil.eungming.com',
      'al:web:should_fallback': 'true',
    }
  }
} 