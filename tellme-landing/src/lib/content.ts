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
  { question: 'Tell me now có chọn ảnh từ thư viện không?', answer: 'Tell me now ghi lại ảnh vừa chụp bằng camera điện thoại hoặc webcam. Bạn xem lại, chụp lại và thêm lời kể trước khi đăng. Mỗi ngày, bạn có thể chụp thêm ảnh để nối tiếp câu chuyện của mình.' },
  { question: 'Ai xem được khoảnh khắc của mình?', answer: 'Ảnh chỉ hiển thị giữa những người đã chấp nhận kết bạn với nhau. Bạn tìm đúng Tellme ID và gửi lời mời để kết nối.' },
  { question: 'Có thể nhắn tin với bất kỳ ai không?', answer: 'Bạn tìm đúng Tellme ID, gửi lời mời và chờ người kia chấp nhận. Khi đã kết nối, hai bạn xem ảnh và nhắn tin riêng cho nhau; nhóm trò chuyện cũng được tạo từ bạn bè.' },
]);
