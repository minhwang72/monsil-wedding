'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Gallery, Guestbook, ContactPerson } from '@/types'

import MainImageUploader from '@/components/MainImageUploader'
import GlobalLoading from '@/components/GlobalLoading'
import SelectableGallery from '@/components/SelectableGallery'
import Cropper from 'react-easy-crop'
import { Area } from 'react-easy-crop'

// 토스트 타입 정의
interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

// 토스트 컴포넌트
const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: number) => void }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-2 rounded-lg shadow-lg text-white text-sm max-w-sm ${
            toast.type === 'success' ? 'bg-gray-700' : 'bg-red-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// 로딩 컴포넌트
const Loading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-300"></div>
  </div>
)

// 로그인 컴포넌트
const LoginForm = ({ onLogin }: { onLogin: (username: string, password: string) => void }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()

  // URL 파라미터에서 username 읽어서 초기값 설정
  useEffect(() => {
    const urlUsername = searchParams.get('username')
    if (urlUsername) {
      setUsername(urlUsername)
      // 비밀번호 입력 필드에 포커스
      setTimeout(() => {
        const passwordInput = document.getElementById('password')
        if (passwordInput) {
          passwordInput.focus()
        }
      }, 100)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onLogin(username, password)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            관리자 로그인
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="sr-only">
              사용자명
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm mb-3"
              placeholder="사용자명을 입력하세요"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-300 hover:bg-purple-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// 메인 이미지 섹션 컴포넌트
const MainImageSection = ({ onUpdate, showToast, setGlobalLoading }: { onUpdate?: () => void, showToast: (message: string, type: 'success' | 'error') => void, setGlobalLoading: (loading: boolean, message?: string) => void }) => {
  const [currentImage, setCurrentImage] = useState<Gallery | null>(null)

  const fetchMainImage = useCallback(async () => {
    try {
      const res = await fetch(`/api/gallery?t=${Date.now()}`)
      const data = await res.json()
      if (data.success) {
        const mainImage = data.data.find((img: Gallery) => img.image_type === 'main')
        setCurrentImage(mainImage || null)
      }
    } catch (error) {
      console.error('Error fetching main image:', error)
    }
  }, [])

  useEffect(() => {
    fetchMainImage()
  }, [fetchMainImage])

  const handleUploadSuccess = async (fileUrl: string) => {
    console.log('[DEBUG] Main image upload successful:', fileUrl)
    
    setGlobalLoading(true, '메인 이미지 업데이트 중...')
    
    try {
      // 이미지가 성공적으로 업로드되었으므로 UI를 새로고침
      await fetchMainImage()
      if (onUpdate) onUpdate()
      showToast('메인 이미지가 업데이트되었습니다', 'success')
      
      // 메타데이터와 공유 이미지 갱신을 위해 잠시 후 페이지 새로고침
      setTimeout(() => {
        console.log('[DEBUG] Reloading page to update metadata and sharing images')
        window.location.reload()
      }, 2000) // 2초 후 새로고침
      
    } catch (error) {
      console.error('Error refreshing image data:', error)
      // 업로드는 성공했으므로 경고만 표시
      showToast('화면 새로고침에 실패했습니다', 'error')
      
      // 에러가 발생해도 메타데이터 갱신을 위해 새로고침
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    } finally {
      setGlobalLoading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">메인 이미지 관리</h2>
      
      <div className="space-y-6">
        {/* 현재 메인 이미지 */}
        {currentImage && currentImage.url ? (
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">현재 메인 이미지</h3>
            <div className="relative w-48 sm:w-64 h-60 sm:h-80 mx-auto">
              <img
                src={`${currentImage.url}?t=${Date.now()}`}
                alt="Main"
                className="w-full h-full object-contain bg-gray-50 rounded-lg"
                key={currentImage.url}
              />
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            현재 설정된 메인 이미지가 없습니다.
          </div>
        )}

        {/* 새로운 이미지 업로더 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            새 메인 이미지 업로드 (3:4 비율 크롭 지원)
          </label>
          <MainImageUploader
            onUploadSuccess={handleUploadSuccess}
            setGlobalLoading={setGlobalLoading}
            className="max-w-md mx-auto"
          />
        </div>
      </div>
    </div>
  )
}

// 연락처 관리 섹션 컴포넌트
const ContactsSection = ({ contacts, onUpdate, showToast, setGlobalLoading }: { contacts: ContactPerson[], onUpdate: () => void, showToast: (message: string, type: 'success' | 'error') => void, setGlobalLoading: (loading: boolean, message?: string) => void }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactPerson | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  
  // 새 연락처 초기값
  const [newContact, setNewContact] = useState({
    side: 'groom' as 'groom' | 'bride',
    relationship: 'other' as ContactPerson['relationship'],
    name: '',
    phone: '',
    bank_name: '',
    account_number: '',
    kakaopay_link: ''
  })

  const resetNewContact = () => {
    setNewContact({
      side: 'groom',
      relationship: 'other',
      name: '',
      phone: '',
      bank_name: '',
      account_number: '',
      kakaopay_link: ''
    })
  }

  // 전화번호 포맷팅 함수 (000-0000-0000 형식)
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return ''
    
    // 숫자만 추출
    const numbers = phone.replace(/\D/g, '')
    
    // 11자리 숫자인 경우 010-0000-0000 형식으로 포맷
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    }
    // 10자리 숫자인 경우 00-0000-0000 형식으로 포맷
    else if (numbers.length === 10) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`
    }
    // 그 외의 경우 원본 반환
    return phone
  }

  // 전화번호 입력 핸들러 (숫자만 허용) - 새 연락처용
  const handleNewContactPhoneChange = (value: string) => {
    // 숫자만 추출
    const numbersOnly = value.replace(/\D/g, '')
    
    // 11자리까지만 허용
    if (numbersOnly.length <= 11) {
      setNewContact(prev => ({ ...prev, phone: numbersOnly }))
    }
  }

  // 전화번호 입력 핸들러 (숫자만 허용) - 수정용
  const handleEditContactPhoneChange = (value: string) => {
    if (!editingContact) return
    
    // 숫자만 추출
    const numbersOnly = value.replace(/\D/g, '')
    
    // 11자리까지만 허용
    if (numbersOnly.length <= 11) {
      setEditingContact(prev => prev ? ({ ...prev, phone: numbersOnly }) : null)
    }
  }

  // 신랑측/신부측 연락처 분리
  const groomContacts = contacts.filter(contact => contact.side === 'groom')
  const brideContacts = contacts.filter(contact => contact.side === 'bride')

  const getRelationshipLabel = (relationship: string) => {
    switch (relationship) {
      case 'person': return '본인'
      case 'father': return '아버지'
      case 'mother': return '어머니'
      case 'brother': return '형제'
      case 'sister': return '자매'
      case 'other': return '그외'
      default: return relationship
    }
  }

  const relationshipOptions = [
    { value: 'person', label: '본인' },
    { value: 'father', label: '아버지' },
    { value: 'mother', label: '어머니' },
    { value: 'brother', label: '형제' },
    { value: 'sister', label: '자매' },
    { value: 'other', label: '그외' }
  ]

  // 연락처 추가
  const handleAdd = async () => {
    if (!newContact.name.trim()) {
      showToast('이름을 입력해주세요', 'error')
      return
    }

    setSaving(true)
    setGlobalLoading(true, '연락처 추가 중...')
    
    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      })
      
      const data = await res.json()
      if (data.success) {
        showToast('연락처가 추가되었습니다', 'success')
        setIsAddModalOpen(false)
        resetNewContact()
        onUpdate()
      } else {
        showToast(data.error || '추가에 실패했습니다', 'error')
      }
    } catch (err) {
      showToast('추가 중 오류가 발생했습니다', 'error')
      console.error('Add contact error:', err)
    } finally {
      setSaving(false)
      setGlobalLoading(false)
    }
  }

  // 연락처 수정 저장
  const handleSave = async () => {
    if (!editingContact) return

    setSaving(true)
    setGlobalLoading(true, '연락처 수정 중...')
    
    try {
      const res = await fetch(`/api/admin/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingContact),
      })
      
      const data = await res.json()
      if (data.success) {
        showToast('연락처가 업데이트되었습니다', 'success')
        setEditingContact(null)
        onUpdate()
      } else {
        showToast(data.error || '업데이트에 실패했습니다', 'error')
      }
    } catch (err) {
      showToast('업데이트 중 오류가 발생했습니다', 'error')
      console.error('Save contact error:', err)
    } finally {
      setSaving(false)
      setGlobalLoading(false)
    }
  }

  // 연락처 삭제
  const handleDelete = async (id: number) => {
    if (!confirm('정말로 이 연락처를 삭제하시겠습니까?')) return

    setDeleting(id)
    setGlobalLoading(true, '연락처 삭제 중...')
    
    try {
      const res = await fetch(`/api/admin/contacts/${id}`, {
        method: 'DELETE',
      })
      
      const data = await res.json()
      if (data.success) {
        showToast('연락처가 삭제되었습니다', 'success')
        onUpdate()
      } else {
        showToast(data.error || '삭제에 실패했습니다', 'error')
      }
    } catch (err) {
      showToast('삭제 중 오류가 발생했습니다', 'error')
      console.error('Delete contact error:', err)
    } finally {
      setDeleting(null)
      setGlobalLoading(false)
    }
  }

  // 연락처 카드 컴포넌트
  const ContactCard = ({ contact }: { contact: ContactPerson }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium text-gray-900">
            {getRelationshipLabel(contact.relationship)} {contact.name}
          </h4>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setEditingContact({ ...contact })}
            className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 border border-blue-200 rounded hover:bg-blue-50"
          >
            수정
          </button>
          <button
            onClick={() => handleDelete(contact.id)}
            disabled={deleting === contact.id}
            className="text-red-600 hover:text-red-800 text-sm px-2 py-1 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
          >
            {deleting === contact.id ? '삭제중...' : '삭제'}
          </button>
        </div>
      </div>
      
      <div className="space-y-1 text-sm text-gray-600">
        <p>전화: {formatPhoneNumber(contact.phone)}</p>
        {contact.bank_name && <p>은행: {contact.bank_name}</p>}
        {contact.account_number && <p>계좌: {contact.account_number}</p>}
        {contact.kakaopay_link && (
          <p>
            카카오페이: 
            <a href={contact.kakaopay_link} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline ml-1">
              링크
            </a>
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="bg-white shadow rounded-lg p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">연락처 관리</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          추가
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 신랑측 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-blue-200">
            신랑측 연락처
          </h3>
          <div className="space-y-3">
            {groomContacts.length > 0 ? (
              groomContacts.map(contact => (
                <ContactCard key={contact.id} contact={contact} />
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">등록된 연락처가 없습니다</p>
            )}
          </div>
        </div>

        {/* 신부측 */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-pink-200">
            신부측 연락처
          </h3>
          <div className="space-y-3">
            {brideContacts.length > 0 ? (
              brideContacts.map(contact => (
                <ContactCard key={contact.id} contact={contact} />
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">등록된 연락처가 없습니다</p>
            )}
          </div>
        </div>
      </div>

      {/* 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div 
            className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center"
            onClick={(e) => {
              // 배경 클릭시 모달 닫기
              if (e.target === e.currentTarget) {
                setIsAddModalOpen(false)
                resetNewContact()
              }
            }}
          >
            <div className="fixed inset-0 bg-black/50"></div>
            
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-10">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">연락처 추가</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">측</label>
                      <select
                        value={newContact.side}
                        onChange={(e) => setNewContact({ ...newContact, side: e.target.value as 'groom' | 'bride' })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="groom">신랑</option>
                        <option value="bride">신부</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">관계</label>
                      <select
                        value={newContact.relationship}
                        onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value as ContactPerson['relationship'] })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        {relationshipOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                    <input
                      type="text"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="이름을 입력하세요"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                    <input
                      type="text"
                      value={newContact.phone}
                      onChange={(e) => handleNewContactPhoneChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="숫자만 입력 (예: 01012345678)"
                      inputMode="numeric"
                      maxLength={11}
                    />
                    {newContact.phone && (
                      <p className="text-xs text-gray-500 mt-1">전화: {formatPhoneNumber(newContact.phone)}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">은행명</label>
                    <input
                      type="text"
                      value={newContact.bank_name}
                      onChange={(e) => setNewContact({ ...newContact, bank_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="은행명을 입력하세요"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">계좌번호</label>
                    <input
                      type="text"
                      value={newContact.account_number}
                      onChange={(e) => setNewContact({ ...newContact, account_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="계좌번호를 입력하세요"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">카카오페이 링크</label>
                    <input
                      type="text"
                      value={newContact.kakaopay_link}
                      onChange={(e) => setNewContact({ ...newContact, kakaopay_link: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="카카오페이 링크를 입력하세요"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {saving ? '추가 중...' : '추가'}
                </button>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false)
                    resetNewContact()
                  }}
                  disabled={saving}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editingContact && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div 
            className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center"
            onClick={(e) => {
              // 배경 클릭시 모달 닫기
              if (e.target === e.currentTarget) {
                setEditingContact(null)
              }
            }}
          >
            <div className="fixed inset-0 bg-black/50"></div>
            
            <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-10">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">연락처 수정</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">측</label>
                      <select
                        value={editingContact.side}
                        onChange={(e) => setEditingContact({ ...editingContact, side: e.target.value as 'groom' | 'bride' })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value="groom">신랑</option>
                        <option value="bride">신부</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">관계</label>
                      <select
                        value={editingContact.relationship}
                        onChange={(e) => setEditingContact({ ...editingContact, relationship: e.target.value as ContactPerson['relationship'] })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        {relationshipOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                    <input
                      type="text"
                      value={editingContact.name}
                      onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                    <input
                      type="text"
                      value={editingContact.phone}
                      onChange={(e) => handleEditContactPhoneChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="숫자만 입력 (예: 01012345678)"
                      inputMode="numeric"
                      maxLength={11}
                    />
                    {editingContact.phone && (
                      <p className="text-xs text-gray-500 mt-1">전화: {formatPhoneNumber(editingContact.phone)}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">은행명</label>
                    <input
                      type="text"
                      value={editingContact.bank_name || ''}
                      onChange={(e) => setEditingContact({ ...editingContact, bank_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">계좌번호</label>
                    <input
                      type="text"
                      value={editingContact.account_number || ''}
                      onChange={(e) => setEditingContact({ ...editingContact, account_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">카카오페이 링크</label>
                    <input
                      type="text"
                      value={editingContact.kakaopay_link || ''}
                      onChange={(e) => setEditingContact({ ...editingContact, kakaopay_link: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => setEditingContact(null)}
                  disabled={saving}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 갤러리용 자유 비율 크롭 컴포넌트
const GalleryImageCropper = ({ 
  imageSrc, 
  onCropComplete, 
  onCancel 
}: { 
  imageSrc: string, 
  onCropComplete: (croppedImageBlob: Blob) => void, 
  onCancel: () => void 
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)
  const [selectedAspect, setSelectedAspect] = useState<number | null>(null) // 자유 비율

  // 비율 옵션들
  const aspectOptions = [
    { label: '자유 비율', value: null, description: '원하는 대로 크롭' },
    { label: '정방형 (1:1)', value: 1, description: '1:1 비율' },
    { label: '가로형 (4:3)', value: 4/3, description: '4:3 비율' },
    { label: '가로형 (16:9)', value: 16/9, description: '16:9 비율' },
    { label: '세로형 (3:4)', value: 3/4, description: '3:4 비율' },
    { label: '세로형 (9:16)', value: 9/16, description: '9:16 비율' },
  ]

  // Canvas에서 크롭된 이미지 생성하는 헬퍼 함수
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', (error) => reject(error))
      image.setAttribute('crossOrigin', 'anonymous')
      image.src = url
    })

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Canvas context not available')
    }

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
      }, 'image/jpeg', 0.85)
    })
  }

  const onCropCompleteHandler = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  const handleCropConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return

    try {
      setProcessing(true)
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
      onCropComplete(croppedImage)
    } catch (e) {
      console.error('크롭 처리 중 오류:', e)
    } finally {
      setProcessing(false)
    }
  }, [croppedAreaPixels, imageSrc, onCropComplete])

  // 비율 변경 시 크롭 위치 초기화
  const handleAspectChange = (newAspect: number | null) => {
    setSelectedAspect(newAspect)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg p-3 sm:p-6 max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">이미지 수정</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* 스크롤 가능한 컨텐츠 영역 */}
        <div className="flex-1 overflow-y-auto">
          {/* 비율 선택 섹션 - 모바일 최적화 */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">크롭 비율 선택</label>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-1 sm:gap-2">
              {aspectOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleAspectChange(option.value)}
                  className={`p-1.5 sm:p-3 text-xs sm:text-sm border rounded-lg transition-colors min-h-[36px] sm:min-h-[44px] ${
                    selectedAspect === option.value
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-[10px] sm:text-sm leading-tight">{option.label}</div>
                  <div className="text-[8px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 leading-tight">{option.description}</div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="relative bg-gray-100 flex-1 min-h-[200px] sm:min-h-[400px] rounded-lg overflow-hidden mb-3 sm:mb-4">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={selectedAspect || undefined}
              onCropChange={setCrop}
              onCropComplete={onCropCompleteHandler}
              onZoomChange={setZoom}
              cropShape="rect"
              showGrid={true}
              restrictPosition={false}
              style={{
                containerStyle: {
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#f3f4f6'
                }
              }}
            />
          </div>
          
          <div className="space-y-3 sm:space-y-4">
            {/* 줌 컨트롤 */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-xs sm:text-sm text-gray-600 min-w-[30px] sm:min-w-[40px]">줌:</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-6 sm:h-8"
              />
              <span className="text-xs sm:text-sm text-gray-600 min-w-[45px] sm:min-w-[60px]">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            
            {/* 현재 선택된 비율 표시 */}
            <div className="text-center">
              <span className="text-xs sm:text-sm text-gray-600">
                현재 비율: <span className="font-medium text-purple-600">
                  {aspectOptions.find(option => option.value === selectedAspect)?.label || '자유 비율'}
                </span>
              </span>
            </div>
            
            {/* 안내 텍스트 */}
            <p className="text-xs sm:text-sm text-gray-600 text-center leading-relaxed">
              {selectedAspect === null 
                ? '자유 비율: 크롭 영역 모서리를 드래그하여 원하는 크기로 조정하세요.'
                : '고정 비율: 드래그로 위치 조정, 마우스 휠이나 슬라이더로 줌 조정하세요.'
              }
            </p>
          </div>
        </div>
        
        {/* 하단 고정 버튼들 */}
        <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={onCancel}
              disabled={processing}
              className="w-full sm:w-auto px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
            >
              취소
            </button>
            <button
              onClick={handleCropConfirm}
              disabled={processing}
              className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 min-h-[44px]"
            >
              {processing ? '처리 중...' : '수정 완료'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 갤러리 관리 섹션 컴포넌트
const GallerySection = ({ gallery, onUpdate, showToast, setGlobalLoading }: { gallery: Gallery[], onUpdate: () => void, showToast: (message: string, type: 'success' | 'error') => void, setGlobalLoading: (loading: boolean, message?: string) => void }) => {
  // 통합된 상태 관리
  const [galleryState, setGalleryState] = useState({
    uploading: false,
    editingItem: null as Gallery | null,
    showCropper: false,
    selectedItems: new Set<number>(),
    isSelectionMode: false
  })

  const galleryItems = gallery
    .filter(item => item.image_type === 'gallery')
    .sort((a, b) => {
      // order_index가 null이면 맨 뒤로
      if (a.order_index === null && b.order_index === null) return 0
      if (a.order_index === null) return 1
      if (b.order_index === null) return -1
      
      // 숫자로 정렬
      return Number(a.order_index) - Number(b.order_index)
    })

  // 상태 업데이트 헬퍼 함수
  const updateGalleryState = (updates: Partial<typeof galleryState>) => {
    setGalleryState(prev => ({ ...prev, ...updates }))
  }

  // 클릭 핸들러 (선택 모드에서만)
  const handleClick = (item: Gallery) => {
    if (galleryState.isSelectionMode) {
      // 선택 모드에서는 아이템 선택/해제
      const newSelected = new Set(galleryState.selectedItems)
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id)
      } else {
        newSelected.add(item.id)
      }
      updateGalleryState({ selectedItems: newSelected })
    }
  }

  // 선택 모드 종료
  const exitSelectionMode = () => {
    updateGalleryState({ 
      isSelectionMode: false, 
      selectedItems: new Set()
    })
  }



  // 순서 변경 핸들러
  const handleReorder = async (sortedIds: number[]) => {
    setGlobalLoading(true, '순서 변경 중...')
    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortedIds }),
      })
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      
      const data = await res.json()
      if (data.success) {
        await onUpdate()
        // 토스트 메시지 제거 - 한 번에 여러 번 할 수 있으므로
      } else {
        showToast(data.error || '순서 변경 실패', 'error')
      }
    } catch (error) {
      console.error('Error reordering gallery:', error)
      showToast('순서 변경 중 오류 발생', 'error')
    } finally {
      setGlobalLoading(false)
    }
  }

  // 다중 이미지 업로드
  const handleMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    updateGalleryState({ uploading: true })
    setGlobalLoading(true, `${files.length}개 이미지 업로드 중...`)
    console.log('[DEBUG] Validating and preparing', files.length, 'files')

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('image_type', 'gallery')

        const response = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        return response.json()
      })

      const results = await Promise.all(uploadPromises)
      const successCount = results.filter(result => result.success).length
      const failCount = results.length - successCount

      if (successCount > 0) {
        await onUpdate()
        showToast(`${successCount}개 업로드 완료${failCount > 0 ? `, ${failCount}개 실패` : ''}`, 'success')
      } else {
        showToast('업로드 실패', 'error')
      }
    } catch (error) {
      console.error('[DEBUG] Upload error:', error)
      showToast('업로드 중 오류 발생', 'error')
    } finally {
      updateGalleryState({ uploading: false })
      setGlobalLoading(false)
    }
  }

  // 선택된 아이템들 삭제
  const handleDeleteSelected = async () => {
    if (galleryState.selectedItems.size === 0) return
    if (!confirm(`선택된 ${galleryState.selectedItems.size}개 이미지를 삭제하시겠습니까?`)) return

    setGlobalLoading(true, `${galleryState.selectedItems.size}개 이미지 삭제 중...`)

    try {
      console.log('[DEBUG] Deleting selected items:', Array.from(galleryState.selectedItems))
      const deletePromises = Array.from(galleryState.selectedItems).map(async (id) => {
        const res = await fetch(`/api/admin/gallery/${id}`, {
          method: 'DELETE',
        })
        return { id, success: res.ok }
      })

      const results = await Promise.all(deletePromises)
      const successCount = results.filter(result => result.success).length
      const failCount = results.length - successCount

      updateGalleryState({ selectedItems: new Set() })
      await onUpdate()
      
      if (successCount > 0) {
        showToast(`${successCount}개 삭제 완료${failCount > 0 ? `, ${failCount}개 실패` : ''}`, 'success')
      } else {
        showToast('삭제 실패', 'error')
      }
    } catch (error) {
      console.error('[DEBUG] Delete error:', error)
      showToast('삭제 중 오류 발생', 'error')
    } finally {
      setGlobalLoading(false)
    }
  }



  // 수정 버튼 클릭
  const handleEditClick = (item: Gallery) => {
    updateGalleryState({ editingItem: item, showCropper: true })
  }

  // 크롭 완료 후 업데이트
  const handleCropComplete = async (croppedImageBlob: Blob) => {
    if (!galleryState.editingItem) return

    updateGalleryState({ showCropper: false })
    updateGalleryState({ uploading: true })
    setGlobalLoading(true, '이미지 수정 중...')

    try {
      // 크롭된 이미지를 File 객체로 변환
      const croppedFile = new File(
        [croppedImageBlob], 
        `edited_${galleryState.editingItem.id}_${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      )

      // FormData 생성
      const formData = new FormData()
      formData.append('file', croppedFile)
      formData.append('image_type', 'gallery')
              
      // 업로드 API 호출
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        // 기존 이미지 삭제
        const deleteResponse = await fetch(`/api/admin/gallery/${galleryState.editingItem.id}`, {
          method: 'DELETE',
        })
        
        if (!deleteResponse.ok) {
          console.warn('⚠️ [DEBUG] Failed to delete original image:', deleteResponse.status)
        }
        
        await onUpdate()
        showToast('이미지 수정 완료', 'success')
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('[DEBUG] Edit error:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      showToast(`이미지 수정 실패: ${errorMessage}`, 'error')
    } finally {
      updateGalleryState({ uploading: false })
      updateGalleryState({ editingItem: null })
      setGlobalLoading(false)
    }
  }

  // 크롭 취소
  const handleCropCancel = () => {
    updateGalleryState({ showCropper: false })
    updateGalleryState({ editingItem: null })
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">갤러리 관리</h2>
      
      {/* 크롭 모달 */}
      {galleryState.showCropper && galleryState.editingItem && (
        <GalleryImageCropper
          imageSrc={galleryState.editingItem.url}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* 상단 컨트롤 */}
      <div className="mb-6 space-y-4">
        {/* 업로드 및 선택 모드 버튼 */}
        <div className="flex items-center space-x-4">
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleMultipleImageUpload}
              disabled={galleryState.uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
            {galleryState.uploading && (
              <p className="text-sm text-purple-600 mt-2">업로드 중...</p>
            )}
          </label>
          
          {/* 선택 모드 토글 버튼 */}
          <button
            onClick={() => {
              if (galleryState.isSelectionMode) {
                exitSelectionMode()
              } else {
                updateGalleryState({ 
                  isSelectionMode: true,
                  selectedItems: new Set()
                })
              }
            }}
            className={`px-4 py-2 rounded-full font-semibold text-sm transition-colors ${
              galleryState.isSelectionMode
                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            {galleryState.isSelectionMode ? '선택 완료' : '선택 모드'}
          </button>
        </div>

        {/* 선택 모드 안내 */}
        {galleryState.isSelectionMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              선택 모드: {galleryState.selectedItems.size}개 선택됨
            </p>
          </div>
        )}
      </div>

      {/* SelectableGallery 컴포넌트 */}
      <div className="mb-6">
        <SelectableGallery
          items={galleryItems}
          onReorder={handleReorder}
          isSelectionMode={galleryState.isSelectionMode}
          selectedItems={galleryState.selectedItems}
          onItemClick={handleClick}
        />
      </div>

      {/* 선택 모드 하단 버튼 */}
      {galleryState.isSelectionMode && galleryState.selectedItems.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <button
              onClick={exitSelectionMode}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            
            <div className="flex items-center space-x-2">
              {galleryState.selectedItems.size === 1 && (
                <button
                  onClick={() => {
                    const selectedItem = galleryItems.find(item => item.id === Array.from(galleryState.selectedItems)[0])
                    if (selectedItem) {
                      handleEditClick(selectedItem)
                      exitSelectionMode()
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  수정
                </button>
              )}
              
              <button
                onClick={handleDeleteSelected}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {galleryState.selectedItems.size > 1 
                  ? `${galleryState.selectedItems.size}개 삭제` 
                  : '삭제'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 안내 텍스트 */}
      <div className="text-sm text-gray-600 mt-4">
        <p>• 일반 모드: 사진을 클릭하여 선택한 후, 하단의 위/아래 버튼으로 순서 변경</p>
        <p>• 선택 모드: 사진을 터치하여 선택/해제, 우상단 체크박스 클릭 가능</p>
        <p>• 선택 모드에서 수정/삭제 가능</p>
      </div>
    </div>
  )
}

// 방명록 관리 섹션 컴포넌트
const GuestbookSection = ({ guestbook, onUpdate, loading, setGlobalLoading }: { guestbook: Guestbook[], onUpdate: () => void, loading: boolean, setGlobalLoading: (loading: boolean, message?: string) => void }) => {
  const [localGuestbook, setLocalGuestbook] = useState<Guestbook[]>(guestbook)

  // guestbook prop이 변경되면 로컬 상태도 업데이트
  useEffect(() => {
    setLocalGuestbook(guestbook)
  }, [guestbook])

  const handleDelete = async (id: number) => {
    if (!confirm('정말로 이 방명록을 삭제하시겠습니까?')) return

    setGlobalLoading(true, '방명록 삭제 중...')

    try {
      console.log('🔍 [DEBUG] Deleting guestbook:', id)
      
      const res = await fetch(`/api/admin/guestbook/${id}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()

      if (data.success) {
        console.log('✅ [DEBUG] Guestbook deleted successfully')
        
        // 즉시 로컬 상태에서 제거
        setLocalGuestbook(prev => prev.filter(item => item.id !== id))
        
        // 외부 상태도 업데이트 (에러가 발생해도 로컬 상태는 유지)
        try {
          await onUpdate()
          console.log('✅ [DEBUG] Guestbook onUpdate completed successfully')
        } catch (updateError) {
          console.warn('⚠️ [DEBUG] Guestbook onUpdate failed, but local state is updated:', updateError)
        }
        
        alert('방명록이 삭제되었습니다.')
      } else {
        console.log('❌ [DEBUG] Guestbook deletion failed:', data.error)
        alert(data.error || '삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error deleting guestbook:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setGlobalLoading(false)
    }
  }

  const formatDate = (dateString: string | Date) => {
    // API에서 이미 "YYYY. MM. DD HH:mm" 형식으로 포맷된 시간을 보내주므로 그대로 사용
    return String(dateString)
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">방명록 관리</h2>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-300 mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {localGuestbook.map((item) => {
            const isDeleted = item.deleted_at !== null && item.deleted_at !== undefined
            return (
              <div 
                key={item.id} 
                className={`border rounded-lg p-4 ${isDeleted ? 'bg-gray-50 opacity-75' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 space-y-2 sm:space-y-0">
                  <div className="flex-1">
                    <h3 className={`font-medium text-lg ${isDeleted ? 'text-gray-500' : ''}`}>
                      {item.name}
                    </h3>
                    <p className={`text-sm ${isDeleted ? 'text-gray-400' : 'text-gray-800'}`}>
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  {!isDeleted && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm min-h-[44px] w-full sm:w-auto"
                    >
                      삭제
                    </button>
                  )}
                </div>
                <p className={`whitespace-pre-wrap break-words ${isDeleted ? 'text-gray-500' : 'text-gray-700'}`}>
                  {item.content}
                </p>
              </div>
            )
          })}
        </div>
      )}
      
      {localGuestbook.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          방명록이 없습니다.
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-300"></div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  )
}

function AdminPageContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [gallery, setGallery] = useState<Gallery[]>([])
  const [guestbook, setGuestbook] = useState<Guestbook[]>([])
  const [contacts, setContacts] = useState<ContactPerson[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [loading, setLoading] = useState({
    auth: true,
    gallery: false,
    guestbook: false,
    contacts: false
  })
  // 전역 로딩 상태 추가
  const [globalLoading, setGlobalLoading] = useState({
    isLoading: false,
    message: 'LOADING'
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URL에서 활성 탭 읽기 (기본값: 'main')
  const getActiveTabFromUrl = useCallback((): 'main' | 'contacts' | 'gallery' | 'guestbook' => {
    const tab = searchParams.get('tab')
    if (tab && ['main', 'contacts', 'gallery', 'guestbook'].includes(tab)) {
      return tab as 'main' | 'contacts' | 'gallery' | 'guestbook'
    }
    return 'main'
  }, [searchParams])
  
  const [activeTab, setActiveTab] = useState<'main' | 'contacts' | 'gallery' | 'guestbook'>(getActiveTabFromUrl())
  
  // 전역 로딩 설정 함수
  const setGlobalLoadingState = useCallback((isLoading: boolean, message: string = 'LOADING') => {
    setGlobalLoading({ isLoading, message })
  }, [])
  
  // 탭 변경 함수 (URL 업데이트 포함)
  const changeTab = (newTab: 'main' | 'contacts' | 'gallery' | 'guestbook') => {
    setActiveTab(newTab)
    // URL 업데이트 (히스토리에 추가)
    router.push(`/admin?tab=${newTab}`)
  }
  
  // URL 변경 감지하여 탭 상태 동기화
  useEffect(() => {
    const urlTab = getActiveTabFromUrl()
    if (urlTab !== activeTab) {
      setActiveTab(urlTab)
    }
  }, [searchParams, activeTab, getActiveTabFromUrl])

  // 인증 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/verify')
        const data = await res.json()
        setIsAuthenticated(data.data?.authenticated || false)
      } catch (error) {
        console.error('Auth check failed:', error)
        setIsAuthenticated(false)
      } finally {
        setLoading(prev => ({ ...prev, auth: false }))
      }
    }

    checkAuth()
  }, [])

  // 로그인 처리
  const handleLogin = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      // 응답 상태 확인
      if (!res.ok) {
        let errorMessage = '로그인에 실패했습니다.'
        try {
          const errorData = await res.json()
          errorMessage = errorData.message || errorData.error || errorMessage
        } catch {
          // JSON 파싱 실패 시 상태 코드로 메시지 생성
          if (res.status === 403) {
            errorMessage = '접근이 거부되었습니다. 서버 설정을 확인해주세요.'
          } else if (res.status === 401) {
            errorMessage = '잘못된 사용자명 또는 비밀번호입니다.'
          } else {
            errorMessage = `로그인 실패 (${res.status})`
          }
        }
        alert(errorMessage)
        return
      }

      const data = await res.json()

      if (data.success) {
        setIsAuthenticated(true)
      } else {
        alert(data.message || data.error || '로그인에 실패했습니다.')
      }
    } catch (error) {
      console.error('Login failed:', error)
      alert('로그인 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
    }
  }

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      setIsAuthenticated(false)
      // 메인페이지로 이동 후 리로드
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // 데이터 로딩 및 개별 업데이트 함수들
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setLoading(prev => ({ ...prev, gallery: true, guestbook: true, contacts: true }))

      const [galleryRes, guestbookRes, contactsRes] = await Promise.all([
        fetch('/api/gallery'),
        fetch('/api/admin/guestbook'),
        fetch('/api/contacts'),
      ])

      const [galleryData, guestbookData, contactsData] = await Promise.all([
        galleryRes.json(),
        guestbookRes.json(),
        contactsRes.json(),
      ])

      if (galleryData.success) setGallery(galleryData.data)
      if (guestbookData.success) setGuestbook(guestbookData.data)
      if (contactsData.success) setContacts(contactsData.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(prev => ({ ...prev, gallery: false, guestbook: false, contacts: false }))
    }
  }, [isAuthenticated])

  // 개별 섹션 업데이트 함수들
  const updateGallery = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, gallery: true }))
      const res = await fetch(`/api/gallery?t=${Date.now()}`)
      const data = await res.json()
      if (data.success) {
        setGallery(data.data)
      }
    } catch (error) {
      console.error('Error updating gallery:', error)
    } finally {
      setLoading(prev => ({ ...prev, gallery: false }))
    }
  }, [])

  const updateGuestbook = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, guestbook: true }))
      const res = await fetch(`/api/admin/guestbook?t=${Date.now()}`)
      const data = await res.json()
      if (data.success) {
        setGuestbook(data.data)
      }
    } catch (error) {
      console.error('Error updating guestbook:', error)
    } finally {
      setLoading(prev => ({ ...prev, guestbook: false }))
    }
  }, [])

  const updateContacts = useCallback(async () => {
    try {
      console.log('🔍 [DEBUG] updateContacts called')
      setLoading(prev => ({ ...prev, contacts: true }))
      const res = await fetch(`/api/contacts?t=${Date.now()}`)
      const data = await res.json()
      console.log('🔍 [DEBUG] Contacts fetch response:', data)
      if (data.success) {
        console.log('✅ [DEBUG] Setting contacts state:', data.data)
        setContacts(data.data)
      } else {
        console.log('❌ [DEBUG] Contacts fetch failed:', data.error)
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error updating contacts:', error)
    } finally {
      setLoading(prev => ({ ...prev, contacts: false }))
      console.log('🔍 [DEBUG] updateContacts completed')
    }
  }, [])

  // 토스트 관리 함수들
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    
    // 3초 후 자동 제거
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading.auth) {
    return <Loading />
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 전역 로딩 스크린 */}
      <GlobalLoading isLoading={globalLoading.isLoading} message={globalLoading.message} />
      
      {/* 토스트 컨테이너 */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">관리자 페이지</h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 sm:px-4 rounded text-sm sm:text-base min-h-[44px]"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 탭 네비게이션 - 모바일 최적화 */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto scrollbar-hide">
            <div className="flex space-x-2 sm:space-x-8 min-w-max">
              {[
                { key: 'main', label: '메인 이미지' },
                { key: 'contacts', label: '연락처 관리' },
                { key: 'gallery', label: '갤러리 관리' },
                { key: 'guestbook', label: '방명록 관리' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => changeTab(tab.key as 'main' | 'contacts' | 'gallery' | 'guestbook')}
                  className={`py-3 sm:py-4 px-3 sm:px-1 border-b-2 font-medium text-sm sm:text-base whitespace-nowrap min-h-[44px] ${
                    activeTab === tab.key
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-700 hover:text-gray-800 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="sm:px-0">
          {/* 메인 이미지 관리 탭 */}
          {activeTab === 'main' && <MainImageSection onUpdate={updateGallery} showToast={showToast} setGlobalLoading={setGlobalLoadingState} />}

          {/* 연락처 관리 탭 */}
          {activeTab === 'contacts' && (
            <ContactsSection contacts={contacts} onUpdate={updateContacts} showToast={showToast} setGlobalLoading={setGlobalLoadingState} />
          )}

          {/* 갤러리 관리 탭 */}
          {activeTab === 'gallery' && (
            <GallerySection gallery={gallery} onUpdate={updateGallery} showToast={showToast} setGlobalLoading={setGlobalLoadingState} />
          )}

          {/* 방명록 관리 탭 */}
          {activeTab === 'guestbook' && (
            <GuestbookSection guestbook={guestbook} onUpdate={updateGuestbook} loading={loading.guestbook} setGlobalLoading={setGlobalLoadingState} />
          )}
        </div>
      </main>
    </div>
  )
} 