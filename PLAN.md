# PLAN — PWA quản lý cửa hàng điện thoại và phụ kiện

Ngày lập: **24/10/2026**. Trạng thái hiện tại: **người dùng đã yêu cầu “triển khai”; đã xây bản chạy thử, chưa nghiệm thu vận hành thật**.

Cập nhật theo phản hồi ngày 24/10/2026: **đã xác nhận Supabase PostgreSQL; 1 cửa hàng, 1 kho; một máy quầy bán/in offline; mỗi khách một bản cài và một Supabase project riêng, cấu hình ẩn riêng**. Người dùng sau đó yêu cầu “triển khai”. Chính sách nghiệp vụ vẫn cần chủ xác nhận trước khi ghi sổ thật. Tiến độ thực tế và phần chưa nghiệm thu nằm tại [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md), hướng dẫn tại [README.md](README.md).

## 1. Phạm vi công việc đã thực hiện

Khi lập PLAN, thư mục ban đầu trống và chưa tạo mã ứng dụng. Sau yêu cầu triển khai, mã nguồn React/TypeScript, SQL migrations và kiểm thử nằm trong `app/`. Chưa kết nối hoặc thay đổi Supabase project thật của khách.

Các lựa chọn ghi “đề xuất” chưa phải chính sách cửa hàng đã duyệt. Bản chạy thử dùng các quy tắc được ghi rõ trong hướng dẫn; dữ liệu thật chỉ ghi sổ sau khi chủ xác nhận chính sách trong Cài đặt. Các phần còn lại của PLAN giữ vai trò mục tiêu nghiệm thu, không phải tuyên bố đã hoàn tất.

## 2. Bản đồ tài liệu

| Tài liệu | Nội dung |
|---|---|
| [01 — Yêu cầu](docs/01-REQUIREMENTS.md) | Phạm vi, vai trò, quy tắc dữ liệu, MVP, quyết định cần duyệt |
| [02 — Luồng nghiệp vụ](docs/02-BUSINESS-FLOWS.md) | Nhập, bán, thu/chi, đổi trả, kiểm kê, giá vốn, lỗi và phục hồi |
| [03 — Database](docs/03-DATABASE-DESIGN.md) | Thực thể, quan hệ, khóa, ràng buộc, đồng thời và tính toàn vẹn |
| [04 — UI/UX](docs/04-UI-UX-PLAN.md) | Danh sách màn hình, thao tác, mobile, PWA và mất mạng |
| [05 — Kiến trúc](docs/05-ARCHITECTURE.md) | Công nghệ, bảo mật, hosting, sao lưu và nguồn chính thức |
| [06 — Lộ trình](docs/06-IMPLEMENTATION-PLAN.md) | Giai đoạn phụ thuộc, công việc, nghiệm thu và rủi ro |
| [07 — Kiểm thử](docs/07-TEST-PLAN.md) | Ca kiểm thử nghiệp vụ, bảo mật, đồng thời và phục hồi |

## 3. Kiến trúc đề xuất

**Database đã chốt: Supabase PostgreSQL.** Bản chạy thử dùng React + TypeScript + Vite, Tailwind CSS, Supabase Authentication và RLS; các thao tác ghi sổ qua RPC trong transaction. **Một bản cài chỉ trỏ tới một Supabase project của một khách**. URL và khóa công khai được đặt qua màn hình `/#thiet-lap`, xuất `deployment.json` và phát hành cùng bản cài. Tài khoản/mật khẩu quản trị Supabase không được lưu trong ứng dụng. Khóa màn hình ẩn chỉ bảo vệ thao tác cục bộ, quyền dữ liệu do Auth/RLS/RPC kiểm soát.

Phạm vi đã xác nhận: **một cửa hàng, một kho; một máy quầy bán offline**. Dữ liệu nghiệp vụ mang `store_id` để kiểm soát quyền. Đề xuất cấp trước IMEI/Serial và hạn mức lượng hàng cho máy quầy khi còn mạng; hàng được cấp bị loại khỏi tồn bán được trên thiết bị khác. Khi mất Internet, máy quầy lưu giao dịch cục bộ bền vững rồi in phiếu **“Chưa đồng bộ”**. Database trung tâm chỉ ghi sổ sau khi đồng bộ thành công; chưa đồng bộ không được hiển thị như chứng từ POSTED. Các thiết bị khác vẫn bán online trong phần tồn chưa cấp.

Đề xuất offline MVP chỉ bán hàng đã cấp, giá/chính sách đã tải và thu tiền mặt; chuyển khoản chưa kiểm chứng, bán nợ, nhập/trả/đổi/kiểm kê cần mạng. Không tự thu hồi hạn mức chỉ vì hết thời gian hoặc mất liên lạc. Phải đối soát khi trả quyền bán, mất máy hoặc khôi phục dữ liệu. Chi tiết và giới hạn ở tài liệu 02/03/05; các giới hạn thanh toán cần chủ duyệt.

## 4. Chức năng và mô hình cốt lõi

- Danh mục sản phẩm → biến thể/SKU → chế độ theo dõi `IMEI`, `QUANTITY` hoặc `SERIAL`.
- IMEI/Serial gắn vào từng đơn vị hàng có UUID; IMEI 1 và IMEI 2 là hai định danh của **cùng một máy**. Không dùng IMEI làm khóa chính.
- Giá vốn đích danh cho IMEI/Serial; **đề xuất bình quân gia quyền liên hoàn** cho hàng số lượng, cần chủ cửa hàng duyệt.
- Nhập và bán chung nhiều loại hàng; chiết khấu, chi phí nhập, thanh toán tiền mặt/chuyển khoản/kết hợp, công nợ và tra cứu lịch sử.
- Sổ biến động kho, sổ công nợ, lịch sử thu/chi, giá vốn tại thời điểm bán và nhật ký thao tác được ghi nguyên tử; không sửa trực tiếp chứng từ đã ghi sổ.
- Đổi trả, hoàn tiền, kiểm kê, điều chỉnh, chi phí máy cũ và công nợ nhà cung cấp ở mức tối thiểu phải có trong MVP để số liệu sử dụng thực tế đúng.
- Bảo hành tối thiểu lưu điều kiện tại lần bán và tiếp nhận ca; quy trình sửa chữa/bảo hành chuyên sâu, thu cũ đổi mới trọn gói, khuyến mãi và nhiều chi nhánh để sau.

## 5. Màn hình và thứ tự triển khai

Menu: Tổng quan, Bán hàng, Nhập hàng, Kho, Công nợ, Khách hàng, Báo cáo, Cài đặt. Nhà cung cấp nằm trong Nhập hàng; bảo hành tối thiểu mở từ hóa đơn/thiết bị. Bảng gọn, chạm dòng mở chi tiết; POS bán máy và phụ kiện cùng giỏ.

| Giai đoạn | Kết quả | Phụ thuộc |
|---|---|---|
| 0 | Chốt nghiệp vụ, mẫu chứng từ, dữ liệu mẫu và quy tắc nghiệm thu | Phê duyệt kế hoạch để bắt đầu làm rõ |
| 1 | Nền dữ liệu, đăng nhập, quyền, transaction và nhật ký | 0 được chốt |
| 2 | Sản phẩm, IMEI/Serial, nhập hàng và số dư đầu kỳ | 1 |
| 3 | Bán hàng, giá vốn, thu/chi, công nợ | 2 |
| 4 | Đổi trả, kiểm kê, chi phí, bảo hành tối thiểu | 3 |
| 4A | Cấp tồn máy quầy, bán/in offline, đồng bộ và phục hồi | 3/4; thiết kế hợp đồng từ 1 |
| 5 | Dashboard, báo cáo, UI/PWA, in và đối soát | 4 và 4A; khung UI/PWA hình thành từ 1 |
| 6 | Kiểm thử tổng thể, diễn tập phục hồi và chạy thử | 5 |
| 7 | Nghiệp vụ nâng cao theo nhu cầu thực tế | MVP ổn định, phê duyệt riêng |

Không đưa bản 3 vào dùng chính thức khi 4 và 6 chưa đạt. Bổ sung giai đoạn **4A — bán/in offline và đối soát**, bắt buộc trước 5/6. Ước lượng sửa đổi **13–21 tuần**, gồm phần offline thêm khoảng 3–5 tuần cho một lập trình viên có kinh nghiệm; cần đo lại sau giai đoạn 0 và thử nghiệm lưu/in trên máy quầy. Đây chưa phải cam kết tiến độ.

## 6. Sổ quyết định và các phần còn cần xác nhận

| Mã | Quyết định | Đề xuất / ảnh hưởng |
|---|---|---|
| D01 | Phạm vi cửa hàng/kho và thiết bị offline | **Đã xác nhận:** một cửa hàng, một kho, một máy quầy offline. Số người bán online đồng thời cần bổ sung |
| D02 | Giá vốn phụ kiện, ngày khóa sổ, nhập lùi ngày | Bình quân liên hoàn, không ghi sổ hồi tố sau nghiệp vụ mới hơn |
| D03 | VAT, giá đã/chưa gồm thuế, thuế đầu vào, hóa đơn điện tử | Chốt với người phụ trách kế toán; không coi phiếu bán/in PDF là hóa đơn điện tử |
| D04 | Đổi trả, phí trả, điều kiện hàng nhập lại và bảo hành | Bản đề xuất cụ thể tại 01, mục 9; chưa áp dụng trước khi chủ duyệt |
| D05 | Hạn mức nợ, bán dưới giá vốn, quyền giảm giá | Chốt ngưỡng và quyền chủ/nhân viên trước triển khai |
| D06 | Phân bổ chi phí nhập, chi phí sửa máy trước/sau bán | Theo giá trị nhập; chi phí sau bán phải là bút toán bổ sung, không sửa lịch sử |
| D07 | Thu mua máy cũ, giấy tờ và dữ liệu cá nhân cần lưu | MVP cho nhập nguồn khách hàng bằng phiếu nhập tối thiểu; quy trình thu cũ đổi mới để sau |
| D08 | Chuẩn IMEI/Serial, dữ liệu cũ sai, Serial có phân biệt hoa thường | IMEI lưu chuỗi 15 chữ số; quy tắc ngoại lệ và chuẩn Serial phải được duyệt |
| D09 | Mất mạng và thiết bị in/quét thực tế | **Đã xác nhận:** bán/in offline trên một máy quầy. Đề xuất cấp tồn riêng, phiếu chưa đồng bộ, thu tiền mặt; cần duyệt hạn mức, thời hạn phiên, phần dữ liệu lưu máy và thử máy in |
| D10 | Database, ngân sách, nơi lưu dữ liệu, RPO/RTO, lịch sao lưu | **Đã chốt Supabase PostgreSQL làm database.** Gói dịch vụ, vùng dữ liệu, ngân sách và phương án sao lưu còn cần xác nhận; ưu tiên gói có sao lưu |
| D11 | Phân quyền xem giá vốn/lãi, lưu lịch sử, thời hạn giữ dữ liệu | Chủ xem đầy đủ; nhân viên theo nhiệm vụ; không chỉ ẩn giao diện |
| D12 | Tồn/nợ đầu kỳ, ngày chuyển hệ thống, người ký đối soát | Chốt số dư và chứng từ đối chiếu trước khi vận hành |

Phản hồi khảo sát đã cập nhật ở D01/D09. Chủ đã yêu cầu đề xuất chính sách để duyệt; bảng chính sách tại 01 mục 9 là đề xuất, không phải chính sách đã chốt. Các quyết định còn mở được chốt tại giai đoạn 0.

## 7. Bước tiếp theo sau phê duyệt

Thực hiện **giai đoạn 0**: giữ các xác nhận D01/D09, dùng ví dụ máy mới/cũ, phụ kiện ba mode, nợ, đổi trả và bán offline để chốt phần quyết định còn mở; ký duyệt chính sách đề xuất, công thức và phạm vi MVP. Chỉ sau đó mới thiết kế schema/migration thực thi. **Dừng tại bộ PLAN này và chờ người dùng phê duyệt trước khi code.**
