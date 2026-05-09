# Somewhere

🗺 Places remember how you felt.

위치 기반으로 그 순간의 감정을 기록하는 PWA.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4
- PWA: Web App Manifest + Service Worker (offline cache, push 준비)

## Getting started

```bash
pnpm install
pnpm dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인.

## PWA

- `src/app/manifest.ts` — Web App Manifest (Next.js Metadata API)
- `src/app/icon.tsx`, `src/app/apple-icon.tsx` — `next/og` 로 생성하는 동적 아이콘
- `public/sw.js` — Service Worker (네비게이션 + static asset 캐싱, offline fallback)
- `src/components/sw-register.tsx` — production 환경에서 SW 등록
- `src/app/offline/page.tsx` — 오프라인 fallback 페이지

> Service Worker 는 `pnpm build && pnpm start` 로 production 모드에서만 등록됩니다.
> iOS Safari 에서 푸시/홈화면 추가를 테스트하려면 `next dev --experimental-https` 를 사용하세요.

## Scripts

- `pnpm dev` — 개발 서버 (Turbopack)
- `pnpm build` — 프로덕션 빌드
- `pnpm start` — 프로덕션 서버
- `pnpm lint` — ESLint
