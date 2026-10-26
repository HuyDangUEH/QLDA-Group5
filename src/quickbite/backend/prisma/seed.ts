/**
 * Seed dữ liệu mẫu — CHỈ DÙNG CHO MÔI TRƯỜNG PHÁT TRIỂN.
 * Chạy: npm run db:seed   (hoặc tự động sau `prisma migrate reset`)
 *
 * ⚠️ Script XOÁ TOÀN BỘ dữ liệu hiện có rồi tạo lại. Bị chặn khi NODE_ENV=production.
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  type Role,
  type VendorRole,
} from '@prisma/client';
import { generateOrderNumber } from '../src/utils/order-number.js';

if (process.env.NODE_ENV === 'production') {
  console.error('⛔ Không được chạy seed dữ liệu mẫu trong môi trường production.');
  process.exit(1);
}

const prisma = new PrismaClient();

/** Mật khẩu chung cho mọi tài khoản demo (CHỈ để phát triển) */
export const DEV_DEMO_PASSWORD = 'QuickBite@123';

/** Ảnh mẫu lưu sẵn trong frontend/public/images/food (chạy được cả khi không có mạng) */
const img = (name: string) => `/images/food/${name}.webp`;

// Bộ sinh số ngẫu nhiên có hạt giống để dữ liệu seed ổn định giữa các lần chạy
let rngState = 20261016;
function rand() {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
}
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

async function clearDatabase() {
  // Xoá theo thứ tự phụ thuộc khoá ngoại
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.vendorMembership.deleteMany();
  await prisma.foodStall.deleteMany();
  await prisma.foodCategory.deleteMany();
  await prisma.campusPickupLocation.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log('🧹 Đang xoá dữ liệu cũ...');
  await clearDatabase();

  const passwordHash = await bcrypt.hash(DEV_DEMO_PASSWORD, 10);

  // ─────────── Người dùng ───────────
  console.log('👤 Tạo tài khoản demo...');
  const createUser = (data: {
    fullName: string;
    email: string;
    role: Role;
    phone?: string;
    studentCode?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  }) => prisma.user.create({ data: { ...data, passwordHash } });

  const admin = await createUser({ fullName: 'Quản trị viên QuickBite', email: 'admin@quickbite.test', role: 'ADMIN' });

  const students = await Promise.all([
    createUser({ fullName: 'Nguyễn Văn An', email: 'an.nguyen@quickbite.test', role: 'STUDENT', studentCode: 'SV2023001', phone: '0901000001' }),
    createUser({ fullName: 'Trần Thị Bình', email: 'binh.tran@quickbite.test', role: 'STUDENT', studentCode: 'SV2023002', phone: '0901000002' }),
    createUser({ fullName: 'Lê Hoàng Cường', email: 'cuong.le@quickbite.test', role: 'STUDENT', studentCode: 'SV2024015', phone: '0901000003' }),
    createUser({ fullName: 'Phạm Minh Dung', email: 'dung.pham@quickbite.test', role: 'STUDENT', studentCode: 'SV2024027', phone: '0901000004' }),
  ]);
  // Một tài khoản bị khoá để thử chức năng quản trị
  await createUser({ fullName: 'Võ Quốc Em', email: 'em.vo@quickbite.test', role: 'STUDENT', studentCode: 'SV2022099', status: 'SUSPENDED' });

  // ─────────── Danh mục ───────────
  console.log('🗂️  Tạo danh mục món ăn...');
  const categoryData = [
    { name: 'Cơm', slug: 'com', icon: 'utensils', description: 'Cơm phần, cơm chiên, cơm bowl' },
    { name: 'Bún – Phở – Mì', slug: 'bun-pho-mi', icon: 'soup', description: 'Các món nước và mì xào' },
    { name: 'Ăn nhanh', slug: 'an-nhanh', icon: 'sandwich', description: 'Burger, pizza, bánh mì' },
    { name: 'Đồ uống', slug: 'do-uong', icon: 'cup-soda', description: 'Trà sữa, cà phê, sinh tố' },
    { name: 'Ăn vặt & Tráng miệng', slug: 'an-vat', icon: 'cookie', description: 'Dimsum, bánh ngọt, đồ chiên' },
    { name: 'Món chay & Salad', slug: 'chay-salad', icon: 'salad', description: 'Món chay, salad, healthy' },
  ];
  const categories: Record<string, number> = {};
  for (const [index, c] of categoryData.entries()) {
    const created = await prisma.foodCategory.create({ data: { ...c, sortOrder: index } });
    categories[c.slug] = created.id;
  }

  // ─────────── Điểm nhận món ───────────
  console.log('📍 Tạo điểm nhận món...');
  const pickupLocations = await Promise.all([
    prisma.campusPickupLocation.create({ data: { name: 'Cổng chính cơ sở B', building: 'Cơ sở B', description: 'Bàn nhận món cạnh nhà bảo vệ, cổng chính' } }),
    prisma.campusPickupLocation.create({ data: { name: 'Căn tin cơ sở B', building: 'Cơ sở B', description: 'Quầy nhận món trong căn tin' } }),
    prisma.campusPickupLocation.create({ data: { name: 'Căn tin cơ sở N', building: 'Cơ sở N', description: 'Quầy nhận món trong căn tin' } }),
    prisma.campusPickupLocation.create({ data: { name: 'Căn tin ký túc xá', building: 'Ký túc xá', description: 'Quầy nhận món trong căn tin ký túc xá' } }),
    prisma.campusPickupLocation.create({ data: { name: 'Nhà thi đấu (tạm đóng)', building: 'Nhà thi đấu', description: 'Đang sửa chữa', isActive: false } }),
  ]);
  const activePickups = pickupLocations.filter((p) => p.isActive);

  // ─────────── Quầy ăn + chủ quầy + thực đơn ───────────
  console.log('🏪 Tạo quầy ăn và thực đơn...');
  type SeedMenuItem = { name: string; description: string; price: number; category: string; image: string; featured?: boolean; available?: boolean };
  type SeedStall = {
    name: string; slug: string; description: string; image: string; location: string; phone: string;
    openTime: string; closeTime: string;
    /** Tài khoản nhận chuyển khoản VietQR (số tài khoản mẫu, không có thật) */
    bank?: { bankBin: string; bankAccountNo: string; bankAccountName: string };
    owner: { fullName: string; email: string };
    staff?: { fullName: string; email: string };
    items: SeedMenuItem[];
  };

  const stallsData: SeedStall[] = [
    {
      name: 'Bếp Nhà Sinh Viên',
      slug: 'bep-nha-sinh-vien',
      bank: { bankBin: '970436', bankAccountNo: '1023456789', bankAccountName: 'BEP NHA SINH VIEN' },
      description: 'Cơm nhà nấu, phần ăn đầy đặn, giá sinh viên. Nổi tiếng với cơm chiên và thịt nướng.',
      image: 'com-chien-duong-chau',
      location: 'Căn tin tòa A, quầy số 1',
      phone: '0283800001',
      openTime: '06:30', closeTime: '20:00',
      owner: { fullName: 'Đỗ Thị Hạnh', email: 'hanh.bepnha@quickbite.test' },
      staff: { fullName: 'Ngô Văn Tài', email: 'tai.bepnha@quickbite.test' },
      items: [
        { name: 'Cơm chiên Dương Châu', description: 'Cơm chiên tơi với lạp xưởng, tôm, trứng và đậu Hà Lan.', price: 35000, category: 'com', image: 'com-chien-duong-chau', featured: true },
        { name: 'Cơm chiên hải sản', description: 'Cơm chiên với mực, tôm, nghêu và rau thơm, kèm chanh.', price: 45000, category: 'com', image: 'com-chien-hai-san' },
        { name: 'Cơm gà bowl sốt mè', description: 'Ức gà áp chảo, trứng luộc, rau củ tươi trên nền cơm trắng.', price: 42000, category: 'com', image: 'com-ga-bowl-sot-me', featured: true },
        { name: 'Cà ri tôm cơm trắng', description: 'Cà ri tôm nước cốt dừa thơm béo, ăn kèm cơm trắng.', price: 48000, category: 'com', image: 'ca-ri-tom-com-trang' },
        { name: 'Thịt nướng xiên (5 xiên)', description: 'Thịt heo, gà nướng than ướp sả, kèm tương ớt.', price: 40000, category: 'an-vat', image: 'thit-nuong-xien-5-xien' },
        { name: 'Thịt viên sốt cà', description: 'Thịt viên mềm sốt cà chua, ăn kèm cơm hoặc bánh mì.', price: 38000, category: 'com', image: 'thit-vien-sot-ca', available: false },
      ],
    },
    {
      name: 'Phở & Mì Cô Ba',
      slug: 'pho-mi-co-ba',
      description: 'Nước dùng hầm xương 12 tiếng, phở bò chuẩn vị Bắc và các món mì xào hấp dẫn.',
      image: 'pho-bo-tai',
      location: 'Căn tin tòa A, quầy số 3',
      phone: '0283800002',
      openTime: '06:00', closeTime: '14:00',
      owner: { fullName: 'Trương Thị Ba', email: 'ba.phomi@quickbite.test' },
      items: [
        { name: 'Phở bò tái', description: 'Bánh phở mềm, thịt bò tái, hành lá, nước dùng thanh ngọt.', price: 45000, category: 'bun-pho-mi', image: 'pho-bo-tai', featured: true },
        { name: 'Mì trứng hải sản', description: 'Mì trứng, tôm, trứng lòng đào và rau cải trong nước dùng đậm đà.', price: 50000, category: 'bun-pho-mi', image: 'mi-trung-hai-san', featured: true },
        { name: 'Mì xào bò', description: 'Mì xào giòn với thịt bò, cải ngọt, cà rốt.', price: 42000, category: 'bun-pho-mi', image: 'mi-xao-bo' },
        { name: 'Mì xào rau củ', description: 'Mì xào với rau củ theo mùa, nêm nếm vừa ăn.', price: 35000, category: 'bun-pho-mi', image: 'mi-xao-rau-cu' },
        { name: 'Sủi cảo (8 viên)', description: 'Sủi cảo nhân tôm thịt, chấm nước tương gừng.', price: 32000, category: 'an-vat', image: 'sui-cao-8-vien' },
        { name: 'Há cảo hấp (6 viên)', description: 'Há cảo vỏ mỏng, nhân tôm tươi, hấp nóng.', price: 30000, category: 'an-vat', image: 'ha-cao-hap-6-vien' },
      ],
    },
    {
      name: 'Góc Ăn Nhanh K-Town',
      slug: 'goc-an-nhanh-k-town',
      description: 'Burger, pizza, bánh mì và bữa sáng kiểu Âu — nhanh, nóng, no bụng giữa giờ học.',
      image: 'pizza-ga-nuong-mieng-lon',
      location: 'Tòa B, tầng trệt cạnh sảnh',
      phone: '0283800003',
      openTime: '07:00', closeTime: '21:00',
      owner: { fullName: 'Kiều Minh Khoa', email: 'khoa.ktown@quickbite.test' },
      items: [
        { name: 'Burger bò phô mai', description: 'Bò xay 120g, phô mai cheddar, rau xà lách, kèm khoai tây chiên.', price: 55000, category: 'an-nhanh', image: 'burger-bo-pho-mai', featured: true },
        { name: 'Pizza gà nướng (miếng lớn)', description: 'Đế mỏng giòn, gà nướng BBQ, phô mai mozzarella.', price: 39000, category: 'an-nhanh', image: 'pizza-ga-nuong-mieng-lon' },
        { name: 'Bánh mì ốp la sốt bơ', description: 'Bánh mì nướng giòn, trứng ốp la, sốt bơ tỏi.', price: 25000, category: 'an-nhanh', image: 'banh-mi-op-la-sot-bo' },
        { name: 'Pancake mật ong', description: 'Bánh pancake mềm xốp, rưới mật ong và bơ.', price: 35000, category: 'an-vat', image: 'pancake-mat-ong' },
        { name: 'Donut sô-cô-la', description: 'Bánh donut phủ sô-cô-la và cốm màu.', price: 18000, category: 'an-vat', image: 'donut-so-co-la' },
      ],
    },
    {
      name: 'Trà Sữa & Cà Phê Chill',
      slug: 'tra-sua-ca-phe-chill',
      bank: { bankBin: '970422', bankAccountNo: '0888123456', bankAccountName: 'TRA SUA CA PHE CHILL' },
      description: 'Trà sữa trân châu tự nấu, cà phê pha máy và sinh tố — tiếp năng lượng cho mùa thi.',
      image: 'tra-sua-tran-chau-duong-den',
      location: 'Sân trước thư viện',
      phone: '0283800004',
      openTime: '07:00', closeTime: '22:00',
      owner: { fullName: 'Lý Gia Hân', email: 'han.chill@quickbite.test' },
      items: [
        { name: 'Trà sữa trân châu đường đen', description: 'Trà sữa đậm vị, trân châu đường đen dẻo thơm.', price: 30000, category: 'do-uong', image: 'tra-sua-tran-chau-duong-den', featured: true },
        { name: 'Bạc xỉu', description: 'Cà phê sữa nhiều sữa, ít đắng, đá viên.', price: 25000, category: 'do-uong', image: 'bac-xiu' },
        { name: 'Cà phê latte', description: 'Espresso và sữa tươi đánh bọt, vẽ latte art.', price: 35000, category: 'do-uong', image: 'ca-phe-latte' },
        { name: 'Trà gừng mật ong', description: 'Trà nóng với gừng tươi và mật ong, ấm bụng ngày mưa.', price: 22000, category: 'do-uong', image: 'tra-gung-mat-ong' },
        { name: 'Sinh tố sô-cô-la kem tươi', description: 'Sinh tố sô-cô-la xay đá, phủ kem tươi.', price: 38000, category: 'do-uong', image: 'sinh-to-so-co-la-kem-tuoi' },
      ],
    },
    {
      name: 'Vườn Xanh — Chay & Salad',
      slug: 'vuon-xanh-chay-salad',
      description: 'Món chay thanh đạm và salad tươi mỗi ngày cho người ăn uống lành mạnh.',
      image: 'salad-rau-cu-hat-dinh-duong',
      location: 'Căn tin tòa C, quầy số 2',
      phone: '0283800005',
      openTime: '08:00', closeTime: '19:00',
      owner: { fullName: 'Hồ Thanh Tâm', email: 'tam.vuonxanh@quickbite.test' },
      items: [
        { name: 'Salad rau củ hạt dinh dưỡng', description: 'Rau xanh, bơ, đậu gà, cà chua bi, sốt mè rang.', price: 45000, category: 'chay-salad', image: 'salad-rau-cu-hat-dinh-duong', featured: true },
        { name: 'Salad trộn dầu giấm', description: 'Xà lách, hành tím, cà rốt, sốt dầu giấm nhẹ.', price: 35000, category: 'chay-salad', image: 'salad-tron-dau-giam' },
        { name: 'Mâm chay thập cẩm', description: 'Đậu hũ, nấm, rau củ xào và canh rau ngót, kèm cơm.', price: 40000, category: 'chay-salad', image: 'mam-chay-thap-cam' },
      ],
    },
  ];

  /** Định lượng mỗi phần (hiển thị ở trang chi tiết món) */
  const PORTIONS: Record<string, string> = {
    'Cơm chiên Dương Châu': '1 dĩa · 400g', 'Cơm chiên hải sản': '1 dĩa · 450g', 'Cơm gà bowl sốt mè': '1 tô · 450g',
    'Cà ri tôm cơm trắng': '1 phần · 450g', 'Thịt nướng xiên (5 xiên)': '5 xiên', 'Thịt viên sốt cà': '1 phần · 8 viên',
    'Phở bò tái': '1 tô · 650ml', 'Mì trứng hải sản': '1 tô · 650ml', 'Mì xào bò': '1 dĩa · 400g', 'Mì xào rau củ': '1 dĩa · 400g',
    'Sủi cảo (8 viên)': '8 viên', 'Há cảo hấp (6 viên)': '6 viên', 'Burger bò phô mai': '1 cái + khoai tây chiên',
    'Pizza gà nướng (miếng lớn)': '1 miếng lớn', 'Bánh mì ốp la sốt bơ': '1 ổ · 2 trứng', 'Pancake mật ong': '3 bánh',
    'Donut sô-cô-la': '1 cái', 'Trà sữa trân châu đường đen': 'Ly 500ml', 'Bạc xỉu': 'Ly 400ml', 'Cà phê latte': 'Ly 350ml',
    'Trà gừng mật ong': 'Ly 350ml', 'Sinh tố sô-cô-la kem tươi': 'Ly 500ml', 'Salad rau củ hạt dinh dưỡng': '1 tô · 350g',
    'Salad trộn dầu giấm': '1 tô · 300g', 'Mâm chay thập cẩm': '1 mâm (cơm + 3 món + canh)',
  };

  const stalls: { id: number; ownerId: number; menu: { id: number; name: string; price: number; isAvailable: boolean }[] }[] = [];

  for (const s of stallsData) {
    const owner = await createUser({ ...s.owner, role: 'VENDOR' });
    const stall = await prisma.foodStall.create({
      data: {
        name: s.name, slug: s.slug, description: s.description, imageUrl: img(s.image),
        location: s.location, phone: s.phone, openTime: s.openTime, closeTime: s.closeTime,
        ...s.bank,
      },
    });
    const memberships: { userId: number; stallId: number; role: VendorRole }[] = [
      { userId: owner.id, stallId: stall.id, role: 'OWNER' },
    ];
    if (s.staff) {
      const staff = await createUser({ ...s.staff, role: 'VENDOR' });
      memberships.push({ userId: staff.id, stallId: stall.id, role: 'STAFF' });
    }
    await prisma.vendorMembership.createMany({ data: memberships });

    const menu = [];
    for (const item of s.items) {
      const created = await prisma.menuItem.create({
        data: {
          stallId: stall.id,
          categoryId: categories[item.category]!,
          name: item.name,
          description: item.description,
          price: new Prisma.Decimal(item.price),
          portion: PORTIONS[item.name] ?? null,
          imageUrl: img(item.image),
          isFeatured: item.featured ?? false,
          isAvailable: item.available ?? true,
        },
      });
      menu.push({ id: created.id, name: created.name, price: item.price, isAvailable: created.isAvailable });
    }
    stalls.push({ id: stall.id, ownerId: owner.id, menu });
  }

  // ─────────── Đơn hàng lịch sử (phục vụ dashboard, lịch sử đơn, đánh giá) ───────────
  console.log('🧾 Tạo đơn hàng mẫu...');
  const notes = [null, null, 'Ít cay giúp mình', 'Không hành', 'Thêm đá', 'Ít đường', null];
  const reviewComments = [
    'Đồ ăn ngon, ra món nhanh!',
    'Phần ăn đầy đặn, giá hợp lý.',
    'Ổn, nhưng hơi mặn một chút.',
    'Sẽ ủng hộ tiếp ❤️',
    'Đóng gói cẩn thận, còn nóng.',
  ];
  const now = new Date();
  const usedNumbers = new Set<string>();
  let orderCount = 0;

  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const ordersToday = randInt(2, 5);
    for (let n = 0; n < ordersToday; n++) {
      const stall = pick(stalls);
      const student = pick(students);
      const pickup = pick(activePickups);
      const createdAt = new Date(now);
      createdAt.setDate(now.getDate() - daysAgo);
      createdAt.setHours(randInt(7, 18), randInt(0, 59), 0, 0);
      if (createdAt > now) createdAt.setTime(now.getTime() - randInt(5, 90) * 60_000);

      // Đơn hôm nay đang được xử lý ở nhiều trạng thái khác nhau; đơn cũ phần lớn đã hoàn thành
      let status: OrderStatus;
      if (daysAgo === 0) {
        status = pick([OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED]);
      } else {
        const r = rand();
        status = r < 0.82 ? OrderStatus.COMPLETED : r < 0.92 ? OrderStatus.CANCELLED : OrderStatus.REJECTED;
      }

      const available = stall.menu.filter((m) => m.isAvailable);
      const chosen = new Map<number, { id: number; name: string; price: number; quantity: number }>();
      for (let k = 0; k < randInt(1, 3); k++) {
        const m = pick(available);
        const existing = chosen.get(m.id);
        if (existing) existing.quantity += 1;
        else chosen.set(m.id, { ...m, quantity: randInt(1, 2) });
      }
      const lines = [...chosen.values()];
      const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

      let orderNumber = generateOrderNumber(createdAt);
      while (usedNumbers.has(orderNumber)) orderNumber = generateOrderNumber(createdAt);
      usedNumbers.add(orderNumber);

      const minutes = (m: number) => new Date(createdAt.getTime() + m * 60_000);
      const flow: OrderStatus[] = [OrderStatus.PENDING];
      const reached = (s: OrderStatus) => {
        const order: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED];
        return order.indexOf(status) >= order.indexOf(s) && order.includes(status);
      };
      for (const s of [OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP, OrderStatus.COMPLETED]) {
        if (reached(s)) flow.push(s);
      }
      if (status === OrderStatus.CANCELLED || status === OrderStatus.REJECTED) flow.push(status);

      const paymentStatus: PaymentStatus =
        status === OrderStatus.COMPLETED ? PaymentStatus.PAID
        : status === OrderStatus.CANCELLED || status === OrderStatus.REJECTED ? PaymentStatus.VOIDED
        : PaymentStatus.UNPAID;

      const order = await prisma.order.create({
        data: {
          orderNumber,
          studentId: student.id,
          stallId: stall.id,
          pickupLocationId: pickup.id,
          status,
          paymentStatus,
          subtotal: new Prisma.Decimal(subtotal),
          total: new Prisma.Decimal(subtotal),
          customerNote: pick(notes),
          pickupTime: minutes(30),
          cancelReason:
            status === OrderStatus.CANCELLED ? 'Sinh viên đổi ý, huỷ đơn'
            : status === OrderStatus.REJECTED ? 'Quầy tạm hết nguyên liệu'
            : null,
          createdAt,
          acceptedAt: reached(OrderStatus.ACCEPTED) ? minutes(3) : null,
          readyAt: reached(OrderStatus.READY_FOR_PICKUP) ? minutes(18) : null,
          completedAt: status === OrderStatus.COMPLETED ? minutes(32) : null,
          cancelledAt: status === OrderStatus.CANCELLED || status === OrderStatus.REJECTED ? minutes(4) : null,
          items: {
            create: lines.map((l) => ({
              menuItemId: l.id,
              itemName: l.name,
              unitPrice: new Prisma.Decimal(l.price),
              quantity: l.quantity,
              note: rand() < 0.2 ? 'Đóng hộp riêng' : null,
              lineTotal: new Prisma.Decimal(l.price * l.quantity),
            })),
          },
          payment: {
            create: {
              method: 'CASH_ON_PICKUP',
              status: paymentStatus,
              amount: new Prisma.Decimal(subtotal),
              confirmedById: paymentStatus === PaymentStatus.PAID ? stall.ownerId : null,
              paidAt: paymentStatus === PaymentStatus.PAID ? minutes(32) : null,
              createdAt,
            },
          },
          statusHistory: {
            create: flow.map((s, i) => ({
              fromStatus: i === 0 ? null : flow[i - 1]!,
              toStatus: s,
              changedById: i === 0 || s === OrderStatus.CANCELLED ? student.id : stall.ownerId,
              createdAt: minutes(i * 6),
            })),
          },
        },
      });
      orderCount++;

      if (status === OrderStatus.COMPLETED && rand() < 0.55) {
        await prisma.review.create({
          data: {
            orderId: order.id,
            studentId: student.id,
            stallId: stall.id,
            rating: pick([3, 4, 4, 5, 5, 5]),
            comment: pick(reviewComments),
            createdAt: minutes(60),
          },
        });
      }

      if (daysAgo <= 1) {
        await prisma.notification.create({
          data: {
            userId: student.id,
            type: 'ORDER_STATUS',
            orderId: order.id,
            title: `Đơn ${orderNumber} đã được cập nhật`,
            message: `Trạng thái hiện tại của đơn hàng: ${status}`,
            createdAt: minutes(6),
          },
        });
      }
    }
  }

  // Tính số phần đã bán của từng món từ các đơn đã hoàn thành
  const sold = await prisma.orderItem.groupBy({
    by: ['menuItemId'],
    where: { order: { status: OrderStatus.COMPLETED } },
    _sum: { quantity: true },
  });
  for (const row of sold) {
    await prisma.menuItem.update({ where: { id: row.menuItemId }, data: { soldCount: row._sum.quantity ?? 0 } });
  }

  // Một đánh giá bị báo cáo để admin kiểm duyệt
  const someReview = await prisma.review.findFirst({ orderBy: { id: 'asc' } });
  if (someReview) {
    await prisma.review.update({
      where: { id: someReview.id },
      data: { status: 'REPORTED', reportReason: 'Nội dung không phù hợp (dữ liệu mẫu)' },
    });
  }

  await prisma.auditLog.create({
    data: { actorId: admin.id, action: 'SEED_DATABASE', entityType: 'System', metadata: { orders: orderCount } },
  });

  console.log('\n✅ Seed hoàn tất!');
  console.log(`   ${stalls.length} quầy ăn, ${Object.keys(categories).length} danh mục, ${orderCount} đơn hàng mẫu`);
  console.log('\n🔐 Tài khoản demo (CHỈ DÙNG KHI PHÁT TRIỂN) — mật khẩu chung:', DEV_DEMO_PASSWORD);
  console.log('   Admin     : admin@quickbite.test');
  console.log('   Chủ quầy  : hanh.bepnha@quickbite.test (Bếp Nhà Sinh Viên), ba.phomi@quickbite.test, ...');
  console.log('   Sinh viên : an.nguyen@quickbite.test, binh.tran@quickbite.test, ...');
}

main()
  .catch((err) => {
    console.error('❌ Seed thất bại:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
