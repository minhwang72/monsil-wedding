'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ContactPerson } from '@/types'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

export default function ContactSection() {
  const [contacts, setContacts] = useState<ContactPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'groom' | 'bride'>('groom')

  // 스크롤 애니메이션 훅들 - 로딩 중일 때는 비활성화
  const titleAnimation = useScrollAnimation({ threshold: 0.4, animationDelay: 200, disabled: loading })
  const contactAnimation = useScrollAnimation({ threshold: 0.3, animationDelay: 400, disabled: loading })
  const buttonAnimation = useScrollAnimation({ threshold: 0.2, animationDelay: 600, disabled: loading })

  const fetchContacts = useCallback(async () => {
    try {
      // 타임아웃 설정 (10초)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      
      // Cache busting을 위한 timestamp 추가
      const timestamp = Date.now()
      const response = await fetch(`/api/contacts?t=${timestamp}`, {
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
      
      if (data.success) {
        setContacts(data.data || [])
        return true // 성공
      }
      return false // 실패
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Error fetching contacts: Request timeout')
      } else {
        console.error('Error fetching contacts:', error)
      }
      // 에러 발생 시 기존 데이터 유지 (무한 로딩 방지)
      return false // 실패
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // 페이지 로드 시 한 번만 API 호출
    // 새로고침하면 자동으로 다시 호출되므로 자동 갱신 불필요
    fetchContacts()
  }, [fetchContacts])

  const handleCall = (phone: string) => {
    if (phone && phone.trim()) {
      window.location.href = `tel:${phone}`
    }
  }

  const handleSMS = (phone: string) => {
    if (phone && phone.trim()) {
      window.location.href = `sms:${phone}`
    }
  }

  const handleModalOpen = () => {
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
  }

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleModalClose()
    }
  }

  const getRelationshipLabel = (relationship: string) => {
    switch (relationship) {
      case 'person': return ''
      case 'father': return '아버지'
      case 'mother': return '어머니'
      default: return ''
    }
  }

  const formatContactText = (contacts: ContactPerson[], side: 'groom' | 'bride') => {
    const person = contacts.find(c => c.relationship === 'person')
    const father = contacts.find(c => c.relationship === 'father')
    const mother = contacts.find(c => c.relationship === 'mother')
    
    if (!person) return { line1: '', line2: '' }
    
    const parentNames = []
    if (father) parentNames.push(father.name)
    if (mother) parentNames.push(mother.name)
    
    if (parentNames.length > 0) {
      const relationship = side === 'groom' ? '아들' : '딸'
      return {
        line1: `${parentNames.join(' · ')}의 ${relationship}`,
        line2: person.name
      }
    }
    
    return { line1: '', line2: person.name }
  }

  const groomSide = contacts.filter(contact => contact.side === 'groom')
  const brideSide = contacts.filter(contact => contact.side === 'bride')

  if (loading) {
    return (
      <section className="w-full flex flex-col justify-center py-12 md:py-16 px-6 md:px-10 font-sans bg-purple-50/50">
        <div className="max-w-xl mx-auto text-center w-full">
          {/* 제목 스켈레톤 */}
          <div className="h-10 md:h-12 bg-gray-200 rounded animate-pulse mb-12 md:mb-16 w-32 mx-auto"></div>
          
          <div className="max-w-md mx-auto space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4"></div>
              </div>
            </div>
            <div className="h-10 bg-gray-200 rounded animate-pulse w-full"></div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="w-full flex flex-col justify-center py-12 md:py-16 px-6 md:px-10 font-sans bg-purple-50/50">
        <div className="max-w-xl mx-auto text-center w-full">
          {/* 제목 */}
          <h2 
            ref={titleAnimation.ref}
            className={`text-3xl md:text-4xl font-semibold mb-12 md:mb-16 tracking-wider text-black transition-all duration-800 ${titleAnimation.animationClass}`}
            style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          >
            CONTACT
          </h2>
          
          <div className="max-w-md mx-auto space-y-8">
            {/* 신랑신부 정보 가로 배치 */}
            <div 
              ref={contactAnimation.ref}
              className={`grid grid-cols-2 gap-8 py-8 transition-all duration-800 ${contactAnimation.animationClass}`}
            >
              {/* 신랑측 */}
              <div className="text-center space-y-4">
                {(() => {
                  const contactText = formatContactText(groomSide, 'groom')
                  return (
                    <>
                      {contactText.line1 && (
                        <div className="text-xs md:text-sm font-semibold text-black" style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                          {contactText.line1}
                        </div>
                      )}
                      <div className="text-base md:text-lg font-semibold text-black" style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        <span className="text-sm md:text-base font-semibold text-black mr-2" style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>신랑</span>
                        {contactText.line2}
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* 신부측 */}
              <div className="text-center space-y-4">
                {(() => {
                  const contactText = formatContactText(brideSide, 'bride')
                  return (
                    <>
                      {contactText.line1 && (
                        <div className="text-xs md:text-sm font-semibold text-black" style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                          {contactText.line1}
                        </div>
                      )}
                      <div className="text-base md:text-lg font-semibold text-black" style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        <span className="text-sm md:text-base font-semibold text-black mr-2" style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>신부</span>
                        {contactText.line2}
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* 연락하기 버튼 */}
            <div 
              ref={buttonAnimation.ref}
              className={`pt-4 transition-all duration-800 ${buttonAnimation.animationClass}`}
            >
              <button
                onClick={handleModalOpen}
                className="w-full py-3 bg-blue-100 text-black rounded-lg font-medium text-sm md:text-base"
                style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                축하 연락하기
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 연락처 모달 */}
      {modalOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[9999] p-4 animate-modal-fade-in"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          onClick={handleBackgroundClick}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm font-sans animate-modal-slide-up shadow-2xl">
            {/* 모달 헤더 */}
            <div className="mb-6 text-center relative">
              <button
                onClick={handleModalClose}
                className="absolute -top-2 -right-2 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h3 className="text-xl font-semibold text-black mb-2" style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                축하연락하기
              </h3>
              <p className="text-sm font-medium text-black" style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                연락으로 마음을 전해요
              </p>
            </div>

            {/* 탭 버튼 */}
            <div className="flex mb-6 gap-2">
              <button
                onClick={() => setActiveTab('groom')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${
                  activeTab === 'groom'
                    ? 'bg-blue-100 text-black border-2 border-black'
                    : 'bg-blue-100 text-black'
                }`}
                style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                신랑측
              </button>
              <button
                onClick={() => setActiveTab('bride')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-colors ${
                  activeTab === 'bride'
                    ? 'bg-blue-100 text-black border-2 border-black'
                    : 'bg-blue-100 text-black'
                }`}
                style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
              >
                신부측
              </button>
            </div>

            {/* 연락처 리스트 */}
            <div className="space-y-4 overflow-hidden">
              <div 
                key={activeTab}
                className="animate-fade-in"
              >
                {(activeTab === 'groom' ? groomSide : brideSide).map((contact) => (
                  <div key={contact.id} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0 mb-4 last:mb-0">
                    <div className="mb-3">
                      {getRelationshipLabel(contact.relationship) && (
                        <div className="text-xs mb-1 font-semibold text-black" style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                          {getRelationshipLabel(contact.relationship)}
                        </div>
                      )}
                      <div className="text-base font-semibold text-black" style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
                        {contact.name}
                      </div>
                    </div>
                    
                    {contact.phone && contact.phone.trim() && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCall(contact.phone)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-black font-semibold shadow-sm bg-blue-100 text-sm"
                          style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.129-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          전화
                        </button>
                        <button
                          onClick={() => handleSMS(contact.phone)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-black font-semibold shadow-sm bg-pink-100 text-sm"
                          style={{ fontFamily: 'MaruBuri, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          문자
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 