import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/components/ui';
import { X } from '@/components/icons';
import { api } from '@/lib/api';

export function WebsiteSection() {
  const qc = useQueryClient();
  const site = useQuery({ queryKey: ['system', 'site'], queryFn: () => api.system.site() });

  const [tagline, setTagline] = useState('');
  const [phone, setPhone] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [newImg, setNewImg] = useState('');
  const seeded = useRef(false);

  useEffect(() => {
    if (site.data && !seeded.current) {
      seeded.current = true;
      setTagline(site.data.tagline || '');
      setPhone(site.data.contact_phone || '');
      setImages(site.data.hero_images || []);
    }
  }, [site.data]);

  const save = useMutation({
    mutationFn: () =>
      api.admin.putConfig({
        site_tagline: tagline.trim() || ' ',
        site_contact_phone: phone.trim() || ' ',
        site_hero_images: JSON.stringify(images),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system', 'site'] }),
  });

  const addImg = () => {
    const u = newImg.trim();
    if (u) {
      setImages((prev) => [...prev, u]);
      setNewImg('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trang web ngoài</CardTitle>
        <CardDescription>
          Tuỳ chỉnh slogan, ảnh slider hero và số liên hệ hiển thị trên trang công khai.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="tagline">Slogan (hero)</Label>
          <Input
            id="tagline"
            placeholder="Nhận diện cây, chẩn đoán bệnh… bằng AI"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Số điện thoại liên hệ (chợ cây)</Label>
          <Input
            id="phone"
            placeholder="+84909000111"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Ảnh slider hero</Label>
          {images.length === 0 && (
            <p className="text-xs text-content-tertiary">Chưa có — sẽ dùng ảnh mặc định.</p>
          )}
          {images.map((u, i) => (
            <div key={i} className="flex items-center gap-2">
              <img src={u} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover" />
              <Input value={u} readOnly className="flex-1 text-xs" />
              <button
                onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="Xoá"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-content-tertiary hover:text-danger"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="Dán URL ảnh (https://…)"
              value={newImg}
              onChange={(e) => setNewImg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImg())}
            />
            <Button variant="outline" onClick={addImg}>
              Thêm
            </Button>
          </div>
        </div>

        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Đang lưu…' : save.isSuccess ? 'Đã lưu ✓' : 'Lưu thay đổi'}
        </Button>
        {save.isError && <p className="text-sm text-danger">Lưu thất bại, thử lại.</p>}
      </CardContent>
    </Card>
  );
}
