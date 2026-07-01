import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { Check, RefreshCw, X } from '@/components/icons';
import { useSystemStatus } from '@/features/system/useSystemStatus';
import { useAdminRefresh } from '../useAdmin';

const CHECK_LABELS: Record<string, string> = {
  database: 'Cơ sở dữ liệu',
  ai_provider: 'AI Provider',
  email: 'Email (Resend)',
  storage: 'Lưu trữ (MinIO)',
};

export function OverviewSection({ firstRun = false }: { firstRun?: boolean }) {
  const { data } = useSystemStatus();
  const refresh = useAdminRefresh();
  if (!data) return null;

  const checks = Object.entries(data.checks);
  const passed = checks.filter(([, c]) => c.ok).length;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <Card className={data.ready ? 'border-brand-200 bg-brand-50' : undefined}>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${
              data.ready ? 'bg-brand-600' : 'bg-warning'
            }`}
          >
            {data.ready ? <Check className="h-7 w-7" /> : <RefreshCw className="h-6 w-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-content">
              {data.ready ? 'Hệ thống đã sẵn sàng' : 'Đang chờ cấu hình'}
            </h2>
            <p className="text-sm text-content-secondary">
              {passed}/{checks.length} kiểm tra đạt · phiên bản {data.version}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
        </CardContent>
      </Card>

      {/* Readiness checks */}
      <Card>
        <CardHeader>
          <CardTitle>Kiểm tra sẵn sàng</CardTitle>
          <CardDescription>Tất cả phải đạt thì người dùng mới truy cập được ứng dụng.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {checks.map(([key, c]) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-lg border border-border-subtle px-4 py-3"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  c.ok ? 'bg-brand-100 text-brand-700' : 'bg-subtle text-content-tertiary'
                }`}
              >
                {c.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-content">{CHECK_LABELS[key] ?? key}</p>
                {c.detail && <p className="truncate text-xs text-content-tertiary">{c.detail}</p>}
              </div>
              <Badge className="ml-auto" variant={c.ok ? 'success' : 'muted'}>
                {c.ok ? 'Đạt' : 'Chờ'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {firstRun && data.ready && (
        <Button className="w-full" size="lg" onClick={() => (window.location.href = '/')}>
          Vào ứng dụng
        </Button>
      )}
    </div>
  );
}
