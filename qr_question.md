Hi, tôi hiểu bạn muốn đổi nội dung quét mã QR thành: `Thanh toan don hang NSGSTARTUP voi ma don [Số đơn] [Ngày tạo]`. 

Tuy nhiên, có một chi tiết kỹ thuật nhỏ: 
Hiện tại ở cả **trang Khách tự đặt** (`/page.tsx`) lẫn **trang Thu Ngân POS** (`/pos/page.tsx`), **mã QR được hiển thị ngay trước khi Người dùng/Thu ngân bấm nút "Đặt hàng" / "Xác nhận"**. Tức là lúc này Đơn hàng chưa hề được lưu vào Hệ thống nên **chưa có Số Đơn**.

Để có Số Đơn chính xác dán vào mã QR, ta có **2 cách giải quyết**:

1. **Cách 1 (Khuyên Dùng):**
Di chuyển việc hiển thị Mã QR sang **Sau khi** bấm "Đặt hàng". Tức là khách/thu ngân bấm Tạo đơn xong -> Hiện ra bảng thông báo "Đơn hàng #XYZ đã tạo thành công" và KÈM THEO mã QR lúc đó luôn. Nội dung chuyển khoản sẽ cực kỳ chuẩn xác: `Thanh toan don hang NSGSTARTUP voi ma don 123 ngay 18042026`.

2. **Cách 2:**
Giữ nguyên hiển thị mã QR lúc chọn hình thức ("Chuyển khoản") nhưng thay vì Dùng "Số đơn", ta sẽ dùng "SỐ ĐIỆN THOẠI" hoặc 1 mã ngẫu nhiên thay thế vì lúc này số đơn chưa tồn tại.

Bạn tham khảo và cho tôi biết bạn muốn làm theo Cách 1 hay Cách 2 nhé? Cảm ơn bạn!
