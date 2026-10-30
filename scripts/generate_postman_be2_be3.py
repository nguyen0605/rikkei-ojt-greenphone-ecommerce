import json
import uuid

def make_test_script(code_status=[200], extra_tests=[]):
    status_str = ", ".join(str(s) for s in code_status)
    lines = [
        f"pm.test(\"Status code la {status_str}\", function () {{",
        f"    pm.expect(pm.response.code).to.be.oneOf([{status_str}]);",
        "});",
        "pm.test(\"Format response chuan ApiResponse\", function () {",
        "    var res = pm.response.json();",
        "    pm.expect(res).to.have.property('code');",
        "    pm.expect(res).to.have.property('message');",
        "    pm.expect(res).to.have.property('timestamp');",
        "});"
    ]
    lines.extend(extra_tests)
    return {
        "listen": "test",
        "script": {
            "type": "text/javascript",
            "exec": lines
        }
    }

def make_request(name, method, path, headers=None, body_json=None, form_data=None, query_params=None, code_status=[200], extra_tests=[]):
    if headers is None:
        headers = []
    
    url_obj = {
        "raw": "{{base_url}}" + path,
        "host": ["{{base_url}}"],
        "path": [p for p in path.split("?")[0].strip("/").split("/") if p]
    }

    if "?" in path or query_params:
        url_obj["query"] = []
        if "?" in path:
            q_part = path.split("?")[1]
            for param in q_part.split("&"):
                if "=" in param:
                    k, v = param.split("=", 1)
                    url_obj["query"].append({"key": k, "value": v})
        if query_params:
            for k, v in query_params.items():
                url_obj["query"].append({"key": k, "value": str(v)})
    
    req_obj = {
        "method": method,
        "header": headers,
        "url": url_obj
    }
    
    if body_json is not None:
        req_obj["body"] = {
            "mode": "raw",
            "raw": json.dumps(body_json, indent=2, ensure_ascii=False),
            "options": {"raw": {"language": "json"}}
        }
        if not any(h["key"].lower() == "content-type" for h in headers):
            headers.append({"key": "Content-Type", "value": "application/json"})
            
    elif form_data is not None:
        req_obj["body"] = {
            "mode": "formdata",
            "formdata": form_data
        }

    return {
        "name": name,
        "event": [make_test_script(code_status, extra_tests)],
        "request": req_obj
    }

def build_collection():
    collection_id = str(uuid.uuid4())
    
    admin_auth = [{"key": "Authorization", "value": "Bearer {{token_admin}}"}]
    customer_auth = [{"key": "Authorization", "value": "Bearer {{token_customer}}"}]
    
    # 00. Auth Helpers
    auth_items = [
        make_request(
            "0.1 [Helper] Đăng nhập Admin - Tự động trích xuất token_admin",
            "POST",
            "/api/auth/login",
            body_json={"email": "{{admin_email}}", "password": "{{admin_password}}"},
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "if (res.data && res.data.token) {",
                "    pm.collectionVariables.set('token_admin', res.data.token);",
                "    console.log('Saved token_admin successfully');",
                "}"
            ]
        ),
        make_request(
            "0.2 [Helper] Đăng nhập Customer - Tự động trích xuất token_customer",
            "POST",
            "/api/auth/login",
            body_json={"email": "{{customer_email}}", "password": "{{customer_password}}"},
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "if (res.data && res.data.token) {",
                "    pm.collectionVariables.set('token_customer', res.data.token);",
                "    console.log('Saved token_customer successfully');",
                "}"
            ]
        )
    ]

    # 01. BE2 - Brand Management
    brand_items = [
        make_request(
            "TC_BE2_BR01 - [Public] Lấy danh sách thương hiệu đang hoạt động",
            "GET",
            "/api/brands",
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(Array.isArray(res.data)).to.be.true;",
                "pm.expect(res.data.length).to.be.above(0);"
            ]
        ),
        make_request(
            "TC_BE2_BR02 - [Admin] Danh sách thương hiệu có phân trang & tìm kiếm",
            "GET",
            "/api/admin/brands?keyword=Apple&page=0&size=10",
            headers=admin_auth,
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data).to.have.property('items');"
            ]
        ),
        make_request(
            "TC_BE2_BR03 - [Admin] Tạo mới thương hiệu thành công",
            "POST",
            "/api/admin/brands",
            headers=admin_auth,
            body_json={
                "name": "Test Brand " + str(uuid.uuid4())[:8],
                "logoUrl": "https://res.cloudinary.com/greenphone/image/upload/v1/test-brand.png"
            },
            code_status=[201],
            extra_tests=[
                "var res = pm.response.json();",
                "if (res.data && res.data.id) {",
                "    pm.collectionVariables.set('created_brand_id', res.data.id);",
                "}"
            ]
        ),
        make_request(
            "TC_BE2_BR04 - [Admin] Tạo thương hiệu thất bại - Tên rỗng (Validation 400)",
            "POST",
            "/api/admin/brands",
            headers=admin_auth,
            body_json={
                "name": "",
                "logoUrl": "https://res.cloudinary.com/logo.png"
            },
            code_status=[400],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.code).to.eq(400);"
            ]
        ),
        make_request(
            "TC_BE2_BR05 - [Admin] Cập nhật thông tin thương hiệu",
            "PUT",
            "/api/admin/brands/{{created_brand_id}}",
            headers=admin_auth,
            body_json={
                "name": "Updated Brand Name",
                "logoUrl": "https://res.cloudinary.com/updated-logo.png"
            },
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data.name).to.eq('Updated Brand Name');"
            ]
        ),
        make_request(
            "TC_BE2_BR06 - [Admin] Cập nhật trạng thái thương hiệu (INACTIVE)",
            "PUT",
            "/api/admin/brands/{{created_brand_id}}/status",
            headers=admin_auth,
            body_json={"status": "INACTIVE"},
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data.status).to.eq('INACTIVE');"
            ]
        ),
        make_request(
            "TC_BE2_BR07 - [Admin] Xóa thương hiệu",
            "DELETE",
            "/api/admin/brands/{{created_brand_id}}",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_BR08 - [Security] Khách không token gọi API Admin Brand bị chặn",
            "GET",
            "/api/admin/brands",
            code_status=[401, 403]
        )
    ]

    # 02. BE2 - Banner Management
    banner_items = [
        make_request(
            "TC_BE2_BN01 - [Public] Lấy danh sách banner kích hoạt trên trang chủ",
            "GET",
            "/api/banners",
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(Array.isArray(res.data)).to.be.true;"
            ]
        ),
        make_request(
            "TC_BE2_BN02 - [Admin] Danh sách toàn bộ banner phân trang",
            "GET",
            "/api/admin/banners?page=0&size=10",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_BN03 - [Admin] Tạo mới banner thành công",
            "POST",
            "/api/admin/banners",
            headers=admin_auth,
            body_json={
                "title": "Flash Sale iPhone 15 Pro Max",
                "imageUrl": "https://res.cloudinary.com/greenphone/banner-sale.webp",
                "linkUrl": "/products?brandIds=1"
            },
            code_status=[201],
            extra_tests=[
                "var res = pm.response.json();",
                "if (res.data && res.data.id) {",
                "    pm.collectionVariables.set('created_banner_id', res.data.id);",
                "}"
            ]
        ),
        make_request(
            "TC_BE2_BN04 - [Admin] Tạo banner thất bại - Thiếu URL ảnh (400)",
            "POST",
            "/api/admin/banners",
            headers=admin_auth,
            body_json={
                "title": "Invalid Banner",
                "imageUrl": ""
            },
            code_status=[400]
        ),
        make_request(
            "TC_BE2_BN05 - [Admin] Cập nhật thông tin banner",
            "PUT",
            "/api/admin/banners/{{created_banner_id}}",
            headers=admin_auth,
            body_json={
                "title": "Mega Sale Tuần Lễ Vàng",
                "imageUrl": "https://res.cloudinary.com/greenphone/banner-mega.webp",
                "linkUrl": "/products"
            },
            code_status=[200]
        ),
        make_request(
            "TC_BE2_BN06 - [Admin] Xóa banner",
            "DELETE",
            "/api/admin/banners/{{created_banner_id}}",
            headers=admin_auth,
            code_status=[200]
        )
    ]

    # 03. BE2 - Option & OptionItem Tree
    option_items = [
        make_request(
            "TC_BE2_OP01 - [Public] Lấy cây cấu hình thông số kỹ thuật (Option Catalog)",
            "GET",
            "/api/options",
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(Array.isArray(res.data)).to.be.true;"
            ]
        ),
        make_request(
            "TC_BE2_OP02 - [Admin] Lấy danh sách nhóm thuộc tính (Categories)",
            "GET",
            "/api/admin/options",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_OP03 - [Admin] Lấy danh sách loại Option Types",
            "GET",
            "/api/admin/options/types",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_OP04 - [Admin] Tạo mới nhóm thuộc tính",
            "POST",
            "/api/admin/options",
            headers=admin_auth,
            body_json={
                "type": "FEATURE",
                "label": "Tính Năng AI " + str(uuid.uuid4())[:6],
                "enabled": True,
                "maxItems": 10,
                "sortOrder": 5
            },
            code_status=[201],
            extra_tests=[
                "var res = pm.response.json();",
                "if (res.data && res.data.id) {",
                "    pm.collectionVariables.set('created_option_id', res.data.id);",
                "}"
            ]
        ),
        make_request(
            "TC_BE2_OP05 - [Admin] Cập nhật nhóm thuộc tính",
            "PUT",
            "/api/admin/options/{{created_option_id}}",
            headers=admin_auth,
            body_json={
                "type": "FEATURE",
                "label": "Tính Năng AI Độc Quyền",
                "enabled": True,
                "maxItems": 10,
                "sortOrder": 6
            },
            code_status=[200]
        ),
        make_request(
            "TC_BE2_OP06 - [Admin] Lấy danh sách giá trị con (Option Items) của nhóm",
            "GET",
            "/api/admin/options/{{created_option_id}}/items",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_OP07 - [Admin] Thêm giá trị con vào nhóm thuộc tính",
            "POST",
            "/api/admin/options/{{created_option_id}}/items",
            headers=admin_auth,
            body_json={
                "value": "Khoanh tròn tìm kiếm",
                "hexColor": None,
                "sortOrder": 1
            },
            code_status=[201],
            extra_tests=[
                "var res = pm.response.json();",
                "if (res.data && res.data.id) {",
                "    pm.collectionVariables.set('created_item_id', res.data.id);",
                "}"
            ]
        ),
        make_request(
            "TC_BE2_OP08 - [Admin] Cập nhật giá trị thuộc tính con",
            "PUT",
            "/api/admin/options/items/{{created_item_id}}",
            headers=admin_auth,
            body_json={
                "value": "Circle to Search AI",
                "hexColor": None,
                "sortOrder": 2
            },
            code_status=[200]
        ),
        make_request(
            "TC_BE2_OP09 - [Admin] Kiểm tra mức độ sử dụng của thuộc tính con",
            "GET",
            "/api/admin/options/items/{{created_item_id}}/usage",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_OP10 - [Admin] Xóa giá trị thuộc tính con",
            "DELETE",
            "/api/admin/options/items/{{created_item_id}}",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_OP11 - [Admin] Xóa nhóm thuộc tính",
            "DELETE",
            "/api/admin/options/{{created_option_id}}",
            headers=admin_auth,
            code_status=[200]
        )
    ]

    # 04. BE2 - Phone Catalog, Search, Filter & Variants
    phone_items = [
        make_request(
            "TC_BE2_PH01 - [Public] Lấy danh sách điện thoại phân trang",
            "GET",
            "/api/phones?page=0&size=10",
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data).to.have.property('items');"
            ]
        ),
        make_request(
            "TC_BE2_PH02 - [Public] Lọc điện thoại đa tiêu chí (Hãng + Giá + RAM)",
            "GET",
            "/api/phones?brandIds=1&minPrice=10000000&maxPrice=35000000&rams=8GB&sort=price_asc",
            code_status=[200]
        ),
        make_request(
            "TC_BE2_PH03 - [Public] Lấy chi tiết điện thoại thành công",
            "GET",
            "/api/phones/1",
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data).to.have.property('id');",
                "pm.expect(res.data).to.have.property('name');",
                "pm.expect(res.data).to.have.property('variants');"
            ]
        ),
        make_request(
            "TC_BE2_PH04 - [Public] Chi tiết điện thoại thất bại - ID không tồn tại (404)",
            "GET",
            "/api/phones/999999",
            code_status=[404],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.code).to.eq(404);"
            ]
        ),
        make_request(
            "TC_BE2_PH05 - [Public] Tìm kiếm điện thoại theo từ khóa",
            "GET",
            "/api/phones/search?q=iPhone",
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data).to.have.property('items');"
            ]
        ),
        make_request(
            "TC_BE2_PH06 - [Public] Lấy dữ liệu cấu hình bộ lọc động (Filters Metadata)",
            "GET",
            "/api/phones/filters",
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data).to.have.property('brands');"
            ]
        ),
        make_request(
            "TC_BE2_PH07 - [Admin] Danh sách điện thoại có tìm kiếm & lọc trạng thái",
            "GET",
            "/api/admin/phones?page=0&size=10",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_PH08 - [Admin] Xem chi tiết điện thoại",
            "GET",
            "/api/admin/phones/1",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_PH09 - [Admin] Tạo mới điện thoại kèm thông số kỹ thuật",
            "POST",
            "/api/admin/phones",
            headers=admin_auth,
            body_json={
                "brandId": 1,
                "name": "GreenPhone Test Ultra " + str(uuid.uuid4())[:6],
                "description": "Điện thoại thử nghiệm cấu hình đỉnh cao",
                "screen": "6.8 inch Dynamic AMOLED 2X 120Hz",
                "os": "Android 15 OneUI 7.0",
                "chip": "Snapdragon 8 Gen 4",
                "rearCamera": "200MP + 50MP + 12MP",
                "frontCamera": "40MP Dual Pixel",
                "battery": "5500 mAh Sạc siêu nhanh 65W",
                "warranty": "12 tháng chính hãng 1 đổi 1"
            },
            code_status=[201],
            extra_tests=[
                "var res = pm.response.json();",
                "if (res.data && res.data.id) {",
                "    pm.collectionVariables.set('created_phone_id', res.data.id);",
                "}"
            ]
        ),
        make_request(
            "TC_BE2_PH10 - [Admin] Cập nhật thông tin thông số kỹ thuật điện thoại",
            "PUT",
            "/api/admin/phones/{{created_phone_id}}",
            headers=admin_auth,
            body_json={
                "brandId": 1,
                "name": "GreenPhone Test Ultra Pro Max",
                "description": "Phiên bản nâng cấp màn hình phủ titan",
                "screen": "6.9 inch OLED Super Retina XDR",
                "os": "Android 15",
                "chip": "Snapdragon 8 Gen 4 AI",
                "rearCamera": "200MP",
                "frontCamera": "50MP",
                "battery": "6000 mAh",
                "warranty": "24 tháng bảo hành VIP"
            },
            code_status=[200]
        ),
        make_request(
            "TC_BE2_PH11 - [Admin] Đổi trạng thái điện thoại (PUBLISHED / HIDDEN)",
            "PUT",
            "/api/admin/phones/{{created_phone_id}}/status",
            headers=admin_auth,
            body_json={"status": "PUBLISHED"},
            code_status=[200]
        ),
        make_request(
            "TC_BE2_PH12 - [Admin] Lấy danh sách biến thể của điện thoại",
            "GET",
            "/api/admin/phones/1/variants",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_PH13 - [Admin] Thêm biến thể SKU cho điện thoại",
            "POST",
            "/api/admin/phones/{{created_phone_id}}/variants",
            headers=admin_auth,
            body_json={
                "ramItemId": 3,
                "storageItemId": 8,
                "colorItemId": 12,
                "price": 28990000,
                "discountPrice": 26990000,
                "stockQuantity": 50,
                "sku": "GP-TEST-" + str(uuid.uuid4())[:8].upper()
            },
            code_status=[201],
            extra_tests=[
                "var res = pm.response.json();",
                "if (res.data && res.data.id) {",
                "    pm.collectionVariables.set('created_variant_id', res.data.id);",
                "}"
            ]
        ),
        make_request(
            "TC_BE2_PH14 - [Admin] Cập nhật giá và tồn kho biến thể",
            "PUT",
            "/api/admin/phones/{{created_phone_id}}/variants/{{created_variant_id}}",
            headers=admin_auth,
            body_json={
                "ramItemId": 3,
                "storageItemId": 8,
                "colorItemId": 12,
                "price": 27990000,
                "discountPrice": 25990000,
                "stockQuantity": 100,
                "sku": "GP-TEST-UPDATED"
            },
            code_status=[200]
        ),
        make_request(
            "TC_BE2_PH15 - [Admin] Xóa biến thể",
            "DELETE",
            "/api/admin/phones/{{created_phone_id}}/variants/{{created_variant_id}}",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_PH16 - [Admin] Xóa điện thoại",
            "DELETE",
            "/api/admin/phones/{{created_phone_id}}",
            headers=admin_auth,
            code_status=[200]
        )
    ]

    # 05. BE2 - Cloudinary Media & Product Images
    media_items = [
        make_request(
            "TC_BE2_MED01 - [Admin] Lấy danh sách ảnh sản phẩm",
            "GET",
            "/api/admin/phones/1/images",
            headers=admin_auth,
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(Array.isArray(res.data)).to.be.true;"
            ]
        ),
        make_request(
            "TC_BE2_MED02 - [Admin] Sắp xếp thứ tự ảnh hiển thị (Reorder)",
            "PUT",
            "/api/admin/phones/1/images/reorder",
            headers=admin_auth,
            body_json={"imageIds": [1, 2]},
            code_status=[200]
        ),
        make_request(
            "TC_BE2_MED03 - [Admin] Cập nhật metadata hình ảnh (isPrimary / caption)",
            "PUT",
            "/api/admin/phones/1/images/1",
            headers=admin_auth,
            body_json={
                "isPrimary": True,
                "caption": "Mặt trước màn hình Dynamic AMOLED"
            },
            code_status=[200]
        ),
        make_request(
            "TC_BE2_MED04 - [Admin] Xóa ảnh sản phẩm thất bại - ID không tồn tại (404)",
            "DELETE",
            "/api/admin/phones/1/images/999999",
            headers=admin_auth,
            code_status=[404]
        )
    ]

    # 06. BE2 - Reviews & Ratings
    review_items = [
        make_request(
            "TC_BE2_REV01 - [Public] Lấy danh sách đánh giá của sản phẩm",
            "GET",
            "/api/reviews/phone/1?page=0&size=10",
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data).to.have.property('items');"
            ]
        ),
        make_request(
            "TC_BE2_REV02 - [Public] Xem tóm tắt thống kê đánh giá (Rating Summary)",
            "GET",
            "/api/reviews/phone/1/summary",
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data).to.have.property('averageRating');",
                "pm.expect(res.data).to.have.property('totalReviews');"
            ]
        ),
        make_request(
            "TC_BE2_REV03 - [Customer] Lấy danh sách sản phẩm đủ điều kiện đánh giá",
            "GET",
            "/api/reviews/eligible",
            headers=customer_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_REV04 - [Customer] Xem lịch sử đánh giá cá nhân",
            "GET",
            "/api/reviews/me",
            headers=customer_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_REV05 - [Customer] Gửi đánh giá thất bại - Số sao ngoài khoảng 1-5 (Validation 400)",
            "POST",
            "/api/reviews",
            headers=customer_auth,
            body_json={
                "orderDetailId": 1,
                "rating": 6,
                "content": "Máy quá xuất sắc 6 sao"
            },
            code_status=[400],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.code).to.eq(400);"
            ]
        ),
        make_request(
            "TC_BE2_REV06 - [Admin] Danh sách đánh giá cần kiểm duyệt",
            "GET",
            "/api/admin/reviews?page=0&size=10",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_REV07 - [Admin] Cập nhật trạng thái duyệt/ẩn đánh giá",
            "PUT",
            "/api/admin/reviews/1/status",
            headers=admin_auth,
            body_json={"status": "APPROVED"},
            code_status=[200]
        )
    ]

    # 07. BE2 - System Settings
    setting_items = [
        make_request(
            "TC_BE2_SET01 - [Public] Lấy cấu hình công khai của cửa hàng",
            "GET",
            "/api/settings",
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data).to.be.an('object');"
            ]
        ),
        make_request(
            "TC_BE2_SET02 - [Admin] Xem toàn bộ cài đặt hệ thống",
            "GET",
            "/api/admin/settings",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE2_SET03 - [Admin] Cập nhật thông tin hotline & phí ship",
            "PUT",
            "/api/admin/settings",
            headers=admin_auth,
            body_json={
                "shop_hotline": "1900 6868",
                "shop_shipping_fee": "30000",
                "shop_address": "123 Đường Cầu Giấy, Hà Nội"
            },
            code_status=[200]
        )
    ]

    # 08. BE3 - Voucher & Promotion Engine
    promo_items = [
        make_request(
            "TC_BE3_PR01 - [Public] Xem danh sách mã khuyến mãi đang áp dụng công khai",
            "GET",
            "/api/promotions/public",
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(Array.isArray(res.data)).to.be.true;"
            ]
        ),
        make_request(
            "TC_BE3_PR02 - [Customer] Lấy danh sách voucher khả dụng theo giá trị đơn hàng",
            "GET",
            "/api/promotions/available?orderAmount=15000000",
            headers=customer_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE3_PR03 - [Customer] Xem ví voucher cá nhân",
            "GET",
            "/api/promotions/me",
            headers=customer_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE3_PR04 - [Customer] Nhận voucher thất bại - Mã code không tồn tại (400/404)",
            "POST",
            "/api/promotions/claim",
            headers=customer_auth,
            body_json={"code": "KHONG_TON_TAI_999"},
            code_status=[400, 404]
        ),
        make_request(
            "TC_BE3_PR05 - [Admin] Danh sách toàn bộ voucher hệ thống",
            "GET",
            "/api/admin/promotions?page=0&size=10",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE3_PR06 - [Admin] Xem chi tiết voucher theo ID",
            "GET",
            "/api/admin/promotions/1",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE3_PR07 - [Admin] Tạo mới mã voucher giảm giá",
            "POST",
            "/api/admin/promotions",
            headers=admin_auth,
            body_json={
                "code": "TESTPROMO" + str(uuid.uuid4())[:6].upper(),
                "name": "Khuyến Mãi Tri Ân Khách Hàng",
                "description": "Giảm ngay 200k cho đơn từ 5 triệu",
                "discountType": "FIXED_AMOUNT",
                "discountValue": 200000,
                "maxDiscountAmount": 200000,
                "minOrderValue": 5000000,
                "quantity": 100,
                "startDate": "2026-01-01T00:00:00",
                "endDate": "2026-12-31T23:59:59"
            },
            code_status=[201],
            extra_tests=[
                "var res = pm.response.json();",
                "if (res.data && res.data.id) {",
                "    pm.collectionVariables.set('created_promo_id', res.data.id);",
                "}"
            ]
        ),
        make_request(
            "TC_BE3_PR08 - [Admin] Tạo voucher thất bại - Thiếu thông tin bắt buộc (Validation 400)",
            "POST",
            "/api/admin/promotions",
            headers=admin_auth,
            body_json={
                "code": "",
                "discountType": "FIXED_AMOUNT"
            },
            code_status=[400]
        ),
        make_request(
            "TC_BE3_PR09 - [Admin] Cập nhật mã voucher",
            "PUT",
            "/api/admin/promotions/{{created_promo_id}}",
            headers=admin_auth,
            body_json={
                "code": "TESTPROMO_UPDATED",
                "name": "Khuyến Mãi Tri Ân Cập Nhật",
                "description": "Giảm 300k cho đơn từ 8 triệu",
                "discountType": "FIXED_AMOUNT",
                "discountValue": 300000,
                "maxDiscountAmount": 300000,
                "minOrderValue": 8000000,
                "quantity": 150,
                "startDate": "2026-01-01T00:00:00",
                "endDate": "2026-12-31T23:59:59"
            },
            code_status=[200]
        ),
        make_request(
            "TC_BE3_PR10 - [Admin] Xóa/ngừng voucher",
            "DELETE",
            "/api/admin/promotions/{{created_promo_id}}",
            headers=admin_auth,
            code_status=[200]
        )
    ]

    # 09. BE3 - Shopping Cart Service
    cart_items = [
        make_request(
            "TC_BE3_CT01 - [Customer] Lấy thông tin giỏ hàng hiện tại",
            "GET",
            "/api/cart",
            headers=customer_auth,
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data).to.have.property('items');",
                "pm.expect(res.data).to.have.property('totalAmount');"
            ]
        ),
        make_request(
            "TC_BE3_CT02 - [Customer] Thêm sản phẩm biến thể vào giỏ hàng",
            "POST",
            "/api/cart/items",
            headers=customer_auth,
            body_json={
                "phoneVariantId": 1,
                "quantity": 1
            },
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "if (res.data && res.data.items && res.data.items.length > 0) {",
                "    pm.collectionVariables.set('cart_item_id', res.data.items[0].id);",
                "}"
            ]
        ),
        make_request(
            "TC_BE3_CT03 - [Customer] Thêm vào giỏ thất bại - Biến thể không tồn tại (404)",
            "POST",
            "/api/cart/items",
            headers=customer_auth,
            body_json={
                "phoneVariantId": 999999,
                "quantity": 1
            },
            code_status=[404]
        ),
        make_request(
            "TC_BE3_CT04 - [Customer] Thêm vào giỏ thất bại - Số lượng bằng 0 hoặc âm (Validation 400)",
            "POST",
            "/api/cart/items",
            headers=customer_auth,
            body_json={
                "phoneVariantId": 1,
                "quantity": 0
            },
            code_status=[400]
        ),
        make_request(
            "TC_BE3_CT05 - [Customer] Cập nhật số lượng sản phẩm trong giỏ hàng",
            "PUT",
            "/api/cart/items/{{cart_item_id}}",
            headers=customer_auth,
            body_json={"quantity": 2},
            code_status=[200]
        ),
        make_request(
            "TC_BE3_CT06 - [Customer] Xóa một sản phẩm khỏi giỏ hàng",
            "DELETE",
            "/api/cart/items/{{cart_item_id}}",
            headers=customer_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE3_CT07 - [Customer] Dọn sạch toàn bộ giỏ hàng (Clear Cart)",
            "DELETE",
            "/api/cart",
            headers=customer_auth,
            code_status=[200]
        )
    ]

    # 10. BE3 - Customer Order Flow & Stock Lock
    order_items = [
        make_request(
            "TC_BE3_ORD01 - [Customer] Tạo đơn hàng mới thành công (COD)",
            "POST",
            "/api/orders",
            headers=customer_auth,
            body_json={
                "receiverName": "Nguyễn Văn An",
                "receiverPhone": "0912345678",
                "shippingAddress": "123 Đường Nguyễn Huệ, Quận 1, TP.HCM",
                "paymentMethod": "COD",
                "note": "Giao giờ hành chính, gọi trước khi giao",
                "userPromotionId": None,
                "items": [
                    {
                        "phoneVariantId": 1,
                        "quantity": 1
                    }
                ]
            },
            code_status=[201],
            extra_tests=[
                "var res = pm.response.json();",
                "if (res.data && res.data.id) {",
                "    pm.collectionVariables.set('created_order_id', res.data.id);",
                "    console.log('Saved created_order_id:', res.data.id);",
                "}"
            ]
        ),
        make_request(
            "TC_BE3_ORD02 - [Customer] Tạo đơn hàng thất bại - Thiếu thông tin người nhận (Validation 400)",
            "POST",
            "/api/orders",
            headers=customer_auth,
            body_json={
                "receiverName": "",
                "receiverPhone": "",
                "shippingAddress": "",
                "paymentMethod": "COD",
                "items": [
                    {"phoneVariantId": 1, "quantity": 1}
                ]
            },
            code_status=[400],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.code).to.eq(400);"
            ]
        ),
        make_request(
            "TC_BE3_ORD03 - [Customer] Lấy danh sách đơn hàng của khách hàng",
            "GET",
            "/api/orders?page=0&size=10",
            headers=customer_auth,
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data).to.have.property('items');"
            ]
        ),
        make_request(
            "TC_BE3_ORD04 - [Customer] Xem chi tiết đơn hàng vừa tạo",
            "GET",
            "/api/orders/{{created_order_id}}",
            headers=customer_auth,
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data).to.have.property('orderCode');",
                "pm.expect(res.data).to.have.property('totalAmount');",
                "pm.expect(res.data).to.have.property('status');"
            ]
        ),
        make_request(
            "TC_BE3_ORD05 - [Customer] Hủy đơn hàng và kiểm tra hoàn trả tồn kho",
            "PUT",
            "/api/orders/{{created_order_id}}/cancel",
            headers=customer_auth,
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data.status).to.eq('CANCELLED');"
            ]
        ),
        make_request(
            "TC_BE3_ORD06 - [Customer] Hủy đơn hàng thất bại - ID không tồn tại (404)",
            "PUT",
            "/api/orders/999999/cancel",
            headers=customer_auth,
            code_status=[404]
        ),
        make_request(
            "TC_BE3_ORD07 - [Customer] Xem lịch sử mua sắm (Đơn hoàn tất)",
            "GET",
            "/api/orders/history?page=0&size=10",
            headers=customer_auth,
            code_status=[200]
        )
    ]

    # 11. BE3 - Admin Order Management & Delivery Progress
    admin_order_items = [
        make_request(
            "TC_BE3_AORD01 - [Admin] Lấy danh sách toàn bộ đơn hàng",
            "GET",
            "/api/admin/orders?page=0&size=10",
            headers=admin_auth,
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(res.data).to.have.property('items');"
            ]
        ),
        make_request(
            "TC_BE3_AORD02 - [Admin] Xem chi tiết đơn hàng quản trị",
            "GET",
            "/api/admin/orders/1",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE3_AORD03 - [Admin] Cập nhật tiến độ giao vận chuyển (IN_TRANSIT)",
            "PUT",
            "/api/admin/orders/1/delivery",
            headers=admin_auth,
            body_json={"status": "IN_TRANSIT"},
            code_status=[200]
        ),
        make_request(
            "TC_BE3_AORD04 - [Admin] Cập nhật trạng thái thanh toán (PAID)",
            "PUT",
            "/api/admin/orders/1/payment-status",
            headers=admin_auth,
            body_json={"paymentStatus": "PAID"},
            code_status=[200]
        ),
        make_request(
            "TC_BE3_AORD05 - [Admin] Cập nhật trạng thái tổng thể đơn hàng (SHIPPING)",
            "PUT",
            "/api/admin/orders/1/status",
            headers=admin_auth,
            body_json={"status": "SHIPPING"},
            code_status=[200]
        )
    ]

    # 12. BE3 - Admin Statistics & Revenue Analytics
    stat_items = [
        make_request(
            "TC_BE3_STAT01 - [Admin] Thống kê doanh thu theo tháng",
            "GET",
            "/api/admin/statistics/revenue?period=month",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE3_STAT02 - [Admin] Thống kê doanh thu theo ngày",
            "GET",
            "/api/admin/statistics/revenue?period=day",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE3_STAT03 - [Admin] Thống kê số lượng đơn theo các trạng thái",
            "GET",
            "/api/admin/statistics/orders",
            headers=admin_auth,
            code_status=[200]
        ),
        make_request(
            "TC_BE3_STAT04 - [Admin] Thống kê Top smartphone bán chạy nhất",
            "GET",
            "/api/admin/statistics/top-selling?limit=5",
            headers=admin_auth,
            code_status=[200],
            extra_tests=[
                "var res = pm.response.json();",
                "pm.expect(Array.isArray(res.data)).to.be.true;"
            ]
        )
    ]

    collection = {
        "info": {
            "_postman_id": collection_id,
            "name": "GreenPhone - BE2 & BE3 Full Backend Test Suite (Excluding BE1 Leader)",
            "description": "Bộ kịch bản Test Postman toàn diện cho toàn bộ các Task Backend của BE2 (38.Phucthinh) và BE3 (Đạt Phan Văn) thuộc dự án GreenPhone. Đã tách riêng và không bao gồm các task của leader dangnguyen vu.",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "variable": [
            {"key": "base_url", "value": "http://localhost:8080", "type": "string"},
            {"key": "admin_email", "value": "admin@greenphone.vn", "type": "string"},
            {"key": "admin_password", "value": "admin123", "type": "string"},
            {"key": "customer_email", "value": "an.nguyen@example.com", "type": "string"},
            {"key": "customer_password", "value": "password123", "type": "string"},
            {"key": "token_admin", "value": "", "type": "string"},
            {"key": "token_customer", "value": "", "type": "string"},
            {"key": "created_brand_id", "value": "1", "type": "string"},
            {"key": "created_banner_id", "value": "1", "type": "string"},
            {"key": "created_option_id", "value": "1", "type": "string"},
            {"key": "created_item_id", "value": "1", "type": "string"},
            {"key": "created_phone_id", "value": "1", "type": "string"},
            {"key": "created_variant_id", "value": "1", "type": "string"},
            {"key": "created_promo_id", "value": "1", "type": "string"},
            {"key": "cart_item_id", "value": "1", "type": "string"},
            {"key": "created_order_id", "value": "1", "type": "string"}
        ],
        "item": [
            {
                "name": "00. Auth Helpers (Trích xuất Token Tự động)",
                "description": "Chạy 2 request này đầu tiên để tự động lưu token_admin và token_customer vào biến collection.",
                "item": auth_items
            },
            {
                "name": "01. [BE2] Quản lý Thương hiệu - Brand Management",
                "description": "Các kịch bản kiểm thử API Public và Admin cho Brand (BE2 Phucthinh).",
                "item": brand_items
            },
            {
                "name": "02. [BE2] Quản lý Banner Quảng cáo - Banner Management",
                "description": "Các kịch bản kiểm thử API Banner trang chủ và Banner Admin (BE2 Phucthinh).",
                "item": banner_items
            },
            {
                "name": "03. [BE2] Cây Thuộc tính & Thông số - Option & Spec Tree",
                "description": "Cây danh mục thuộc tính RAM, ROM, Màu sắc, Tính năng linh hoạt (BE2 Phucthinh).",
                "item": option_items
            },
            {
                "name": "04. [BE2] Danh mục Điện thoại, Bộ lọc & Biến thể",
                "description": "API tìm kiếm, lọc đa tiêu chí, chi tiết máy, quản lý điện thoại & biến thể SKU (BE2 Phucthinh).",
                "item": phone_items
            },
            {
                "name": "05. [BE2] Cloudinary Media & Ảnh Sản phẩm",
                "description": "Upload CDN, sắp xếp thứ tự ảnh, cập nhật ảnh chính (BE2 Phucthinh).",
                "item": media_items
            },
            {
                "name": "06. [BE2] Đánh giá Sản phẩm - Reviews & Ratings",
                "description": "API xem review, tổng hợp sao, đánh giá sau mua, kiểm duyệt (BE2 Phucthinh).",
                "item": review_items
            },
            {
                "name": "07. [BE2] Cấu hình Cửa hàng - System Settings",
                "description": "Cấu hình hotline, phí vận chuyển, địa chỉ cửa hàng (BE2 Phucthinh).",
                "item": setting_items
            },
            {
                "name": "08. [BE3] Mã Giảm giá - Promotion & Voucher Engine",
                "description": "Khuyến mãi phần trăm, tiền mặt, điều kiện tối thiểu, claim voucher (BE3 Đạt Phan Văn).",
                "item": promo_items
            },
            {
                "name": "09. [BE3] Giỏ hàng Mua sắm - Shopping Cart Service",
                "description": "Thêm biến thể vào giỏ, cập nhật số lượng, tính tiền tạm tính (BE3 Đạt Phan Văn).",
                "item": cart_items
            },
            {
                "name": "10. [BE3] Quy trình Đặt hàng & Khóa Tồn kho - Order Flow",
                "description": "Tạo đơn hàng, trừ tồn kho thời gian thực, hủy đơn hoàn tồn kho (BE3 Đạt Phan Văn).",
                "item": order_items
            },
            {
                "name": "11. [BE3] Quản lý Đơn hàng Admin - Order Progress",
                "description": "Xác nhận đơn hàng, cập nhật vận chuyển, thanh toán, trạng thái đơn (BE3 Đạt Phan Văn).",
                "item": admin_order_items
            },
            {
                "name": "12. [BE3] Báo cáo Thống kê & Phân tích Doanh thu",
                "description": "Thống kê doanh thu theo ngày/tháng, số lượng đơn, top điện thoại bán chạy (BE3 Đạt Phan Văn).",
                "item": stat_items
            }
        ]
    }
    
    return collection

if __name__ == "__main__":
    col = build_collection()
    out_path = "docs/postman_greenphone_BE2_BE3_test_suite.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(col, f, indent=2, ensure_ascii=False)
    print(f"Postman collection successfully generated at: {out_path}")
    print(f"Total top-level folders: {len(col['item'])}")
    total_requests = sum(len(folder['item']) for folder in col['item'])
    print(f"Total requests generated: {total_requests}")
