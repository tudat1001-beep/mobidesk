# Trạng thái triển khai — 24/10/2026

Người dùng đã yêu cầu triển khai và xác nhận **mỗi khách một bản cài, cấu hình Supabase ẩn riêng**. Đây là bản chạy thử để kiểm tra và chuẩn bị nối project riêng; chưa có Supabase project thật được cung cấp hoặc áp dụng SQL.

## Đã có trong mã nguồn

| Phần | Hành vi hiện tại |
|---|---|
| Giao diện | React/TypeScript, tiếng Việt, responsive, dashboard, bán/nhập, kho, công nợ, khách/NCC, báo cáo, lịch sử, bảo hành, cài đặt |
| Danh mục | Một hàng cho mỗi biến thể/SKU, IMEI/QUANTITY/SERIAL; mã vạch riêng; cập nhật giá, ngưỡng tồn, bảo hành mà không sửa lịch sử |
| Ghi sổ | Nhập/bán hỗn hợp; IMEI1/2 chung đơn vị UUID; giảm giá; thanh toán tiền mặt/ngân hàng/kết hợp; nợ, thu/chi; số dư/tồn đầu kỳ |
| Sau bán | Trả/hoàn gắn phiếu gốc, đổi hàng nguyên tử, cách ly/kiểm tra, chi phí thiết bị, kiểm kê lượng, bảo hành tối thiểu |
| Database | 3 SQL migrations, composite FK cùng cửa hàng, ràng buộc tiền/tồn, RLS, RPC kiểm tra quyền; idempotency UUID/nội dung; khóa hàng cửa hàng để tuần tự hóa ghi |
| Quyền | Chủ/nhân viên; không cấp quyền trực tiếp bảng private; server lọc giá vốn và giao dịch NCC đối với nhân viên |
| Báo cáo | Tổng hợp từ toàn sổ trên server theo ngày Việt Nam; doanh thu/giá vốn/gộp khác dòng tiền và công nợ |
| Tra cứu | RPC lịch sử tìm mã phiếu/khách/SKU/IMEI/Serial, 100 dòng/trang; snapshot làm việc lấy 500 chứng từ/biến động gần nhất |
| Offline | Một terminal, cấp tồn riêng; lưu phiếu + trừ hạn mức + sequence nguyên tử trong IndexedDB, in nhãn chưa đồng bộ; gửi tuần tự cùng UUID, ACK không xóa phiếu mới; xuất JSON quầy |
| Bản cài khách | `/#thiet-lap`, Ctrl+Alt+S, khóa cục bộ PBKDF2; kiểm tra kết nối, xuất cấu hình dùng chung, tải SQL; chặn đổi project khi còn dữ liệu quầy cần đối soát |
| PWA | Manifest, asset cục bộ, service worker cache shell, trạng thái chuẩn bị bộ nhớ; cập nhật chờ đóng tab, không tự xóa outbox |

So với mô hình logic trong PLAN, database gộp các đầu chứng từ vào `documents` và dòng vào `document_lines` có loại nghiệp vụ, vẫn giữ sổ kho/công nợ/tiền riêng. `products` tương đương một biến thể SKU, chưa có bảng master model và hệ thống danh mục phân cấp. Mục tiêu là giữ transaction và tra cứu đơn giản cho một cửa hàng nhỏ.

## Bằng chứng kiểm tra hiện có

- `npm test`: **21 kiểm thử, 4 tệp đều qua**. SQL migrations được thực thi trên PGlite (PostgreSQL nhúng), với mô phỏng Auth uid/roles.
- Kiểm thử bao gồm vốn bình quân và vốn đích danh, rollback khi thiếu tồn/IMEI trùng, trả giá vốn gốc, công nợ/hoàn, cùng request không ghi trùng, khác nội dung bị chặn, phân quyền giá vốn/bảng private, grant/consume/release, đầu kỳ, FK khác cửa hàng, đổi hàng rollback/bù trừ, báo cáo toàn sổ và lịch sử theo quyền, mã vạch duy nhất và giá lịch sử.
- fake-indexeddb: hai lượt bán tranh phần tồn cuối chỉ một thành công; cập nhật ACK không làm mất phiếu khác; chặn grant/sequence hồi lùi; seed demo bền vững trước khi cấp ID.
- Cấu hình: chỉ URL Supabase HTTPS và khóa công khai; từ chối khóa đặc quyền; kiểm tra khóa màn hình cài đặt không lưu mật khẩu thô.
- `npm run build`: TypeScript và Vite thành công; sinh SQL bundle và SW. Có cảnh báo chunk JS trên 500 kB (khoảng 164 kB gzip), cần đo trên máy quầy thực tế.
- Trình duyệt: đã bán demo thường, tồn giảm và mở phiếu; cấp 2 phụ kiện cho quầy, lưu 1 phiếu nhãn chưa đồng bộ, chuyển màn Quầy offline và đồng bộ thành 1 chứng từ. Đây là demo local, không phải PostgREST/Supabase thật.

## Chưa nghiệm thu / cần hoàn thiện trước vận hành

- Chưa cấu hình Supabase thật: cần chạy SQL, Auth, SMTP/redirect, chủ/nhân viên; kiểm tra RPC/RLS bằng JWT thật trên project thử rồi mới dùng project vận hành.
- Chưa chạy trọn ma trận `../docs/07-TEST-PLAN.md`, kiểm thử hai kết nối PostgreSQL thật đồng thời, dữ liệu dung lượng mục tiêu hoặc hiệu năng trên máy cấu hình thấp.
- Chưa xác minh in trên máy in giấy thật, khổ giấy/lề/cắt giấy. Hỗ trợ hộp thoại in trình duyệt; không có driver in thẳng.
- Đã sửa khởi tạo SW sau top-level await và cache miss do `Vary: Origin`. Sau sửa, đã dừng máy chủ local, reload được giao diện từ cache và lưu phiếu quầy thứ hai. Đây là kiểm tra shell + IndexedDB demo; vẫn cần thử mất Internet/khởi động lại và đồng bộ Supabase thật trên Chrome/Edge của máy quầy.
- Chưa có nhập bản sao quầy tự động, quy trình xử lý mất máy/clone browser, grant có chữ ký và ràng buộc phần cứng. Cần quy trình đối soát ngoại lệ và diễn tập khôi phục cả database/Auth trước go-live.
- Chưa có lưu giỏ nháp khi chuyển màn/tải lại, quét camera, ảnh sản phẩm, bảng giá nhập tham khảo riêng, import Excel hàng loạt, luồng hoàn tất email đặt lại mật khẩu, hóa đơn điện tử/VAT hoặc thu cũ đổi mới chuyên sâu.
- Báo cáo tổng hợp lấy toàn sổ, nhưng CSV chi tiết/biến động và lịch sử tại trang đối tác/thiết bị dựa trên snapshot gần nhất; dùng trang Lịch sử để tra cứu chứng từ cũ. Chưa có xuất toàn bộ sổ phân trang.
- Các chính sách giá vốn, trả/đổi, bảo hành và giá/thuế là quy tắc của bản thử chờ chủ duyệt, chưa tự trở thành chính sách của khách.

Chỉ chuyển sang vận hành sau khi hoàn thành cài đặt khách, duyệt chính sách, kiểm thử offline/in và backup/restore thực tế theo PLAN. Không dùng chung dữ liệu hoặc thông tin đăng nhập quản trị Supabase giữa các khách.
