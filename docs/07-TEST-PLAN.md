# 07 — Kế hoạch kiểm thử và nghiệm thu

Đây là danh sách kiểm thử **sẽ thực hiện khi triển khai**, chưa có ứng dụng/database nên chưa chạy test runtime. Việc rà tài liệu PLAN không được báo thành test sản phẩm đã đạt.

## 1. Chiến lược và tiêu chuẩn

Ưu tiên kiểm thử database tích hợp cho nghiệp vụ tiền/kho, quyền và transaction. Unit test dùng cho công thức phân bổ/làm tròn hoặc parser định danh có nhánh khó; không chỉ test lại chính implementation. E2E chọn các hành trình bán/nhập/trả/nợ chính; UAT xác nhận người dùng thực thao tác được. Không cần phủ E2E mọi nút hoặc snapshot mọi trang.

Mức ưu tiên: **Critical** = sai/mất tiền, sai kho, ghi trùng hoặc lộ dữ liệu; **High** = không hoàn thành luồng chính hoặc không phục hồi; **Normal** = hiển thị/tiện ích không ảnh hưởng sổ. Critical và High phải đạt trước go-live. Tất cả test dưới đây là Critical trừ khi được ghi khác.

Mỗi lần chạy lưu phiên bản ứng dụng/migration, người chạy, dữ liệu đầu vào, thời điểm, request_id, kết quả mong đợi/thực tế và bằng chứng truy vấn theo quyền. Test không dùng khóa service-role thay cho phiên nhân viên khi kiểm tra RLS. Tách database/môi trường thử, không phá dữ liệu production.

## 2. Bộ dữ liệu chuẩn

| Dữ liệu | Nội dung |
|---|---|
| Người dùng | Chủ, nhân viên bán, người bị thu hồi quyền, người không thuộc cửa hàng; thêm cửa hàng B chỉ để kiểm tra cách ly dữ liệu |
| Máy A | IMEI1 `490154203237518`, IMEI2 `356938035643809`, mới, vốn ví dụ 10.000.000đ |
| Máy B | IMEI1 `352099001761481`, cũ, mua 4.000.000đ + sửa trước bán 300.000đ + nhập phân bổ 50.000đ |
| Phụ kiện lượng | SKU CAP-01, 10 cáp × 50.000đ, nhập thêm 10 × 70.000đ |
| Phụ kiện Serial | SKU PIN-S01, Serial thử `SN-TEST-0001` và `SN-TEST-0002`, hai giá vốn khác nhau |
| Đối tác | Khách C, NCC N và đối tác X vừa là khách vừa NCC; khách có và không có số điện thoại |
| Số tiền nhỏ | Ba dòng khác nhau, giảm toàn phiếu 1đ hoặc 10.001đ để kiểm phần dư |
| Thời gian | Giao dịch trước/sau 00:00 giờ Việt Nam, cuối tháng/năm, trả hàng khác ngày bán |

Định danh trên là dữ liệu kiểm thử, không đại diện hàng thật. Đối chiếu checksum/định dạng bằng validator chuẩn trước khi dùng làm fixture “hợp lệ”; chuẩn Serial và ngoại lệ IMEI phải chốt D08. Sinh thêm mã hợp lệ không trùng cho kiểm thử tải. Tất cả ví dụ tiền giả sử không có phần thuế cần tách; bổ sung bộ VAT theo chính sách D03 đã duyệt.

## 3. Danh mục, định danh và nhập hàng

| Mã | Tình huống / thao tác | Kết quả mong đợi |
|---|---|---|
| CAT01 | Tạo SKU, barcode trùng; mã có số 0 đầu | Trùng bị chặn theo chính sách; số 0 giữ nguyên |
| CAT02 | IMEI1 máy mới trùng IMEI2 máy A, kể cả hai request nhập song song | Chỉ một định danh tồn tại; giao dịch bị từ chối rollback cả phiếu |
| CAT03 | Serial nhập vào máy mode IMEI, unit gắn variant QUANTITY, thiếu IMEI1, hai IMEI giống nhau | Không ghi sổ; lỗi đúng trường, không tự suy luận đổi mode |
| CAT04 | Đổi mode/xóa variant hoặc sửa định danh đã có lịch sử; máy trả rồi bán lại | Mode/lịch sử được bảo vệ; máy trả giữ unit UUID và định danh, không tạo bản trùng |
| IN01 | Nhập chung 2 máy, 20 cáp và 2 Serial với giá riêng | Đúng số unit, quantity, movement, vốn, AP và từng khoản trả |
| IN02 | Giảm giá dòng/phiếu, chi phí vốn hóa phân bổ có phần dư | Tổng phân bổ đúng; current_cost từng unit và V phụ kiện khớp nguồn |
| IN03 | Chi phí giao hàng trả bên thứ ba | Không cộng vào AP NCC hàng hai lần; có chứng từ chi/đối ứng đúng bên |
| IN04 | Nhập lượng 0/âm/lẻ, giá âm, chiết khấu vượt tiền, cơ sở phân bổ 0 | Từ chối hoặc yêu cầu phân bổ được duyệt; không NaN/chia 0/giá vốn âm |
| IN05 | Nhập máy từ khách bán, chưa trả hết tiền | Nguồn nhập khách rõ, AP đúng; AR của người đó không tự bù trừ |
| IN06 | Cố gây lỗi sau khi tạo units nhưng trước ledger/audit | Không còn unit, tồn, nợ hoặc tiền mồ côi sau rollback |

## 4. Bán hàng và tiền

| Mã | Tình huống / thao tác | Kết quả mong đợi |
|---|---|---|
| SALE01 | Bán máy A + 3 cáp + 1 Serial trong một hóa đơn | Đúng unit được xuất, tồn lượng giảm 3, vốn theo từng mode |
| SALE02 | Chọn máy SOLD/QUARANTINE/REPAIR hoặc phụ kiện vượt tồn | Chặn cả giao dịch; không hóa đơn POSTED hoặc nợ/tiền rời rạc |
| SALE03 | Cùng unit ở hai dòng, hai dòng cùng SKU cộng vượt tồn | Chặn; tính tồn theo tổng giỏ, không kiểm riêng từng dòng |
| SALE04 | Nhân viên sửa payload tổng, vốn, giá dưới ngưỡng, store/actor | Server tính lại và kiểm quyền; không tin tổng/vốn/actor client |
| SALE05 | Khách lẻ trả thiếu, khách định danh nợ một phần | Khách lẻ bị yêu cầu xác định đối tác; khách có mã ghi đúng AR |
| SALE06 | Đổi tên/giá sản phẩm sau bán, in lại và mở lịch sử | Snapshot phiếu/vốn/bảo hành không đổi; in không ghi giao dịch mới |
| MONEY01 | Nhập 1.000.000đ, trả NCC 400.000đ | AP phát sinh +1.000.000 và thanh toán −400.000; dư 600.000đ, chi tiền 400.000đ |
| MONEY02 | Bán 1.000.000đ, thu tiền mặt 200.000 và CK 300.000 | Doanh thu 1.000.000đ; hai khoản IN tổng 500.000đ; AR 500.000đ |
| MONEY03 | Khách đưa 1.000.000đ cho hóa đơn 850.000đ | Thực thu 850.000đ, tiền thừa 150.000đ; không ghi ứng trước ngoài ý muốn |
| MONEY04 | Thu nợ sau 500.000đ và phân bổ nhiều phiếu cùng khách | AR giảm đúng, doanh thu không tăng; không phân bổ vượt nguồn/nợ hoặc sang đối tác khác |
| MONEY05 | Đối tác X có AR 2.000.000đ và AP 1.000.000đ | Hiện riêng phải thu 2.000.000 và phải trả 1.000.000; không chỉ hiển thị nợ ròng 1.000.000 |
| MONEY06 | Đảo khoản thu đã phân bổ, rồi ghi khoản đúng; ứng trước được duyệt | Đảo ledger/allocation đúng một lần; không sửa bản gốc; dư chưa phân bổ hiển thị riêng |

## 5. Giá vốn, doanh thu và điều chỉnh

| Mã | Dữ liệu / thao tác | Số kỳ vọng và kiểm tra |
|---|---|---|
| COST01 | Máy B vốn 4.350.000đ, bán thuần 5.000.000đ, thu 2.000.000đ | Lãi gộp 650.000đ; AR 3.000.000đ; vốn tại lần bán lưu cố định |
| COST02 | 10 cáp ×50.000 + 10 ×70.000; bán 3 ×90.000 | Bình quân 60.000; doanh thu 270.000; vốn 180.000; lãi 90.000; Q=17, V=1.020.000 |
| COST03 | Sau COST02 nhập 3 ×80.000, khách trả 1 cáp từ lần bán cũ | Trước trả Q=20 V=1.260.000; hoàn vốn 60.000; sau Q=21 V=1.320.000; doanh thu trả 90.000; không dùng vốn hiện tại 63.000 |
| COST04 | Sửa máy trước bán rồi phát sinh chi phí sau bán | Chi phí trước tăng vốn được duyệt; sau bán ghi bổ sung kỳ hiện tại hoặc chi phí bảo hành theo D06, không đổi snapshot cũ |
| COST05 | Phân bổ 1đ/10.001đ, trả nhiều lần, xuất hết kho lượng có vốn lẻ | Tổng phần dư khớp; lần cuối lấy số dư; Q=0 thì V=0; không lỗi float |
| COST06 | Trả nhập 2 cáp, bình quân 60.000, NCC credit 100.000 | Kho giảm V 120.000; AP giảm 100.000; variance bất lợi 20.000 riêng, không tạo doanh thu giả |

Thêm bộ thuế được duyệt: giá đã/chưa gồm thuế, giảm giá ảnh hưởng thuế, thuế đầu vào được/không được khấu trừ, hoàn từng phần và tổng lẻ. Không nghiệm thu lãi gộp trước khi các số kỳ vọng thuế được người phụ trách xác nhận.

## 6. Đổi trả và bảo hành

| Mã | Tình huống / thao tác | Kết quả mong đợi |
|---|---|---|
| RET01 | Trả một máy theo IMEI2 từ hóa đơn cũ | Tìm cùng unit đúng lần bán; hoàn vốn gốc, không tạo máy mới; vào QUARANTINE |
| RET02 | Trả phụ kiện nhiều lần, lần cuối nhận phần dư | Tổng lượng/tiền/vốn hoàn không vượt snapshot; đúng phần giảm giá phân bổ |
| RET03 | Hóa đơn 10 triệu đã thu 6 triệu, trả 3 triệu | AR từ 4 triệu còn 1 triệu; chi hoàn 0 |
| RET04 | Hóa đơn 10 triệu đã thu 6 triệu, trả 5 triệu rồi chi hoàn 1 triệu | Giảm AR 5 triệu tạo credit 1 triệu; hoàn 1 triệu đưa AR về 0; không hoàn quá credit |
| RET05 | Hai request trả cùng máy/lượng hoặc hoàn cùng credit | Chỉ phần còn đủ điều kiện được trả/hoàn; không âm số lượng chưa trả |
| RET06 | Đổi máy cũ lấy máy mới trong một thao tác, máy mới vừa bị người khác bán | Toàn bộ thao tác đổi rollback; máy cũ/chứng từ gốc/tiền không bị ghi một nửa |
| RET07 | Trả nhập máy đã bán, trả lượng quá còn nhập/tồn, hủy phiếu đã ghi sổ | Bị chặn; không xóa sổ hoặc làm âm Q/V; sửa sai bằng chứng từ hợp lệ |
| RET08 | Nhận máy trả rồi bán lại sau duyệt kiểm tra | Bán bị chặn khi cách ly; sau chuyển AVAILABLE có lần bán mới, vốn và bảo hành đúng, lịch sử lần cũ còn nguyên |
| WAR01 | Tra bảo hành qua IMEI1/2, Serial hoặc hóa đơn hàng lượng | Đúng lần bán và chính sách snapshot; không áp chính sách mới lên lần bán cũ |
| WAR02 | Khách gửi máy bảo hành, chưa đổi quyền sở hữu | Không tăng tồn sở hữu hoặc tồn khả dụng; chỉ custody hồ sơ |
| WAR03 | Tiếp nhận cùng đơn vị/ lượng bảo hành trùng khi hồ sơ đang mở | Cảnh báo/chặn theo chính sách; không nhận vượt quyền lợi còn lại |
| WAR04 | Bảo hành đã xử lý, chi phí và đổi miễn phí chưa có chính sách | Lưu kết quả có quyền; không tự xuất hàng thay thế khi chưa có quy tắc được duyệt |

WAR01–WAR04 mức High trừ tác động kho/tiền là Critical. Không tự đặt số ngày/phí làm số kỳ vọng; lấy D04 đã phê duyệt.

## 7. Transaction, idempotency và đồng thời

Các ca đồng thời phải dùng **hai kết nối/phiên thật** với barrier cho cùng lúc đọc/gửi; không thay bằng hai lần gọi nối tiếp. Lưu request_id và kết quả sổ sau khi cả hai hoàn tất.

| Mã | Kích thích | Kết quả mong đợi |
|---|---|---|
| TX01 | Cùng request_id và payload gửi hai lần liên tiếp hoặc đồng thời | Một chứng từ/kho/ledger/thu tiền; các lần nhận cùng kết quả an toàn |
| TX01b | Một lệnh bán có hai khoản thu, hoặc đổi gồm trả+bán+thu chênh | Một gốc lệnh với đủ chứng từ con cùng commit; unique request_id không chặn con hợp lệ và replay không nhân đôi bất kỳ chứng từ con nào |
| TX02 | Cùng request_id nhưng đổi tiền/IMEI/khách | Từ chối khác hash; không trả thành công như yêu cầu mới |
| TX03 | Fault injection từng điểm trước commit: header, lines, kho, nợ, tiền, audit | Mỗi lần rollback toàn bộ; không dư số âm, số lẻ hoặc orphan |
| TX04 | Server commit thành công nhưng cắt phản hồi mạng | Client pending → tra đúng khóa → cùng phiếu; không yêu cầu thanh toán lại |
| TX05 | Dọn payload idempotency rồi replay request cũ | Dấu chống trùng bền vẫn ngăn ghi lần hai; không lộ dữ liệu qua lookup |
| TX06 | Deadlock/serialization hoặc version nháp cũ | Retry hữu hạn cùng khóa; hết retry báo lỗi rõ, không gửi khóa mới, không ghi đè nháp người khác |
| CON01 | Hai người bán cùng IMEI hoặc Serial | Một thành công, một hết hàng; tổng xuất một unit, không hai AR/thu tiền |
| CON02 | Tồn 5 cáp, hai người cùng bán 4 | Một thành công, một thất bại, tồn=1; không tồn −3 |
| CON03 | Bán và trả nhập/điều chỉnh cùng SKU/unit | Theo thứ tự khóa, chỉ trạng thái hợp lệ được commit; sổ/tồn khớp |
| CON04 | Hai người cùng trả 1 phần còn lại hoặc chi hoàn cùng credit | Không trả/hoàn vượt nguồn; tổng allocation/credit hợp lệ |
| CON05 | Nợ 100.000đ, hai người cùng thu/phân bổ 80.000đ không cho ứng trước | Không ghi tổng thu 160.000đ vào nợ đó; request sau yêu cầu xử lý số còn lại |
| CON06 | Kiểm kê snapshot và phát sinh bán/nhập/chi phí vốn trước duyệt | Tạm dừng/kiểm tra phiên bản hiệu lực tại DB; snapshot cũ không ghi đè số mới; đối soát lại khi cần |

## 8. Kho, đầu kỳ và báo cáo

| Mã | Tình huống / thao tác | Kết quả mong đợi |
|---|---|---|
| STOCK01 | Chuyển máy/cáp AVAILABLE ↔ QUARANTINE/REPAIR | Tồn khả dụng đổi, tổng tài sản/vốn không đổi nếu không có chi phí mới |
| STOCK02 | Kiểm kê thiếu/thừa máy và cáp; thừa chưa biết vốn | Có chứng từ/lý do/duyệt; thừa thiếu nguồn/vốn không tự nhập 0; máy đã bán không tự hồi kho |
| STOCK03 | Hủy mất một đơn vị hoặc lượng | Giảm kho/vốn đúng, hao hụt riêng; không tự tạo doanh thu hay dòng tiền |
| STOCK04 | Đối soát mọi movement với balances và trạng thái units | Tổng theo bucket/Q/V và nguồn chứng từ khớp; không orphan hoặc movement tự ghi trực tiếp |
| STOCK05 | Ngừng bán/xóa danh mục/đối tác đã giao dịch | Archive, không xóa lịch sử; phiếu cũ và báo cáo vẫn đúng |
| OPEN01 | Nhập số dư tồn/nợ đầu kỳ rồi import lại cùng mã | Một bộ số dư; không có doanh thu/thu/chi giả; unique/chống replay hoạt động |
| OPEN02 | Đầu kỳ thiếu IMEI/vốn, sai tổng kiểm kê, AR/AP lệch nguồn | Chặn duyệt/mở bán, có danh sách lỗi; chủ ký số đúng trước cutover |
| REP01 | Báo cáo một ngày có bán chịu và thu nợ cũ | Doanh thu theo lần bán, tiền theo lần thu; không lấy thực thu làm doanh thu |
| REP02 | Trả vào tháng sau, sửa chi phí sau bán, tồn quá khứ | Kỳ bán và kỳ trả/điều chỉnh tách; tồn quá khứ từ sổ, không dùng current_cost/state hiện tại |
| REP03 | Khoảng ngày Việt Nam, tháng/năm biên, ngày không phát sinh | Không thiếu/trùng ở biên; có số 0 thật, không lỗi timezone |
| REP04 | Tổng sản phẩm/hóa đơn/nhóm/dashboard so chi tiết | Tổng đúng snapshot và allocation; hao hụt/variance/chi phí bảo hành tách theo định nghĩa |
| REP05 | AR/AP dương, credit/ứng trước âm cùng đối tác | Báo cáo tổng nợ và dư có riêng, drill-down chứng từ khớp ledger |

## 9. Bảo mật

| Mã | Thử tấn công / lỗi quyền | Kết quả mong đợi |
|---|---|---|
| SEC01 | Không đăng nhập, user ngoài cửa hàng, user bị khóa | Không đọc/ghi dữ liệu; không mặc nhiên xem được vì biết UUID |
| SEC02 | Đổi store_id hoặc gửi IDs cha/con từ cửa hàng B | RLS/FK/RPC từ chối, rollback; không lộ thông tin B qua lỗi |
| SEC03 | PATCH unit status/balance/ledger/payment/audit trực tiếp qua REST/SDK và API khác nếu bật | Không có DML trái phép; chỉ RPC đúng quyền |
| SEC04 | Gọi helper, function đặc quyền, tự sửa membership/role | EXECUTE/grants và kiểm tra quyền chặn; không tự nâng quyền |
| SEC05 | Nhân viên select cost, join, view, export, RPC dashboard hoặc idempotency result | Không nhận cost/margin; không tải về rồi ẩn trên UI; lỗi không lộ giá |
| SEC06 | Thu hồi quyền khi màn bán đang mở hoặc đang chốt | Thứ tự hiệu lực theo membership lock xác định; không có giao dịch mới sau khi thu hồi đã có hiệu lực |
| SEC07 | Payload quá lớn, ký tự SQL/HTML trong tên/ghi chú, giả actor/tổng tiền | Xác thực giới hạn, không SQL injection/XSS, không thay actor hoặc bypass nghiệp vụ |
| SEC08 | Kiểm bundle/env, logs, cache, thiết bị dùng chung, backup permissions | Không secret trong bundle/log, không cache API/PII/cost; local quầy chỉ chứa dữ liệu đã duyệt cho bán/in; logout khóa truy cập nhưng không xóa outbox chưa ack; backup mã hóa/hạn chế quyền |

Kiểm RLS với vai trò ứng dụng thật và xác nhận bảng exposed không bị bỏ sót. Kiểm SELECT trực tiếp cột vì RLS chỉ giới hạn hàng; quyền view/function là ca riêng. Sau restore phải lặp SEC01–SEC05.

## 10. PWA, UI, thiết bị và hiệu năng

| Mã | Tình huống / môi trường | Kết quả mong đợi |
|---|---|---|
| PWA01 | Mất Internet trên quầy có grant và trên máy khác | Quầy bán/in được trong quota, phiếu chưa sync; máy khác chỉ nháp; không POSTED trung tâm trước ack |
| PWA02 | Online trở lại có outbox và nháp | Tự gửi được phiếu đã ghi nhận theo sequence/idempotency; nháp không tự chốt; không đổi giá/tiền khách đã trả theo giá mới |
| PWA03 | Service Worker mới khi đang lưu/in hoặc có outbox | Không reload giữa transaction; migration giữ dữ liệu, phiếu ack/pending tra được; không clear outbox |
| PWA04 | Auth hết hạn, logout/đổi user trên quầy có outbox | Không user mới bán bằng quyền cũ; giữ phiếu chưa ack có khóa truy cập/bàn giao; sync yêu cầu quyền hợp lệ/chủ phục hồi |
| PWA05 | Inspect Cache Storage/IndexedDB sau bán/nhập/tra khách | Cache static allowlist; IndexedDB chỉ hàng/giá/quyền/phiếu/tiền được duyệt của quầy; không cost/danh bạ/token đặc quyền |
| PWA06 | Schema local/API cũ sau phát hành, đóng/mở lại PWA offline | Không mất quota/outbox, không gửi payload sai; nếu chưa tương thích dừng bán mới nhưng giữ được phiếu để đối soát |
| UI01 | Mobile 360 px, tablet, PC; chữ 200%, bàn phím/focus | Luồng chính dùng được, nút/nhãn rõ, không chỉ dùng màu; High |
| UI02 | Bán hỗn hợp, giảm giá, chia trả và nợ trên mobile | Không mất giỏ khi đổi bước; tổng/định danh thấy rõ trước xác nhận; High |
| UI03 | Quét camera bị từ chối/quá tối/không hỗ trợ; scanner bàn phím | Có nhập tay; quét IMEI2 ra đúng máy, quét lại không thêm unit lần hai; High |
| UI04 | Ngắt Internet thật, in lỗi/hết giấy rồi in lại | Quầy in từ local sau lưu thành công, nhãn chưa sync/mã duy nhất rõ; in lại không bán/thu lại; sau sync tra local→server được; High |
| PERF01 | 10.000 SKU/50.000 units/100.000 chứng từ, tìm exact SKU/IMEI và tên | p95 tìm ≤1 giây theo mạng kiểm thử, có phân trang và index phù hợp; High |
| PERF02 | 5 phiên đồng thời, giỏ ≤20 dòng/50 units, ít nhất 100 lần chốt đại diện | p95 chốt ≤2 giây từ lúc gửi; đo riêng xung đột đúng nghiệp vụ, không tồn/nợ lệch; High |
| PERF03 | Tải màn bán lần đầu và mở báo cáo khoảng ngày thường dùng | Màn bán mục tiêu ≤3 giây trên thiết bị/mạng thống nhất; báo cáo không tải toàn bộ sổ về client; High |

Ma trận ban đầu: Chrome Android, Safari iOS ở chế độ trình duyệt/thêm màn hình chính, Chrome/Edge Windows và tablet thực cửa hàng. Chọn phiên bản còn hỗ trợ lúc triển khai, ghi model/version/mạng; không tuyên bố hỗ trợ mọi camera/máy in. Camera/in nhiệt nâng cao có thể hoãn, nhập tay và in trình duyệt là đường chính cần đạt.

### Bộ kiểm thử offline bắt buộc bổ sung

Chạy trên đúng máy quầy/browser/máy in được chọn và ít nhất một thiết bị online khác. Kiểm bằng truy vấn số dư/quota/UUID và tiền thực mô phỏng, không chỉ thấy phiếu in. Các ca OFF là Critical.

| Mã | Tình huống | Kết quả mong đợi |
|---|---|---|
| OFF01 | Đăng ký hai terminal/offline bằng tài khoản khác hoặc máy chưa chuẩn bị | Chỉ một terminal offline hoạt động; không tự sao chép quyền; máy chưa chuẩn bị không bán/in hoàn tất |
| OFF02 | Tồn 10 cáp, cấp quầy 6 và một máy A | Online chỉ bán 4 cáp và không bán A; tổng sở hữu vẫn 10/A trước sync. Quầy không bán quá 6; hết hạn grant không tự release |
| OFF03 | Hai tab quầy cùng bán cáp cuối hoặc cùng IMEI/Serial | Một local transaction thành công, một hết quota; một phiếu/số tiền, không hai bản tồn |
| OFF04 | Bán đủ ba mode trong quota; bán nợ, CK chưa kiểm chứng hoặc giảm ngoài quyền | Tiền mặt đủ theo đề xuất được lưu; ngoài phạm vi/quyền bị chặn; không tự đánh dấu chuyển khoản đã nhận |
| OFF05 | Crash trước local commit, sau commit trước in, sau in trước ack | Trước commit không có phiếu thành công; sau commit mở lại đúng phiếu và quota, in lại cùng mã, không thu tiền lần hai |
| OFF06 | Máy in cần Internet/driver lỗi, tài nguyên mẫu chưa cache | Không giả báo đã in; mẫu không gọi CDN; giữ local record, in lại cùng mã. Thiết bị không đáp ứng thì chưa nghiệm thu offline |
| OFF07 | Sync trùng/mất ack/server commit xong cắt mạng | Một POSTED, một lần xuất/thu tiền; local quota và server consumed khớp; request cũ trả cùng kết quả |
| OFF08 | Phiếu sequence giữa chuỗi sai hash/grant, tiền/hàng đã giao | Dừng chuỗi ở lỗi, NEEDS_REVIEW giữ đầy đủ; chủ đối soát, không xóa/đổi giá/đổi UUID hoặc rollback giả phần vật lý |
| OFF09 | Thu hồi user hoặc đổi bảng giá khi quầy đang offline | Ghi rõ quầy chưa thể biết thu hồi ngay; sync kiểm quyền, chủ xử lý phần đã thực hiện; không cho user mới dùng grant cũ. Giá hợp lệ đã cấp không bị tự đổi theo bảng mới |
| OFF10 | Hỏng/mất terminal, phục hồi browser backup cũ hoặc clone profile | Không tự cấp lại/release quota; dừng bản cũ, kiểm phiếu/tiền/hàng; bản phục hồi phải đối soát trước bán mới, không reset consumed |
| OFF11 | Kiểm kê/chốt kỳ/trả NCC/sửa vốn unit đang có grant chưa đóng | Chặn hoặc bắt dừng/sync/reconcile grant trước; cloud lock đơn lẻ không đủ, không lấy số tồn chưa sync làm số thực |
| OFF12 | Bán trước nửa đêm/qua kỳ khóa, sync ngày sau, đồng hồ quầy sai | Lưu riêng occurred/received/posted; không hồi tố bình quân; đóng ca nêu tiền local chưa sync, thời gian bảo hành có bước xác nhận khi nghi ngờ |
| OFF13 | Quota storage đầy/persist từ chối/xóa dữ liệu/log out/cập nhật schema | Dừng trước in khi không lưu được; outbox chưa ack không tự xóa. Nếu tiền đã nhận trước lỗi, có quy trình biên nhận/kiểm tiền, không thu lại |
| OFF14 | Đã gửi chốt online chưa rõ kết quả rồi đứt mạng | Không tạo bản offline UUID mới cho cùng giao dịch; tra request cũ và giữ pending cho đến khi xác định |

Thêm chuỗi kiểm số: OFF02 quầy bán 2 cáp offline, thiết bị khác bán 4 cáp online → trước sync server owned Q=6 (gồm 6 reserved), quầy còn quyền 4 và đã giao 2; sau sync server Q=4, reserved=4, available=0. Release sau đối soát chuyển reserved 4→available 4, Q vẫn 4. Màn trung tâm trước sync không được gọi Q=6 là tồn vật lý chắc chắn; phải ghi phần quầy chưa cập nhật.

## 11. Backup, restore và UAT

| Mã | Thao tác | Kết quả mong đợi |
|---|---|---|
| RESTORE01 | Khôi phục DB từ bản sao vào môi trường cách ly | Chứng từ/kho/nợ/tiền/vốn/migrations khớp mốc, đo thời gian thực |
| RESTORE02 | Khôi phục Auth, roles/grants/functions/RLS và Storage | Đăng nhập được, đúng membership, file thực mở được; nhân viên vẫn không xem cost; không mất custom trigger |
| RESTORE03 | Job backup lỗi, file thiếu/hỏng, checksum sai hoặc Storage không đồng mốc | Phát hiện/cảnh báo, không coi bản đó hợp lệ; chọn bản khác và ghi khoảng mất dữ liệu |
| RESTORE04 | Có phiếu/tiền thực sau mốc restore và nháp pending cũ | Đối soát chứng từ ngoài hệ thống + request_id trước nhập lại; không replay mù, không thu tiền hai lần |
| RESTORE05 | Restore cloud trước mốc cấp/consume grant, trong khi quầy còn outbox hoặc ack từ hệ thống cũ | Dừng bán cả quầy và cloud để đối soát; phục dựng grant/phiếu/tiền bằng UUID/sequence/phiếu in, không tự cho quota trở lại hay replay mù; drill gồm mất local và bản sao local, backup cloud không được coi đã chứa outbox |
| UAT01 | Chủ/nhân viên thực hiện một ngày: đầu kỳ, nhập, bán hỗn hợp, nợ, thu, trả, đổi, chi phí; cấp quầy rồi mất Internet bán/in, sync, đóng ca, đóng grant, kiểm kê, báo cáo và backup | Tự thao tác theo hướng dẫn; tiền local/POSTED, quota và số cuối ngày khớp, không kiểm kê khi quầy còn phiếu chưa xử lý; ghi vướng mắc và chủ ký; High |

Mục tiêu RPO/RTO theo lựa chọn đã ký D10; nếu không đo đạt thì chưa nghiệm thu, không lấy tính năng backup của nhà cung cấp thay bằng chứng phục hồi. Lặp drill khi đổi lớn và theo lịch đề xuất trong 05.

## 12. Truy vết yêu cầu và cổng phát hành

| Nhóm yêu cầu | Ca kiểm thử chính |
|---|---|
| FR01 quyền | SEC01–SEC08 |
| FR02–FR04 danh mục/định danh/nhập | CAT, IN, OPEN |
| FR05 bán | SALE, TX, CON, MONEY |
| FR06 kho | STOCK, OPEN, CON |
| FR07 công nợ | MONEY, RET03–RET05, REP05 |
| FR08 vốn/lãi | COST, REP01–REP04 |
| FR09 đổi trả | RET, CON03–CON04 |
| FR10 bảo hành | WAR, RET08 |
| FR11 đối tác | MONEY05, IN05, SEC02 |
| FR12 dashboard | REP, PERF |
| FR13 chứng từ/lịch sử | SALE06, UI04, SEC05 |
| FR14 PWA/offline | OFF01–OFF14, PWA, UI, TX04, RESTORE05 |
| INV01–INV10 | Tập hợp CON/TX/SEC/COST/MONEY/RET/STOCK/REP |

Go-live cần: Critical/High gồm toàn bộ OFF đạt; đầu kỳ/chính sách/chỉ số được ký; không lộ secret/quyền/PII; đối soát không lệch; restore cloud và phục hồi local đạt mục tiêu đã chốt; chủ chạy được ca mất Internet, in lại, sync và đóng ca có phiếu chờ; hướng dẫn rõ, người hỗ trợ sẵn sàng. Lỗi Normal chỉ chấp nhận khi không ảnh hưởng dữ liệu/quyền, có người và lịch xử lý.

Kết quả kiểm thử thực tế sẽ được ghi khi có sản phẩm. **Hiện tại chỉ hoàn thành kế hoạch kiểm thử, không khẳng định bất kỳ test runtime nào đã chạy.**
