# 01 — Yêu cầu và phạm vi

Ngày 24/10/2026 · PLAN đề xuất, chưa phải cấu hình nghiệp vụ được phê duyệt.

Quyết định công nghệ đã được người dùng xác nhận: **dùng Supabase PostgreSQL làm database trung tâm**. Chưa chốt gói dịch vụ/vùng dữ liệu và chưa tạo hoặc kết nối database; lựa chọn này không phải phê duyệt bắt đầu code.

## 1. Mục tiêu và nguyên tắc

Ứng dụng tiếng Việt cho cửa hàng điện thoại mới/cũ và phụ kiện, ưu tiên thao tác bán nhanh, số liệu đúng và chi phí vận hành thấp. Một danh mục thống nhất cho hàng hiện tại và nhóm hàng bổ sung; khác biệt nằm ở cách theo dõi tồn kho. Không xây ERP, kế toán tổng hợp, quản lý nhân sự, thương mại điện tử hay đồng bộ nhiều kênh trong MVP.

Thư mục dự án ban đầu trống. Chưa có hệ thống cần tích hợp hoặc migration dữ liệu được cung cấp. Người dùng đã xác nhận **một cửa hàng/một kho và một máy quầy bán, in phiếu khi mất Internet**. Tiền VND và số lượng nguyên vẫn là đề xuất. Người dùng chưa có chính sách giá vốn/đổi trả/bảo hành/thuế và yêu cầu đề xuất để duyệt.

## 2. Vai trò đề xuất

| Vai trò | Quyền theo công việc | Hạn chế |
|---|---|---|
| Chủ cửa hàng | Cấu hình, sản phẩm, nhập/bán, trả hàng, điều chỉnh, thu/chi, nợ, giá vốn/lãi, người dùng và audit | Các sửa sai đã ghi sổ phải có chứng từ bổ sung/đảo, không xóa lịch sử |
| Nhân viên bán hàng | Tìm tồn được bán, lập/bán hóa đơn, nhận tiền, tra khách và chứng từ trong phạm vi cấp | Không xem giá vốn/lợi nhuận, điều chỉnh tồn, cấp quyền hoặc tự duyệt ngoại lệ |
| Nhân viên kho (tùy nhu cầu MVP) | Danh mục, nhập nháp, kiểm đếm, tra định danh | Quyền chốt nhập/kiểm kê tùy chủ cấp, không mặc nhiên xem toàn bộ giá vốn |

MVP có thể chỉ dùng hai vai trò đầu. Quyền kiểm tra tại server/database. Không chỉ ẩn nút hoặc ẩn cột trên màn hình. Ma trận cuối cùng và ngưỡng duyệt giảm giá/bán dưới vốn theo D05/D11.

## 3. Yêu cầu chức năng và thời điểm cung cấp

| Mã | Nghiệp vụ | MVP cần có | Sau MVP |
|---|---|---|---|
| FR01 | Đăng nhập/phân quyền | Auth, thành viên cửa hàng, chủ/nhân viên, thu hồi quyền | Vai trò tùy chỉnh nếu có nhu cầu |
| FR02 | Danh mục | Nhóm, hãng, mẫu, biến thể, SKU, barcode, giá tham khảo, lưu trữ ngừng bán; ảnh tùy chọn | Import hàng loạt phức tạp, nhiều bảng giá |
| FR03 | Theo dõi tồn | Ba mode IMEI/QUANTITY/SERIAL, lịch sử đơn vị, trạng thái bán được/cách ly/sửa | Nhiều kho và luân chuyển chi nhánh |
| FR04 | Nhập hàng | Nhiều mode cùng phiếu, định danh, giá thực, giảm giá/chi phí nhập, nguồn NCC hoặc khách bán máy cũ | Chấm điểm máy, quy trình định giá thu mua chuyên sâu |
| FR05 | Bán hàng | Giỏ hỗn hợp, chọn đúng máy/Serial, số lượng, giảm giá, chia phương thức trả, nợ | Khuyến mãi theo quy tắc, đặt cọc/giữ hàng có thời hạn |
| FR06 | Kho | Sổ nhập/xuất, tồn khả dụng/cách ly, kiểm kê và điều chỉnh có lý do, cảnh báo thấp | Quản lý vị trí kệ chi tiết |
| FR07 | Công nợ | Phải thu và phải trả tối thiểu, thu/chi từng lần, phân bổ chứng từ, dư có/ứng trước tách riêng | Tuổi nợ, nhắc nợ, đối soát tự động |
| FR08 | Lãi gộp | Doanh thu thuần, vốn đích danh/bình quân, chi phí máy, giảm giá/trả hàng, tách dòng tiền | Lợi nhuận ròng và phân bổ chi phí vận hành |
| FR09 | Đổi trả | Trả một phần/toàn bộ, tiền hoàn, trả nhập, đổi bằng cặp trả+bán, chống trả trùng | Quy trình nhiều cấp và tự động hóa |
| FR10 | Bảo hành | Snapshot chính sách từng dòng/đơn vị, tra hóa đơn/IMEI/Serial, ghi tiếp nhận và kết quả cơ bản | Sửa chữa, linh kiện, lịch hẹn, gửi hãng nhiều bước |
| FR11 | Đối tác | Khách/NCC, người vừa mua vừa bán, lịch sử hóa đơn/thiết bị/nợ | CRM/loyalty |
| FR12 | Dashboard/báo cáo | Ngày/tháng/khoảng ngày, doanh thu, lãi gộp, tồn và nợ, hàng sắp hết, bán chạy | Báo cáo chuyên sâu, phân tích nhiều chi nhánh |
| FR13 | Chứng từ/lịch sử | In trình duyệt/PDF phiếu bán, mã chứng từ, audit và tra nhanh | Tem, máy in chuyên dụng, hóa đơn điện tử sau khảo sát |
| FR14 | PWA/mạng | Bán/in offline trên một máy quầy đã chuẩn bị, cấp trước tồn riêng, lưu giao dịch cục bộ, đồng bộ một lần, xử lý lệch và phục hồi | Nhiều thiết bị bán offline độc lập, máy chủ LAN hoặc đồng bộ mọi nghiệp vụ |

Các phần được thêm vào nền MVP so với danh sách tối thiểu trong yêu cầu gốc: trả nhập, trả bán/hoàn tiền, công nợ NCC tối thiểu, kiểm kê/điều chỉnh, nhập đầu kỳ và chi phí máy. Chúng cần có để sửa sai và đối soát dữ liệu vận hành; không kéo theo giao diện nâng cao của từng phân hệ.

## 4. Quy tắc theo dõi hàng

| Thuộc tính | IMEI | QUANTITY | SERIAL |
|---|---|---|---|
| Đơn vị quản lý | Một điện thoại cụ thể | SKU/biến thể và số lượng | Một đơn vị phụ kiện cụ thể |
| Định danh | IMEI 1 bắt buộc, IMEI 2 nếu có | Không yêu cầu định danh đơn vị | Serial bắt buộc, không dùng trường IMEI |
| Nhập/bán | Chọn đủ từng máy; số máy = số lượng | Số nguyên dương không vượt tồn khả dụng | Chọn đủ từng Serial; số đơn vị = số lượng |
| Giá vốn | Đích danh mỗi máy | Đề xuất bình quân liên hoàn | Đích danh mỗi đơn vị |
| Tình trạng | Mới/cũ, ngoại hình, pin/ghi chú khi cần | Mới/cũ tách SKU nếu cần bán riêng | Tình trạng theo đơn vị nếu cần |
| Bảo hành | Theo thiết bị và lần bán | Theo dòng hóa đơn và lượng bán | Theo đơn vị và lần bán |

`tracking_mode` thuộc biến thể, không suy luận từ tên danh mục lúc bán. Điện thoại phải dùng IMEI. Một khi phát sinh sổ kho, không đổi mode hoặc chuyển đơn vị sang SKU khác bằng sửa trực tiếp. Nếu phân loại sai phải lập điều chỉnh có phê duyệt hoặc tạo SKU mới theo quy trình chuyển đổi được duyệt.

IMEI/Serial là chuỗi, giữ số 0 đầu; IMEI 1/2 kiểm tra trùng chéo vị trí. Một máy trả về vẫn giữ UUID và định danh cũ; lần bán sau có lịch sử và chính sách bảo hành mới. Giá nhập tham khảo trong danh mục không được thay thế giá vốn giao dịch.

## 5. Bất biến nghiệp vụ

| Mã | Điều kiện không được vi phạm |
|---|---|
| INV01 | Tồn khả dụng không âm; máy/Serial chỉ thuộc một lần bán chưa trả tại cùng thời điểm; hàng cấp offline không bán được trên thiết bị khác |
| INV02 | Chứng từ ghi sổ, kho, công nợ, thanh toán, vốn và audit cùng thành công hoặc cùng thất bại |
| INV03 | Cùng khóa yêu cầu và cùng nội dung chỉ tạo một kết quả; cùng khóa nhưng khác nội dung bị từ chối |
| INV04 | Không sửa/xóa nội dung chứng từ đã ghi sổ, sổ kho, sổ nợ, vốn tại lần bán hoặc lịch sử thanh toán |
| INV05 | Không trả quá phần còn được trả; hàng trả cách ly không được bán trước khi được kiểm tra |
| INV06 | Mọi dữ liệu của cửa hàng và quyền xem giá vốn được kiểm tra phía server |
| INV07 | Offline chỉ ghi nhận bán cục bộ trong hạn mức đã cấp và in phiếu chưa đồng bộ; không tự coi database trung tâm đã POSTED. Timeout không tạo lại phiếu/thu tiền |
| INV08 | Tổng giảm giá/chi phí phân bổ bằng tổng chứng từ, không mất tiền do làm tròn |
| INV09 | Số dư công nợ có thể đối chiếu tới từng chứng từ và từng lần thu/chi; không tự bù trừ AR với AP |
| INV10 | Lãi không được suy ra từ tiền thu; tiền vay, trả nợ, nhập hàng và hoàn tiền có ý nghĩa riêng |

## 6. Yêu cầu phi chức năng đề xuất để nghiệm thu

- Giao diện mobile tại 360 px, tablet và PC; nút đủ lớn, thao tác bằng bàn phím ở POS, nhãn tiếng Việt rõ ràng. Phương án chi tiết trong 04.
- Mục tiêu khi kiểm thử: dữ liệu 10.000 SKU, 50.000 đơn vị có định danh, 100.000 chứng từ, 5 nhân viên đồng thời; chủ cửa hàng xác nhận lại dung lượng thực tế. Đây là dữ liệu benchmark, không phải dự báo.
- Với mạng kiểm thử đã ghi lại: tìm kiếm p95 ≤ 1 giây; chốt bán p95 ≤ 2 giây cho giỏ ≤ 20 dòng/50 đơn vị sau khi gửi; tải màn bán lần đầu ≤ 3 giây trên thiết bị và mạng đại diện. Đo riêng độ trễ mạng, không hứa mọi mạng đều đạt.
- Kết quả tiền VND, lưu giá vốn trung gian chính xác; ngày nghiệp vụ theo Asia/Ho_Chi_Minh, timestamp UTC. Báo cáo dùng khoảng đầu ngày đến trước đầu ngày tiếp theo, không ghép thời gian 23:59:59.
- Có thông báo lỗi có thể hành động; phân biệt “Đã lưu trên máy — chưa đồng bộ” với “Đã ghi sổ trung tâm”; không in trước khi lưu cục bộ hoàn tất. Lỗi không làm mất nháp hoặc phiếu đang chờ.
- Có sao lưu, diễn tập khôi phục, nhật ký và đối soát tự động/tác vụ kiểm tra theo 05/07. Mục tiêu RPO/RTO phải được duyệt trước chạy thật.

## 7. Ngoài phạm vi và đầu vào còn thiếu

Không xây kế toán tổng hợp/ERP, bảng lương, bán hàng đa kênh, chương trình khách hàng thân thiết, nhiều thiết bị offline độc lập hoặc nhiều chi nhánh trong MVP. Offline chỉ phục vụ bán/in trên một máy quầy, với hàng đã cấp trước. Không tích hợp hóa đơn điện tử trước khi xác định yêu cầu kế toán và nhà cung cấp.

Chưa có danh mục thực, mẫu phiếu, số dư đầu kỳ, danh sách người dùng, mẫu máy in, ngân sách và chính sách thuế/đổi trả/bảo hành. Danh sách D01–D12 trong [PLAN](../PLAN.md) là sổ quyết định; tất cả phần liên quan phải được duyệt trước triển khai phụ thuộc. Không dùng mặc định của phần mềm để thay cho xác nhận chính sách.

## 8. Hoàn thành yêu cầu MVP

Tất cả FR phần MVP có ca nghiệm thu và người chịu trách nhiệm; INV01–INV10 được kiểm tra với cả yêu cầu song song và gọi API trực tiếp; số dư đầu kỳ, kho, nợ và lãi đối soát khớp; người dùng hoàn thành một ngày bán hàng thử; phục hồi sao lưu thành công. Chỉ phê duyệt đưa vào dùng khi đạt cổng giai đoạn 6 của 06.

## 9. Chính sách đề xuất để chủ duyệt

Các lựa chọn sau là phương án khởi đầu theo yêu cầu mới của người dùng; chưa có hiệu lực. Mốc thời gian không được tự đưa lên phiếu khách trước phê duyệt và rà điều kiện cung ứng/nghĩa vụ áp dụng.

| Nội dung | Đề xuất | Điểm cần duyệt |
|---|---|---|
| Giá vốn | IMEI/Serial đích danh; hàng lượng bình quân liên hoàn; chi phí nhập theo giá trị mua sau giảm giá | Người phụ trách kế toán xác nhận công thức, làm tròn và thuế đầu vào |
| Giá vốn offline | Không in vốn/lãi. Khi đồng bộ, server tính vốn theo thứ tự ghi sổ; giá và tiền đã giao dịch giữ theo snapshot cấp quyền hợp lệ | Chấp nhận ngày ghi sổ có thể khác ngày bán cục bộ; nếu cần vốn theo đúng thời điểm thực bán, phải thiết kế lại và ước lượng riêng |
| Đổi do lỗi kỹ thuật | Đề xuất cửa sổ hỗ trợ đổi nhanh 7 ngày cho lỗi được kiểm tra; không thu phí với trường hợp thuộc chính sách lỗi đã duyệt | Khả năng NCC, phạm vi lỗi và chứng cứ; không dùng mốc 7 ngày để loại quyền bảo hành/khiếu nại khác |
| Trả do đổi nhu cầu | Chủ duyệt từng trường hợp trong MVP, chưa tự tính phí/khấu hao | Điều kiện hàng, phí nếu có phải công khai và được duyệt trước |
| Bảo hành điện thoại mới | Ghi đúng chính sách hãng/NCC của từng hàng, không mặc định mọi máy cùng thời hạn | Nguồn chính sách và bên tiếp nhận trách nhiệm |
| Bảo hành máy cũ | Đề xuất 90 ngày với phạm vi và tình trạng công khai theo máy; không tự đặt loại trừ pin/màn hình | Chủ chốt phạm vi, năng lực sửa và chi phí trước áp dụng |
| Phụ kiện | Đề xuất 30 ngày hỗ trợ lỗi cho hàng lượng; hàng Serial theo chính sách NCC được ghi rõ | Từng nhóm hàng có thể khác; không suy Serial đồng nghĩa thời hạn cố định |
| Tiền và nợ offline | Bán tiền mặt trả đủ, hàng trong hạn mức cấp; không bán nợ/ghi nhận CK đã nhận khi chưa kiểm chứng | Chủ duyệt; muốn mở rộng phải bổ sung kiểm soát nợ/xác minh tiền |
| Giảm giá và dưới vốn | Nhân viên theo giá và quyền đã cấp; ngoại lệ cần chủ duyệt online; offline chưa cho giảm ngoài bảng giá đã cấp | Ngưỡng tiền/tỷ lệ và vai trò |
| Thuế/hóa đơn điện tử | Chưa chọn thuế suất/cách tính khi chưa biết tư cách kinh doanh, phương pháp thuế và nghĩa vụ hóa đơn | Cung cấp thông tin cho người phụ trách kế toán; tách phiếu bán khỏi chứng từ thuế, không tự mặc định VAT=0 |

Phần bảo hành cần lưu ngày tiếp nhận/trả, thời gian xử lý và các lần đổi để thực hiện đúng chính sách đã chốt. Điều 30 của Luật Bảo vệ quyền lợi người tiêu dùng là nguồn cần đối chiếu khi hoàn thiện điều kiện bảo hành; các thời hạn 7/90/30 ngày ở trên là **đề xuất thương mại**, không phải trích thời hạn luật định. Nguồn chính thức đã tra ngày 24/10/2026: [CSDL quốc gia về văn bản pháp luật — Luật 19/2023/QH15](https://vbpl.moj.gov.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=161263). Kiểm tra văn bản hiện hành và trường hợp áp dụng trước ban hành chính sách; PLAN không kết luận nghĩa vụ thuế hay chứng nhận chính sách đã hợp pháp.
