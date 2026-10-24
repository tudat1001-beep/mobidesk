# MobiDesk

PWA tiếng Việt quản lý một cửa hàng điện thoại/phụ kiện, một kho, một máy quầy offline. Mỗi khách dùng một bản cài và một Supabase project riêng. Chưa nhập cấu hình thì ứng dụng mở dữ liệu minh họa, lưu riêng trên máy; dữ liệu minh họa không được chuyển thành sổ thật.

## Chạy trên máy phát triển

Cần Node.js 24 và npm. Tại thư mục `app`:

```powershell
npm ci
npm run dev
```

```powershell
npm test
npm run build
npm run preview -- --port 5173
```

`build` tạo `dist/`, service worker và `dist/supabase-setup.sql`. PWA offline chỉ có trong bản build, trên HTTPS hoặc localhost. Không chạy ứng dụng bằng cách mở trực tiếp tệp `index.html`.

## Cài riêng cho một khách

1. Tạo **Supabase project trống riêng cho khách**, giữ tài khoản quản trị ngoài ứng dụng. Bộ SQL dưới đây là bộ khởi tạo mới, không phải script nâng cấp có thể chạy lặp trên dữ liệu đang vận hành.
2. Chạy lần lượt các tệp trong `supabase/migrations/` theo tên tăng dần bằng công cụ quản trị Supabase. Hoặc chạy một lần nội dung `dist/supabase-setup.sql`. Không đưa schema `app_private` vào danh sách exposed schemas. RPC công khai nằm trong schema `public`.
3. Tạo/invite tài khoản chủ trong Supabase Authentication bằng kênh quản trị của bạn. Cấu hình URL/redirect và dịch vụ email theo tên miền bản cài; ứng dụng đăng nhập email/mật khẩu. Không bật đăng ký công khai nếu không cần. Khôi phục mật khẩu do quản trị viên thực hiện ở bản này; UI hoàn tất link recovery chưa có.
4. Mở `/#thiet-lap` hoặc bấm **Ctrl+Alt+S**. Lần đầu nhập mật khẩu khóa màn hình cài đặt (ít nhất 8 ký tự); lần sau dùng mật khẩu đó trên cùng trình duyệt.
5. Nhập tên khách, Project URL dạng `https://<project-ref>.supabase.co`, publishable key hoặc legacy anon key. Bấm **Kiểm tra kết nối** sau khi chạy SQL.
6. Bấm **Xuất cấu hình bản cài**, đặt tệp `deployment.json` nhận được vào `public/` của đúng bản cài khách, chạy lại build và phát hành toàn bộ `dist/` lên tên miền HTTPS riêng. Không chỉ thay cấu hình trên một thiết bị nếu khách sử dụng nhiều thiết bị.
7. Mở bản cài, đăng nhập chủ, tạo cửa hàng một lần. Trong Cài đặt, nhập thông tin cửa hàng và xác nhận các chính sách trước giao dịch thật. Nhập tồn và công nợ đầu kỳ đã đối chiếu, rồi đóng kỳ đầu trước phát sinh thường xuyên. Tạo các Auth user nhân viên và gán quyền bằng email tại Cài đặt.

**Lưu trên máy** trong màn hình ẩn dùng để thử kết nối trên thiết bị đó. Khi đã phát hành `deployment.json`, cấu hình từ hosting được ưu tiên; muốn đổi cho cả khách phải xuất/phát hành lại tệp. Thứ tự ưu tiên: biến môi trường build → `deployment.json` → cấu hình máy. `.env.example` là cách thay thế cho người triển khai có pipeline riêng; không dùng đồng thời nếu muốn quản lý bằng `deployment.json`.

URL và publishable/anon key là cấu hình công khai của frontend. Không nhập service_role/secret key, database password, email/mật khẩu quản trị Supabase. Không có danh sách project các khách khác trên máy khách. Khóa màn hình cài đặt được băm PBKDF2 có salt; người kiểm soát trình duyệt vẫn có thể xóa/bỏ qua khóa cục bộ. Quyền dữ liệu thật phụ thuộc Supabase Auth, RPC/RLS và quyền quản trị hosting. Màn hình ẩn không thay thế các quyền này.

Khi sao chép mã nguồn cho một khách mới, dùng project/đích hosting mới của khách đó; `.openai/hosting.json` trong checkout này là định danh bản demo hiện tại, không dùng để ghi đè khách khác. Không đưa dữ liệu khách, `.env`, khóa đặc quyền hoặc bản sao quầy vào Git.

## Vận hành quầy offline

1. Trên đúng máy quầy, mở bản production khi còn mạng, đăng nhập và vào **Quầy offline**. Chờ trạng thái bộ nhớ PWA; thử mất mạng/mở lại trên chính máy và trình duyệt sẽ dùng. Trình duyệt nhúng có thể không hỗ trợ đầy đủ PWA; máy quầy nên dùng Chrome/Edge với hồ sơ trình duyệt được giữ cố định.
2. Chủ cấp trước IMEI/Serial cụ thể hoặc số lượng phụ kiện. Một cửa hàng chỉ có một phiên cấp hàng hoạt động. Các máy khác không bán được phần tồn này. Khi quầy có phiên, cả lúc có mạng quầy cũng dùng quy trình lưu tại máy rồi đồng bộ để giữ thứ tự phiếu.
3. Chỉ bán hàng đã cấp, đúng giá đã cấp và thu đủ tiền mặt. Không chuyển khoản, ghi nợ hoặc giảm thêm trong phiên offline. Phiếu lưu xong IndexedDB mới hiện để in, có mã UUID và nhãn chưa đồng bộ.
4. Có mạng, mở Quầy offline để đồng bộ tuần tự. Tự đồng bộ chỉ chạy khi màn hình này đang mở; có nút thử lại. Cùng UUID/nội dung được gửi lại an toàn. Nếu lỗi cần kiểm tra, giữ nguyên phiếu, không lập hóa đơn hoặc thu tiền lần hai.
5. Xuất bản sao quầy ra nơi an toàn định kỳ. Đối chiếu phiếu, tiền và hàng chưa bán, đánh dấu xác nhận rồi đóng phiên. Không đổi project, xóa dữ liệu trình duyệt, đăng xuất, sao chép hồ sơ sang máy khác hoặc khôi phục bản sao cũ khi chưa giải quyết phiếu chờ. Ứng dụng chặn một số thao tác này nhưng không thể chặn người quản trị xóa ổ đĩa.

Hạn mức không tự hết hạn/thu hồi khi máy mất liên lạc. Bản xuất quầy hiện phục vụ lưu bằng chứng/đối soát; chưa có nhập bản sao tự động hoặc quy trình tự phục hồi khi mất máy. Không dùng bản sao như cách nhân bản quyền offline. Nghiệm thu quy trình ngoại lệ này trước vận hành thật.

## Chính sách của bản chạy thử cần chủ duyệt

- IMEI/Serial: giá vốn đích danh; phụ kiện số lượng: bình quân gia quyền liên hoàn, lưu độ chính xác trong PostgreSQL. Giảm giá phân bổ theo phần dư lớn nhất; phiếu đã ghi sổ giữ nguyên giá và giá vốn.
- Hàng bán trả về cách ly, chỉ đưa về khả dụng sau kiểm tra có lý do; hoàn theo giao dịch gốc và giới hạn lượng/tiền còn được trả. Đổi hàng ghi trả + bán + bù trừ tín dụng trong cùng transaction, không tạo dòng tiền giả.
- Chi phí thiết bị trước bán cộng vốn; sau bán ghi chi phí kỳ hiện tại. Nhập chi phí vận chuyển thanh toán riêng bằng tiền mặt. Bảo hành theo số ngày cấu hình và snapshot lúc bán; chưa có quy trình sửa chữa chuyên sâu.
- Giá/biên lợi nhuận là số quản trị. Chủ phải xác nhận cách sử dụng giá và ghi chú thuế với người phụ trách kế toán. Phiếu in không thay thế hóa đơn điện tử; chưa tích hợp kê khai VAT/hóa đơn điện tử.

## Kiểm tra trước khi nhận dữ liệu thật

Xem [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) và bộ kế hoạch `../docs/`. Đã có kiểm thử SQL trên PostgreSQL nhúng, tiền, quyền và IndexedDB; chưa thay thế kiểm thử Supabase thật, mạng đứt trên máy quầy, máy in thật, tải thực tế và diễn tập backup/restore. Không tuyên bố bản này đã nghiệm thu toàn bộ PLAN.

Hosting cần phục vụ ứng dụng tại `/`, HTTPS, đúng MIME JS/CSS/manifest và không cache lâu `deployment.json`, `index.html`, `sw.js`. Các asset có hash có thể cache lâu. Nếu nền tảng không áp dụng `public/_headers`, hãy cấu hình header tương đương ở hosting. Service worker chỉ cache shell/asset tĩnh, không cache phản hồi Auth/RPC. Dữ liệu làm việc/offline nằm trong IndexedDB tách theo project/cửa hàng/user.
