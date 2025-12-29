import { useEffect, useRef, useState } from 'react'

interface UseScrollAnimationOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
  animationDelay?: number
  disabled?: boolean
}

export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { 
    threshold = 0.1, 
    rootMargin = '0px', 
    triggerOnce = true,
    animationDelay = 0,
    disabled = false
  } = options
  
  const [isVisible, setIsVisible] = useState(false)
  const hasTriggeredRef = useRef(false)
  const [shouldAnimate, setShouldAnimate] = useState(disabled)
  const ref = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (disabled) {
      setShouldAnimate(true)
      return
    }

    setShouldAnimate(false)
    hasTriggeredRef.current = false
    setIsVisible(false)

    const element = ref.current
    if (!element) return

    // 모바일 디바이스 감지
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    // 모바일에서는 더 큰 rootMargin을 사용하여 미리 로드
    const mobileRootMargin = isMobile ? '100px' : rootMargin

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting
        setIsVisible(isIntersecting)
        
        if (isIntersecting && (!triggerOnce || !hasTriggeredRef.current)) {
          if (triggerOnce) {
            hasTriggeredRef.current = true
          }
          
          // 이전 타임아웃 제거
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
          
          // 애니메이션 딜레이 적용
          if (animationDelay > 0) {
            timeoutRef.current = setTimeout(() => {
              setShouldAnimate(true)
            }, animationDelay)
          } else {
            setShouldAnimate(true)
          }
        } else if (!triggerOnce && !isIntersecting) {
          setShouldAnimate(false)
        }
      },
      { 
        threshold, 
        rootMargin: mobileRootMargin
      }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [threshold, rootMargin, triggerOnce, animationDelay, disabled])

  const finalShouldAnimate = disabled || (triggerOnce ? shouldAnimate : (isVisible && shouldAnimate))

  return { 
    ref, 
    isVisible, 
    shouldAnimate: finalShouldAnimate,
    animationClass: finalShouldAnimate ? 'animate-fade-in-up' : 'opacity-0 translate-y-4 transition-opacity duration-300'
  }
} 