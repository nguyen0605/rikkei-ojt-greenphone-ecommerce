#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kich ban demo truc quan dong thoi (Concurrency Split-Screen Visual Demo)
Danh cho he thong GreenPhone.

Muc tieu:
- Mo 2 cua so trinh duyet Chrome chia doi man hinh (Nua Trai va Nua Phai).
- Moi cua so la mot Profile doc lap (User 1 va User 2), khong bi chia se session/cookie/localStorage.
- Nguoi dung tu do thao tac bang tay: dang nhap 2 tai khoan khac nhau, vao gio hang va den trang Thanh toan (/thanh-toan).
- Khi ca 2 ben da san sang tai nut "Dat hang", chi can bam phim [ENTER] tai Terminal:
  Script se kich hoat su kien click nut "Dat hang" tren ca 2 man hinh tai cung mot phan nghin giay (dong bo bang threading.Barrier).
- Truc tiep chung kien tren man hinh:
  + 1 man hinh: Dat hang thanh cong (chuyen den trang hoan tat don hang).
  + 1 man hinh: Bi chan lap tuc voi thong bao do "San pham khong du so luong trong kho" (khoa bi quan @Lock Pessimistic Write hoat dong chuan xac).
"""

import argparse
import ctypes
import os
import sys
import tempfile
import threading
import time
from datetime import datetime

try:
    import requests
except ImportError:
    requests = None

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Loi: Thuw vien 'playwright' chua duoc cai dat.")
    print("Vui long chay lenh sau de cai dat: pip install playwright")
    print("Sau do chay tiep: playwright install chromium")
    sys.exit(1)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Demo truc quan chia doi man hinh chong ban am (GreenPhone Concurrency Split-Screen Demo)"
    )
    parser.add_argument(
        "--url",
        default="http://localhost:5173",
        help="Dia chi trang Frontend (mac dinh: http://localhost:5173 hoac https://greenphone.duckdns.org)",
    )
    parser.add_argument(
        "--api-url",
        default="http://localhost:8080/api",
        help="Dia chi Backend API de kiem tra ton kho (mac dinh: http://localhost:8080/api)",
    )
    parser.add_argument(
        "--phone-id",
        type=int,
        default=1,
        help="ID san pham cha can kiem tra ton kho (mac dinh: 1)",
    )
    parser.add_argument(
        "--variant-id",
        type=int,
        default=1,
        help="ID bien the san pham can kiem tra ton kho (mac dinh: 1)",
    )
    return parser.parse_args()


def get_screen_dimensions():
    """Lay do phan giai man hinh thuc te tren Windows hoac tra ve 1920x1080 mac dinh."""
    width, height = 1920, 1080
    try:
        if sys.platform == "win32":
            user32 = ctypes.windll.user32
            user32.SetProcessDPIAware()
            width = user32.GetSystemMetrics(0)
            height = user32.GetSystemMetrics(1)
    except Exception:
        pass
    return width, height


def get_live_variant_stock(base_url, phone_id, variant_id):
    """Kiem tra so luong ton kho truc tiep qua Admin API (ke thua tu test_concurrent_checkout.py)."""
    if not requests:
        return None
    try:
        login_res = requests.post(
            f"{base_url}/auth/login",
            json={"email": "admin@greenphone.vn", "password": "123456789"},
            timeout=3,
        )
        if login_res.status_code == 200:
            token = login_res.json().get("data", {}).get("token")
            variants_res = requests.get(
                f"{base_url}/admin/phones/{phone_id}/variants",
                headers={"Authorization": f"Bearer {token}"},
                timeout=3,
            )
            if variants_res.status_code == 200:
                variants = variants_res.json().get("data", [])
                for v in variants:
                    if v.get("id") == variant_id:
                        return v.get("stockQuantity")
    except Exception:
        pass
    return None


def worker_click_order(barrier, page, user_label, results):
    """
    Luong phu trach cho tung cua so:
    Doi tai barrier de dong thoi click nut Dat hang tai dung cung mot mili-giay.
    """
    try:
        # Script JS tim nut Dat hang: uu tien nut primary chua chu 'Dat hang' hoac class ant-btn-primary
        click_script = """
        () => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const orderBtn = buttons.find(b => {
                const text = (b.innerText || b.textContent || '').trim();
                return text.includes('Đặt hàng') || text.includes('Dat hang');
            }) || document.querySelector('button.ant-btn-primary');
            
            if (orderBtn) {
                orderBtn.click();
                return { success: true, text: orderBtn.innerText };
            }
            return { success: False, text: null };
        }
        """

        # Cho tat ca cac luong cung den diem san sang truoc khi click
        barrier.wait()
        click_time = datetime.now()
        start_perf = time.perf_counter()

        res = page.evaluate(click_script)
        duration_ms = (time.perf_counter() - start_perf) * 1000

        results[user_label] = {
            "clicked": res.get("success", False),
            "button_text": res.get("text"),
            "click_time": click_time.strftime("%H:%M:%S.%f")[:-3],
            "duration_ms": round(duration_ms, 2),
            "error": None,
        }
    except Exception as e:
        results[user_label] = {
            "clicked": False,
            "button_text": None,
            "click_time": datetime.now().strftime("%H:%M:%S.%f")[:-3],
            "duration_ms": 0,
            "error": str(e),
        }


def print_banner(args, screen_w, screen_h):
    print("=" * 80)
    print(" GREENPHONE - DEMO TRUC QUAN CHIA DOI MAN HINH CHONG BAN AM KHO HANG")
    print(" Co che kiem chung: Khoa bi quan (@Lock Pessimistic Write) tai tang Database")
    print("=" * 80)
    print(f"- Dia chi Frontend:       {args.url}")
    print(f"- Do phan giai phat hien: {screen_w} x {screen_h} px")
    print(f"- Cua so ben Trai (User 1): Vi tri (0, 0) - Kich thuoc {screen_w // 2} x {screen_h - 60} px")
    print(f"- Cua so ben Phai (User 2): Vi tri ({screen_w // 2}, 0) - Kich thuoc {screen_w // 2} x {screen_h - 60} px")

    live_stock = get_live_variant_stock(args.api_url, args.phone_id, args.variant_id)
    if live_stock is not None:
        print(f"- Ton kho thuc te hien tai: {live_stock} san pham (Variant #{args.variant_id})")
    else:
        print(f"- Luu y ve ton kho: Hay chac chan bien the #{args.variant_id} co dung 1 san pham de demo!")

    print("\n[GOI Y CAU LENH SQL CHUAN BI TON KHO = 1 SAN PHAM DE DEMO]")
    print(f"  UPDATE phone_variant SET stock_quantity = 1 WHERE id = {args.variant_id};")
    print(f"  UPDATE warehouse_stock SET quantity = 1 WHERE phone_variant_id = {args.variant_id} AND warehouse_id = 1;")
    print(f"  UPDATE warehouse_stock SET quantity = 0 WHERE phone_variant_id = {args.variant_id} AND warehouse_id IN (2, 3);")
    print("=" * 80)


def main():
    args = parse_args()
    screen_w, screen_h = get_screen_dimensions()
    half_w = screen_w // 2
    win_h = max(700, screen_h - 60)

    print_banner(args, screen_w, screen_h)

    # Tao 2 thu muc profile doc lap trong tempdir
    temp_base = tempfile.gettempdir()
    profile_dir1 = os.path.join(temp_base, "greenphone_demo_user1")
    profile_dir2 = os.path.join(temp_base, "greenphone_demo_user2")
    os.makedirs(profile_dir1, exist_ok=True)
    os.makedirs(profile_dir2, exist_ok=True)

    print("\nDang khoi dong 2 trinh duyet Chrome doc lap...")

    p = sync_playwright().start()

    # Cua so 1: Nua man hinh ben Trai
    ctx1 = p.chromium.launch_persistent_context(
        profile_dir1,
        headless=False,
        viewport=None,
        args=[
            f"--window-position=0,0",
            f"--window-size={half_w},{win_h}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-blink-features=AutomationControlled",
        ],
    )
    page1 = ctx1.pages[0] if ctx1.pages else ctx1.new_page()

    # Cua so 2: Nua man hinh ben Phai
    ctx2 = p.chromium.launch_persistent_context(
        profile_dir2,
        headless=False,
        viewport=None,
        args=[
            f"--window-position={half_w},0",
            f"--window-size={half_w},{win_h}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-blink-features=AutomationControlled",
        ],
    )
    page2 = ctx2.pages[0] if ctx2.pages else ctx2.new_page()

    print("Dang dieu huong ca 2 cua so den dia chi:", args.url)
    try:
        page1.goto(args.url, timeout=15000)
    except Exception as e:
        print(f"Luu y: Cua so 1 load cham: {e}")

    try:
        page2.goto(args.url, timeout=15000)
    except Exception as e:
        print(f"Luu y: Cua so 2 load cham: {e}")

    print("\n" + "#" * 80)
    print("HUONG DAN THAO TAC DEMO CHO NGUOI DUNG:")
    print("1. Tren CUA SO BEN TRAI (User 1):")
    print("   - Dang nhap tai khoan 1 (Vi du: an.nguyen@example.com / 123456789).")
    print("   - Chon dien thoai, them vao gio hang va bam 'Tien hanh dat hang'.")
    print("   - Dien dia chi nhan hang, den buoc cuoi cung (dang nhin thay nut 'Dat hang (COD)').")
    print("2. Tren CUA SO BEN PHAI (User 2):")
    print("   - Dang nhap tai khoan 2 (Vi du: laotuyentvm@gmail.com / 123456789).")
    print("   - Chon dung san pham / bien the do, them vao gio va den buoc 'Dat hang (COD)'.")
    print("3. KHI CA 2 BEN DA DUNG O MAN HINH THANH TOAN VA SAN SANG NUT 'DAT HANG':")
    print("   - Hay quay lai Terminal nay va nhan [ENTER].")
    print("   - Script se dong thoi click vao nut 'Dat hang' tren ca 2 man hinh tai cung mot thoi diem.")
    print("#" * 80)

    while True:
        try:
            user_input = input("\nNhan [ENTER] de kich hoat click dong thoi (hoac go 'q' de thoat): ").strip().lower()
            if user_input == "q":
                print("Dang dong cac cua so trinh duyet...")
                break

            print("\n--> Dang chuan bi ban su kien Click dong thoi qua threading.Barrier...")
            barrier = threading.Barrier(2)
            results = {}

            t1 = threading.Thread(
                target=worker_click_order,
                args=(barrier, page1, "Man hinh TRAI (User 1)", results),
            )
            t2 = threading.Thread(
                target=worker_click_order,
                args=(barrier, page2, "Man hinh PHAI (User 2)", results),
            )

            t1.start()
            t2.start()

            t1.join()
            t2.join()

            print("\n" + "=" * 80)
            print("KET QUA THUC THI CLICK DONG THOI:")
            print("=" * 80)
            for label in ["Man hinh TRAI (User 1)", "Man hinh PHAI (User 2)"]:
                info = results.get(label, {})
                print(f"[{label}]")
                print(f"  - Thoi diem click: {info.get('click_time')}")
                print(f"  - Thoi gian xu ly: {info.get('duration_ms')} ms")
                print(f"  - Da tim thay nut: {info.get('clicked')} (Noi dung: '{info.get('button_text')}')")
                if info.get("error"):
                    print(f"  - Ngoai le:        {info.get('error')}")

            print("\nDang quan sat phan hoi tren giao dien trong 3 giay...")
            time.sleep(3)

            # Doc thong bao tren ca 2 man hinh
            check_ui_script = """
            () => {
                const toasts = Array.from(document.querySelectorAll('.ant-message-notice, .ant-notification-notice, .text-red-500, .text-red-600'))
                                    .map(el => (el.innerText || el.textContent || '').trim())
                                    .filter(t => t.length > 0);
                return {
                    url: window.location.href,
                    messages: toasts
                };
            }
            """
            ui1 = page1.evaluate(check_ui_script)
            ui2 = page2.evaluate(check_ui_script)

            print("\n" + "-" * 80)
            print("DANH GIA TRANG THAI GIAO DIEN THUC TE:")
            print(f"- Man hinh TRAI: URL hien tai: {ui1.get('url')}")
            if ui1.get("messages"):
                print(f"  Thong bao tren man hinh: {ui1.get('messages')}")

            print(f"- Man hinh PHAI: URL hien tai: {ui2.get('url')}")
            if ui2.get("messages"):
                print(f"  Thong bao tren man hinh: {ui2.get('messages')}")
            print("-" * 80)

            # Kiem tra xem co 1 ben thanh cong (chuyen trang dat-hang-thanh-cong) va 1 ben o lai bao loi khong
            is_p1_success = "thanh-cong" in ui1.get("url", "") or "success" in ui1.get("url", "")
            is_p2_success = "thanh-cong" in ui2.get("url", "") or "success" in ui2.get("url", "")

            if (is_p1_success and not is_p2_success) or (is_p2_success and not is_p1_success):
                winner = "Man hinh TRAI" if is_p1_success else "Man hinh PHAI"
                blocked = "Man hinh PHAI" if is_p1_success else "Man hinh TRAI"
                print("\nKET LUAN CHUNG:")
                print(f"1. [{winner}] Da chiem duoc khoa truoc va dat hang thanh cong (chuyen trang thanh cong).")
                print(f"2. [{blocked}] Bi chan lai lap tuc vi ton kho da ve 0, hien thi thong bao loi.")
                print("3. HE THONG CHONG BAN AM VA XU LY CONCURRENCY HOAT DONG XUAT SAC!")
            else:
                print("\nGhi chu quan sat:")
                print("Ban hay nhin truc tiep vao 2 man hinh trinh duyet de doi chieu voi Mentor.")

            print("\nBan co the tiep tuc bam [ENTER] de thu lai lan nua (sau khi reset kho), hoac go 'q' de ket thuc.")

        except (KeyboardInterrupt, EOFError):
            print("\nNhan tin hieu dung tu ban phim...")
            break

    try:
        ctx1.close()
        ctx2.close()
        p.stop()
    except Exception:
        pass

    print("\nDa dong phien demo an toan. Chuc ban co buoi bao ve thanh cong!")


if __name__ == "__main__":
    main()
