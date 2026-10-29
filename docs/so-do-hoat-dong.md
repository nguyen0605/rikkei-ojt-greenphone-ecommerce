# Sơ đồ hoạt động GreenPhone (Sequence Diagram)

Dưới đây là 5 sơ đồ Mermaid dạng Sequence Diagram, được xây dựng từ source code thực tế.

---

## 1. Luồng Thanh Toán (Chuyển khoản ngân hàng)

```mermaid
sequenceDiagram
    actor Khach as Khach hang
    participant FE as Frontend
    participant PayCtrl as PaymentController
    participant PaySvc as PaymentService
    participant SepaySvc as SepayService
    participant Webhook as SepayWebhookController
    participant DB
    participant NH as Ngan hang Sepay

    Khach->>FE: 1. Chon thanh toan don hang
    FE->>PayCtrl: 2. POST /api/payments {orderId, method}
    PayCtrl->>PaySvc: 3. createPayment(orderId, method)
    PaySvc->>DB: 4. Tim Order theo orderId
    DB-->>PaySvc: Order
    PaySvc->>DB: 5. INSERT Payment (amount=finalAmount, status=PENDING)
    DB-->>PaySvc: Payment
    PaySvc-->>PayCtrl: PaymentDTO
    PayCtrl-->>FE: 6. 201 Created

    FE->>PayCtrl: 7. GET /api/payments/qr/{orderId}
    PayCtrl->>PaySvc: 8. getQRCode(orderId)
    PaySvc->>DB: 9. Tim Order
    DB-->>PaySvc: Order
    PaySvc->>SepaySvc: 10. generateQRUrl(amount, "GREENPHONE"+orderId)
    SepaySvc->>SepaySvc: 11. Doc SEPA_ACCOUNT_NUMBER, SEPA_BANK_CODE
    SepaySvc-->>PaySvc: 12. VietQR URL
    PaySvc-->>FE: 13. {qrUrl}
    FE-->>Khach: 14. Hien thi ma QR

    Khach->>NH: 15. Quet ma, chuyen khoan (noi dung: GREENPHONE{id})

    NH->>Webhook: 16. POST /api/webhooks/sepay (payload + chu ky)
    Webhook->>SepaySvc: 17. verifyWebhookSignature(payload, authHeader)
    SepaySvc-->>Webhook: 18. HMAC-SHA256 / Apikey verified
    Webhook->>SepaySvc: 19. processPaymentWebhook(payload)

    SepaySvc->>DB: 20. Idempotency: tim Payment theo transactionCode
    DB-->>SepaySvc: null (chua ton tai)

    SepaySvc->>SepaySvc: 21. extractOrderId(): parse "GREENPHONE"+so
    SepaySvc->>DB: 22. Tim Order
    DB-->>SepaySvc: Order

    SepaySvc->>SepaySvc: 23. Terminal guard: tu choi neu DELIVERED/CANCELLED
    SepaySvc->>SepaySvc: 24. Amount check: transferAmount >= finalAmount
    SepaySvc->>SepaySvc: 25. Status guard: payment chua PAID

    SepaySvc->>DB: 26. UPDATE payment: status=PAID, transactionCode, paidAt=now
    SepaySvc->>DB: 27. UPDATE order: paymentStatus=PAID, orderStatus=CONFIRMED

    SepaySvc-->>Webhook: 28. {success: true}
    Webhook-->>NH: 29. 200 OK

    Note over DB: OrderTimeoutScheduler moi 60s: huy PENDING+UNPAID >10phut, hoan ton kho
```

---

## 2. Luồng Đặt Đơn

```mermaid
sequenceDiagram
    actor Khach as Khach hang
    participant FE as Frontend
    participant OrdCtrl as OrderController
    participant OrdSvc as OrderService
    participant DB
    participant Mail as EmailService

    Khach->>FE: 1. Vao gio hang, cap nhat so luong
    Khach->>FE: 2. Nhan "Tien hanh dat hang"
    Khach->>FE: 3. Nhap: receiverName, phone, address, note
    Khach->>FE: 4. Chon paymentMethod (COD/BANK_TRANSFER/E_WALLET)
    Khach->>FE: 5. Chon ma giam gia (neu co)
    Khach->>FE: 6. Nhan "Xac nhan dat hang"

    FE->>OrdCtrl: 7. POST /api/orders (OrderRequest)
    OrdCtrl->>OrdSvc: 8. createOrder(request)

    OrdSvc->>OrdSvc: 9. userId = SecurityUtils.getCurrentUserId()
    OrdSvc->>DB: 10. Tim User
    DB-->>OrdSvc: User

    OrdSvc->>OrdSvc: 11. Build Order skeleton (PENDING, UNPAID)

    loop 12. Tung item (retry toi da 3 lan neu optimistic lock)
        OrdSvc->>DB: 13. Tim PhoneVariant theo variantId
        DB-->>OrdSvc: PhoneVariant
        OrdSvc->>OrdSvc: 14. Check: stockQuantity >= quantity
        OrdSvc->>DB: 15. stockQuantity -= quantity (@Version)
        OrdSvc->>OrdSvc: 16. Tinh gia: discountPrice ? discountPrice : price
        OrdSvc->>OrdSvc: 17. subtotal = price * quantity
        OrdSvc->>OrdSvc: 18. Cong don totalAmount
        OrdSvc->>OrdSvc: 19. Tao OrderDetail (productName, RAM, ROM, color, price, qty)
    end

    opt 20. Co userPromotionId
        OrdSvc->>DB: 21. Tim UserPromotion
        DB-->>OrdSvc: UserPromotion
        OrdSvc->>OrdSvc: 22. Check: status=AVAILABLE + orderAmount >= minOrderValue
        OrdSvc->>OrdSvc: 23. calculateDiscount(): PERCENT/FIXED, cap maxDiscount, cap total
        OrdSvc->>DB: 24. UserPromotion.status = USED
    end

    OrdSvc->>OrdSvc: 25. finalAmount = totalAmount - discountAmount
    OrdSvc->>DB: 26. INSERT Order + OrderDetails
    DB-->>OrdSvc: Order saved

    OrdSvc->>DB: 27. Tim Cart cua user, xoa toan bo CartItems
    OrdSvc->>Mail: 28. sendOrderConfirmation(email, orderId) [@Async]
    OrdSvc-->>OrdCtrl: 29. OrderDTO
    OrdCtrl-->>FE: 30. 201 Created
    FE-->>Khach: 31. Hien thi xac nhan don hang
```

---

## 3. Luồng Áp Voucher Vào Đơn

```mermaid
sequenceDiagram
    actor Admin
    actor Khach as Khach hang
    participant FE as Frontend
    participant PromoCtrl as PromotionController
    participant PromoSvc as PromotionService
    participant OrdSvc as OrderService
    participant DB

    Note over Admin,DB: Pha A - Admin tao khuyen mai

    Admin->>FE: 1. Vao Quan ly khuyen mai, Tao moi
    Admin->>FE: 2. Nhap: code, name, discountType, discountValue, maxDiscount, minOrder, dates
    FE->>DB: 3. POST /api/admin/promotions, INSERT Promotion
    DB-->>FE: 4. Promotion created

    Note over Admin,DB: Pha B - Khach nhan ma giam gia

    Khach->>FE: 5. Nhap ma giam gia
    FE->>PromoCtrl: 6. POST /api/promotions/claim {code}
    PromoCtrl->>PromoSvc: 7. claimPromotion(code)
    PromoSvc->>DB: 8. Tim Promotion theo code
    DB-->>PromoSvc: Promotion
    PromoSvc->>PromoSvc: 9. Check: startDate <= now <= endDate
    PromoSvc->>DB: 10. Check: user da claim ma nay chua (unique)
    DB-->>PromoSvc: Chua claim
    PromoSvc->>DB: 11. INSERT UserPromotion (status=AVAILABLE)
    PromoSvc-->>PromoCtrl: 12. UserPromotionDTO
    PromoCtrl-->>FE: 13. Da nhan ma

    Note over Admin,DB: Pha C - Xem ma kha dung khi checkout

    Khach->>FE: 14. Vao trang checkout
    FE->>PromoCtrl: 15. GET /api/promotions/available?orderAmount=X
    PromoCtrl->>PromoSvc: 16. getAvailablePromotions(orderAmount)
    PromoSvc->>DB: 17. Tim UserPromotions AVAILABLE cua user
    DB-->>PromoSvc: Danh sach UserPromotion
    PromoSvc->>PromoSvc: 18. Loc: active date + minOrderValue
    PromoSvc->>PromoSvc: 19. Tinh discount du kien, sap xep giam dan
    PromoSvc-->>FE: 20. Danh sach ma + discount du kien
    FE-->>Khach: 21. Hien thi ma giam gia kha dung

    Note over Admin,DB: Pha D - Ap dung khi dat hang

    Khach->>FE: 22. Chon ma, nhan Dat hang
    FE->>OrdSvc: 23. POST /api/orders (kem userPromotionId)
    OrdSvc->>DB: 24. Tim UserPromotion
    DB-->>OrdSvc: UserPromotion
    OrdSvc->>OrdSvc: 25. Check: status=AVAILABLE + orderAmount >= minOrderValue
    OrdSvc->>OrdSvc: 26. PERCENT: discount = total * value/100
    OrdSvc->>OrdSvc: 27. FIXED: discount = value
    OrdSvc->>OrdSvc: 28. discount = min(discount, maxDiscountAmount)
    OrdSvc->>OrdSvc: 29. discount = min(discount, total) - khong cho am
    OrdSvc->>DB: 30. UserPromotion.status = USED
    OrdSvc->>DB: 31. Order: discountAmount, finalAmount, userPromotionId
    DB-->>OrdSvc: Order saved
    OrdSvc-->>FE: 32. OrderDTO (kem discountAmount, finalAmount)
    FE-->>Khach: 33. Don hang da ap dung ma giam gia
```

---

## 4. Luồng Huỷ Đơn Hàng

```mermaid
sequenceDiagram
    actor Khach as Khach hang
    actor Admin
    participant Ctrl as Controller
    participant OrdSvc as OrderService
    participant AdmSvc as AdminOrderService
    participant DB
    participant Scheduler as OrderTimeoutScheduler

    Note over Khach,Scheduler: Truong hop A - Khach hang huy don

    Khach->>Ctrl: 1. PUT /api/orders/{id}/cancel
    Ctrl->>OrdSvc: 2. cancelOrder(orderId)

    OrdSvc->>OrdSvc: 3. userId = SecurityUtils.getCurrentUserId()
    OrdSvc->>DB: 4. Tim Order theo ID
    DB-->>OrdSvc: Order

    OrdSvc->>OrdSvc: 5. Check: order.user.id == currentUserId

    OrdSvc->>OrdSvc: 6. State gate: chi PENDING hoac CONFIRMED

    loop 7. Tung OrderDetail
        OrdSvc->>DB: 8. Tim PhoneVariant
        DB-->>OrdSvc: PhoneVariant
        OrdSvc->>DB: 9. stockQuantity += detail.quantity
    end

    OrdSvc->>DB: 10. order.orderStatus = CANCELLED
    DB-->>OrdSvc: Order saved
    OrdSvc-->>Ctrl: 11. OrderDTO
    Ctrl-->>Khach: 12. Don da huy

    Note over Khach,Scheduler: paymentStatus KHONG doi, UserPromotion KHONG hoan, KHONG gui email

    Note over Khach,Scheduler: Truong hop B - Admin huy don

    Admin->>Ctrl: 13. PUT /api/admin/orders/{id}/status {status:"CANCELLED"}
    Ctrl->>AdmSvc: 14. updateStatus(id, "CANCELLED")
    AdmSvc->>DB: 15. Tim Order
    DB-->>AdmSvc: Order

    Note over AdmSvc: 16. Admin KHONG co state gate

    loop 17. Tung OrderDetail
        AdmSvc->>DB: 18. Tim PhoneVariant
        DB-->>AdmSvc: PhoneVariant
        AdmSvc->>DB: 19. stockQuantity += detail.quantity
    end

    AdmSvc->>DB: 20. order.orderStatus = CANCELLED
    DB-->>AdmSvc: Order saved
    AdmSvc-->>Ctrl: 21. OrderDTO
    Ctrl-->>Admin: 22. Don da huy

    Note over Khach,Scheduler: Truong hop C - Tu dong huy do timeout

    Scheduler->>DB: 23. @Scheduled 60s: tim PENDING+UNPAID > 10 phut
    DB-->>Scheduler: Danh sach Order qua han

    loop 24. Tung Order qua han
        loop 25. Tung OrderDetail
            Scheduler->>DB: 26. Hoan stockQuantity += quantity
        end
        Scheduler->>DB: 27. order.orderStatus = CANCELLED
    end
```

---

## 5. Luồng Admin Thêm Điện Thoại

```mermaid
sequenceDiagram
    actor Admin
    participant FE as Frontend
    participant Ctrl as AdminPhoneController
    participant Svc as AdminPhoneService
    participant CloudSvc as CloudinaryService
    participant Cloud as Cloudinary
    participant DB

    Note over Admin,DB: Buoc 1 - Tao thong tin dien thoai

    Admin->>FE: 1. Vao Quan ly dien thoai, Them moi
    Admin->>FE: 2. Nhap: brandId, name, description
    Admin->>FE: 3. Nhap thong so: screen, os, chip, camera, battery, warranty
    Admin->>FE: 4. Nhan "Tao"

    FE->>Ctrl: 5. POST /api/admin/phones (PhoneRequest)
    Ctrl->>Svc: 6. createPhone(request)

    Svc->>DB: 7. Tim Brand theo brandId
    DB-->>Svc: Brand

    Svc->>Svc: 8. Build Phone entity (status=ACTIVE)
    Svc->>DB: 9. INSERT PHONE
    DB-->>Svc: Phone (co id)

    Svc-->>Ctrl: 10. PhoneDTO
    Ctrl-->>FE: 11. 201 Created (phoneId)
    FE-->>Admin: 12. Hien thi phoneId

    Note over Admin,DB: Buoc 2 - Them bien the (RAM/ROM/Mau/Gia/Ton)

    loop 13. Moi bien the
        Admin->>FE: 14. Nhap: ram, storage, color, price, discountPrice, stockQuantity
        Admin->>FE: 15. Nhan "Them bien the"

        FE->>Ctrl: 16. POST /api/admin/phones/{id}/variants
        Ctrl->>Svc: 17. addVariant(phoneId, request)

        Svc->>DB: 18. Tim Phone
        DB-->>Svc: Phone

        Svc->>Svc: 19. Build PhoneVariant (status=ACTIVE, @Version auto)
        Svc->>DB: 20. INSERT PHONE_VARIANT
        Note over DB: 21. UNIQUE(phoneId, ram, storage, color)

        DB-->>Svc: PhoneVariant
        Svc-->>Ctrl: 22. PhoneVariantDTO
        Ctrl-->>FE: 23. 201 Created
        FE-->>Admin: 24. Bien the da them
    end

    Note over Admin,DB: Buoc 3 - Upload anh san pham

    loop 25. Moi anh
        Admin->>FE: 26. Chon file anh tu may
        Admin->>FE: 27. Nhan "Upload"

        FE->>Ctrl: 28. POST /api/admin/phones/{id}/images (multipart)
        Ctrl->>Svc: 29. addImage(phoneId, file)

        Svc->>DB: 30. Tim Phone
        DB-->>Svc: Phone

        Svc->>CloudSvc: 31. uploadImage(file, "greenphone/phones")

        CloudSvc->>CloudSvc: 32. Validate: file, contentType=image/*, size<=10MB
        CloudSvc->>CloudSvc: 33. public_id = UUID.randomUUID()
        CloudSvc->>Cloud: 34. uploader.upload(bytes, folder="greenphone/phones")
        Cloud-->>CloudSvc: 35. secure_url

        CloudSvc-->>Svc: 36. imageUrl

        Svc->>DB: 37. Check: anh dau tien cua phone
        Svc->>Svc: 38. Anh dau: isMain=true; anh sau: false
        Svc->>DB: 39. INSERT PHONE_IMAGE (imageUrl, isMain)
        DB-->>Svc: PhoneImage

        Svc-->>Ctrl: 40. PhoneImageDTO
        Ctrl-->>FE: 41. 201 Created
        FE-->>Admin: 42. Anh da upload
    end

    Note over Admin,DB: Buoc 4 - Dat anh chinh va xem tong quan

    Admin->>FE: 43. Chon anh lam anh chinh
    FE->>Ctrl: 44. PUT /api/admin/phones/{id}/images/{imgId} {isMain:true}
    Ctrl->>Svc: 45. updateImage(phoneId, imageId, request)

    Svc->>DB: 46. Set tat ca anh khac isMain=false
    Svc->>DB: 47. Set anh duoc chon isMain=true
    DB-->>Svc: Updated

    Svc-->>Ctrl: 48. PhoneImageDTO
    Ctrl-->>FE: 49. OK
    FE-->>Admin: 50. Anh chinh da cap nhat

    Admin->>FE: 51. Xem tong quan san pham
    FE->>Ctrl: 52. GET /api/admin/phones/{id}
    Ctrl->>DB: 53. Query Phone + Variants + Images
    DB-->>Ctrl: Full detail
    Ctrl-->>FE: 54. PhoneDetailDTO
    FE-->>Admin: 55. Hien thi tong quan, SP da san sang
```

---

> **Nguon**: So do duoc xay dung tu source code thuc te:
> - `OrderService.java` — dat don, huy don
> - `PaymentService.java`, `SepayService.java`, `SepayWebhookController.java` — thanh toan
> - `PromotionService.java`, `AdminPromotionService.java` — khuyen mai
> - `AdminPhoneService.java`, `CloudinaryService.java` — admin them dien thoai
> - `greenphone.sql` — schema va rang buoc
> - `phan tich module.txt`, `api-listing.txt` — chuc nang va API
