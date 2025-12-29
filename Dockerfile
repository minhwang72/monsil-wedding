FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN yarn install --frozen-lockfile && yarn install --dev

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
ARG NAVER_MAP_CLIENT_SECRET
ARG NEXT_PUBLIC_KAKAO_JS_KEY

# Set environment variables for build
ENV NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=$NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
ENV NAVER_MAP_CLIENT_SECRET=$NAVER_MAP_CLIENT_SECRET
ENV NEXT_PUBLIC_KAKAO_JS_KEY=$NEXT_PUBLIC_KAKAO_JS_KEY

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN yarn build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Runtime environment variables
ARG NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
ARG NAVER_MAP_CLIENT_SECRET
ARG NEXT_PUBLIC_KAKAO_JS_KEY

ENV NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=$NEXT_PUBLIC_NAVER_MAP_CLIENT_ID
ENV NAVER_MAP_CLIENT_SECRET=$NAVER_MAP_CLIENT_SECRET
ENV NEXT_PUBLIC_KAKAO_JS_KEY=$NEXT_PUBLIC_KAKAO_JS_KEY

# SSL and internal API configuration
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV INTERNAL_API_URL=http://127.0.0.1:1108

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Create uploads directory with proper permissions
RUN mkdir -p ./public/uploads && chown -R nextjs:nodejs ./public/uploads

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 1108

ENV PORT 1108
ENV HOSTNAME "0.0.0.0"

# Healthcheck using Node.js (no curl needed)
# 헬스체크 실패해도 웹페이지는 계속 운영되도록 관대한 설정
# interval: 60초마다 체크 (너무 자주 체크하면 부담)
# timeout: 15초 (헬스체크 응답 대기 시간 - 충분히 여유있게)
# start-period: 90초 (초기 시작 대기 시간)
# retries: 5회 (5회 연속 실패 시에만 unhealthy로 표시 - 더 관대하게)
# 중요: 헬스체크 실패(unhealthy)해도 컨테이너는 계속 실행됨
# 타임아웃 처리 강화: 응답이 없어도 무한 대기하지 않도록 명시적 타임아웃 설정
HEALTHCHECK --interval=60s --timeout=15s --start-period=90s --retries=5 \
  CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:1108/api/health',{timeout:10000},(r)=>{r.on('data',()=>{});r.on('end',()=>process.exit(r.statusCode===200?0:1))});req.on('error',()=>process.exit(1));req.on('timeout',()=>{req.destroy();process.exit(1)});setTimeout(()=>{req.destroy();process.exit(1)},10000)"

CMD ["node", "server.js"] 