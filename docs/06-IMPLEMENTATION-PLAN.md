# 06 — Kế hoạch triển khai sau khi được phê duyệt

Tài liệu chỉ lập kế hoạch. Không giai đoạn kỹ thuật nào bên dưới đã được thực hiện. Mỗi giai đoạn chỉ được bắt đầu khi đầu vào và cổng nghiệm thu trước đó đã đạt; chưa phê duyệt PLAN thì không code/cài package/tạo database/deploy.

Người dùng đã chốt **Supabase PostgreSQL làm database**. Giai đoạn 0 chỉ cần chốt gói, vùng, ngân sách và cấu hình vận hành còn mở; không hỏi lại lựa chọn database đã xác nhận.

## 1. Cách chia công việc

Làm một lát nghiệp vụ hoàn chỉnh từ dữ liệu → quyền → transaction → UI → nghiệm thu, ưu tiên kho/tiền trước dashboard. Khung responsive, xử lý lỗi và PWA xuất hiện từ giai đoạn 1; giai đoạn 5 hoàn thiện và kiểm chứng, không dồn toàn bộ giao diện xuống cuối.

Phụ thuộc chính: **0 → 1 → 2 → 3 → 4 → 4A → 5 → 6**. Giai đoạn 4A bổ sung theo xác nhận bán/in offline trên một máy quầy, bắt buộc cho MVP. Giai đoạn 7 cần yêu cầu/phê duyệt riêng. Có thể chuẩn bị mẫu in và rà dữ liệu cũ trước, nhưng không chạy thật khi chưa qua 6.

| Vai trò thực hiện | Trách nhiệm |
|---|---|
| Chủ cửa hàng/người được ủy quyền | Chốt chính sách, quyền, mẫu phiếu, ký số dư đầu kỳ và nghiệm thu UAT |
| Lập trình viên | Mô hình dữ liệu, transaction/RLS, giao diện, migration, kiểm thử và tài liệu vận hành |
| Người phụ trách kiểm thử | Thực hiện ca rủi ro và UAT, lưu kết quả độc lập khi có người; nếu kiêm nhiệm phải ghi rõ |
| Người vận hành | Backup/restore, quản lý tài khoản, sự cố và đối soát; có thể là chủ hoặc đơn vị hỗ trợ đã thỏa thuận |

## 2. Giai đoạn 0 — Chốt nghiệp vụ và dữ liệu mẫu

**Mục tiêu:** loại bỏ giả định quan trọng trước schema và công thức tiền.

**Chức năng cần làm rõ:** ba mode; bán/nợ/đổi trả; mức quản lý thu mua máy cũ/bảo hành; điều kiện vốn hóa; VAT/hóa đơn; quy tắc quyền và phạm vi kho.

**Công việc:** phỏng vấn ngắn theo D01–D12 trong PLAN; thu mẫu phiếu nhập/bán/thu/chi, danh mục thực, bảng nợ/tồn đầu kỳ; thống nhất định nghĩa chỉ số và kỳ báo cáo. Chạy tay bộ ví dụ bán hỗn hợp, trả một phần, trả nhập sau đổi bình quân, máy sửa trước/sau bán, khách vừa là NCC. Chốt ngày chuyển đổi, thiết bị/browser/máy in và quy trình mất mạng.

**Dữ liệu liên quan:** từ điển thuật ngữ, danh sách trường bắt buộc, mẫu SKU/IMEI/Serial, số dư nguồn; mới là tài liệu/mẫu kiểm thử, chưa tạo database.

**Tiêu chí nghiệm thu:** D01 đã xác nhận một cửa hàng/kho; D09 đã xác nhận một quầy bán/in offline. Chốt các phần còn mở của D01–D12, chính sách đề xuất ở 01 mục 9, quota/ca/quyền, cách phục hồi local, phương thức tiền và model/browser/máy in. Công thức/thuế có người phụ trách xác nhận. Thử kỹ thuật lưu/in offline trên thiết bị thật trước cam kết tiến độ.

**Trường hợp kiểm tra:** IMEI2 trùng IMEI1 máy khác; Serial không phải IMEI; khách trả hàng còn nợ; chi phí vận chuyển trả bên thứ ba; phụ kiện trả vốn gốc; cùng đối tác có AR/AP; dữ liệu mã sai và tồn đầu kỳ thiếu vốn.

**Rủi ro:** chính sách chưa tồn tại hoặc dữ liệu cũ không đủ. Không đưa quy tắc mặc định vào vận hành để lấp chỗ trống.

**Điều kiện hoàn thành:** biên bản nghiệp vụ và phạm vi MVP đã được duyệt; mọi blocker ảnh hưởng schema/tiền/kho được giải quyết hoặc loại khỏi phạm vi có căn cứ. Nội dung chỉ ảnh hưởng giai đoạn nâng cao có thể giữ trong backlog có chủ sở hữu.

## 3. Giai đoạn 1 — Nền dữ liệu, quyền và cơ chế ghi sổ

**Mục tiêu:** xây nền có thể chứng minh dữ liệu không vượt quyền hoặc ghi một phần.

**Chức năng:** đăng nhập, thành viên, ma trận quyền, danh mục khung, trạng thái lỗi/quyền/mạng và vỏ responsive.

**Công việc kỹ thuật dự kiến:** sau phê duyệt mới khởi tạo React/TS/Vite/Tailwind và môi trường Supabase tách biệt; version hóa schema/grants/RLS/functions; đặc tả RPC, thứ tự khóa, idempotency, version nháp/outbox, terminal/grant và hợp đồng sync. Thử IndexedDB atomic, dung lượng/persistence, nhiều tab, mẫu in khi ngắt mạng và chiến lược phục hồi; kết quả không đạt thì sửa phương án trước phát triển. Thiết kế logging và kiểm thử DB/Auth/RLS; chọn phiên bản được hỗ trợ lúc triển khai và giữ lockfile.

**Dữ liệu:** stores, store_members, parties, categories/brands, products/variants, documents, audit_events, idempotency_requests; hợp đồng offline_terminals/grants/grant_lines/sync_records và local IndexedDB. Schema chi tiết triển khai theo lát, nhưng FK/tiền/quyền/quota phải thống nhất từ đầu.

**Tiêu chí nghiệm thu:** chủ/nhân viên đăng nhập và đúng quyền; người ngoài không đọc dữ liệu; không có secret đặc quyền trong bundle; gọi RPC sai store hoặc sai quyền bị từ chối; ghi lỗi giữa chừng rollback; retry cùng khóa không ghi đôi; database trống có thể dựng lại từ migration tương lai.

**Trường hợp kiểm thử:** SEC01–SEC08, TX01–TX03, PWA01/PWA04 trong 07; đổi/thu hồi membership, gọi function helper trái phép, truy cost qua API trực tiếp.

**Rủi ro:** grants mặc định quá rộng, SECURITY DEFINER bypass kiểm tra, RLS đệ quy, lộ cột vốn, dùng chung staging/production.

**Điều kiện hoàn thành:** kiểm thử ranh giới quyền/transaction đạt và được rà lại; chưa cho nhập dữ liệu vận hành thật. Không tiếp tục nếu chỉ có đăng nhập UI nhưng backend chưa giới hạn quyền.

## 4. Giai đoạn 2 — Danh mục, nhập hàng và đầu kỳ

**Mục tiêu:** tạo đúng hàng, định danh, vốn và nghĩa vụ phải trả từ nguồn đầu vào.

**Chức năng:** sản phẩm/biến thể ba mode, đối tác, phiếu nhập hỗn hợp, giá từng máy, phân bổ giảm giá/chi phí, thu mua nguồn khách ở mức phiếu nhập cơ bản, trả tiền/nợ NCC và nhập đầu kỳ trên môi trường thử.

**Công việc kỹ thuật:** ràng buộc mode/IMEI/Serial, unique trùng chéo, FK cùng store; RPC nhập atomic; dòng balance QUANTITY tạo trước; UI nhập định danh và preview vốn; số dư đầu kỳ theo loại, kiểm tra import nhỏ có xem trước, log kết quả. Không cần import đa dạng định dạng trong MVP; có thể dùng mẫu chuẩn đã duyệt.

**Dữ liệu:** purchases, purchase_lines, purchase_charges, stock_units, unit_identifiers, inventory_balances/movements, payments, party_ledger, opening_documents/lines, documents/audit/idempotency.

**Tiêu chí nghiệm thu:** một phiếu có máy hai IMEI, phụ kiện lượng và Serial cho đúng tồn/vốn/AP/tiền; vốn phân bổ khớp tổng; chi phí bên thứ ba không cộng nhầm nợ NCC; trùng định danh hoặc lỗi thanh toán không để kho/nợ một phần; số đầu kỳ không tăng doanh thu/mua/thu chi kỳ mới.

**Trường hợp kiểm thử:** CAT01–CAT04, IN01–IN06, MONEY01, OPEN01–OPEN02; nhập cùng IMEI song song, dữ liệu 0 đầu, hai máy cùng mẫu khác vốn.

**Rủi ro:** dữ liệu đầu kỳ thiếu giá vốn, mode đã dùng bị sửa, tính trùng chi phí hoặc biến tiền trả NCC thành chi phí vận hành.

**Điều kiện hoàn thành:** đối soát nhập–kho–AP–tiền trên dữ liệu mẫu khớp; nguồn đầu kỳ đã có kế hoạch ký duyệt. Không mở bán production tại thời điểm này.

## 5. Giai đoạn 3 — Bán hàng, thu/chi và giá vốn

**Mục tiêu:** hoàn thành giao dịch bán hỗn hợp an toàn với thanh toán và nợ.

**Chức năng:** POS, chọn IMEI/Serial, lượng phụ kiện, giảm giá dòng/phiếu, tiền mặt/chuyển khoản/kết hợp, một phần/ghi nợ, lịch sử hóa đơn và thu nợ/phân bổ cơ bản.

**Công việc kỹ thuật:** RPC bán, thu/chi và phân bổ; khóa unit/balance và chứng từ đích; snapshot vốn đích danh/bình quân; tính tiền server và phân bổ phần dư; quyền giảm giá/bán dưới vốn; UI timeout tra kết quả; in lại bản phiếu cơ bản sau commit.

**Dữ liệu:** sales, sale_lines, sale_line_units, payments/allocations, party_ledger, movements/balances, unit status, documents/audit/idempotency.

**Tiêu chí nghiệm thu:** bán được một máy+hai nhóm phụ kiện trong một giỏ; trả hai phương thức và nợ khớp; máy cuối/hàng cuối chỉ một người bán được; thu nợ không tạo doanh thu lần nữa; khách lẻ không được nợ; vốn/lãi không thay khi giá danh mục thay.

**Trường hợp kiểm thử:** SALE01–SALE06, MONEY02–MONEY06, COST01–COST03, TX01–TX06, CON01–CON06; gửi trùng, hash khác, hai dòng cùng SKU và hai tab cùng nháp.

**Rủi ro:** đọc tồn trước khóa, phân bổ vượt nợ, retry tạo phiếu đôi, tin tổng tiền client, vốn bình quân làm tròn sai.

**Điều kiện hoàn thành:** các bất biến INV01–INV04/INV06–INV10 đạt cho luồng thuận. Có thể trình diễn trên staging, nhưng chưa chạy thật vì chưa có bộ sửa sai/đổi trả và phục hồi đã nghiệm thu.

## 6. Giai đoạn 4 — Sửa sai, đổi trả, kiểm kê và hậu mãi tối thiểu

**Mục tiêu:** dữ liệu vẫn đúng khi phát sinh nghiệp vụ ngược và ngoại lệ thực tế.

**Chức năng:** trả bán/trả nhập, hoàn tiền từng phần, đổi bằng trả+bán liên kết, đảo thu/chi có kiểm soát, cách ly/kiểm tra lại, kiểm kê và điều chỉnh, chi phí máy trước/sau bán, bảo hành cơ bản.

**Công việc kỹ thuật:** RPC trả/hoàn/đổi atomic, kiểm giới hạn tích lũy, credit giảm nợ và phân bổ; trả lượng theo vốn lần bán; trả nhập chênh credit/vốn kho; khóa kỳ và kiểm kê snapshot; state machine quyền sở hữu/trạng thái; chi phí có chứng từ đối ứng và audit, không ghi đè cogs snapshot. Thử quy trình máy trả rồi bán lại.

**Dữ liệu:** returns/return_lines, device_costs, warranty_cases, stocktakes/lines, inventory_adjustments/lines; tham chiếu sales/purchases/payments và ledger/movements.

**Tiêu chí nghiệm thu:** không trả/hoàn quá nguồn; trả hàng còn nợ không chi hoàn sai; đổi thiếu hàng mới rollback cả bộ; hàng trả cách ly không bán; kiểm kê sổ thay đổi buộc đối chiếu lại; chi phí sau bán hiện riêng, không đổi lãi lịch sử âm thầm; tài sản khách bảo hành không tăng tồn sở hữu.

**Trường hợp kiểm thử:** RET01–RET08, COST04–COST06, STOCK01–STOCK05, WAR01–WAR04, MONEY05–MONEY06, CON03/CON04/CON06.

**Rủi ro:** quá nhiều trạng thái lẫn quyền sở hữu, hoàn tiền đôi, trả nhập làm V âm, dùng lại định danh bằng tạo unit mới, kiểm kê ghi đè bán hàng mới.

**Điều kiện hoàn thành:** cả luồng thuận và sửa sai đối soát kho–nợ–tiền–lãi; các chính sách D04/D06 đã được thực hiện đúng phần duyệt. Chưa tự thêm quy trình sửa chữa chuyên sâu.

## 7. Giai đoạn 4A — Một máy quầy bán và in offline

**Mục tiêu:** mất Internet vẫn bán/in trong quyền đã cấp mà không tạo trùng hoặc bỏ sót hàng/tiền.

**Chức năng:** đăng ký một terminal, cấp hàng theo unit/quota, mở ca, bán tiền mặt theo chính sách đề xuất, phiếu chưa sync, in lại, theo dõi outbox/ack/ngoại lệ, đối soát và trả quyền bán.

**Công việc kỹ thuật:** transaction cấp/consume/release quota, bucket OFFLINE_RESERVED; IndexedDB lưu phiếu bất biến+quota+sequence nguyên tử, coordination nhiều tab; cache static và dữ liệu được phép; mẫu in không tải tài nguyên mạng; sync tuần tự, cùng request_id và kiểm payload; khôi phục pending sau crash; chặn clear/update/logout làm mất outbox; luồng chủ xử lý rejected/revoked, bản sao local và chuyển ngày/kỳ. Không tự hết hạn rồi release hàng. Nếu chọn capability ký số, đặc tả khóa server/public verification và không đưa private key ra client.

**Dữ liệu:** offline_terminals, offline_grants, offline_grant_lines, offline_sync_records, local config/quota/outbox/print; documents và sales/payment/ledger/movement mở rộng tham chiếu local UUID/grant, xảy ra local/nhận/posted riêng.

**Tiêu chí nghiệm thu:** thiết bị khác không bán được hàng đã cấp; bán đúng ba mode trong quota; lưu local hoàn tất mới in; in lỗi/reboot/retry không tạo phiếu/tiền đôi; outbox không mất qua logout/update; sync theo server không đổi tiền đã giao dịch; báo cáo không giấu phiếu chưa sync; không kiểm kê/chốt kỳ hoặc thu hồi quota khi quầy chưa đối soát; phục hồi máy hỏng có chứng từ và không replay mù.

**Trường hợp kiểm thử:** OFF01–OFF14, PWA01–PWA06, TX04/TX05, CON01/CON02, RESTORE04/RESTORE05, UI04; thử ngắt mạng thật và máy in thật, không chỉ nút giả lập offline.

**Rủi ro:** local bị xóa/đầy/hỏng; đồng hồ máy sai; clone profile/backup cũ; quyền thu hồi chưa tới quầy; chi phí bình quân khác lúc thực bán; tiền đã nhận nhưng ghi local lỗi; tái cấp hàng khi chưa biết hàng đã giao. Các giới hạn phải được chủ duyệt và diễn tập, không chỉ ghi chú trong tài liệu.

**Điều kiện hoàn thành:** các ca Critical/High offline đạt trên máy được chọn; quy trình mở/đóng ca, kiểm tiền, sao lưu/recovery và đối soát đã được chủ chạy thử; không còn đường clear outbox chưa ack hoặc giải phóng quota mù. Chưa code phần này cho đến khi PLAN/phương án được duyệt.

## 8. Giai đoạn 5 — Dashboard, UX/PWA và vận hành thử đầy đủ

**Mục tiêu:** thông tin dễ dùng và có thể truy ngược về sổ nguồn.

**Chức năng:** dashboard/report theo khoảng ngày, tồn định danh/hàng thấp/bán chạy, lịch sử đối tác, mẫu in/PDF online và offline; chỉ số quota/phiếu chưa sync, cài PWA, cập nhật phiên bản và scanner bàn phím. Camera chỉ đưa vào nếu thử nền tảng đạt; nhập tay luôn có.

**Công việc kỹ thuật:** truy vấn/index theo dữ liệu thử, phân trang, projection theo quyền; đối soát chỉ số, chỉ cache static, clear dữ liệu cục bộ khi logout; version draft/RPC/SW, đường xử lý pending request; tối ưu responsive và khả năng truy cập; quy trình backup/restore, giám sát và hướng dẫn thao tác.

**Dữ liệu:** view/RPC từ snapshot và sổ; không tạo một bộ tổng tiền khác nhập tay. Cấu hình chỉ số/chính sách/nội dung phiếu đã duyệt.

**Tiêu chí nghiệm thu:** dashboard khớp phần đã POSTED và nêu rõ phiếu offline chưa sync; hoàn/trả đúng kỳ; nợ/ứng trước tách; quyền vốn giữ cả export/API; offline không tự coi trung tâm đã ghi sổ; PWA cũ không gửi payload sai hoặc xóa outbox; in lại không ghi trùng. Đạt hiệu năng môi trường thử của 01.

**Trường hợp kiểm thử:** REP01–REP05, UI01–UI04, PWA01–PWA06, SEC05/SEC08 và PERF01–PERF03.

**Rủi ro:** báo cáo lấy trạng thái hiện tại làm tồn quá khứ, cache chứa PII/tiền, reload mất giỏ, số tổng UI khác database, scanner/camera không tương thích.

**Điều kiện hoàn thành:** bộ màn MVP đủ dùng, tất cả test chức năng đạt; sẵn sàng diễn tập full-day và restore. Chưa tính là production-ready chỉ vì giao diện hoàn thiện.

## 9. Giai đoạn 6 — Nghiệm thu, phục hồi và chuyển vận hành

**Mục tiêu:** chứng minh MVP sử dụng được với người và thiết bị thật.

**Chức năng/vận hành:** chạy thử một ngày và đóng ngày, đối soát tồn/nợ/tiền/lãi, quản lý sự cố, sao lưu/khôi phục và ký đầu kỳ.

**Công việc kỹ thuật:** chạy test rủi ro cao, security trực tiếp API, request song song, lỗi giữa transaction và timeout; restore DB/Auth/Storage/quyền vào môi trường cách ly và đo RPO/RTO đã chốt; kiểm tra secret/bundle/cache; chuẩn bị cutover, tạm dừng ghi nguồn cũ, import đầu kỳ có preview và đối soát, smoke test, cơ chế mở lại hệ thống cũ nếu chưa có giao dịch mới. Khi đã có giao dịch thật mới, phải đối soát và chuyển chúng có kiểm soát, không rollback bỏ dữ liệu.

**Dữ liệu:** toàn bộ schema, dữ liệu nghiệm thu, manifest backup, số dư đầu kỳ đã ký và log import; dữ liệu thử không trộn vào báo cáo thật.

**Tiêu chí nghiệm thu:** tất cả test Critical/High đạt; không lỗi mất dữ liệu, sai tiền/tồn hoặc lộ quyền; phần còn lại có người chấp nhận và phương án xử lý; restore đạt mục tiêu; chủ hoàn thành ngày thử và ký UAT; có người trực xử lý lỗi, lịch backup và cách kiểm tra thành công.

**Trường hợp kiểm thử:** toàn bộ bộ 07, ưu tiên RESTORE01–RESTORE05, OFF, SEC, CON, TX và UAT01. Thử trên mạng/thiết bị cửa hàng, có đóng ca khi phiếu chưa sync, không chỉ máy phát triển.

**Rủi ro:** chỉ có backup nhưng restore không dùng được, lệch đầu kỳ, nháp trước mốc restore gửi lại, nhân viên chưa quen quy trình hoàn/nợ, không có người phản hồi sự cố.

**Điều kiện hoàn thành:** biên bản go-live được chủ duyệt, đầu kỳ khớp, backup trước cutover và drill có bằng chứng. Vận hành giới hạn có giám sát ban đầu; chốt đối soát hằng ngày cho đến khi ổn định. Phê duyệt PLAN hiện tại không tự thay thế phê duyệt go-live tương lai.

## 10. Giai đoạn 7 — Mở rộng có chọn lọc

**Mục tiêu:** bổ sung nhu cầu được chứng minh sau khi MVP ổn định.

**Chức năng ứng viên:** bảo hành/sửa chữa nhiều bước, gửi hãng, thu cũ đổi mới và định giá, công nợ NCC/tuổi nợ nâng cao, báo cáo sâu, in tem/camera, khuyến mãi, nhiều chi nhánh.

**Công việc kỹ thuật:** ghi yêu cầu riêng từng tính năng, đánh giá dữ liệu/quyền/chi phí, migration tương thích, kiểm thử hồi quy kho/tiền. Không gộp mọi ứng viên thành một đợt lớn. Nhiều chi nhánh cần mô hình locations/transfers và quyền riêng, không chỉ thêm bộ lọc store_id.

**Dữ liệu liên quan:** mở rộng bảng hậu mãi/chi phí hoặc thêm chứng từ chuyển kho/chính sách có yêu cầu thực tế; tránh EAV, workflow engine hay promotion engine tổng quát trước nhu cầu.

**Tiêu chí nghiệm thu:** mỗi yêu cầu có lợi ích và phạm vi được duyệt, không làm hỏng bất biến MVP. **Kiểm thử:** regression toàn bộ luồng kho/tiền liên quan, quyền mới và migration dữ liệu cũ. **Rủi ro:** tăng độ phức tạp làm chậm bán hàng, phá giá vốn/lịch sử. **Điều kiện hoàn thành:** nghiệm thu từng phần có người dùng thực; không thuộc cam kết triển khai MVP hiện tại.

## 11. Ước lượng và kiểm soát phạm vi

| Giai đoạn | Khoảng thời gian sơ bộ |
|---|---|
| 0 | 3–5 ngày làm việc |
| 1 | 1–2 tuần |
| 2 | 1–2 tuần |
| 3 | 2–3 tuần |
| 4 | 2–3 tuần |
| 4A | Thêm 3–5 tuần cho offline, sync và phục hồi local |
| 5 | 1–2 tuần |
| 6 | 1–2 tuần |

Ước lượng cũ 10–16 tuần chỉ dành cho phương án mất mạng lưu nháp đã bị thay thế. Với **một quầy bán/in offline**, ước lượng sửa đổi **13–21 tuần**, gồm thêm 3–5 tuần so với nền cũ. Điều kiện: một lập trình viên có kinh nghiệm toàn thời gian, một cửa hàng/kho, dữ liệu sạch tương đối, Supabase/hosting quản lý, chủ phản hồi đều và thử lưu/in thiết bị đạt. Khoảng chưa phải cam kết; chốt lại sau giai đoạn 0 và thử kỹ thuật offline. Chưa ước lượng giai đoạn 7.

Nếu giảm thời gian, ưu tiên cắt camera, ảnh, kiểu in phụ, bảng biểu nâng cao và tự động hóa; vẫn giữ transaction, quyền, công nợ tối thiểu, đổi trả cơ bản, đối soát và phục hồi. Không đưa mốc giao diện hoàn thiện lên thay cho tiêu chí dữ liệu.

## 12. Điều kiện cho phép bắt đầu

Hiện chỉ bàn giao bộ PLAN. Bước đầu tiên đề nghị người dùng duyệt là **giai đoạn 0**, chưa phải viết code. Mọi thay đổi phạm vi quan trọng phải cập nhật đồng thời requirements, flows, database, test và ước lượng trước khi triển khai.
