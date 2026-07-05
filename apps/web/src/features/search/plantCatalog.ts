/**
 * Curated catalog of popular houseplants (Vietnam), with real care profiles.
 * Powers the Search feature — no backend call needed for browsing; the AI chat
 * handles anything not in the catalog. Kept as plain data so it can be shared
 * with the future React Native app.
 */

export type Level = 'Dễ' | 'Trung bình' | 'Khó';
export type Light = 'Ít sáng' | 'Sáng gián tiếp' | 'Nắng trực tiếp';
export type Water = 'Ít' | 'Vừa' | 'Nhiều';

/** Filter facets used by the search chips. */
export type Facet = 'indoor' | 'sun' | 'shade' | 'easy' | 'air' | 'petsafe';

export interface Plant {
  id: string;
  name: string;
  scientific: string;
  /** Extra search terms (common misspellings / English names). */
  aliases: string[];
  emoji: string;
  /** Tailwind gradient classes for the tile background. */
  grad: string;
  facets: Facet[];
  light: Light;
  water: Water;
  humidity: string;
  level: Level;
  /** Safe around cats/dogs? */
  petSafe: boolean;
  blurb: string;
  tips: string[];
}

export const FACETS: { key: Facet; label: string }[] = [
  { key: 'indoor', label: 'Trong nhà' },
  { key: 'easy', label: 'Dễ chăm' },
  { key: 'shade', label: 'Ưa bóng' },
  { key: 'sun', label: 'Ưa nắng' },
  { key: 'air', label: 'Lọc không khí' },
  { key: 'petsafe', label: 'An toàn thú cưng' },
];

export const PLANTS: Plant[] = [
  {
    id: 'trau-ba',
    name: 'Trầu bà',
    scientific: 'Epipremnum aureum',
    aliases: ['pothos', 'trau ba', 'trầu bà vàng', 'golden pothos'],
    emoji: '🌿',
    grad: 'from-emerald-400/25 to-green-600/25',
    facets: ['indoor', 'easy', 'shade', 'air'],
    light: 'Sáng gián tiếp',
    water: 'Vừa',
    humidity: 'Trung bình',
    level: 'Dễ',
    petSafe: false,
    blurb: 'Cây leo dễ tính nhất cho người mới — sống khỏe cả nơi thiếu sáng, lọc không khí tốt.',
    tips: [
      'Tưới khi lớp đất mặt khô ~2–3cm, tránh úng.',
      'Cắt tỉa ngọn để cây rậm và ra nhiều nhánh.',
      'Có thể trồng thủy sinh trong bình nước.',
    ],
  },
  {
    id: 'luoi-ho',
    name: 'Lưỡi hổ',
    scientific: 'Sansevieria trifasciata',
    aliases: ['snake plant', 'luoi ho', 'lưỡi cọp'],
    emoji: '🪴',
    grad: 'from-lime-400/25 to-emerald-600/25',
    facets: ['indoor', 'easy', 'shade', 'air', 'sun'],
    light: 'Ít sáng',
    water: 'Ít',
    humidity: 'Thấp',
    level: 'Dễ',
    petSafe: false,
    blurb: 'Gần như “không thể chết”. Chịu hạn, chịu bóng, nhả oxy ban đêm — hợp phòng ngủ.',
    tips: [
      'Chỉ tưới 1–2 tuần/lần, để đất khô hẳn giữa các lần.',
      'Rất sợ úng — dùng đất thoát nước nhanh.',
      'Lau lá định kỳ để cây quang hợp tốt.',
    ],
  },
  {
    id: 'kim-tien',
    name: 'Kim tiền',
    scientific: 'Zamioculcas zamiifolia',
    aliases: ['zz plant', 'kim tien', 'kim phát tài'],
    emoji: '💰',
    grad: 'from-green-400/25 to-teal-600/25',
    facets: ['indoor', 'easy', 'shade'],
    light: 'Ít sáng',
    water: 'Ít',
    humidity: 'Thấp',
    level: 'Dễ',
    petSafe: false,
    blurb: 'Biểu tượng tài lộc, lá bóng khỏe. Chịu bóng và quên tưới vẫn xanh tốt.',
    tips: [
      'Củ trữ nước nên tưới thưa, 2–3 tuần/lần.',
      'Tránh ánh nắng gắt làm cháy lá.',
      'Thay chậu 2 năm/lần khi củ chật.',
    ],
  },
  {
    id: 'monstera',
    name: 'Trầu bà lá xẻ',
    scientific: 'Monstera deliciosa',
    aliases: ['monstera', 'trau ba la xe', 'lá xẻ', 'swiss cheese'],
    emoji: '🍃',
    grad: 'from-emerald-400/25 to-green-700/25',
    facets: ['indoor', 'air'],
    light: 'Sáng gián tiếp',
    water: 'Vừa',
    humidity: 'Cao',
    level: 'Trung bình',
    petSafe: false,
    blurb: 'Ngôi sao trang trí với lá xẻ đặc trưng. Càng nhiều sáng lá càng xẻ đẹp.',
    tips: [
      'Cho leo cọc rêu để lá to và xẻ nhiều.',
      'Ưa ẩm — phun sương hoặc đặt gần máy tạo ẩm.',
      'Lau lá và xoay chậu để cây mọc cân đối.',
    ],
  },
  {
    id: 'lan-y',
    name: 'Lan ý',
    scientific: 'Spathiphyllum wallisii',
    aliases: ['peace lily', 'lan y', 'bạch môn', 'huệ hòa bình'],
    emoji: '🤍',
    grad: 'from-teal-300/25 to-emerald-600/25',
    facets: ['indoor', 'shade', 'air'],
    light: 'Sáng gián tiếp',
    water: 'Nhiều',
    humidity: 'Cao',
    level: 'Trung bình',
    petSafe: false,
    blurb: 'Hoa trắng thanh lịch, top cây lọc không khí. Rũ lá là dấu hiệu cần tưới ngay.',
    tips: [
      'Giữ đất ẩm đều, tưới khi lá hơi rũ.',
      'Tránh nắng trực tiếp làm cháy mép lá.',
      'Cắt bỏ hoa tàn để kích ra hoa mới.',
    ],
  },
  {
    id: 'nha-dam',
    name: 'Nha đam',
    scientific: 'Aloe vera',
    aliases: ['aloe', 'nha dam', 'lô hội'],
    emoji: '🌵',
    grad: 'from-lime-400/25 to-green-600/25',
    facets: ['indoor', 'easy', 'sun'],
    light: 'Nắng trực tiếp',
    water: 'Ít',
    humidity: 'Thấp',
    level: 'Dễ',
    petSafe: false,
    blurb: 'Mọng nước, vừa trang trí vừa lấy gel làm đẹp & sơ cứu bỏng nhẹ.',
    tips: [
      'Cần nhiều nắng — đặt gần cửa sổ hướng nắng.',
      'Tưới đẫm rồi để khô hoàn toàn mới tưới lại.',
      'Tách cây con để nhân giống.',
    ],
  },
  {
    id: 'sen-da',
    name: 'Sen đá',
    scientific: 'Echeveria elegans',
    aliases: ['succulent', 'sen da', 'hoa đá'],
    emoji: '🌸',
    grad: 'from-rose-300/25 to-emerald-500/25',
    facets: ['easy', 'sun'],
    light: 'Nắng trực tiếp',
    water: 'Ít',
    humidity: 'Thấp',
    level: 'Dễ',
    petSafe: true,
    blurb: 'Hình hoa xếp tầng đáng yêu, đủ nắng sẽ lên màu hồng tím rực rỡ.',
    tips: [
      'Tối thiểu 4–6 giờ nắng/ngày để giữ dáng.',
      'Tưới vào gốc, tránh đọng nước trên lá.',
      'Dùng đất trộn perlite/đá cho thoát nước.',
    ],
  },
  {
    id: 'kim-ngan',
    name: 'Kim ngân',
    scientific: 'Pachira aquatica',
    aliases: ['money tree', 'kim ngan', 'thắt bím'],
    emoji: '🎋',
    grad: 'from-green-400/25 to-emerald-700/25',
    facets: ['indoor', 'easy', 'petsafe'],
    light: 'Sáng gián tiếp',
    water: 'Vừa',
    humidity: 'Trung bình',
    level: 'Dễ',
    petSafe: true,
    blurb: 'Thân bện đẹp, tượng trưng may mắn. An toàn với thú cưng và rất dễ chiều.',
    tips: [
      'Tưới khi 5cm đất mặt khô, khoảng 1 tuần/lần.',
      'Xoay chậu hằng tuần cho tán đều.',
      'Tránh di chuyển đột ngột dễ rụng lá.',
    ],
  },
  {
    id: 'day-nhen',
    name: 'Dây nhện',
    scientific: 'Chlorophytum comosum',
    aliases: ['spider plant', 'day nhen', 'cỏ lan chi', 'lục thảo trổ'],
    emoji: '🕸️',
    grad: 'from-emerald-300/25 to-lime-500/25',
    facets: ['indoor', 'easy', 'air', 'petsafe'],
    light: 'Sáng gián tiếp',
    water: 'Vừa',
    humidity: 'Trung bình',
    level: 'Dễ',
    petSafe: true,
    blurb: 'Đẻ cây con thành “nhện” treo lủng lẳng, lọc không khí tốt và an toàn thú cưng.',
    tips: [
      'Treo cao để cây con rủ xuống đẹp mắt.',
      'Đầu lá nâu thường do nước máy nhiều clo — dùng nước để qua đêm.',
      'Tách cây con cắm nước là ra rễ.',
    ],
  },
  {
    id: 'cau-tieu-tram',
    name: 'Cau tiểu trâm',
    scientific: 'Chamaedorea elegans',
    aliases: ['parlor palm', 'cau tieu tram', 'cau cảnh mini'],
    emoji: '🌴',
    grad: 'from-green-300/25 to-teal-600/25',
    facets: ['indoor', 'shade', 'air', 'petsafe'],
    light: 'Ít sáng',
    water: 'Vừa',
    humidity: 'Cao',
    level: 'Dễ',
    petSafe: true,
    blurb: 'Dáng cọ mini xanh mát cho bàn làm việc, chịu bóng và an toàn thú cưng.',
    tips: [
      'Giữ ẩm nhẹ, không để đất khô kiệt.',
      'Phun sương để lá không bị khô đầu.',
      'Tránh nắng gắt chiếu trực tiếp.',
    ],
  },
  {
    id: 'phu-quy',
    name: 'Phú quý',
    scientific: 'Aglaonema',
    aliases: ['aglaonema', 'phu quy', 'ngọc ngân'],
    emoji: '🌺',
    grad: 'from-rose-300/25 to-emerald-600/25',
    facets: ['indoor', 'shade', 'air'],
    light: 'Ít sáng',
    water: 'Vừa',
    humidity: 'Trung bình',
    level: 'Dễ',
    petSafe: false,
    blurb: 'Lá pha sắc hồng/đỏ sang trọng, chịu bóng tốt — hợp không gian trong nhà.',
    tips: [
      'Bản lá màng đỏ cần chút sáng để giữ màu.',
      'Tưới vừa phải, tránh úng gốc.',
      'Lau lá cho lên màu bóng đẹp.',
    ],
  },
  {
    id: 'bang-singapore',
    name: 'Bàng Singapore',
    scientific: 'Ficus lyrata',
    aliases: ['fiddle leaf fig', 'bang singapore', 'bàng lá to'],
    emoji: '🌳',
    grad: 'from-emerald-400/25 to-green-800/25',
    facets: ['indoor'],
    light: 'Sáng gián tiếp',
    water: 'Vừa',
    humidity: 'Trung bình',
    level: 'Khó',
    petSafe: false,
    blurb: 'Cây nội thất “quốc dân” với lá to bản. Đẹp nhưng khá nhạy cảm với thay đổi.',
    tips: [
      'Đặt cố định gần cửa sổ sáng, ít di chuyển.',
      'Tưới đều đặn khi 3–4cm đất mặt khô.',
      'Lau lá và xoay chậu để tán đều.',
    ],
  },
  {
    id: 'van-nien-thanh',
    name: 'Vạn niên thanh',
    scientific: 'Dieffenbachia',
    aliases: ['dieffenbachia', 'van nien thanh', 'dumb cane'],
    emoji: '🌱',
    grad: 'from-lime-300/25 to-green-600/25',
    facets: ['indoor', 'shade', 'air'],
    light: 'Sáng gián tiếp',
    water: 'Vừa',
    humidity: 'Cao',
    level: 'Trung bình',
    petSafe: false,
    blurb: 'Lá đốm trắng xanh nổi bật, lớn nhanh. Nhựa cây gây ngứa nên để xa trẻ nhỏ.',
    tips: [
      'Giữ ẩm đều, ưa môi trường ẩm.',
      'Đeo găng khi cắt tỉa vì nhựa gây kích ứng.',
      'Tránh gió lạnh và điều hòa thổi trực tiếp.',
    ],
  },
  {
    id: 'xuong-rong',
    name: 'Xương rồng',
    scientific: 'Cactaceae',
    aliases: ['cactus', 'xuong rong'],
    emoji: '🌵',
    grad: 'from-amber-300/25 to-emerald-600/25',
    facets: ['easy', 'sun', 'petsafe'],
    light: 'Nắng trực tiếp',
    water: 'Ít',
    humidity: 'Thấp',
    level: 'Dễ',
    petSafe: true,
    blurb: 'Chịu hạn số một, hợp ban công nắng. Tưới càng ít càng khỏe.',
    tips: [
      'Mùa hè tưới 10–14 ngày/lần, mùa đông gần như ngưng.',
      'Cần nắng nhiều giờ mỗi ngày.',
      'Đất cát/sỏi thoát nước là bắt buộc.',
    ],
  },
  {
    id: 'trau-ba-de-vuong',
    name: 'Trầu bà đế vương',
    scientific: 'Philodendron erubescens',
    aliases: ['philodendron', 'de vuong', 'đế vương đỏ'],
    emoji: '👑',
    grad: 'from-green-500/25 to-slate-700/25',
    facets: ['indoor', 'easy', 'shade', 'air'],
    light: 'Sáng gián tiếp',
    water: 'Vừa',
    humidity: 'Trung bình',
    level: 'Dễ',
    petSafe: false,
    blurb: 'Lá lớn màu xanh thẫm/ánh đỏ sang trọng, dễ chăm và lọc không khí.',
    tips: [
      'Tưới khi đất mặt se khô, tránh sũng nước.',
      'Ưa sáng gián tiếp, tránh nắng gắt.',
      'Bón phân loãng mỗi tháng vào mùa sinh trưởng.',
    ],
  },
];

/** Full-text-ish match over name, scientific name and aliases. */
export function searchPlants(query: string, facets: Facet[]): Plant[] {
  const q = query.trim().toLowerCase();
  return PLANTS.filter((p) => {
    if (facets.length && !facets.every((f) => p.facets.includes(f))) return false;
    if (!q) return true;
    const hay = [p.name, p.scientific, ...p.aliases].join(' ').toLowerCase();
    return hay.includes(q);
  });
}
