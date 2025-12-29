import { mkdir, unlink, access, chmod, stat } from 'fs/promises'
import { join } from 'path'

// 환경변수에서 업로드 디렉토리 경로 가져오기 (기본값: /app/public/uploads)
export const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || '/app/public/uploads'

export async function ensureUploadDir(dateString: string): Promise<string> {
  const datePath = join(UPLOAD_BASE_DIR, dateString)
  
  try {
    // 먼저 기본 uploads 디렉토리 확인/생성
    await mkdir(UPLOAD_BASE_DIR, { recursive: true, mode: 0o755 })
    console.log('✅ [DEBUG] Base uploads directory ensured:', UPLOAD_BASE_DIR)
    
    // 날짜별 디렉토리 생성
    await mkdir(datePath, { recursive: true, mode: 0o755 })
    console.log('✅ [DEBUG] Date uploads directory ensured:', datePath)
    
    // 권한 확인 및 설정
    try {
      await chmod(UPLOAD_BASE_DIR, 0o755)
      await chmod(datePath, 0o755)
      console.log('✅ [DEBUG] Directory permissions set to 755')
    } catch (permError) {
      console.warn('⚠️ [DEBUG] Could not set directory permissions:', permError)
    }
    
    // 쓰기 권한 테스트
    const testFile = join(datePath, '.write_test')
    try {
      const { writeFile, unlink } = await import('fs/promises')
      await writeFile(testFile, 'test')
      await unlink(testFile)
      console.log('✅ [DEBUG] Write permission test passed')
    } catch (writeError) {
      console.error('❌ [DEBUG] Write permission test failed:', writeError)
      throw new Error(`No write permission in directory: ${datePath}`)
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Directory creation failed:', error)
    throw new Error(`Failed to create upload directory: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return datePath
}

export async function ensureImageUploadDir(): Promise<string> {
  const imagesPath = join(UPLOAD_BASE_DIR, 'images')
  
  try {
    // 디렉토리 생성
    await mkdir(imagesPath, { recursive: true, mode: 0o755 })
    console.log('✅ [DEBUG] Images uploads directory ensured:', imagesPath)
    
    // 권한 설정
    try {
      await chmod(imagesPath, 0o755)
      console.log('✅ [DEBUG] Images directory permissions set to 755')
    } catch (permError) {
      console.warn('⚠️ [DEBUG] Could not set images directory permissions:', permError)
    }
    
    // 쓰기 권한 테스트
    const testFile = join(imagesPath, '.write_test')
    try {
      const { writeFile, unlink } = await import('fs/promises')
      await writeFile(testFile, 'test')
      await unlink(testFile)
      console.log('✅ [DEBUG] Images write permission test passed')
    } catch (writeError) {
      console.error('❌ [DEBUG] Images write permission test failed:', writeError)
      throw new Error(`No write permission in images directory: ${imagesPath}`)
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Images directory creation failed:', error)
    throw new Error(`Failed to create images upload directory: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return imagesPath
}

export async function deletePhysicalFile(filename: string): Promise<void> {
  if (!filename) return
  
  const fullPath = join(UPLOAD_BASE_DIR, filename)
  
  try {
    await access(fullPath)
    await unlink(fullPath)
    console.log(`✅ [DEBUG] File deleted: ${fullPath}`)
  } catch (error) {
    // File might not exist, that's okay
    console.log(`ℹ️ [DEBUG] File deletion info: ${fullPath}`, error)
  }
}

export function generateFilename(originalName: string, forceJpeg: boolean = false): string {
  const timestamp = Date.now()
  const originalExt = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  
  // HEIC나 HEIF 파일이거나 강제 JPEG 변환이 요청된 경우 JPEG로 변환
  if (forceJpeg || ['heic', 'heif'].includes(originalExt)) {
    return `${timestamp}.jpg`
  }
  
  return `${timestamp}.${originalExt}`
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

// 디렉토리 상태 확인 함수
export async function checkDirectoryStatus(dirPath: string): Promise<{
  exists: boolean;
  writable: boolean;
  stats?: {
    isDirectory: boolean;
    mode: number;
    size: number;
    mtime: Date;
  };
}> {
  try {
    const stats = await stat(dirPath)
    
    // 쓰기 권한 테스트
    let writable = false
    try {
      const testFile = join(dirPath, '.write_test_' + Date.now())
      const { writeFile, unlink } = await import('fs/promises')
      await writeFile(testFile, 'test')
      await unlink(testFile)
      writable = true
    } catch {
      writable = false
    }
    
    return {
      exists: true,
      writable,
      stats: {
        isDirectory: stats.isDirectory(),
        mode: stats.mode,
        size: stats.size,
        mtime: stats.mtime
      }
    }
  } catch {
    return {
      exists: false,
      writable: false
    }
  }
} 