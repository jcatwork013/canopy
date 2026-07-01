# 🎨 Canopy Design System — Mobile-first PWA

> Nguồn chân lý cho giao diện. Web (Tailwind + CSS variables) và React Native
> (theme object) dùng **chung token** để hai nền tảng nhất quán. Tài liệu này mô
> tả nguyên tắc, token, component và pattern mobile chuẩn.

## 1. Nguyên tắc thiết kế

| Nguyên tắc | Diễn giải |
|---|---|
| **Mobile-first, app-like** | Bố cục dạng cột rộng tối đa `480px` (`--app-max-width`), căn giữa trên desktop để khớp app RN. Không phụ thuộc hover. |
| **Thumb-friendly** | Điều hướng chính ở **bottom nav**. Touch target tối thiểu **44×44px** (`.touch-target`). Hành động chính (Quét) đặt ở giữa, nổi lên. |
| **Notch-aware** | Tôn trọng `env(safe-area-inset-*)` qua `--safe-top` / `--safe-bottom`. Header + bottom nav tự chừa vùng tai thỏ / home indicator. |
| **Token-driven** | Mọi màu/spacing/radius đến từ CSS variables → đổi theme một chỗ, dark mode "miễn phí". |
| **Performance** | App shell precache (offline), `NetworkFirst` cho API, ảnh resize trước khi gửi AI, code-split theo route. |
| **Accessible** | Tương phản WCAG AA, `aria-label` cho icon-button, focus nhìn thấy được, `lang="vi"`. |

## 2. Design tokens

Định nghĩa tại `apps/web/src/styles/tokens.css`. Tailwind map lại trong
`apps/web/tailwind.config.ts` → dùng được như `bg-brand-600`, `text-content-secondary`,
`rounded-lg`, `shadow-md`, `max-w-app`…

### 2.1 Màu thương hiệu
`brand-50 … brand-900` — xanh lá "tán cây". **Primary = `brand-600` (#16a34a)**.
Phụ trợ: `accent` (#d97706 — đất/hổ phách), `danger`, `warning`, `success`, `info`.

### 2.2 Surfaces & text (semantic, tự đổi theo dark mode)
`--bg-base`, `--bg-surface`, `--bg-elevated`, `--bg-subtle`, `--bg-inverse`;
`--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-on-brand`;
`--border-subtle`, `--border-strong`.

### 2.3 Spacing — thang 4px
`--space-1=4` … `--space-12=48`. Dùng nhất quán cho padding/gap.

### 2.4 Radius / Elevation / Type
- Radius: `sm 8 / md 12 / lg 16 / xl 24 / full`.
- Shadow: `sm / md / lg` (đổi độ đậm theo light/dark).
- Type scale: `xs 12 … 3xl 34`; font `Inter`, fallback system.

### 2.5 Layout tokens
`--app-max-width 480`, `--header-height 56`, `--bottom-nav-height 64`,
`--safe-top`, `--safe-bottom`, z-index thang (`--z-header/nav/modal/toast`).

## 3. Component cơ bản (đã có trong Phase 0)

| Class / Component | Vai trò |
|---|---|
| `.app-frame` | Khung điện thoại căn giữa, nền `--bg-base`. |
| `AppShell` | Header cố định + content (chừa header & nav) + `BottomNav`. |
| `BottomNav` | 5 tab: Trang chủ · Vườn · **Quét** (nổi) · Cộng đồng · Tôi. |
| `.card` | Mặt phẳng nội dung: surface + border-subtle + radius-lg + shadow-sm. |
| `.btn` / `.btn-primary` / `.btn-ghost` | Nút cao 48px, hiệu ứng `:active scale(.97)`. |
| `.touch-target` | Đảm bảo tối thiểu 44×44. |
| `SplashScreen` / `NotReadyScreen` / `AdminSetupScreen` | Các trạng thái của readiness gate. |
| `icons.tsx` | Bộ icon SVG inline (Leaf, Home, Sprout, Scan, Users, User, Bell, Settings). |

### Component sẽ bổ sung (Phase tiếp)
`Sheet`/`BottomSheet`, `Toast`, `Input`/`Field` (RHF + Zod), `Avatar`, `Badge`,
`Tabs`, `Skeleton`, `EmptyState`, `Chip`, `Stepper` (lộ trình điều trị). Khuyến
nghị dùng **shadcn/ui** (Radix) và tô lại bằng token Canopy.

## 4. Pattern mobile chuẩn

- **Navigation:** bottom tab (≤5). Trang con đẩy stack, có back. Tránh menu hamburger.
- **Capture:** input `capture="environment"` mở camera sau (`ScanScreen`). RN dùng `expo-camera`.
- **Bottom sheet** cho action phụ thay vì dropdown/desktop modal.
- **Optimistic + skeleton** khi tải dữ liệu (TanStack Query).
- **Pull-to-refresh** ở danh sách (Phase sau).
- **Disclaimer AI** (`AI_DISCLAIMER` từ `@canopy/shared`) luôn hiện cạnh kết quả AI.
- **Empty states** thân thiện, có CTA (xem `PlantsScreen`).

## 5. Chuẩn PWA

- `manifest.webmanifest`: `display: standalone`, `theme_color`, icon 192/512 + maskable 512, `start_url /`.
- Service worker (Workbox qua `vite-plugin-pwa`): precache app shell; `NetworkFirst` cho `/api/`; `StaleWhileRevalidate` cho asset.
- `viewport-fit=cover` + safe-area để chạy full-screen có notch.
- Cài được trên iOS/Android; có `apple-touch-icon`, `apple-mobile-web-app-*`.
- Offline: app shell + dữ liệu GET gần nhất; hành động ghi cần mạng (báo lỗi rõ).

> ⚠️ Icon hiện tại là placeholder (`apps/web/scripts/gen-icons.mjs`). Thay bằng
> artwork thương hiệu trước khi phát hành.

## 6. RN theme mapping (cho Phase 8)

Token CSS → object JS để React Native dùng (giữ tên giống nhau):

```ts
// packages/shared (hoặc apps/mobile/theme.ts) — single source khi lên RN
export const theme = {
  color: {
    brand600: '#16a34a', accent: '#d97706', danger: '#dc2626',
    bgBase: '#f7f9f6', bgSurface: '#ffffff', bgSubtle: '#eef2ec',
    textPrimary: '#0f1b14', textSecondary: '#4b5a51', textTertiary: '#7a8a80',
    borderSubtle: '#e3e9e1',
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 },
  text: { xs: 12, sm: 14, base: 16, lg: 18, xl: 22, '2xl': 28, '3xl': 34 },
} as const;
```

- Safe-area: `react-native-safe-area-context` thay cho `env(safe-area-inset-*)`.
- Bottom tab: `@react-navigation/bottom-tabs` map 1-1 với `BottomNav`.
- Dark mode: `useColorScheme()` chọn bảng màu — cùng cấu trúc semantic như web.

## 7. Checklist review giao diện

- [ ] Mọi màn dùng token, không hardcode hex.
- [ ] Touch target ≥ 44px; icon-button có `aria-label`.
- [ ] Header & nav chừa safe-area; không che nội dung.
- [ ] Tương phản AA ở cả light/dark.
- [ ] Trạng thái loading (skeleton) + empty + error rõ ràng.
- [ ] Kết quả AI kèm disclaimer.
- [ ] Build PWA pass; cài được; offline shell hoạt động.
