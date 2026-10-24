# Hướng dẫn sử dụng MobiDesk

Cập nhật: 24/10/2026

Dành cho chủ cửa hàng và người bán. Đọc phần Bắt đầu trước khi nhập dữ liệu thật; trên điện thoại có thể tìm nhanh theo tên nghiệp vụ hoặc lỗi đang gặp.

## Mục lục

- [1. Bắt đầu và phân biệt dữ liệu minh họa](#bat-dau)
- [2. Điều hướng trên điện thoại và máy tính](#dieu-huong)
- [3. Tạo SKU, mã vạch và giá bán](#san-pham)
- [4. Khách hàng và nhà cung cấp](#doi-tac)
- [5. Nhập tồn và công nợ đầu kỳ](#dau-ky)
- [6. Nhập hàng và thu mua máy cũ](#nhap-hang)
- [7. Bán hàng: chọn hàng, số lượng và đúng chiếc máy](#ban-hang)
- [8. Nhập giá, giảm giá và bốn cách thanh toán](#nhap-tien)
- [9. Phiếu nháp và giao dịch chưa rõ kết quả](#nhap-va-nhap-lai)
- [10. Tra cứu chứng từ, in và in lại](#lich-su-in)
- [11. Thu nợ khách hàng, trả nợ nhà cung cấp](#cong-no)
- [12. Trả hàng, hoàn tiền và đổi hàng](#tra-doi)
- [13. Kho, kiểm kê và hàng lỗi](#kho-kiem-ke)
- [14. Chi phí thiết bị và tiếp nhận bảo hành](#chi-phi-bao-hanh)
- [15. Đọc Dashboard và báo cáo đúng ý nghĩa](#bao-cao)
- [16. Chuẩn bị và bán khi mất Internet](#quay-offline)
- [17. Đối soát cuối ngày, sao lưu và đóng phiên quầy](#dong-ca)
- [18. Tài khoản, quyền và cài đặt ứng dụng](#quyen-cai-dat)
- [19. Khi gặp lỗi: xử lý theo tình huống](#xu-ly-loi)

<a name="bat-dau"></a>

## 1. Bắt đầu và phân biệt dữ liệu minh họa

Mỗi khách dùng một bản cài và một Supabase project riêng; mỗi cửa hàng có một kho và một máy quầy offline.

1. Mở đúng liên kết bản cài được bàn giao. Bản thử riêng tư trên Sites yêu cầu đăng nhập ChatGPT trước; đây là lớp truy cập trang web, khác với tài khoản nhân viên của cửa hàng.

2. Nếu thấy dải Dữ liệu minh họa, bạn đang thử trên dữ liệu mẫu trong trình duyệt. Các thao tác ở đây không ghi vào cửa hàng thật. Không nhập thông tin khách thật vào chế độ thử.

3. Nhờ người triển khai hoàn tất kết nối Supabase của riêng cửa hàng, chạy SQL và cấp tài khoản. Không gửi mật khẩu quản trị Supabase hoặc khóa đặc quyền cho người bán.

4. Đăng nhập bằng email và mật khẩu được cấp. Chủ tạo cửa hàng một lần nếu ứng dụng hiện màn Tạo cửa hàng.

5. Vào Cài đặt, nhập tên, địa chỉ, điện thoại và ghi chú về cách sử dụng giá/thuế. Chủ đọc và xác nhận các chính sách rồi chọn Lưu cài đặt trước khi ghi sổ thật.

### Cần nhớ

- Dữ liệu minh họa không được chuyển tự động thành số dư đầu kỳ hoặc hóa đơn thật.

- Nếu quên mật khẩu tài khoản cửa hàng, liên hệ chủ/người triển khai. Bản này chưa có màn hoàn tất đường dẫn đặt lại mật khẩu bằng email; không xóa dữ liệu máy quầy để xử lý lỗi đăng nhập.

<a name="dieu-huong"></a>

## 2. Điều hướng trên điện thoại và máy tính

Các màn chính gồm Tổng quan, Bán hàng, Nhập hàng, Kho hàng, Công nợ, Khách hàng và Báo cáo. Lịch sử giao dịch, Bảo hành, Quầy offline, Cài đặt và Hướng dẫn sử dụng nằm trong nhóm công cụ.

1. Trên phone, dùng thanh dưới cùng để vào Tổng quan, Bán hàng hoặc Kho hàng; chọn Thêm hoặc nút mở menu để tới các chức năng khác.

2. Trong Bán hàng/Nhập hàng, bước 1 là Chọn hàng. Chạm sản phẩm, sau đó chọn Xem phiếu hoặc bước 2 Phiếu & thanh toán để sửa giá và kiểm tra tiền.

3. Thanh cuối màn hình hiển thị số hàng/tổng tiền và nút xác nhận. Kiểm tra cả phương thức thanh toán hiển thị cạnh tổng trước khi chốt.

4. Trên máy tính, danh mục và giỏ cùng xuất hiện. Có thể dùng máy quét hoạt động như bàn phím, gửi SKU, mã vạch, IMEI hoặc Serial rồi Enter.

5. Chạm một dòng chứng từ để mở chi tiết, in lại, thanh toán, trả hàng hoặc tiếp nhận bảo hành nếu có quyền.

### Cần nhớ

- Màn hẹp có thể phải cuộn bảng theo chiều ngang để xem hết các cột; không suy ra rằng dữ liệu bị mất.

- Nếu chưa thấy giao diện mới sau cập nhật PWA, đồng bộ/đối soát quầy và xuất bản sao trước, rồi đóng các tab của bản cài và mở lại.

<a name="san-pham"></a>

## 3. Tạo SKU, mã vạch và giá bán

Một SKU đại diện cho một biến thể cụ thể, ví dụ iPhone 16 128GB màu xanh. Các máy cùng SKU vẫn có IMEI và giá vốn riêng.

1. Vào Kho hàng → Thêm sản phẩm. Nhập tên và SKU duy nhất, dễ đọc; ví dụ CAP-USBC-1M hoặc IP16-128-XANH.

2. Chọn IMEI cho điện thoại; QUANTITY/Số lượng cho cáp, ốp, kính; SERIAL cho phụ kiện quản lý từng chiếc có serial riêng.

3. Nhập hãng, màu, dung lượng/phiên bản và mã vạch trên bao bì nếu có. Một mã vạch không được gán cho hai SKU khác nhau.

4. Nhập giá bán tham khảo, ngưỡng tồn tối thiểu và số ngày bảo hành đã duyệt, rồi Xác nhận lưu. Thao tác này chưa làm tăng tồn hàng.

5. Để đổi giá, mở chi tiết SKU trong Kho hàng → Cập nhật giá / mã vạch. Kiểm tra giá, ngưỡng tồn và số ngày bảo hành rồi lưu.

### Cần nhớ

- Cơ chế IMEI/Số lượng/Serial phải chọn đúng từ đầu. Giao diện cập nhật không đổi cơ chế theo dõi hoặc sửa chứng từ cũ.

- Giá bán mới áp dụng cho giao dịch sau. Giá/bảo hành đã ghi trên phiếu và hàng đã cấp quầy được giữ theo lần ghi nhận trước đó.

<a name="doi-tac"></a>

## 4. Khách hàng và nhà cung cấp

Công nợ phải gắn với một đối tác xác định. Một người có thể vừa mua hàng vừa bán máy cũ cho cửa hàng.

1. Vào Khách hàng & đối tác, chọn thêm đối tác. Nhập tên, điện thoại, vai trò Khách hàng/Nhà cung cấp/Cả hai và ghi chú nếu cần.

2. Trong phiếu bán, chạm Chọn khách hàng; tìm bằng tên không dấu hoặc điện thoại có/không có dấu cách, rồi chọn đúng người. Có thể Enter khi chỉ còn một kết quả.

3. Nếu thu đủ tiền và không cần xác định khách, có thể để Khách lẻ. Nếu còn nợ, bắt buộc chọn khách trước xác nhận.

4. Trong phiếu nhập, chọn nhà cung cấp. Khi mua máy cũ từ một khách, đối tác đó cần vai trò Nhà cung cấp hoặc Cả hai.

5. Mở chi tiết đối tác để xem các giao dịch gần đây và đối chiếu công nợ; dùng Lịch sử giao dịch để tra cứu phiếu cũ ngoài danh sách gần nhất.

### Cần nhớ

- Số phải thu khách và số phải trả nhà cung cấp là hai sổ riêng; không tự lấy số này bù sang số kia.

- Nếu tài khoản không được phép thêm đối tác, nhờ chủ cửa hàng thực hiện. Không dùng tên Khách lẻ để ghi nợ cho một khách xác định.

<a name="dau-ky"></a>

## 5. Nhập tồn và công nợ đầu kỳ

Chỉ chủ thực hiện khi cửa hàng chưa phát sinh nhập/bán thường xuyên. Đầu kỳ ghi tài sản và số dư đã đối chiếu, không tạo doanh thu hoặc dòng tiền.

1. Tạo trước các SKU và đối tác cần dùng. Kiểm đếm hàng thực tế, lập danh sách IMEI/Serial, giá vốn và các khoản nợ đã đối chiếu.

2. Vào Cài đặt → Nhập số dư đầu kỳ. Chọn Tồn hàng và giá vốn, SKU, số lượng và giá vốn một đơn vị. IMEI/Serial nhập riêng từng chiếc cùng định danh và tình trạng.

3. Đối với điện thoại hai IMEI, ghi cả IMEI 1 và IMEI 2 cho cùng chiếc máy; không tạo hai hàng tồn cho hai IMEI.

4. Để nhập nợ, chọn Công nợ phải thu khách hàng hoặc Công nợ phải trả nhà cung cấp, chọn đúng đối tác và nhập số dư có dấu theo chỉ dẫn trong biểu mẫu. Số dương là còn phải thu/trả; số âm thể hiện số ngược chiều đã được đối chiếu.

5. Kiểm tra lại tổng tồn, giá trị vốn và nợ với chứng từ bàn giao. Chỉ khi đủ và đúng mới chọn Khóa đầu kỳ.

### Cần nhớ

- Sau khi khóa hoặc có nhập/bán, không dùng đầu kỳ để sửa lệch kho hoặc nợ. Nhờ chủ xử lý bằng đúng nghiệp vụ điều chỉnh/đối soát.

- Nếu đang ở chế độ minh họa, đầu kỳ bị chặn vì bộ dữ liệu đã có giao dịch; đây không phải lỗi của project Supabase mới.

<a name="nhap-hang"></a>

## 6. Nhập hàng và thu mua máy cũ

Một phiếu nhập có thể chứa điện thoại, phụ kiện số lượng và phụ kiện Serial. Cần mạng để ghi nhận.

1. Mở Nhập hàng, tìm SKU và thêm vào phiếu. Với hàng số lượng, nhập trực tiếp lượng nhận và đơn giá nhập ở bước Phiếu & thanh toán.

2. Với IMEI/Serial, nhập định danh, IMEI 2 nếu có, giá nhập và chọn tình trạng Mới hoặc Cũ · Đã kiểm tra. Mỗi chiếc máy có một dòng riêng.

3. Lặp lại cho các chiếc khác. Không nhập lại cùng một IMEI/Serial thành nhiều dòng; kiểm tra tem và IMEI trên máy trước khi lưu.

4. Chọn đúng nhà cung cấp/người bán máy cũ. Nhập giảm giá hóa đơn và Chi phí nhập trả riêng nếu phát sinh.

5. Chọn Tiền mặt, Chuyển khoản, Kết hợp hoặc Ghi nợ. Số thanh toán trong phiếu là tiền hàng; chi phí nhập trả riêng được xử lý thêm theo quy tắc tiền mặt của bản này.

6. Kiểm tra tổng, tiền đã chi và số còn phải trả, rồi Ghi nhận nhập hàng. Mở chứng từ được trả về và đối chiếu hàng đã vào kho.

### Cần nhớ

- IMEI cần 15 chữ số và mã kiểm tra hợp lệ; không bỏ kiểm tra bằng cách đổi SKU sang Serial để nhập một điện thoại sai IMEI.

- Bản này thu mua máy cũ bằng phiếu nhập từ đối tác; chưa có quy trình thu cũ đổi mới trọn gói hoặc định giá tự động.

<a name="ban-hang"></a>

## 7. Bán hàng: chọn hàng, số lượng và đúng chiếc máy

Phiếu chỉ được coi đã ghi sổ khi ứng dụng trả về chứng từ thành công. Giỏ nháp chưa làm giảm tồn trung tâm.

1. Mở Bán hàng, tìm theo tên, SKU hoặc mã vạch. Có thể tìm không dấu; gõ mã/IMEI/Serial rồi Enter hoặc Tìm mã. Nếu tên chỉ khớp một SKU, Enter cũng thêm hoặc mở chọn chiếc.

2. Chạm phụ kiện số lượng để thêm. Chạm tiếp để tăng lượng; không thể chọn vượt tồn khả dụng hiện tại.

3. Với điện thoại/phụ kiện Serial, chọn chính xác IMEI/Serial đang được phép bán. Định danh đã bán, đã chọn hoặc ngoài phần quầy được cấp không được chọn tiếp.

4. Trên phone, chọn Xem phiếu. Sửa số lượng trực tiếp hoặc dùng nút +/−, sửa đơn giá nếu được phép, bỏ dòng bằng nút xóa.

5. Chọn khách nếu cần lưu danh tính hoặc bán nợ. Kiểm tra giảm giá, tổng và phương thức thanh toán theo mục tiếp theo.

6. Chọn Xác nhận bán. Sau khi có mã chứng từ, đối chiếu tên hàng, định danh, tổng, đã trả và còn nợ trước khi giao hàng/in phiếu.

### Cần nhớ

- Tồn có thể thay đổi do máy khác bán. Nếu bị từ chối vì thiếu tồn, kiểm tra lại hàng; không tạo SKU khác để vượt chặn.

- Nếu đã cấp phiên quầy offline cho máy này, máy dùng quy trình Lưu tại quầy cả khi đang có mạng; xem mục Quầy offline.

<a name="nhap-tien"></a>

## 8. Nhập giá, giảm giá và bốn cách thanh toán

Các ô tiền VND của POS dùng số nguyên: nhập 149000 hoặc 149.000. Khi chọn ô, số hiện tại được chọn để thay nhanh. Không dùng số âm, dấu phẩy thập phân hoặc dạng 1e6.

1. Tiền mặt: ứng dụng điền đủ phần tiền hàng. Nếu chỉ thu một phần, sửa đúng số thực thu và chọn khách để ghi số còn lại thành nợ.

2. Chuyển khoản: chọn nút này để đặt tiền mặt về 0 và điền đủ tiền hàng vào chuyển khoản. Chỉ ghi nhận sau khi bạn đã kiểm tra tiền đến.

3. Kết hợp: nhập số chuyển khoản; khi chưa sửa tiền mặt thủ công, ứng dụng tính tiền mặt bằng tổng trừ chuyển khoản. Có thể sửa cả hai nếu thực tế chỉ trả một phần.

4. Ghi nợ: ứng dụng bắt đầu với tiền trả trước bằng 0. Chọn khách, nhập tiền mặt trả trước nếu có, kiểm tra phần Còn nợ.

5. Nhập Giảm giá hóa đơn đúng số giảm. Tổng sẽ cập nhật. Đơn giá bỏ trống hoặc tiền nhập sai sẽ chặn xác nhận; số 0 chỉ dùng khi chủ thực sự cho phép giao miễn phí.

6. Nếu tổng tiền mặt và chuyển khoản vượt tổng cần thanh toán, kiểm tra lại các ô; không cố ghi phần tiền thừa như doanh thu. Ngoại lệ tiền khách đưa/tiền thừa được hỗ trợ riêng trong quầy offline.

> Ví dụ kết hợp: tổng 159.000đ, chuyển khoản 100.000đ → tiền mặt tự còn 59.000đ, nợ 0đ. Ví dụ trả trước: tổng 159.000đ, thu 50.000đ → còn nợ 109.000đ, bắt buộc có khách hàng.

### Cần nhớ

- Thay phương thức thanh toán sẽ điền lại các ô tương ứng; kiểm tra lại tiền sau khi đổi. Chạm lại phương thức đang chọn không xóa số đã nhập.

- Giá bán tham khảo không phải giá vốn. Chiết khấu và trả hàng ảnh hưởng lợi nhuận; tiền thu không tự bằng lợi nhuận.

<a name="nhap-va-nhap-lai"></a>

## 9. Phiếu nháp và giao dịch chưa rõ kết quả

Nháp POS được giữ trong tab hiện tại, tách theo project, cửa hàng, tài khoản và bán/nhập.

1. Chuyển sang màn khác hoặc tải lại trong cùng tab: khi trở lại Bán hàng/Nhập hàng, kiểm tra thông báo Đã khôi phục phiếu nháp và kiểm tra lại giá/số lượng.

2. Nháp chưa ghi sổ. Sau khi giao dịch thành công, giỏ được xóa để chuẩn bị khách tiếp theo. Đóng tab hoặc xóa trình duyệt có thể làm mất nháp.

3. Nếu bấm xác nhận rồi mạng lỗi hoặc hết thời gian chờ, đọc thông báo yêu cầu chưa rõ kết quả. Dùng chức năng xác minh/thử lại yêu cầu đang chờ mà ứng dụng cung cấp.

4. Giữ nguyên nội dung yêu cầu đang chờ; không nhận tiền lại hoặc lập một phiếu mới cho cùng lần bán. Tra cứu Lịch sử khi kết nối trở lại.

5. Nếu không tự xử lý được, ghi lại mã yêu cầu/mã phiếu, giờ bán, hàng và số tiền để chủ/người triển khai đối soát.

### Cần nhớ

- Nháp tab không thay thế bản sao quầy offline và không đồng bộ sang máy khác.

- Cùng mã yêu cầu và nội dung được gửi lại để tránh ghi trùng. Nếu đã sửa nội dung, ứng dụng có thể chặn đến khi yêu cầu trước được xác minh.

<a name="lich-su-in"></a>

## 10. Tra cứu chứng từ, in và in lại

Lịch sử giao dịch là nơi tra cứu phiếu cũ; các ô gần đây ở Dashboard, đối tác hoặc thiết bị chỉ là một phần danh sách.

1. Mở Lịch sử giao dịch, tìm mã phiếu, tên khách, tên/SKU hàng hoặc đúng IMEI/Serial. Chọn loại giao dịch để thu hẹp.

2. Với dữ liệu thật, dùng Trang trước/Trang tiếp để xem từng nhóm tối đa 100 phiếu. Quyền nhân viên sẽ giới hạn những giao dịch được nhìn thấy.

3. Chạm dòng để mở chi tiết. Kiểm tra Tổng tiền, Thanh toán lúc lập phiếu và Còn nợ/Còn phải hoàn. Thanh toán lúc lập phiếu không bao gồm mọi lần thu nợ về sau.

4. Chọn In phiếu. Chọn máy in, khổ giấy và tùy chọn phù hợp trong hộp thoại của trình duyệt; nên thử in trước trên đúng máy in của quầy.

5. Muốn in lại, mở lại chính chứng từ đó. Với phiếu lưu tại quầy, vào Quầy offline → Xem / in lại và kiểm tra trạng thái đồng bộ.

### Cần nhớ

- Không tạo giao dịch mới chỉ để in lại. Phiếu offline phải giữ mã tra cứu và nhãn chưa đồng bộ cho tới khi đã lên sổ.

- Phiếu của bản này không thay thế hóa đơn điện tử. Chưa có driver in thẳng, cắt giấy tự động hoặc tích hợp phát hành hóa đơn điện tử.

<a name="cong-no"></a>

## 11. Thu nợ khách hàng, trả nợ nhà cung cấp

Thực hiện thu/chi theo chứng từ gốc để giữ đúng đối chiếu. Công nợ dương và khoản cần hoàn có ý nghĩa khác nhau.

1. Vào Công nợ, chọn phía khách hàng hoặc nhà cung cấp và đúng đối tác. Mở phiếu đang còn số dư.

2. Chọn Thanh toán. Nhập đúng số tiền thực thu hoặc thực chi, không vượt số còn cần thanh toán; chọn Tiền mặt hoặc Chuyển khoản đã kiểm chứng.

3. Xác nhận lưu, sau đó mở lại phiếu và đối chiếu số dư. Ghi nhận từng lần thu/chi riêng nếu đối tác thanh toán nhiều đợt.

4. Nếu số dư âm và ứng dụng hiện Còn phải hoàn/Ghi nhận hoàn tiền, kiểm tra đúng đối tác, chứng từ và chiều tiền rồi mới hoàn.

5. Nhân viên chỉ dùng quyền được cấp cho thu nợ khách; phần nhà cung cấp và các tác vụ chủ bị hạn chế trên server.

> Đơn 159.000đ đã thu 50.000đ, còn nợ 109.000đ. Thu thêm 60.000đ qua Thanh toán thì số dư còn 49.000đ. Không sửa số tiền trên hóa đơn cũ thành 110.000đ.

### Cần nhớ

- Không lấy khoản cửa hàng phải trả cho một đối tác để tự cấn khoản khách phải trả nếu chưa có nghiệp vụ/đối soát được hỗ trợ.

<a name="tra-doi"></a>

## 12. Trả hàng, hoàn tiền và đổi hàng

Mở đúng phiếu gốc; không tạo phiếu nhập mới để giả lập hàng bán trả lại. Chủ duyệt điều kiện đổi/trả trước khi thao tác.

1. Trong chi tiết phiếu bán/nhập, chọn Trả hàng / hoàn tiền. Nhập lượng trả cho từng dòng; không vượt Còn được trả.

2. Đối chiếu Giá trị trả, Nợ trước trả và Có thể hoàn tối đa. Với phiếu có khách còn nợ, giá trị trả được xét với nợ trước khi xác định tiền cần hoàn.

3. Nhập đúng tiền hoàn và lý do theo biểu mẫu. Bản này xử lý phần tiền hoàn trong hộp thoại trả/đổi bằng tiền mặt; không chọn thao tác này thay cho một khoản chuyển khoản chưa được kiểm chứng.

4. Muốn đổi từ hóa đơn bán có khách xác định, đánh dấu Đổi sang hàng khác trong cùng giao dịch. Chọn hàng mới, số lượng hoặc IMEI/Serial khả dụng.

5. Kiểm tra chênh lệch và tiền mặt cần thu thêm/hoàn trước khi xác nhận. Trả, bán mới và bù trừ trong luồng này được ghi cùng transaction; nếu hàng mới không còn đủ, toàn bộ lần đổi bị từ chối.

6. Hàng bán nhận lại vào trạng thái cách ly/chờ kiểm tra. Kiểm tra thực tế trước khi chủ cho phép đưa về hàng bán được.

### Cần nhớ

- Đổi trong hộp thoại hiện chọn một SKU thay thế; chưa có quy trình đổi phức tạp nhiều hàng mới hoặc tự điều chỉnh chính sách cho từng cửa hàng.

- Phiếu đã ghi sổ không sửa trực tiếp. Hàng/giá vốn trả lại dựa trên lần bán gốc; không lấy giá hiện tại để tự tính tiền hoàn.

<a name="kho-kiem-ke"></a>

## 13. Kho, kiểm kê và hàng lỗi

Khả dụng là hàng có thể bán; Cấp offline là phần quầy giữ riêng; Cách ly/Đang sửa không phải hàng được bán ngay.

1. Trong Kho hàng, lọc sản phẩm hoặc thiết bị theo IMEI/Serial, xem tồn khả dụng, phần cấp quầy và lịch sử biến động gần đây.

2. Muốn kiểm kê hàng số lượng, dừng và đối soát/đóng phiên quầy offline trước. Chọn Kiểm kê hàng lượng, SKU, lượng khả dụng thực đếm, giá vốn hàng thừa nếu có và căn cứ chênh lệch.

3. Nếu sổ đã thay đổi trong lúc đếm, tải lại và đối chiếu lại thay vì cố lưu số đếm trên phiên bản cũ.

4. Với từng máy, mở thiết bị → Đổi trạng thái có lý do; chọn Có thể bán, Chờ kiểm tra, Đang sửa chữa hoặc Hủy / mất hàng đã được xác nhận.

5. Với phụ kiện số lượng đã trả về cách ly, mở chi tiết SKU, nhập Số lượng đã kiểm tra, cho phép bán lại và kết quả kiểm tra rồi lưu.

### Cần nhớ

- Hủy/mất hàng phải là sự kiện đã được chủ xác nhận. Không dùng để làm biến mất máy cần bảo hành hoặc điều chỉnh tạm cho dễ bán.

- Không đánh đồng tổng hàng sở hữu với tồn khả dụng. Hàng đã cấp quầy chỉ trở lại kho online qua đóng phiên và đối soát.

<a name="chi-phi-bao-hanh"></a>

## 14. Chi phí thiết bị và tiếp nhận bảo hành

Chi phí sửa máy thuộc sở hữu của cửa hàng khác với việc giữ máy khách gửi bảo hành; tiếp nhận bảo hành không tự làm tăng tồn sở hữu.

1. Để ghi chi phí máy, mở thiết bị trong Kho → Ghi chi phí thiết bị. Nhập số tiền, nội dung, phương thức thanh toán thực tế và lưu.

2. Chi phí trước bán được cộng vốn máy. Chi phí phát sinh sau bán được ghi vào kỳ hiện tại; không sửa lại vốn đã snapshot trên lần bán cũ.

3. Để nhận bảo hành, mở hóa đơn bán → Tiếp nhận bảo hành từ phiếu này, hoặc vào Bảo hành → Tiếp nhận bảo hành và chọn đúng lần bán/dòng hàng.

4. Ghi đầy đủ lỗi, tình trạng bên ngoài, phụ kiện nhận kèm và thông tin liên hệ. Với hàng không Serial, gắn hồ sơ vào dòng hóa đơn bán.

5. Mở hồ sơ để chuyển Đang xử lý/Hoàn tất và nhập kết quả. Tra cứu lịch sử trước khi trả máy/hàng cho khách.

### Cần nhớ

- Thời hạn bảo hành lấy theo chính sách lưu lúc bán. Giá/bảo hành SKU thay đổi sau đó không tự sửa quyền lợi đã lưu trên phiếu trước.

- Đây là quản lý bảo hành tối thiểu, chưa có quy trình sửa chữa chuyên sâu, báo giá linh kiện hoặc tự động tính phí khách.

<a name="bao-cao"></a>

## 15. Đọc Dashboard và báo cáo đúng ý nghĩa

Doanh thu, lợi nhuận gộp, dòng tiền và công nợ là bốn nhóm khác nhau; không dùng một số để thay cho số khác.

1. Tại Tổng quan, chọn khoảng thời gian biểu đồ và xem doanh thu, giá vốn, số nợ, giá trị tồn và hàng chạm ngưỡng cần nhập.

2. Tại Báo cáo, chọn từ ngày/đến ngày theo ngày Việt Nam. Đối chiếu doanh thu thuần, giá vốn và nhóm hàng; doanh thu bị ảnh hưởng bởi giảm giá và trả hàng.

3. Đối chiếu thực thu tiền mặt/ngân hàng riêng. Bán nợ có doanh thu nhưng tiền chưa thu đủ; thu nợ cũ có tiền vào nhưng không tạo lại doanh thu bán mới.

4. Xem công nợ phải thu/phải trả và tồn riêng. Chủ nhìn giá vốn/lợi nhuận; nhân viên không được server trả các số vốn bị hạn chế.

5. Tổng hợp dữ liệu thật tính trên toàn sổ. Bảng chi tiết gần đây/CSV hiện chỉ dựa trên tối đa 500 chứng từ gần nhất; dùng Lịch sử để tìm phiếu ngoài phạm vi đó.

> Bán 159.000đ với vốn 65.000đ thì chênh lệch gộp của hàng là 94.000đ trước các điều chỉnh/chi phí liên quan. Nếu mới thu 50.000đ, dòng tiền vào lúc bán vẫn chỉ 50.000đ và còn nợ 109.000đ.

### Cần nhớ

- Đây là báo cáo quản trị theo quy tắc bản thử và chính sách chủ xác nhận, chưa phải báo cáo kê khai thuế hoặc hệ thống kế toán hoàn chỉnh.

<a name="quay-offline"></a>

## 16. Chuẩn bị và bán khi mất Internet

Chỉ một máy quầy được chỉ định được bán offline, trong đúng phần hàng đã được cấp khi còn mạng.

1. Trên đúng máy và hồ sơ trình duyệt sẽ dùng, mở bản production khi còn mạng, đăng nhập và vào Quầy offline. Chờ trạng thái bộ nhớ PWA sẵn sàng; người triển khai cần thử ngắt mạng và mở lại trên máy thực tế trước vận hành.

2. Chủ chọn Cấp hàng cho máy này, đánh dấu IMEI/Serial cụ thể hoặc nhập hạn mức phụ kiện, kiểm tra giá rồi Xác nhận cấp hàng.

3. Kiểm tra máy hiển thị Đã đăng ký máy này và danh sách hàng cấp. Thiết bị khác không thể bán phần tồn đó.

4. Vào Bán hàng. Chỉ chọn hàng đã cấp, đúng giá đã cấp và thu đủ tiền mặt; không ghi nợ, chuyển khoản hoặc giảm thêm trong phiên quầy.

5. Chọn Lưu tại quầy. Chờ ứng dụng xác nhận đã lưu bền vững rồi in phiếu có nhãn chưa đồng bộ và mã tra cứu. Nếu khách đưa dư, kiểm tra tiền thừa phải trả.

6. Khi có mạng, mở Quầy offline. Đồng bộ tự chạy trên màn hình này; có thể dùng Đồng bộ / thử lại. Kiểm tra phiếu đã có trạng thái Đã đồng bộ và mã bán trung tâm.

### Cần nhớ

- Có mạng trở lại không có nghĩa mọi phiếu đã lên sổ: cần mở màn Quầy offline và kiểm tra từng trạng thái. Không thu tiền hoặc lập lại hóa đơn khi đồng bộ.

- Máy chưa được cấp quyền chỉ có thể soạn nháp lúc mất mạng. Không tự thu hồi hạn mức của máy mất liên lạc để cấp sang máy khác.

<a name="dong-ca"></a>

## 17. Đối soát cuối ngày, sao lưu và đóng phiên quầy

Mục tiêu là khớp hàng, tiền, chứng từ trung tâm và phiếu tại máy trước khi kết thúc ca.

1. Dừng nhận thêm đơn trên quầy. Mở Quầy offline, đồng bộ các phiếu và xử lý các phiếu cần kiểm tra trước.

2. Đối chiếu tổng tiền mặt thực giữ với tiền thu/hoàn, thanh toán nợ và chi tiền thực tế. Đối chiếu chuyển khoản bằng nguồn kiểm chứng của cửa hàng.

3. Kiểm số hàng còn giữ tại quầy; đối chiếu IMEI/Serial, hạn mức phụ kiện, số đã bán và phần chưa bán.

4. Chọn Xuất bản sao quầy, lưu tệp JSON ra nơi an toàn có thể truy cập khi máy gặp sự cố. Tệp có dữ liệu giao dịch nên chỉ bàn giao cho người có trách nhiệm, không đưa lên GitHub.

5. Khi phiếu chưa đồng bộ bằng 0, đã kiểm hàng/tiền và còn mạng, đánh dấu xác nhận đã dừng bán/đối soát rồi chọn Đóng phiên & trả hàng chưa bán.

6. Kiểm tra phiên đã đóng và phần chưa bán trở lại kho online. Chủ đối chiếu báo cáo ngày, công nợ và các giao dịch bất thường trước khi kết ca.

### Cần nhớ

- Không xóa dữ liệu trình duyệt, đăng xuất, đổi máy hoặc đổi project khi còn phiếu cần xử lý. Không sao chép hồ sơ trình duyệt để nhân bản quyền bán offline.

- Bản xuất quầy hiện dùng làm bằng chứng/đối soát; chưa có tự nhập bản sao hay tự phục hồi sau mất máy. Cần người triển khai diễn tập khôi phục database/Auth và quy trình ngoại lệ trước dùng thật.

<a name="quyen-cai-dat"></a>

## 18. Tài khoản, quyền và cài đặt ứng dụng

Quyền dữ liệu thật được kiểm tra tại Supabase, không chỉ dựa vào việc có thấy một nút trong giao diện.

1. Chủ nhờ người quản trị tạo/invite tài khoản trong Supabase Authentication. Sau đó vào Cài đặt và gán email đã có tài khoản vào vai trò phù hợp.

2. Chủ thực hiện nhập hàng, cấu hình, đầu kỳ, điều chỉnh, cấp quầy và các tác vụ quản trị. Nhân viên chỉ sử dụng các quyền bán, thu nợ khách và tiếp nhận bảo hành được cấp; không được nhìn vốn hoặc làm nghiệp vụ nhà cung cấp bị hạn chế.

3. Dùng tài khoản riêng cho từng người, đúng tài khoản được chỉ định trên máy quầy. Nếu báo chỉ dành cho chủ, chuyển yêu cầu cho chủ thay vì dùng chung mật khẩu.

4. Để cài PWA, mở liên kết bằng trình duyệt có hỗ trợ cài ứng dụng và dùng chức năng cài/đưa ra màn hình chính nếu có. Bản development không có đầy đủ shell offline như bản production.

5. Cấu hình kết nối riêng cho khách do người triển khai quản lý theo tài liệu README của bộ mã nguồn. Người bán không cần tài khoản quản trị Supabase để sử dụng hàng ngày.

### Cần nhớ

- Đường dẫn bản thử Sites có lớp đăng nhập ChatGPT riêng. Mỗi bản cài khách cần được bàn giao đúng quyền truy cập và tài khoản cửa hàng.

- Bản này chưa nghiệm thu Safari, bàn phím ảo hoặc mọi máy in thực tế; cần thử trên đúng thiết bị trước nhận giao dịch thật.

<a name="xu-ly-loi"></a>

## 19. Khi gặp lỗi: xử lý theo tình huống

Ưu tiên giữ dữ liệu và xác minh kết quả trước khi làm lại. Ghi lại thông báo chính xác để người phụ trách hỗ trợ.

1. Chưa xác nhận chính sách: chủ vào Cài đặt, rà lại quy tắc và lưu xác nhận. Không dùng dữ liệu minh họa để né chặn ghi sổ thật.

2. Không đủ tồn, IMEI đã dùng hoặc không còn khả dụng: kiểm tra đúng SKU/chiếc máy, giỏ hiện tại, hàng cách ly và hạn mức quầy. Tải lại dữ liệu khi có mạng; không sửa định danh để tạo một máy giả.

3. Số tiền không hợp lệ hoặc thanh toán vượt tổng: nhập VND nguyên, kiểm tra giảm giá, tiền mặt và chuyển khoản. Ví dụ 1.5 không hợp lệ; 1.500 là một nghìn năm trăm.

4. Yêu cầu trước chưa rõ kết quả: giữ mã/nội dung yêu cầu, dùng chức năng xác minh/thử lại và tra Lịch sử. Không xóa dữ liệu hay lập đơn thứ hai cho cùng lần thu tiền.

5. Phiếu quầy ở trạng thái cần kiểm tra: dừng đồng bộ tự động theo thông báo, giữ nguyên phiếu và xuất bản sao; gửi mã tra cứu/giờ/tiền cho chủ/người triển khai, không thu tiền lại.

6. Không đóng được phiên: kiểm tra còn phiếu chờ không, có phải đúng máy/tài khoản được cấp không, đã đánh dấu đối soát chưa và mạng có hoạt động không.

7. Không mở được dữ liệu thật hoặc đăng nhập lỗi: kiểm tra đúng liên kết bản cài, tài khoản cửa hàng và kết nối; liên hệ người triển khai để kiểm tra Auth/RPC. Không gửi secret/service_role key vào khung hỗ trợ.

8. Mất máy hoặc bị xóa dữ liệu quầy: ngừng cấp lại phần hàng có rủi ro bán trùng, giữ chứng từ in/bản xuất còn có và nhờ người phụ trách đối soát với sổ trung tâm trước khi mở lại quyền bán.

### Cần nhớ

- Khi nhờ hỗ trợ, cung cấp tên bản cài, mã phiếu/yêu cầu, giờ xảy ra, thao tác và thông báo; che thông tin khách không cần thiết. Không gửi mật khẩu, mã đăng nhập hay khóa quản trị.
