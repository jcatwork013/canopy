import { useMutation } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { Check, X } from '@/components/icons';
import { api } from '@/lib/api';
import { useAdminConfig } from '../useAdmin';

export function StorageSection() {
  const cfg = useAdminConfig();
  const reachable = cfg.data?.storage.reachable;

  const test = useMutation({
    mutationFn: () => api.admin.testConnection('storage'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lưu trữ — MinIO</CardTitle>
        <CardDescription>Lưu ảnh cây và tệp tải lên. Cấu hình qua biến môi trường máy chủ.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-border-subtle px-4 py-3">
          <span className="text-sm text-content-secondary">Trạng thái kết nối</span>
          <Badge variant={reachable ? 'success' : 'danger'}>
            {reachable ? 'Kết nối được' : 'Chưa kết nối'}
          </Badge>
        </div>

        <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>
          {test.isPending ? 'Đang test…' : 'Test kết nối'}
        </Button>
        {test.data && (
          <p
            className={`flex items-center gap-1.5 text-sm ${
              test.data.ok ? 'text-brand-700' : 'text-danger'
            }`}
          >
            {test.data.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {test.data.ok ? 'Kết nối thành công' : test.data.detail || 'Thất bại'}
          </p>
        )}

        <p className="text-xs text-content-tertiary">
          Đặt các biến <code className="rounded bg-subtle px-1">MINIO_ENDPOINT</code>,{' '}
          <code className="rounded bg-subtle px-1">MINIO_ACCESS_KEY</code>,{' '}
          <code className="rounded bg-subtle px-1">MINIO_SECRET_KEY</code> ở máy chủ rồi khởi động lại.
        </p>
      </CardContent>
    </Card>
  );
}
