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
  queueLimit: 0
});

export default pool; 