import mysql from 'mysql2/promise';

// 환경에 따라 데이터베이스 설정 선택
const isLocal = process.env.NODE_ENV === 'development' || process.env.LOCAL_DB === 'true';

const pool = mysql.createPool({
  host: isLocal ? 'localhost' : '192.168.0.19',
  port: 3306,
  user: isLocal ? 'root' : 'min',
  password: isLocal ? '' : 'f8tgw3lshms!',
  database: 'eungming_wedding',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // 10초 연결 타임아웃
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// 기존 pool export
export default pool;

// 연결 풀 상태 모니터링 및 장기 운영 안정성 확보
// 3분마다 체크하여 연결이 살아있는지 확인
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5; // 5회 연속 실패 시 경고
  
  setInterval(async () => {
    try {
      const connection = await pool.getConnection();
      await connection.ping(); // 연결이 살아있는지 확인
      connection.release();
      
      consecutiveErrors = 0; // 성공 시 에러 카운터 리셋
    } catch (error) {
      consecutiveErrors++;
      console.error(`[DB] Connection pool error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);
      
      // 연속 에러가 많으면 경고
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error('[DB] ⚠️ WARNING: Multiple consecutive connection pool errors detected!');
        consecutiveErrors = 0; // 리셋하여 반복 경고 방지
      }
    }
  }, 3 * 60 * 1000); // 3분마다 체크 (더 자주 모니터링)
  
  // 메모리 사용량 모니터링 (30분마다)
  setInterval(() => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };
      console.log('[DB] Memory usage:', memUsageMB, 'MB');
      
      // 메모리 사용량이 500MB를 넘으면 경고
      if (memUsageMB.heapUsed > 500) {
        console.warn('[DB] ⚠️ WARNING: High memory usage detected!');
      }
    }
  }, 30 * 60 * 1000); // 30분마다
}
