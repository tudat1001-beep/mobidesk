# 04 — Kế hoạch UI/UX và PWA

Mục tiêu: giao diện tiếng Việt đơn giản, thao tác bằng điện thoại, tablet hoặc PC. Đây là mô tả màn hình và hành vi; chưa tạo giao diện/mã nguồn.

## 1. Bố cục chung

Mobile dùng thanh trên chứa tiêu đề, tìm kiếm theo ngữ cảnh và trạng thái mạng; thanh dưới tối đa bốn lối vào thường dùng: Tổng quan, Bán hàng, Kho, Thêm. “Thêm” mở đầy đủ menu đã yêu cầu: Tổng quan, Bán hàng, Nhập hàng, Kho, Công nợ, Khách hàng, Báo cáo, Cài đặt. PC/tablet rộng dùng sidebar đủ tám mục. Nhà cung cấp là tab trong Nhập hàng; bảo hành mở từ lịch sử bán hoặc chi tiết máy và có bộ lọc hồ sơ.

Một màu nhấn, nền sáng, chữ rõ; trạng thái dùng cả chữ/icon và màu. Đề xuất vùng chạm tối thiểu 44×44 px, cỡ chữ chính 16 px; kiểm tra tương phản và focus. Ưu tiên component ít loại: nút, input, bộ chọn, bảng/card, dialog xác nhận, trạng thái trống/lỗi. Chưa cần nhiều theme hoặc tùy chỉnh dashboard.

Ở màn nhỏ, bảng đổi sang dòng/card tóm tắt, không nhồi tất cả cột. Chạm dòng mở chi tiết; menu thao tác phụ riêng để không vô tình chốt. Bộ lọc nằm trong sheet, có chip hiển thị lọc đang dùng và nút xóa. Danh sách phân trang/tải thêm từ server, không tải toàn bộ kho/lịch sử về máy.

## 2. Danh sách màn hình

| Mã | Màn hình | Nội dung và thao tác chính | Quyền |
|---|---|---|---|
| UI01 | Đăng nhập/khôi phục phiên | Nhập thông tin, lỗi tiếng Việt, đang xác minh phiên, không có quyền cửa hàng | Mọi tài khoản được mời |
| UI02 | Tổng quan | Doanh thu thuần, lãi gộp nếu có quyền, phải thu/phải trả, giá trị tồn, hàng sắp hết; ngày/khoảng ngày | Chỉ số theo quyền, không trả cost ẩn về client |
| UI03 | Bán hàng/POS | Tìm hàng, chọn định danh, giỏ hỗn hợp, khách, giảm giá, thanh toán, nợ, xác nhận | Bán hàng/chủ |
| UI04 | Danh sách/chi tiết hóa đơn | Trạng thái, dòng hàng, IMEI/Serial, tiền đã thu/nợ, lịch sử thu/đổi trả, in lại | Theo quyền |
| UI05 | Nhập hàng | Tab phiếu/NCC, tạo phiếu hỗn hợp, nhập định danh từng dòng, chi phí, nợ/thanh toán | Chủ; nhân viên kho theo quyền |
| UI06 | Danh mục và biến thể | Nhóm/hãng, màu/dung lượng/phiên bản, SKU/barcode, mode, giá bán và ngưỡng tồn | Giá vốn chỉ người được cấp |
| UI07 | Kho | Tab đơn vị IMEI/Serial, hàng lượng, cách ly; tìm kiếm và cảnh báo tồn thấp | Theo quyền đọc tồn |
| UI08 | Chi tiết máy/Serial/SKU | Tình trạng, IMEI1/2 hoặc Serial, nguồn nhập, trạng thái, lịch sử nhập/bán/trả/bảo hành | Chi phí và vốn theo quyền |
| UI09 | Kiểm kê/điều chỉnh | Chụp sổ, tạm dừng ghi kho, nhập đếm, lệch, lý do, duyệt | Đếm theo quyền, chủ duyệt |
| UI10 | Công nợ | Tab phải thu/phải trả/dư có, đối tác, từng chứng từ, thu/chi và phân bổ | Theo quyền thu/chi |
| UI11 | Khách hàng/NCC | Mã/tên/liên hệ tối thiểu, lịch sử hàng và nợ; đối tác có cả hai vai trò | Theo quyền, không bắt lưu giấy tờ |
| UI12 | Trả/đổi/hoàn tiền | Mở từ phiếu gốc; phần còn trả, nơi nhập lại, credit, giảm nợ/hoàn, hóa đơn đổi mới | Chủ hoặc người được cấp |
| UI13 | Bảo hành cơ bản | Tra lần bán, điều kiện snapshot, tiếp nhận, trạng thái, kết quả; tài sản khách gửi | Theo quyền hậu mãi |
| UI14 | Báo cáo | Doanh thu/lãi gộp, tồn, nợ, bán chạy, theo nhóm và khoảng ngày; truy tới chứng từ | Chủ hoặc quyền báo cáo cụ thể |
| UI15 | Cài đặt | Cửa hàng, thành viên, ma trận quyền, chính sách đã duyệt, mẫu in, nhập đầu kỳ và lịch sử thao tác | Chủ |
| UI16 | Nháp, quầy offline và đồng bộ | Nháp tách phiếu đã lưu; ca/quota, số phiếu chưa sync/tổng tiền, ack/lỗi, tra request_id, cấp/trả quota cho chủ | Đúng người/cửa hàng và một terminal được chỉ định |

## 3. POS ít thao tác

PC: tìm/chọn hàng ở trái, giỏ và tổng thanh toán ở phải, nút chốt cố định. Mobile: danh sách hàng → giỏ → thanh toán, thanh cuối hiển thị số lượng/tổng và nút bước tiếp theo; giữ giỏ khi quay lại. Đề xuất mục tiêu hàng lượng bán tiền mặt đủ tiền: tìm hàng → thêm giỏ → xác nhận thanh toán, không qua nhiều màn cấu hình.

Máy/Serial cần bước chọn đơn vị: hiển thị đuôi IMEI/Serial, tình trạng, giá bán gợi ý, tồn và chính sách; có thể mở mã đầy đủ để đối chiếu máy vật lý. Quét IMEI2 phải tìm ra cùng máy như IMEI1, không thêm hai máy. Quét lại một máy đã trong giỏ báo rõ đã có; quét lại barcode phụ kiện lượng tăng số lượng theo hành vi đã được xác nhận ở giai đoạn 0.

Dòng lượng có nút +/− và nhập trực tiếp; chỉ số lượng nguyên, server kiểm lại tồn. Không tự chọn thay một IMEI khác khi xung đột. Khi SKU có nhiều máy khác vốn/tình trạng, nhân viên vẫn chỉ thấy thông tin đã được cấp quyền.

Thanh toán có lựa chọn Tiền mặt, Chuyển khoản, Kết hợp, Ghi nợ; không bắt tạo khách cho khách lẻ trả đủ. Ghi nợ bắt buộc đối tác được xác định. Hiển thị riêng tiền khách đưa, tiền trả lại, thực nhận và còn nợ. Ô chuyển khoản yêu cầu đánh dấu đã kiểm tra tiền đến theo quyền; không coi tạo QR là đã thanh toán.

Trước chốt online hiển thị khách, đơn vị, lượng, tiền, giảm giá, thực thu/nợ. Khóa nút chỉ là UX, chống trùng thật ở DB. Online thành công sau server xác nhận. Quầy offline hiển thị nút “Lưu tại quầy và in”, chỉ bật khi đủ quota/quyền/lưu trữ; sau transaction local hoàn tất báo “Đã lưu trên máy — chưa đồng bộ”, không dùng cùng thông báo POSTED. Hóa đơn đổi giữ liên kết gốc.

## 4. Nhập hàng và hàng có định danh

Chọn SKU trước rồi hiển thị biểu mẫu theo mode. IMEI có từng hàng máy với IMEI1, IMEI2 tùy chọn, mới/cũ, tình trạng, giá nhập; SERIAL có trường Serial, không gắn nhãn IMEI; QUANTITY chỉ lượng và đơn giá. Báo trùng trong chính phiếu ngay, đồng thời kiểm tra server khi chốt.

Với số lượng máy lớn, cho dán danh sách mã có xem trước/đếm lỗi trong phạm vi được duyệt; import file hàng loạt phức tạp có thể để sau. Không tự sửa mã định danh người dùng nhập mà không cho thấy bản chuẩn hóa và lỗi. Chi phí nhập có màn phân bổ xem trước, tổng phân bổ khớp; không lộ giá nhập cho vai trò không được cấp.

## 5. Công nợ, đổi trả và kiểm kê

Chi tiết đối tác có tab AR/AP tách biệt nếu vừa khách vừa NCC. Danh sách chứng từ hiện phải trả, đã tất toán, còn lại và credit. Thu/chi chọn chứng từ cần phân bổ, số tiền và phương thức; không chỉ có một ô “Sửa dư nợ”. Báo cáo dư có/ứng trước thành nhóm riêng.

Đổi trả bắt đầu từ chứng từ gốc. Chỉ hiển thị phần còn đủ điều kiện trả và giá trị phân bổ ban đầu. Tóm tắt riêng: giá trị hàng trả, giảm nợ, credit, hoàn tiền thực và vị trí cách ly. Nếu đổi sang máy khác, hiển thị cả máy nhận lại và máy xuất mới cùng chênh lệch; hết máy mới thì chốt đổi thất bại toàn bộ, giữ nội dung để chọn lại.

Kiểm kê hiển thị rõ trạng thái tạm dừng ghi kho và phạm vi đếm. Có bảng lệch, định danh thiếu/thừa, giá trị điều chỉnh và lý do; nút duyệt riêng cho chủ. Khi sổ thay đổi từ snapshot, yêu cầu đối chiếu lại, không có nút ghi đè mù.

## 6. Trạng thái hệ thống và PWA

| Trạng thái | Nội dung hiển thị / hành vi |
|---|---|
| Đang tải | Skeleton ngắn, giữ bộ lọc/giỏ; không hiện tồn 0 giả |
| Trống | Nêu không có dữ liệu hay không có kết quả lọc, kèm thao tác phù hợp quyền |
| Lỗi nhập | Gắn lỗi cạnh trường và bản tóm tắt, focus lỗi đầu tiên |
| Lỗi server | Thông báo có thể sửa, mã tra cứu; không lộ SQL, cost hoặc thông tin khách khác |
| Offline trên quầy đã cấp quyền | Banner “Bán offline — phiếu chờ đồng bộ”; chỉ bán hàng trong quota và thu tiền mặt theo đề xuất, lưu trước in; chặn nhập/trả/đổi/thu nợ/kiểm kê |
| Offline thiết bị khác/quầy chưa chuẩn bị | Banner “Mất mạng — chưa có quyền bán offline”; chỉ nháp, không dùng snapshot tồn để bán |
| Đang xác minh | “Chưa xác định giao dịch đã hoàn tất”; tra lại cùng request_id, không cho tạo bản trùng |
| Phiên online hết hạn | Không xóa outbox; sync cần phiên hợp lệ. Bán offline chỉ trong phiên/ca đã cấp riêng; không cho tài khoản mới đăng nhập offline |
| Nháp cũ | Báo giá/tồn/chính sách thay đổi; cho xem lại, không tự chốt |
| Bản PWA mới | Gợi ý cập nhật sau khi lưu nháp/kết thúc chốt, tránh reload giữa giao dịch |

Service Worker chỉ cache static đã cho phép, không cache response API/Auth/báo cáo. Máy quầy dùng IndexedDB riêng chứa hàng/giá/quyền được cấp và phiếu bán/tiền mặt chưa sync; đây là dữ liệu nghiệp vụ phải giữ, không phải cache tạm. Không lưu cost/margin hoặc cả danh bạ khách. Nháp thông thường tối thiểu có thể dọn theo user, nhưng **outbox chưa ack không được xóa khi logout, đổi user, cập nhật hoặc dọn cache**. UI có bàn giao/đồng bộ trước thao tác ảnh hưởng; timeout không cho bấm bán lại bằng mã mới.

Màn quầy offline hiển thị: terminal/ca/user, dữ liệu cập nhật lúc nào, quota còn dùng theo SKU/unit, số/tổng tiền phiếu chưa sync, phần cần chủ xử lý, tình trạng dung lượng và bản sao local. Danh sách tách “Nháp”, “Đã lưu tại quầy”, “Đã đồng bộ”, “Cần đối soát”. Chủ cấp/release hàng khi online; không có nút bỏ qua quota hoặc xóa phiếu lỗi.

“Cài ứng dụng” chỉ xuất hiện khi nền tảng hỗ trợ; hướng dẫn thêm lên màn hình chính theo thiết bị, vẫn sử dụng bình thường qua trình duyệt. Camera yêu cầu quyền khi người dùng bấm Quét, có nhập tay và máy quét bàn phím thay thế. Không phụ thuộc BarcodeDetector hoặc quyền camera để bán được; ma trận thiết bị trong 07 phải kiểm tra thực tế.

## 7. In và hiển thị tiền

MVP in bằng trình duyệt hoặc lưu PDF, có mã phiếu, ngày giờ, hàng/định danh, giảm giá, tổng, thực thu/nợ và bảo hành đã duyệt. Phiếu offline được dựng hoàn toàn từ dữ liệu đã lưu và mẫu đã tải; dùng mã terminal/ca/sequence+UUID riêng, có nhãn **“Đã ghi nhận tại quầy — chưa đồng bộ hệ thống”**. Sau sync có thể tra mã server từ mã local; không đổi âm thầm mã trên phiếu đã đưa khách. Thử A4 và khổ giấy thực khi ngắt Internet; không hứa in nhiệt/Bluetooth tự động. In lại không phát sinh bán/thu.

Phiếu bán/in PDF phục vụ giao dịch trong ứng dụng; yêu cầu hóa đơn điện tử và cách hiển thị thuế chờ D03. Không tự gắn tuyên bố giá trị pháp lý hoặc gọi file PDF là hóa đơn điện tử.

Tiền định dạng tiếng Việt, có đơn vị đ; giá vốn/lãi chỉ hiển thị theo quyền. Khi hiển thị vốn trung gian đã làm tròn phải giữ số nguồn chính xác để tổng báo cáo khớp; nơi có chênh hiển thị do làm tròn cần quy tắc tổng nhất quán trong D02.

## 8. Nghiệm thu trải nghiệm

- Hoàn thành bán một máy + hai phụ kiện, thu hai phương thức và nợ một phần trên mobile/PC không mất dữ liệu khi đổi bước.
- Nhân viên không thấy và không tải về giá vốn/lãi; máy cách ly không có nút thêm vào giỏ.
- Quét lỗi/mã trùng/mã không tìm thấy có đường nhập tay rõ ràng; bàn phím máy quét không gây chốt ngoài ý muốn.
- Mất Internet: quầy có quota vẫn bán/in, thiết bị khác không bán phần đã cấp; local lỗi thì không in thành công, in lại không sinh phiếu mới. Timeout/SW mới không mất outbox hoặc nhân đôi tiền.
- Đạt các màn 360 px và thiết bị đại diện, tăng chữ 200%, thao tác focus/bàn phím, nhãn biểu mẫu và không chỉ dùng màu phân biệt trạng thái.
- Chủ cửa hàng chạy thử một ngày nghiệp vụ có trả/đổi/nợ/kiểm kê và tự tìm được lịch sử cần tra. Việc “ít thao tác” được xác nhận qua quan sát, không chỉ bằng bản vẽ.

Wireframe chi tiết và giao diện thực tế chỉ thực hiện sau khi bộ PLAN được duyệt.
