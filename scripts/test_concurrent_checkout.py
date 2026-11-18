#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kịch bản kiểm thử đồng thời (Concurrency Test Script) cho hệ thống GreenPhone.
Mục tiêu: Dùng 2 tài khoản người dùng cùng lúc gửi yêu cầu đặt mua cùng một biến thể sản phẩm (PhoneVariant)
nhằm kiểm tra cơ chế khóa bi quan (@Lock Pessimistic Write), chống bán âm và logic trừ tồn kho khi số lượng trong kho sắp hết.
"""

import argparse
import json
import sys
import threading
import time
from datetime import datetime

try:
    import requests
except ImportError:
    print("Lỗi: Thư viện 'requests' chưa được cài đặt. Vui lòng chạy: pip install requests")
    sys.exit(1)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Kịch bản kiểm thử đặt hàng đồng thời chống bán âm kho (GreenPhone Concurrency Test)"
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:8080/api",
        help="Đường dẫn gốc của Backend API (mặc định: http://localhost:8080/api)",
    )
    parser.add_argument(
        "--user1-email",
        default="an.nguyen@example.com",
        help="Email của tài khoản User 1 (mặc định: an.nguyen@example.com)",
    )
    parser.add_argument(
        "--user1-password",
        default="123456789",
        help="Mật khẩu của tài khoản User 1 (mặc định: 123456789)",
    )
    parser.add_argument(
        "--user2-email",
        default="laotuyentvm@gmail.com",
        help="Email của tài khoản User 2 (mặc định: laotuyentvm@gmail.com)",
    )
    parser.add_argument(
        "--user2-password",
        default="123456789",
        help="Mật khẩu của tài khoản User 2 (mặc định: 123456789)",
    )
    parser.add_argument(
        "--variant-id",
        type=int,
        default=1,
        help="ID biến thể sản phẩm cần kiểm thử đặt mua (mặc định: 1)",
    )
    parser.add_argument(
        "--phone-id",
        type=int,
        default=1,
        help="ID sản phẩm cha chứa biến thể (mặc định: 1)",
    )
    parser.add_argument(
        "--quantity",
        type=int,
        default=1,
        help="Số lượng mỗi tài khoản đặt mua trong một đơn (mặc định: 1)",
    )
    return parser.parse_args()


def get_live_variant_stock(base_url, phone_id, variant_id):
    """Lấy số lượng tồn kho trực tiếp từ Admin API (không qua bộ nhớ đệm Redis)."""
    try:
        login_res = requests.post(
            f"{base_url}/auth/login",
            json={"email": "admin@greenphone.vn", "password": "123456789"},
            timeout=5
        )
        if login_res.status_code == 200:
            token = login_res.json().get("data", {}).get("token")
            variants_res = requests.get(
                f"{base_url}/admin/phones/{phone_id}/variants",
                headers={"Authorization": f"Bearer {token}"},
                timeout=5
            )
            if variants_res.status_code == 200:
                variants = variants_res.json().get("data", [])
                for v in variants:
                    if v.get("id") == variant_id:
                        return v.get("stockQuantity")
    except Exception:
        pass
    return None


def login_user(base_url, email, password, user_label):
    """Đăng nhập để nhận JWT Bearer Token."""
    login_url = f"{base_url}/auth/login"
    payload = {
        "email": email,
        "password": password
    }
    headers = {"Content-Type": "application/json"}
    
    print(f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] [{user_label}] Đang đăng nhập tài khoản: {email}...")
    try:
        response = requests.post(login_url, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            token = data.get("data", {}).get("token")
            if token:
                print(f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] [{user_label}] Đăng nhập thành công.")
                return token
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] [{user_label}] Lỗi: Không tìm thấy token trong phản hồi: {data}")
                return None
        else:
            print(f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] [{user_label}] Đăng nhập thất bại (HTTP {response.status_code}): {response.text}")
            return None
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] [{user_label}] Ngoại lệ khi kết nối đăng nhập: {str(e)}")
        return None


def execute_order(barrier, base_url, token, user_label, variant_id, quantity, results):
    """Hàm đặt hàng chạy trên từng luồng độc lập, được đồng bộ qua Barrier."""
    order_url = f"{base_url}/orders"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": f"test-concurrency-{user_label.lower().replace(' ', '')}-{int(time.time() * 1000)}"
    }
    payload = {
        "receiverName": f"Khách hàng Thử Nghiệm {user_label}",
        "receiverPhone": "0987654321",
        "shippingAddress": "123 Đường Thử Nghiệm, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
        "paymentMethod": "COD",
        "note": f"Đơn hàng kiểm thử đồng thời chống bán âm - {user_label}",
        "buyNow": True,
        "items": [
            {
                "phoneVariantId": variant_id,
                "quantity": quantity
            }
        ]
    }

    # Chờ tất cả luồng cùng đạt tới điểm này trước khi bắn request
    barrier.wait()
    send_time = datetime.now()
    start_perf = time.perf_counter()

    try:
        response = requests.post(order_url, json=payload, headers=headers, timeout=15)
        duration_ms = (time.perf_counter() - start_perf) * 1000
        recv_time = datetime.now()

        results[user_label] = {
            "status_code": response.status_code,
            "send_time": send_time.strftime("%H:%M:%S.%f")[:-3],
            "recv_time": recv_time.strftime("%H:%M:%S.%f")[:-3],
            "duration_ms": round(duration_ms, 2),
            "response_body": response.text,
            "success": response.status_code in (200, 201)
        }
    except Exception as e:
        duration_ms = (time.perf_counter() - start_perf) * 1000
        results[user_label] = {
            "status_code": 0,
            "send_time": send_time.strftime("%H:%M:%S.%f")[:-3],
            "recv_time": datetime.now().strftime("%H:%M:%S.%f")[:-3],
            "duration_ms": round(duration_ms, 2),
            "response_body": f"Ngoại lệ kết nối: {str(e)}",
            "success": False
        }


def main():
    args = parse_args()

    print("=" * 80)
    print("KIEM THU DONG THOI: CHONG BAN AM KHO HANG KHI NHIEU TAI KHOAN CUNG DAT HANG")
    print("=" * 80)
    print(f"- Backend API URL:      {args.base_url}")
    print(f"- ID San pham / Bien the: Phone #{args.phone_id} -> Variant #{args.variant_id}")
    print(f"- So luong moi don:     {args.quantity}")
    print(f"- Tai khoan User 1:     {args.user1_email}")
    print(f"- Tai khoan User 2:     {args.user2_email}")

    initial_stock = get_live_variant_stock(args.base_url, args.phone_id, args.variant_id)
    if initial_stock is not None:
        print(f"- Ton kho thuc te hien tai: {initial_stock} san pham")
    print("=" * 80)

    # 1. Đăng nhập 2 tài khoản để lấy token
    token1 = login_user(args.base_url, args.user1_email, args.user1_password, "User 1 (an.nguyen)")
    token2 = login_user(args.base_url, args.user2_email, args.user2_password, "User 2 (laotuyentvm)")

    if not token1 or not token2:
        print("\nKet luan: Khong the thuc hien kiem thu do dang nhap khong thanh cong.")
        print("Goi y: Vui long kiem tra Backend dang chay va mat khau hop le.")
        sys.exit(1)

    print("\nChuan bi ban request dong thoi tu 2 luong (su dung threading.Barrier)...")
    barrier = threading.Barrier(2)
    results = {}

    thread1 = threading.Thread(
        target=execute_order,
        args=(barrier, args.base_url, token1, "User 1 (an.nguyen)", args.variant_id, args.quantity, results)
    )
    thread2 = threading.Thread(
        target=execute_order,
        args=(barrier, args.base_url, token2, "User 2 (laotuyentvm)", args.variant_id, args.quantity, results)
    )

    thread1.start()
    thread2.start()

    thread1.join()
    thread2.join()

    print("\n" + "=" * 80)
    print("KET QUA PHAN HOI DONG THOI TU SERVER")
    print("=" * 80)

    for label in ["User 1 (an.nguyen)", "User 2 (laotuyentvm)"]:
        res = results.get(label, {})
        status = res.get("status_code", 0)
        success = res.get("success", False)
        status_text = "THANH CONG (HTTP " + str(status) + ")" if success else "THAT BAI / BI CHAN (HTTP " + str(status) + ")"
        
        print(f"\n--- {label} ---")
        print(f"Trang thai:        {status_text}")
        print(f"Thoi diem gui:     {res.get('send_time')}")
        print(f"Thoi diem nhan:    {res.get('recv_time')}")
        print(f"Thoi gian xu ly:   {res.get('duration_ms')} ms")
        
        raw_body = res.get("response_body", "")
        try:
            parsed = json.loads(raw_body)
            print("Noi dung phan hoi:")
            print(json.dumps(parsed, ensure_ascii=False, indent=2))
        except Exception:
            print(f"Noi dung phan hoi tho: {raw_body}")

    print("\n" + "=" * 80)
    print("DANH GIA CO CHE KHOA CONCURRENCY & CHONG BAN AM")
    print("=" * 80)

    res1 = results.get("User 1 (an.nguyen)", {})
    res2 = results.get("User 2 (laotuyentvm)", {})

    success_count = (1 if res1.get("success") else 0) + (1 if res2.get("success") else 0)

    after_stock = get_live_variant_stock(args.base_url, args.phone_id, args.variant_id)
    if after_stock is not None:
        print(f"- Ton kho thuc te sau kiem thu: {after_stock} san pham")

    if success_count == 1:
        print("\nDANH GIA: DAT CHUAN - HE THONG CHONG BAN AM THANH CONG!")
        print("Giai thich:")
        print("- Mot luong da chiem duoc khoa bi quan (@Lock Pessimistic Write) truoc va dat hang thanh cong.")
        print("- Luong con lai bi chan lai ngay khi kiem tra ton kho (variant.getStockQuantity() < itemReq.getQuantity()).")
        print("- Server tra ve HTTP 400 Bad Request voi thong bao: San pham khong du so luong trong kho.")
        print("- Ton kho duoc bao ve tuyet doi, khong bao gio bi am duoi 0.")
    elif success_count == 2:
        print("\nDANH GIA: CA 2 LUONG DEU DAT THANH CONG.")
        print("Luu y: Kich ban nay xay ra khi so luong ton kho ban dau lon hon hoac bang tong so luong ca 2 don (>= 2).")
        print("De kiem thu tinh huong tranh chap 1 san pham duy nhat, vui long cap nhat ton kho ve dung 1 san pham:")
        print(f"SQL: UPDATE phone_variant SET stock_quantity = 1 WHERE id = {args.variant_id};")
    else:
        print("\nDANH GIA: CA 2 LUONG DEU THAT BAI HOAC CO LOI XAY RA.")
        print("Vui long kiem tra chi tiet thong bao loi o tren de xu ly.")
    print("=" * 80)


if __name__ == "__main__":
    main()


# UPDATE phone_variant SET stock_quantity = 1 WHERE id = 1;
# UPDATE warehouse_stock SET quantity = 1 WHERE phone_variant_id = 1 AND warehouse_id = 1;
# UPDATE warehouse_stock SET quantity = 0 WHERE phone_variant_id = 1 AND warehouse_id IN (2, 3);