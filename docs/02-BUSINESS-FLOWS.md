# 02 — Luồng nghiệp vụ và quy tắc tính toán

Các công thức/quy trình dưới đây cần phê duyệt theo D01–D12. Đã xác nhận một cửa hàng, một kho và một máy quầy bán/in offline. Các mốc bảo hành/đổi trả đề xuất ở 01 mục 9 chưa có hiệu lực; hạn mức nợ, thuế và phí chưa chốt.

## 1. Trạng thái và thời gian

Chứng từ có `DRAFT → POSTED`; nháp có thể `CANCELLED`. Chứng từ POSTED không chỉnh nội dung hoặc xóa. Sửa sai bằng chứng từ trả/đảo/điều chỉnh có liên kết bản gốc; số tiền và lượng đã trả được tính từ chứng từ liên kết. Không dùng nút “hủy” để xóa tác động sổ. Đánh dấu “đã đảo” chỉ là thông tin suy ra hoặc cập nhật nguyên tử kèm chứng từ đảo.

Đơn vị hàng thuộc sở hữu cửa hàng: `AVAILABLE` bán online được, `OFFLINE_RESERVED` đã cấp riêng cho quầy, `QUARANTINE` chờ kiểm tra, `REPAIR` sửa chữa. Sau xuất bán là `SOLD`, sau trả NCC là `SUPPLIER_RETURNED`, sau hủy mất là `DISPOSED`. “Trả lại”, “lỗi”, “bảo hành” là sự kiện/lý do, không đủ mô tả quyền sở hữu/tồn khả dụng. Hàng khách gửi bảo hành không tự tăng tồn bán được.

Giỏ online không giữ hàng; hai người có thể chọn cùng máy trong nháp, chỉ người ghi sổ trước được xuất. Riêng hạn mức bán offline là quyền bán được cấp rõ khi còn mạng, độc lập với giỏ và đặt cọc: hàng đã cấp không thể bán online ở máy khác. Khách đặt cọc/giữ máy vẫn là nghiệp vụ bổ sung.

Server ghi `posted_at` và số thứ tự ghi sổ; thời gian người dùng nhập/ngày chứng từ được lưu riêng. Báo cáo kho, vốn, nợ theo thời điểm ghi sổ. Không nhập lùi để tính lại bình quân hoặc sửa kỳ đã khóa. Ghi nhận lỗi kỳ trước theo bút toán hiện tại có tham chiếu; chính sách ngoại lệ D02/D06 phải chốt.

## 2. Nhập hàng

1. Chọn nhà cung cấp; với máy mua từ khách, chọn đối tác có vai trò người bán. Không cần tạo bản NCC trùng với cùng khách hàng.
2. Chọn SKU và mode cố định. IMEI: nhập một máy mỗi đơn vị, IMEI 1/2, mới/cũ, tình trạng, giá nhập riêng. SERIAL: nhập Serial từng đơn vị. QUANTITY: nhập lượng nguyên và đơn giá.
3. Nhập giảm giá dòng, giảm giá phiếu, chi phí nhập đủ điều kiện tính vào vốn và số tiền đã trả. Kiểm tra chi phí trả cho ai; vận chuyển trả bên thứ ba không làm tăng nợ NCC hàng.
4. Xem tổng, định danh trùng, phân bổ vốn và số phải trả theo từng đối tác. Chốt trực tuyến bằng một yêu cầu có khóa idempotency.
5. Trong transaction: kiểm tra quyền, mode, số lượng, định danh và kỳ; khóa các số dư cần đổi; ghi phiếu và đơn vị, kho, vốn, công nợ, thanh toán được nhập kèm và audit; hoàn tất cùng lúc.
6. Sau xác nhận, in/xem phiếu. Mọi lỗi rollback toàn bộ. Có thể lưu nháp thiếu định danh nhưng không chốt khi chưa đủ.

Giá vốn nhập = giá mua sau giảm giá + chi phí mua được duyệt vốn hóa + thuế đầu vào không được khấu trừ nếu chính sách thuế yêu cầu. Không tự quyết định việc khấu trừ thuế. Chi phí nhập phân bổ đề xuất theo giá trị mua sau giảm giá, rồi phân xuống từng máy. Nếu tổng cơ sở phân bổ bằng 0, yêu cầu chủ chọn phân bổ thủ công có tổng khớp; không chia cho 0.

Chi phí vận chuyển/sửa ban đầu đã thanh toán hoặc còn nợ phải tạo chứng từ chi phí và đối ứng thu/chi/nợ đúng đối tác. Không vừa cộng vào nợ NCC hàng vừa ghi chi riêng trùng. Phần đơn giản MVP có thể yêu cầu chi phí bên thứ ba được thanh toán ngay; nhu cầu ghi nợ bên thứ ba cần chốt ở giai đoạn 0.

## 3. Bán chung điện thoại và phụ kiện

1. Tìm theo tên, SKU, barcode hoặc IMEI/Serial. Chọn máy/Serial có trạng thái AVAILABLE; phụ kiện lượng có tồn khả dụng.
2. Giỏ gồm dòng SKU, lượng/đơn vị cụ thể, đơn giá, giảm giá và chính sách bảo hành dự kiến. Nhiều máy cùng SKU nhưng giá bán khác được tách dòng; snapshot giá vốn vẫn theo từng máy.
3. Chọn khách nếu phát sinh nợ hoặc cần lịch sử/bảo hành có thông tin liên hệ. Khách lẻ không định danh chỉ được chốt khi trả đủ. Không bắt buộc số điện thoại để tạo một khách có tên/mã riêng, tránh nhập giả.
4. Nhập tiền mặt/chuyển khoản hoặc kết hợp. Chuyển khoản chỉ được đánh dấu nhận khi người có quyền kiểm tra; không suy từ việc đã mở QR. Tiền khách đưa và tiền thực nhận sau trả lại tiền thừa tách biệt.
5. Hiển thị tiền hàng, giảm giá, thuế theo chính sách được duyệt, tổng phải trả, thực thu và nợ còn lại. Nếu vượt ngưỡng giảm giá/nợ/bán dưới vốn, thực hiện cơ chế duyệt chủ theo D05; không cho nhân viên tự đổi quyền.
6. Với bán online, database khóa toàn bộ hàng liên quan theo thứ tự cố định, kiểm tra lại giá/quyền/tồn và tính tổng phía server; không tin số tổng hoặc vốn client gửi. Bán offline dùng luồng riêng tại mục 11, không gọi giả RPC thành công.
7. Ghi hóa đơn, dòng, đơn vị xuất và vốn snapshot, sổ kho, phải thu, các khoản nhận tiền, phân bổ, audit và kết quả idempotency trong một transaction.
8. Nhận kết quả thành công mới hiển thị số phiếu và cho in phiếu hoàn tất. Mất phản hồi: giữ nguyên khóa yêu cầu, tra lại kết quả trước khi gửi lại.

Đề xuất chưa cho xuất âm, bán máy cách ly hoặc bán chưa chọn định danh. Sai tồn do người khác vừa bán: từ chối cả giao dịch, chỉ rõ dòng cần thay, không tự thay bằng máy khác.

## 4. Giảm giá, giá vốn và lãi gộp

### 4.1. Giảm giá và làm tròn

Giảm giá dòng không vượt tiền dòng; giảm giá hóa đơn phân bổ tỷ lệ theo giá trị dòng sau giảm giá dòng. Tổng sau giảm không âm. Tỷ lệ chiết khấu là đầu vào tiện dụng; số tiền cuối cùng được server tính theo quy tắc làm tròn đã duyệt. Dùng phương pháp phần dư lớn nhất, thứ tự dòng cố định để phân bổ tiền VND và bảo đảm tổng các dòng đúng bằng tổng hóa đơn. Giỏ toàn dòng giá 0 chỉ được chốt theo chính sách hàng tặng được duyệt, không tự tạo vốn 0.

Hoàn trả dùng đúng doanh thu sau giảm giá, thuế và giá vốn đã phân bổ ở lần bán, không áp bảng giá hoặc bình quân hiện tại. Trả một phần chia phần phân bổ theo lượng; lần trả cuối nhận phần dư còn lại. Tổng hoàn/đảo vốn không vượt snapshot gốc. Các phụ phí trả hàng chỉ có khi D04 đã chốt, ghi riêng và có quyền duyệt.

### 4.2. Giá vốn đích danh

Máy/Serial giữ các thành phần vốn: giá mua thuần, chi phí nhập phân bổ, chi phí sửa đủ điều kiện vốn hóa trước bán và các điều chỉnh đã phê duyệt. Khi bán, lưu vốn chính xác từng đơn vị trên liên kết dòng bán–đơn vị, không lấy giá hiện tại trong danh mục.

Ví dụ máy cũ mua 4.000.000đ, sửa trước bán được duyệt vốn hóa 300.000đ, chi phí nhập 50.000đ: vốn 4.350.000đ. Bán sau giảm giá 5.000.000đ thì lãi gộp 650.000đ, dù khách mới trả 2.000.000đ và còn nợ 3.000.000đ. Ví dụ giả sử không có phần thuế cần tách; không dùng ví dụ để kết luận chính sách thuế thực tế.

Chi phí sửa sau khi máy đã bán không được sửa snapshot cũ. Tạo khoản bổ sung liên kết đơn vị/lần bán, phân loại điều chỉnh vốn đã bán hoặc chi phí bảo hành theo D06. Báo cáo giữ lãi gốc tại ngày bán và phần điều chỉnh tại ngày ghi nhận; có thể hiển thị lãi lũy kế sau điều chỉnh. Chi phí bị ghi nhầm phải đảo bằng bản ghi khác có lý do.

### 4.3. Bình quân liên hoàn cho QUANTITY — đề xuất

Gọi Q là tổng lượng thuộc sở hữu cửa hàng ở các trạng thái, V là tổng giá trị còn trong kho. Khi nhập q với giá trị vốn C: Q mới = Q + q, V mới = V + C; bình quân = V mới / Q mới. Khi bán q: xuất vốn q × bình quân ngay trước xuất, giảm V tương ứng; chỉ lượng AVAILABLE được xuất. Khóa cùng số dư SKU để giao dịch đồng thời không tính trên cùng V cũ.

Ví dụ: 10 cáp × 50.000đ, nhập 10 cáp × 70.000đ → Q=20, V=1.200.000đ, bình quân 60.000đ. Bán 3 cáp giá thuần 90.000đ/cáp → doanh thu 270.000đ, vốn 180.000đ, lãi gộp 90.000đ; kho Q=17, V=1.020.000đ. Sau đó nhập 3 cáp × 80.000đ → Q=20, V=1.260.000đ, bình quân 63.000đ. Khách trả 1 cáp từ lần bán đầu → tăng V đúng 60.000đ, Q=21, bình quân mới 1.320.000/21, không dùng 63.000đ làm vốn trả.

Chuyển AVAILABLE sang QUARANTINE không đổi tổng Q/V hoặc vốn bình quân. Vốn trung gian dùng decimal chính xác tới mức được thiết kế, không float. Khi xuất hết Q, xuất hết V còn lại để không để số dư lẻ; khi chia vốn trả từng phần, phần cuối nhận số dư. Quy tắc hạch toán/làm tròn VND cần kế toán xác nhận D02/D03.

### 4.4. Báo cáo

Doanh thu thuần = doanh thu bán sau chiết khấu, loại trừ phần thuế phải tách theo D03, trừ doanh thu trả lại. Giá vốn thuần = vốn xuất bán − vốn hoàn nhập tương ứng + điều chỉnh vốn đã bán thuộc phạm vi báo cáo. Lãi gộp = doanh thu thuần − giá vốn thuần. Hủy mất/hao hụt và chênh lệch trả NCC hiển thị riêng, không âm thầm gộp vào doanh thu.

Thực thu/thực chi theo ngày tiền đi/đến; nợ theo sổ đối tác; lợi nhuận không phải tiền trong két. Không gọi lãi gộp là lợi nhuận ròng khi chưa quản lý đầy đủ chi phí vận hành.

## 5. Công nợ và thanh toán

Đề xuất tách tài khoản phải thu `AR` và phải trả `AP` của cùng một đối tác; không tự bù trừ khi người đó vừa mua máy vừa bán máy cho cửa hàng.

| Sự kiện | AR khách hàng | AP nhà cung cấp |
|---|---:|---:|
| Bán hàng / nhập hàng | + Tổng phải thu | + Tổng phải trả |
| Khách trả tiền / cửa hàng trả NCC | − Số tiền thu | − Số tiền chi |
| Khách trả hàng / cửa hàng trả hàng nhập | − Giá trị giảm phải thu | − Giá trị giảm phải trả |
| Cửa hàng hoàn tiền khách / NCC hoàn tiền | + Số tiền chi hoàn | + Số tiền nhận hoàn |

Số dư dương là nợ còn phải thu/phải trả theo tài khoản. Số dư âm AR là tiền cửa hàng còn phải trả khách/khách ứng trước; số dư âm AP là tiền NCC còn phải trả cửa hàng/cửa hàng ứng trước. Báo cáo trình bày số dương và dư có/ứng trước riêng, không cộng gộp làm giảm tổng nợ cần quản lý.

Mỗi thanh toán có đối tác, tài khoản, chiều tiền, phương thức, thời điểm, số tiền và người lập. Phân bổ thanh toán tới một hoặc nhiều chứng từ cùng đối tác/cửa hàng/tài khoản; tổng phân bổ không vượt khoản thanh toán hoặc nợ chứng từ. Dư chưa phân bổ chỉ được lưu như ứng trước có chủ đích, không do làm tròn hoặc bỏ qua kiểm tra. Hoàn tiền gắn chứng từ trả/credit tương ứng, không dùng phân bổ nhận tiền như hoàn tiền.

Hai người thu cùng một khoản nợ phải khóa số dư/chứng từ trước kiểm tra. Không tạo thu trùng khi mất phản hồi. Sai thanh toán: lập chứng từ đảo khoản thu/chi và đảo phân bổ liên quan nguyên tử, sau đó tạo bản đúng; không sửa số tiền đã ghi sổ.

## 6. Trả hàng bán, hoàn tiền và đổi hàng

1. Tra hóa đơn; chọn dòng và đúng đơn vị đã bán, hoặc lượng phụ kiện chưa trả. Xác thực nhân viên được quyền, lý do và chính sách.
2. Kiểm tra tổng đã trả qua các lần, điều kiện hàng, khấu trừ/phí nếu đã có chính sách; tiền hoàn không được lấy giá mới.
3. Hàng nhận lại thường vào QUARANTINE để kiểm tra; không cho tăng tồn khả dụng trước kiểm tra. Định danh giữ nguyên; vốn hoàn nhập theo lần bán gốc.
4. Ghi giảm doanh thu và AR theo giá trị trả. Nếu hóa đơn còn nợ, phân bổ credit trả hàng để giảm nợ trước trong phạm vi chứng từ được chọn. Nếu đã thanh toán, tạo credit còn phải hoàn hoặc thực chi hoàn trong cùng transaction.
5. Khóa lần bán/đơn vị, số dư và phần trả tích lũy. Không cho dùng lại cùng máy đã được trả, hoặc hoàn tiền quá credit còn lại sau các lần hoàn trước.
6. Kiểm tra xong, có thể chuyển cách ly → bán được bằng thao tác có quyền và audit; nếu hỏng chuyển sửa/đề xuất hủy.

Ví dụ hóa đơn 10.000.000đ, đã thu 6.000.000đ, còn nợ 4.000.000đ: trả 3.000.000đ thì còn nợ 1.000.000đ, chưa phát sinh chi hoàn. Trả 5.000.000đ thì giảm hết nợ 4.000.000đ và còn credit 1.000.000đ; chi hoàn 1.000.000đ đưa AR về 0. Không tự hoàn 5.000.000đ vì sẽ làm sai nghĩa vụ.

Đổi hàng = chứng từ trả liên kết + hóa đơn bán mới + thu/hoàn chênh lệch. Đề xuất thao tác đổi trực tiếp tại quầy chốt toàn bộ trong một transaction để hết máy mới không để nửa nghiệp vụ. Trả độc lập trước rồi bán sau vẫn được phép nếu người dùng chọn rõ và xem trạng thái credit. Đổi bảo hành miễn phí cần chính sách riêng về quyền sở hữu, chi phí và liên kết; trước khi chốt chính sách, chỉ tiếp nhận hồ sơ, không tự xuất máy thay thế.

## 7. Trả hàng nhập và sửa phiếu nhập

Nháp sửa trực tiếp. Phiếu nhập đã ghi sổ chỉ sửa thông tin phi tài chính được phép hoặc lập chứng từ điều chỉnh/trả, không xóa phiếu để làm lại. IMEI/Serial trả NCC phải còn thuộc sở hữu cửa hàng và đúng nguồn nhập; không trả máy đã bán hoặc đang xử lý mâu thuẫn.

QUANTITY không theo lô nên giá trị giảm kho dùng bình quân hiện tại; số credit NCC dùng giá/điều kiện trả được duyệt và tham chiếu phiếu gốc. Chênh lệch là khoản chênh lệch trả nhập, được hiển thị riêng. Không đảo nguyên giá mua lịch sử vào kho nếu đã phát sinh nhiều lần bán khiến V âm. Ví dụ bình quân hiện tại 60.000đ, trả 2 cáp được NCC chấp nhận 100.000đ: giảm kho 120.000đ, giảm AP 100.000đ, chênh lệch bất lợi 20.000đ ghi riêng. Cách phân loại kế toán cuối cùng thuộc D02/D03.

Không trả quá lượng nhập trừ các lần trả trước; không vượt tồn có thể xuất. NCC hoàn tiền ghi khoản tiền nhận riêng, tránh vừa giảm nợ vừa cộng thêm doanh thu.

## 8. Kiểm kê và số dư đầu kỳ

Số dư đầu kỳ nhập bằng chứng từ riêng có ngày chuyển hệ thống, danh sách đơn vị, lượng/vốn phụ kiện, AR/AP và chứng từ còn nợ. Không coi tồn đầu kỳ là mua hàng trong doanh thu/dòng tiền kỳ hiện tại. Người chủ ký đối soát trước mở bán; hoàn tất rồi khóa quyền nhập đầu kỳ để tránh nhân đôi. Mã nhập đầu kỳ có idempotency và đối chiếu dữ liệu cũ nếu có.

MVP kiểm kê trong khoảng tạm dừng ghi sổ kho: **dừng quầy offline, đồng bộ/đối soát mọi phiếu và đóng/release grant trước chụp sổ**. Khóa cloud không thể tự dừng máy đang mất mạng nên thiếu xác nhận quầy thì chưa mở kiểm kê/chốt kỳ. Sau đó chụp số thứ tự sổ, đếm, đối chiếu, chủ duyệt; server kiểm phiên bản trước điều chỉnh. Sổ thay đổi phải đối chiếu lại, không ghi đè số đếm cũ. Đọc dữ liệu vẫn được.

Thiếu hàng: giảm tồn và ghi hao hụt riêng. Thừa hàng: phải có căn cứ giá vốn và định danh hợp lệ; không tự nhập giá 0. Không “tạo lại” máy đã bán khi quét thấy, phải tìm nguyên nhân sở hữu trước. Mỗi điều chỉnh có người đếm, người duyệt, lý do và giá trị. Thay đổi trạng thái kho cũng phải qua nghiệp vụ có audit.

## 9. Bảo hành và thu mua máy cũ

Tại lần bán lưu snapshot nội dung/thời hạn bảo hành đã duyệt. Ngày bắt đầu/kết thúc theo D04, không dùng ngày nhập. Bán offline lưu ngày bán thực tế để đối soát; không tự lấy ngày sync làm ngày bán hoặc rút ngắn quyền lợi vì lệch đồng hồ. Ngày nghi ngờ cần chủ xác nhận trước cấp chính sách chính thức. Hàng lượng bảo hành theo dòng hóa đơn, không tự tạo Serial.

Khi tiếp nhận: tra lần bán, ghi mô tả lỗi, phụ kiện kèm, tình trạng tiếp nhận, liên hệ và người xử lý. Phân biệt tài sản khách gửi với tồn sở hữu cửa hàng. Kết quả cơ bản: tiếp nhận → đang xử lý → hoàn tất/không tiếp tục, có ghi chú và chi phí. Bán lại máy từng trả có lần bảo hành mới, không mất hồ sơ lần bán cũ.

Thu mua tối thiểu trong MVP dùng phiếu nhập nguồn khách bán: tình trạng, định danh, giá mua, khoản trả/nợ và ghi chú. Quy trình định giá, chứng từ chủ sở hữu và dữ liệu nhạy cảm cần D07. Thu cũ đổi mới, sửa chữa nhiều bước và gửi hãng là giai đoạn nâng cao; không tự bù nợ AR/AP trong MVP.

## 10. Sự cố và kết quả người dùng thấy

| Tình huống | Xử lý |
|---|---|
| Mất mạng khi đang nhập giỏ | Máy quầy đã chuẩn bị chuyển sang bán offline nếu đủ quyền/hạn mức; máy khác chỉ nháp. Không chuyển request online chưa rõ kết quả thành giao dịch offline mới |
| Gửi chốt rồi timeout | Hiển thị đang xác minh; tra kết quả bằng đúng khóa; không tạo khóa mới tự động |
| Chốt xong nhưng in lỗi | Chứng từ vẫn thành công; in lại cùng số, không chốt lại |
| Nháp cũ, giá/tồn/quyền thay đổi | Server kiểm tra lại; thông báo thay đổi và yêu cầu xem lại trước chốt |
| Hai người cùng máy/Serial hoặc cáp cuối | Một giao dịch thành công; giao dịch còn lại nhận lỗi tồn, không có sổ nợ/tiền mồ côi |
| Lỗi ghi một bước trong transaction | Rollback mọi thành phần, giữ nháp và mã lỗi tra cứu |
| Sai máy đã xuất | Quy trình trả/đổi/điều chỉnh có căn cứ, không sửa trực tiếp IMEI trên hóa đơn |

Liên kết: [database](03-DATABASE-DESIGN.md), [test và số liệu kỳ vọng](07-TEST-PLAN.md).

## 11. Bán và in khi mất Internet trên một máy quầy

### 11.1. Chuẩn bị khi còn mạng

Người dùng đã xác nhận một máy quầy offline. Đề xuất chủ đăng ký đúng máy/hồ sơ trình duyệt, mở phiên được phép bán offline và cấp hàng bằng transaction: IMEI/Serial cấp theo unit_id; hàng lượng cấp q cụ thể. Quyền gắn store, terminal, user/ca, grant_id, chính sách/giá và phiên bản. Phiên chỉ được khởi tạo/gia hạn khi online; máy chưa chuẩn bị, chế độ ẩn danh hoặc thiếu dữ liệu cục bộ không được tự chuyển sang bán offline.

Server chuyển hàng sang **OFFLINE_RESERVED**/bucket lượng cấp riêng. Đây vẫn là một kho vật lý; chỉ khác quyền bán. Tổng tài sản chưa thay đổi, nhưng phần này bị trừ khỏi tồn bán được trên thiết bị khác. Máy quầy dùng phần đã cấp kể cả khi đang có mạng để tránh có hai sổ hạn mức độc lập; chỉ nhận ack sau khi sync mới đánh dấu đã tiêu thụ phía server.

Không trả NCC/điều chỉnh mất hàng/đổi định danh hoặc thêm chi phí vốn hóa vào unit đã cấp khi chưa đối soát quyền đó. Muốn làm phải dừng bán unit, sync và thu hồi hợp lệ trước. Hàng lượng vẫn cùng một pool bình quân; nhập/bán online phần khác có thể làm bình quân server thay đổi trước lúc sync, theo chính sách giá vốn đã nêu.

Đề xuất không hết hạn rồi tự mở lại hàng đã cấp: khi máy quầy mất mạng, server không biết hàng đã được giao khách hay chưa. Thu hồi phải dừng bán trên quầy, tải hết phiếu, đối soát chuỗi số và kiểm hàng còn lại; sau đó mới trả quyền bán. Không cấp lại cùng IMEI hoặc quota cho thiết bị khác chỉ vì terminal không phản hồi.

### 11.2. Thực hiện giao dịch tại quầy

1. Mở ca đã cấp, kiểm tra kho dữ liệu/phiên bản/quyền còn dùng được và trạng thái chưa có request online chưa rõ kết quả. Hiển thị dữ liệu cập nhật lần cuối và phần hàng offline còn bán.
2. Chọn hàng trong quota. Đề xuất chỉ giá/chính sách đã cấp, tiền mặt đủ; không nợ, không xác nhận CK đã nhận, không nhập/trả/đổi/kiểm kê offline trong MVP. Ngoại lệ cần mạng để chủ duyệt.
3. Tạo UUID giao dịch, số phiếu riêng theo terminal+ca+sequence và request_id cố định. Trong **một transaction IndexedDB**, ghi payload bất biến, hash, quyền nguồn, số tiền mặt thực nhận, giảm quota cục bộ và tăng sequence. Chờ transaction hoàn tất mới cho giao hàng/in. Hai tab dùng chung cơ chế khóa và quota, không mỗi tab một bản tồn.
4. In bằng mẫu và tài nguyên đã có trên máy. Phiếu có mã duy nhất, thời gian bán cục bộ, hàng/định danh, tổng/tiền nhận và dòng **“Đã ghi nhận tại quầy — chưa đồng bộ hệ thống”**. Không in số hóa đơn thuế giả hoặc lời khẳng định database đã ghi sổ. In lỗi thì in lại cùng phiếu, không thu tiền/bán lần hai.
5. Phiếu cục bộ sau ghi nhận không sửa/xóa trực tiếp. Sai sót hoặc muốn hủy trước/ sau giao hàng phải lưu yêu cầu xử lý, đối soát khi online; không giải phóng quota đã dùng bằng xóa bản ghi.

Trạng thái local: `RECORDED_LOCAL → SYNC_PENDING → POSTED` hoặc `NEEDS_REVIEW`. Đây không phải trạng thái POSTED của chứng từ trung tâm. Thời gian/sequence máy hỗ trợ đối soát, không dùng đồng hồ thiết bị làm bằng chứng tin cậy về hạn quyền hoặc thứ tự toàn cửa hàng.

### 11.3. Đồng bộ và ghi sổ trung tâm

Đồng bộ có thứ tự theo sequence, một tác vụ tại một thời điểm, khi có mạng và phiên server hợp lệ; có thể tự gửi **các phiếu đã ghi nhận**, không tự chốt giỏ còn nháp. Mỗi phiếu là một transaction RPC riêng có idempotency; batch không yêu cầu tất cả phiếu cùng thành công. Mất phản hồi phải tra lại chính request_id, không cấp số mới.

Server kiểm grant, terminal, payload/giá/chính sách đã cấp, số chưa tiêu thụ, unit và tổng lượng; giữ snapshot giá/tiền hợp lệ lúc giao dịch thay vì tự đổi theo bảng giá mới. Sau đó ghi sales, cogs, movement từ bucket offline, ledger, cash payment, audit và ack trong cùng transaction. Nếu một phiếu có lỗi không tự bỏ qua để tiếp tục làm mất thứ tự: dừng chuỗi tại lỗi, báo chủ xử lý và giữ dữ liệu nguyên vẹn.

Giá vốn và báo cáo đề xuất theo **thứ tự server ghi sổ**, không tính lại lịch sử bình quân dựa vào thời gian máy. Lưu `occurred_at_local`, `received_at`, `posted_at` riêng. Ví dụ bán offline trước nửa đêm, sync ngày sau: tiền thực đã nhận lúc bán nhưng chỉ xuất hiện ở sổ trung tâm ngày ghi nhận; màn đối soát hiển thị cả thời gian bán và thời gian nhận, có tổng tiền phiếu local chưa sync để đóng ca không bỏ sót. Nếu cần báo cáo kế toán theo đúng thời điểm phát sinh thực tế hoặc sync qua kỳ khóa, chủ/kế toán phải duyệt quy tắc trước triển khai, không âm thầm hồi tố.

### 11.4. Lỗi, quyền và đối soát cuối ca

Không mất dấu hàng/tiền thực vì API trả lỗi. Phiếu sai grant, user đã bị khóa, quá kỳ hoặc dữ liệu nghi ngờ vào NEEDS_REVIEW; chủ tiếp nhận bằng luồng phục hồi có quyền, giữ actor gốc và người phê duyệt, kiểm tiền/hàng thực rồi tạo chứng từ/điều chỉnh hợp lệ có tham chiếu. Không tự sửa giá, bỏ phiếu, chi hoàn hoặc mở lại quota.

Thu hồi user online không thể ngay lập tức tới máy đang offline. Đề xuất giới hạn ca/thời gian cho phép và số hàng cấp, không cho đăng nhập user mới offline. Khi có tín hiệu thu hồi, dừng giao dịch mới và chuyển phần đã ghi nhận sang đối soát có chủ. Máy không đáng tin cậy/đồng hồ đổi hoặc bản sao dữ liệu trình duyệt không được coi là một máy quầy thứ hai hợp lệ.

Trước logout, đổi tài khoản, cập nhật schema, thu hồi thiết bị hoặc xóa dữ liệu, phải xử lý phiếu chưa ack; không tự clear outbox như nháp thông thường. Mất/hỏng máy khi còn phiếu cần bản sao cục bộ có kiểm soát/phiếu in và kiểm hàng/tiền để phục dựng; backup cloud không chứa phiếu chưa sync. Nếu không thể lưu bền hoặc hết dung lượng, dừng bán trước khi nhận tiền/giao hàng/in và dùng quy trình dự phòng thủ công được chủ duyệt.

Nếu lỗi lưu xảy ra sau khi nhân viên thực tế đã nhận tiền, không thể coi rollback phần mềm là đã hoàn tác tiền mặt: lập biên nhận/sổ sự cố có mã tham chiếu và chủ kiểm tra tiền/hàng, hoặc hoàn tiền có chứng cứ. Không tự thu lại tiền vì local không có phiếu. Khả năng lỗi nguồn điện/ổ đĩa ngay sau local commit vẫn là rủi ro cần bản sao và diễn tập, không hứa atomic giữa phần mềm với giao tiền/giao hàng vật lý.

Đóng ca: đếm tiền thực, tổng phiếu đã POSTED, phiếu chưa sync, tiền thừa và ngoại lệ; kiểm đủ sequence/không trùng UUID, hàng còn trong quota. Chỉ release grant sau ack và đối soát, kể cả khi đã hết thời hạn ca. Trường hợp mất máy cần khóa thiết bị, ngừng sử dụng bản cũ và kiểm vật lý trước cấp lại; không hứa chống bán trùng vật lý tuyệt đối nếu thiết bị cũ vẫn được người dùng tiếp tục bán ngoài quy trình.
