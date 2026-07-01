// Seed data for the Community marketplace + local services. Plant care details
// are accurate for these common houseplants. Listings/services will later be
// admin-managed (DB-backed); this seed ships the experience now.

/** Default contact number for listings (admin-configurable later). */
export const CONTACT_PHONE = '+84909000111';

export interface Listing {
  id: string;
  name: string;
  sci: string;
  image: string;
  location: string;
  desc: string;
  care: { light: string; water: string; note: string };
  seller: string;
  phone: string;
}

const img = (id: string) => `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop`;

export const LISTINGS: Listing[] = [
  {
    id: 'monstera-deliciosa',
    name: 'Trầu bà Nam Mỹ',
    sci: 'Monstera deliciosa',
    image: img('photo-1614594975525-e45190c55d0b'),
    location: 'Quận 1, TP.HCM',
    desc: 'Cây khỏe, lá xẻ đẹp, cao ~60cm. Thích hợp đặt phòng khách, văn phòng.',
    care: {
      light: 'Ánh sáng gián tiếp, tránh nắng gắt',
      water: 'Tưới khi đất mặt khô ~2–3cm, ~1 lần/tuần',
      note: 'Lau lá định kỳ; bón phân loãng mỗi tháng vào mùa sinh trưởng.',
    },
    seller: 'Vườn Xanh Sài Gòn',
    phone: CONTACT_PHONE,
  },
  {
    id: 'sansevieria',
    name: 'Lưỡi hổ',
    sci: 'Sansevieria trifasciata',
    image: img('photo-1593482892290-f54927ae1bb6'),
    location: 'Cầu Giấy, Hà Nội',
    desc: 'Cây lọc không khí, cực dễ chăm, hợp người mới. Chậu sứ trắng kèm theo.',
    care: {
      light: 'Chịu được bóng râm lẫn nắng nhẹ',
      water: 'Rất ít nước, 2–3 tuần/lần, tránh úng',
      note: 'Sợ úng nước nhất — để đất khô hẳn rồi mới tưới.',
    },
    seller: 'Green Home',
    phone: CONTACT_PHONE,
  },
  {
    id: 'ficus-lyrata',
    name: 'Bàng Singapore',
    sci: 'Ficus lyrata',
    image: img('photo-1545241047-6083a3684587'),
    location: 'Hải Châu, Đà Nẵng',
    desc: 'Dáng cây cao 1m2, lá to bản, làm điểm nhấn nội thất rất sang.',
    care: {
      light: 'Cần nhiều sáng gián tiếp, gần cửa sổ',
      water: 'Tưới khi đất khô, giữ ẩm đều, ~1 lần/tuần',
      note: 'Không thích bị di chuyển nhiều; tránh gió lạnh từ máy lạnh.',
    },
    seller: 'Nhà Vườn Đà Nẵng',
    phone: CONTACT_PHONE,
  },
  {
    id: 'epipremnum',
    name: 'Trầu bà leo',
    sci: 'Epipremnum aureum',
    image: img('photo-1572688484438-313a6e50c333'),
    location: 'Ninh Kiều, Cần Thơ',
    desc: 'Giỏ treo trầu bà xanh mướt, leo rủ đẹp, lọc không khí tốt.',
    care: {
      light: 'Linh hoạt, hợp cả nơi ít sáng',
      water: 'Tưới 1 lần/tuần, thích ẩm',
      note: 'Có thể trồng thủy sinh trong bình nước.',
    },
    seller: 'Cây Cảnh Miền Tây',
    phone: CONTACT_PHONE,
  },
  {
    id: 'zz-plant',
    name: 'Kim tiền',
    sci: 'Zamioculcas zamiifolia',
    image: img('photo-1632207691143-643e2a9a9361'),
    location: 'Thủ Đức, TP.HCM',
    desc: 'Cây phong thủy, lá bóng, chịu hạn tốt, hợp bàn làm việc.',
    care: {
      light: 'Bóng râm tới sáng gián tiếp',
      water: '2 tuần/lần, chịu hạn',
      note: 'Củ trữ nước nên rất sợ úng.',
    },
    seller: 'Lộc Phát Garden',
    phone: CONTACT_PHONE,
  },
  {
    id: 'succulent-set',
    name: 'Combo sen đá mini',
    sci: 'Echeveria spp.',
    image: img('photo-1485955900006-10f4d324d411'),
    location: 'Đà Lạt, Lâm Đồng',
    desc: 'Set 5 chậu sen đá nhiều màu, trồng sẵn, đóng hộp tặng quà xinh.',
    care: {
      light: 'Cần nắng sáng nhiều giờ',
      water: 'Ít nước, 10–14 ngày/lần',
      note: 'Đất tơi xốp thoát nước; tránh đọng nước trên lá.',
    },
    seller: 'Sen Đá Đà Lạt',
    phone: CONTACT_PHONE,
  },
];

export function getListing(id: string): Listing | undefined {
  return LISTINGS.find((l) => l.id === id);
}

export const PLANT_CATEGORIES = [
  { key: 'all', label: 'Tất cả' },
  { key: 'la', label: 'Cây lá' },
  { key: 'than-go', label: 'Cây thân gỗ' },
  { key: 'canh', label: 'Cây cảnh' },
  { key: 'leo', label: 'Cây leo' },
  { key: 'sen-da', label: 'Sen đá & xương rồng' },
] as const;

const CATEGORY_OF: Record<string, string> = {
  'monstera-deliciosa': 'la',
  sansevieria: 'la',
  'ficus-lyrata': 'than-go',
  epipremnum: 'leo',
  'zz-plant': 'canh',
  'succulent-set': 'sen-da',
};

export function listingCategory(id: string): string {
  return CATEGORY_OF[id] ?? 'canh';
}

// Extra gallery images per listing (besides the cover).
const GALLERY: Record<string, string[]> = {
  'monstera-deliciosa': [img('photo-1466692476868-aef1dfb1e735'), img('photo-1459156212016-c812468e2115')],
  sansevieria: [img('photo-1485955900006-10f4d324d411'), img('photo-1416879595882-3373a0480b5b')],
  'ficus-lyrata': [img('photo-1416879595882-3373a0480b5b'), img('photo-1572688484438-313a6e50c333')],
  epipremnum: [img('photo-1466692476868-aef1dfb1e735'), img('photo-1459156212016-c812468e2115')],
  'zz-plant': [img('photo-1485955900006-10f4d324d411'), img('photo-1593482892290-f54927ae1bb6')],
  'succulent-set': [img('photo-1459156212016-c812468e2115'), img('photo-1416879595882-3373a0480b5b')],
};

const ARTICLE: Record<string, string> = {
  'monstera-deliciosa':
    'Trầu bà Nam Mỹ (Monstera deliciosa) nổi bật với lá to bản, xẻ thùy đặc trưng — biểu tượng của phong cách nội thất hiện đại. Cây phát triển nhanh, dễ chăm, hợp đặt phòng khách hoặc góc làm việc.\n\nMonstera ưa sáng gián tiếp, sợ nắng gắt trực tiếp làm cháy lá. Tưới khi lớp đất mặt khô ~2–3cm; mùa hè tưới nhiều hơn, mùa đông giảm lại để tránh úng rễ. Lau lá định kỳ giúp cây quang hợp tốt và lá luôn bóng đẹp.\n\nĐây là cây lọc không khí, an toàn về thẩm mỹ nhưng lưu ý nhựa cây có thể gây kích ứng nếu nuốt phải — để xa tầm trẻ nhỏ và thú cưng.',
  sansevieria:
    'Lưỡi hổ (Sansevieria) là “nhà vô địch” về độ bền — gần như không thể chăm chết. Lá mọc thẳng đứng, viền vàng sang trọng, hợp người mới bắt đầu hoặc văn phòng ít người chăm.\n\nCây chịu được cả bóng râm lẫn nắng nhẹ, rất ít nước: 2–3 tuần tưới một lần, để đất khô hẳn rồi mới tưới tiếp. Kẻ thù lớn nhất là úng nước, nên chọn chậu thoát nước tốt.\n\nLưỡi hổ còn được biết đến với khả năng lọc không khí, nhả oxy về đêm — đặt phòng ngủ rất hợp.',
  'ficus-lyrata':
    'Bàng Singapore (Ficus lyrata) gây ấn tượng bởi tán lá to như cây đàn, làm điểm nhấn nội thất cực sang. Một cây cao 1m2 đủ “nâng tầm” cả không gian.\n\nCây cần nhiều ánh sáng gián tiếp, đặt gần cửa sổ. Giữ ẩm đều, tưới khi đất se khô; tránh gió lạnh từ máy lạnh và hạn chế di chuyển vì cây khá “khó tính” khi đổi chỗ.\n\nLau lá thường xuyên và xoay chậu định kỳ để cây phát triển cân đối, lá đều và xanh mướt.',
  epipremnum:
    'Trầu bà leo (Epipremnum aureum) xanh mướt quanh năm, buông rủ mềm mại — lý tưởng cho giỏ treo, kệ sách hay ban công.\n\nCây cực kỳ linh hoạt: sống tốt cả nơi ít sáng, tưới khoảng 1 lần/tuần. Có thể trồng thủy sinh trong bình nước trong suốt rất đẹp và sạch sẽ.\n\nĐây là một trong những cây lọc không khí hiệu quả nhất, lại dễ nhân giống bằng cách giâm cành trong nước.',
  'zz-plant':
    'Kim tiền (Zamioculcas zamiifolia) mang ý nghĩa phong thủy “tiền vào như nước”, lá bóng dày, dáng sang. Rất hợp đặt bàn làm việc, quầy lễ tân.\n\nCây chịu hạn cực tốt nhờ củ trữ nước, chỉ cần tưới 2 tuần/lần. Sống khỏe trong bóng râm tới sáng gián tiếp — gần như “trồng là quên”.\n\nVì củ trữ nước nên kim tiền rất sợ úng; hãy để đất khô hẳn giữa các lần tưới.',
  'succulent-set':
    'Combo sen đá mini gồm 5 chậu nhiều màu, trồng sẵn, đóng hộp xinh xắn — món quà tặng dễ thương hoặc trang trí bàn làm việc.\n\nSen đá cần nắng sáng nhiều giờ để giữ màu và dáng đẹp. Tưới rất ít, khoảng 10–14 ngày/lần, dùng đất tơi xốp thoát nước nhanh.\n\nTránh để đọng nước trên lá và trong nõn cây vì dễ gây thối. Khi cây lớn có thể tách nhánh để nhân thêm.',
};

export function listingImages(l: Listing): string[] {
  return [l.image, ...(GALLERY[l.id] ?? [])];
}

export function listingArticle(l: Listing): string {
  return ARTICLE[l.id] ?? l.desc;
}

export interface Service {
  id: string;
  name: string;
  type: 'repair' | 'nursery';
  desc: string;
  area: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  image: string;
  /** Listing IDs this store sells (if registered with the system). */
  products: string[];
}

// Example providers (demo seed). Real, verified nearby results require a Places/
// web-search integration — that's the next step.
export const SERVICES: Service[] = [
  {
    id: 's1',
    name: 'Thợ chăm cây An Phú',
    type: 'repair',
    desc: 'Cắt tỉa, trị sâu bệnh, thay đất tại nhà',
    area: 'TP.HCM',
    address: '123 Nguyễn Văn Hưởng, P. Thảo Điền, TP. Thủ Đức',
    phone: CONTACT_PHONE,
    lat: 10.806,
    lng: 106.74,
    image: img('photo-1466692476868-aef1dfb1e735'),
    products: [],
  },
  {
    id: 's2',
    name: 'Trại cây Hóc Môn',
    type: 'nursery',
    desc: 'Cây nội thất, cây công trình, số lượng lớn',
    area: 'TP.HCM',
    address: 'Ấp Đông, Xã Thới Tam Thôn, H. Hóc Môn, TP.HCM',
    phone: CONTACT_PHONE,
    lat: 10.88,
    lng: 106.59,
    image: img('photo-1459156212016-c812468e2115'),
    products: ['monstera-deliciosa', 'ficus-lyrata', 'zz-plant'],
  },
  {
    id: 's3',
    name: 'Green Care Hà Nội',
    type: 'repair',
    desc: 'Dịch vụ chăm sóc cây văn phòng theo tháng',
    area: 'Hà Nội',
    address: '45 Trần Duy Hưng, Q. Cầu Giấy, Hà Nội',
    phone: CONTACT_PHONE,
    lat: 21.01,
    lng: 105.79,
    image: img('photo-1485955900006-10f4d324d411'),
    products: ['sansevieria', 'epipremnum'],
  },
  {
    id: 's4',
    name: 'Vườn ươm Đà Lạt',
    type: 'nursery',
    desc: 'Sen đá, cây cảnh xứ lạnh, giao toàn quốc',
    area: 'Lâm Đồng',
    address: 'Thái Phiên, P12, TP. Đà Lạt, Lâm Đồng',
    phone: CONTACT_PHONE,
    lat: 11.97,
    lng: 108.47,
    image: img('photo-1416879595882-3373a0480b5b'),
    products: ['succulent-set'],
  },
  {
    id: 's5',
    name: 'Cây Xanh Đà Nẵng',
    type: 'nursery',
    desc: 'Cây phong thủy, chậu sứ, tư vấn tận nơi',
    area: 'Đà Nẵng',
    address: '200 Nguyễn Hữu Thọ, Q. Cẩm Lệ, Đà Nẵng',
    phone: CONTACT_PHONE,
    lat: 16.03,
    lng: 108.21,
    image: img('photo-1572688484438-313a6e50c333'),
    products: ['zz-plant', 'sansevieria'],
  },
];

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

/** Haversine distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}
