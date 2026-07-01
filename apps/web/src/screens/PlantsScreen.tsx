import { Sprout } from '@/components/icons';

export function PlantsScreen() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Vườn của tôi</h1>
        <button className="btn btn-primary h-10 px-4 text-sm">+ Thêm cây</button>
      </div>

      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <Sprout className="h-7 w-7" />
        </span>
        <p className="font-semibold">Chưa có cây nào</p>
        <p className="text-sm text-content-tertiary">
          Thêm cây đầu tiên để quản lý hồ sơ, theo dõi sức khỏe và đặt lịch chăm sóc.
        </p>
      </div>
    </div>
  );
}
