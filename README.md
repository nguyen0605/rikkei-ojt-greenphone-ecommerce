CÁC LỆNH CẦN THIẾT: - FE: npm run dev
                    - BE: .\gradlew bootRun
                    - log VPS: docker compose -f docker-compose.prod.yml logs -f
                    - mysql VPS: docker exec -it greenphone-mysql mysql -u root -proot greenphone


3. Hướng Dẫn Các Bước Thực Hiện Demo Với Mentor
Bước 1: Cập Nhật Số Lượng Tồn Kho Về Đúng 1 Sản Phẩm

Mở DBeaver / Navicat hoặc terminal kết nối MySQL và chạy câu lệnh sau (ví dụ kiểm thử với biến thể id = 1):

sql
UPDATE phone_variant SET stock_quantity = 1 WHERE id = 1;
UPDATE warehouse_stock SET quantity = 1 WHERE phone_variant_id = 1 AND warehouse_id = 1;
UPDATE warehouse_stock SET quantity = 0 WHERE phone_variant_id = 1 AND warehouse_id IN (2, 3);
Bước 2: Khởi Chạy Kịch Bản Chia Đôi Màn Hình

Mở Terminal tại thư mục gốc dự án và chạy lệnh:

Nếu chạy trên môi trường Localhost:

bash
python scripts/demo_concurrency_split_screen.py

Nếu chạy trên môi trường VPS (DuckDNS):

bash
python scripts/demo_concurrency_split_screen.py --url https://greenphone.duckdns.org
Bước 3: Thao Tác Chuẩn Bị Trên Cả 2 Cửa Sổ Trình Duyệt
Cửa sổ bên Trái: Đăng nhập tài khoản 1 (ví dụ an.nguyen@example.com / 123456789), chọn sản phẩm có biến thể id = 1, nhấn "Tiến hành đặt hàng" và đi tới bước hiển thị nút "Đặt hàng (COD)".
Cửa sổ bên Phải: Đăng nhập tài khoản 2 (ví dụ laotuyentvm@gmail.com / 123456789), cũng chọn đúng sản phẩm đó và đi tới bước hiển thị nút "Đặt hàng (COD)".
Bước 4: Kích Hoạt Và Trình Bày Demo
Quay lại cửa sổ Terminal và nhấn [ENTER].
Quan sát trực tiếp trên 2 nửa màn hình:
Một bên hoàn tất đơn hàng thành công.
Bên còn lại hiện thông báo lỗi đỏ từ Ant Design: "Sản phẩm không đủ số lượng trong kho".
Bạn có thể trình bày với Mentor cơ chế kỹ thuật: Hệ thống sử dụng @Lock(LockModeType.PESSIMISTIC_WRITE) tại tầng cơ sở dữ liệu. Khi hai giao dịch diễn ra đồng thời, một giao dịch sẽ giữ khóa hàng (row-level lock) để trừ kho, giao dịch sau phải đợi và bị từ chối ngay lập tức khi kiểm tra số lượng tồn kho còn lại bằng 0, đảm bảo kho hàng không bao giờ bị bán âm.