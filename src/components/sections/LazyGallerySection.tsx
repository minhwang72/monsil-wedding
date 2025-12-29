import { useState, useEffect, useCallback } from 'react'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import GallerySection from './GallerySection'
import type { Gallery } from '@/types'

// API 응답 캐시
interface CacheData {
  data: unknown
  timestamp: number
}

const apiCache = new Map<string, CacheData>()
const CACHE_DURATION = 5 * 60 * 1000 // 5분

// 캐시된 API 호출 함수
const fetchWithCache = async (url: string, forceRefresh = false) => {
  const now = Date.now()
  const cached = apiCache.get(url)
  
  if (!forceRefresh && cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  
  // 타임아웃 설정 (10초)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  
  try {
    // Cache busting을 위한 timestamp 추가
    const timestamp = Date.now()
    const response = await fetch(`${url}?t=${timestamp}`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    apiCache.set(url, { data, timestamp: now })
    return data
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Error fetching ${url}: Request timeout`)
      // 타임아웃 시 캐시된 데이터 반환 (있으면)
      if (cached) {
        return cached.data
      }
    }
    throw error
  }
}

// 갤러리 로딩 스켈레톤
const GalleryLoading = () => (
  <section className="w-full min-h-screen flex flex-col justify-center py-12 md:py-16 px-0 font-sans bg-white">
    <div className="max-w-xl mx-auto text-center w-full px-6 md:px-8">
      {/* 제목 스켈레톤 */}
      <div className="h-10 bg-gray-200 rounded animate-pulse mb-12 md:mb-16 w-40 mx-auto"></div>
      
      {/* 상단 가로선 */}
      <div className="w-full h-px bg-gray-200 mb-6 md:mb-8"></div>
      
      {/* 갤러리 그리드 스켈레톤 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 mb-6 md:mb-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded"></div>
        ))}
      </div>
      
      {/* 하단 가로선 */}
      <div className="w-full h-px bg-gray-200"></div>
    </div>
  </section>
)

export default function LazyGallerySection() {
  const [gallery, setGallery] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  
  const { ref, shouldLoad } = useIntersectionObserver({
    rootMargin: '200px',
    threshold: 0.1,
    triggerOnce: true
  })

  const fetchGallery = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      const galleryData = await fetchWithCache('/api/gallery', forceRefresh)
      
      if (galleryData && typeof galleryData === 'object' && 'success' in galleryData && galleryData.success) {
        setGallery((galleryData as { data: Gallery[] }).data || [])
      }
    } catch (error) {
      console.error('Error fetching gallery:', error)
      // 에러 발생 시 기존 갤러리 데이터 유지 (무한 로딩 방지)
      // setGallery([]) 제거하여 빈 화면 방지
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (shouldLoad && !hasLoaded) {
      fetchGallery().then(() => setHasLoaded(true))
    }
  }, [shouldLoad, hasLoaded, fetchGallery])

  // 주기적 리프레시 (30초마다)
  useEffect(() => {
    if (hasLoaded) {
      const interval = setInterval(() => {
        fetchGallery(true) // 강제 리프레시
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [hasLoaded, fetchGallery])

  return (
    <div ref={ref}>
      {loading && !hasLoaded ? (
        <GalleryLoading />
      ) : (
        <GallerySection gallery={gallery} />
      )}
    </div>
  )
} 