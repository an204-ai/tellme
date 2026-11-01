import { z } from 'zod';

export const site = z.object({ name: z.string(), appUrl: z.string().url(), email: z.string().email() }).parse({ name: 'Tellme', appUrl: 'https://tellme.my', email: 'tellmesocialmediavn@gmail.com' });
export const navigation = [ { href: '/', label: 'Trang chủ' }, { href: '/ve-tellme/', label: 'Về Tellme' }, { href: '/tell-me-now/', label: 'Tell me now' }, { href: '/ung-dung/', label: 'Ứng dụng' } ];
export const moments = [
  { id: 'coffee', tab: 'Đầu ca', time: '08:15', image: '/moments/coffee.webp', caption: 'Cà phê đã có. Chuyện hôm nay từ từ kể.', name: 'Mai', alt: 'Hai đồng nghiệp nâng ly cà phê trước giờ làm', reaction: 'like' },
  { id: 'lunch', tab: 'Giờ nghỉ', time: '12:10', image: '/moments/lunch.webp', caption: 'Họp gì cũng được, đừng họp giờ ăn nha.', name: 'Mai', alt: 'Ba người bạn cùng ăn trưa trong quán nhỏ', reaction: 'haha' },
  { id: 'after-work', tab: 'Tan làm', time: '17:35', image: '/moments/after-work.webp', caption: 'Xong một ngày. Đi bộ một đoạn rồi về.', name: 'Mai', alt: 'Hai người bạn đi bộ trên đường về sau giờ làm', reaction: 'love' },
] as const;
export const faqSchema = z.array(z.object({ question: z.string(), answer: z.string() }));
export const faqs = faqSchema.parse([
  { question: 'Chưa có app thì dùng Tellme thế nào?', answer: 'Bạn có thể dùng ngay trên trình duyệt tại tellme.my, bằng điện thoại hoặc máy tính. Bản ứng dụng iOS và Android đang được chuẩn bị.' },
  { question: 'Tell me now có chọn ảnh từ thư viện không?', answer: 'Tell me now ghi lại ảnh vừa chụp bằng camera điện thoại hoặc webcam. Bạn xem lại, chụp lại và thêm lời kể trước khi đăng. Muốn chia sẻ ảnh có sẵn, bạn có thể tạo bài viết ở Khám phá.' },
  { question: 'Ai xem được khoảnh khắc của mình?', answer: 'Bạn chọn Công khai, Bạn bè hoặc Chỉ mình tôi cho chuỗi ngày. Từng ảnh cũng có thể được giới hạn riêng trong phạm vi người xem của chuỗi.' },
  { question: 'Có thể nhắn tin với bất kỳ ai không?', answer: 'Hai người trở thành bạn bè khi follow nhau. Tin nhắn riêng dành cho bạn bè; khi tạo nhóm, bạn chọn từ những người bạn của mình.' },
]);
