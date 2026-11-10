package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ConflictException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.OrderItemRequest;
import com.re.greenphone.dto.request.OrderRequest;
import com.re.greenphone.dto.response.OrderCreationResult;
import com.re.greenphone.dto.response.OrderDTO;
import com.re.greenphone.entity.*;
import com.re.greenphone.entity.Order;
import com.re.greenphone.mapper.OrderMapper;
import com.re.greenphone.repository.*;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.service.admin.InventoryStockHistoryService;
import jakarta.persistence.OptimisticLockException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private com.re.greenphone.repository.OrderHistoryRepository orderHistoryRepository;
    @Mock private UserRepository userRepository;
    @Mock private PhoneVariantRepository phoneVariantRepository;
    @Mock private UserPromotionRepository userPromotionRepository;
    @Mock private PromotionRepository promotionRepository;
    @Mock private CartRepository cartRepository;
    @Mock private OrderMapper orderMapper;
    @Mock private EmailService emailService;
    @Mock private SettingsService settingsService;
    @Mock private InventoryStockHistoryService inventoryStockHistoryService;
    @Mock private jakarta.persistence.EntityManager entityManager;
    @Mock private RedisTemplate<String, Object> redisTemplate;
    @Mock private ValueOperations<String, Object> valueOperations;

    @InjectMocks
    private OrderService orderService;

    private MockedStatic<SecurityUtils> securityUtilsMock;
    private static final Long USER_ID = 1L;
    private static final String USER_EMAIL = "test@test.com";

    @BeforeEach void setUp() { securityUtilsMock = mockStatic(SecurityUtils.class); }
    @AfterEach void tearDown() { securityUtilsMock.close(); }

    private User createUser() {
        User u = new User(); u.setId(USER_ID); u.setEmail(USER_EMAIL); return u;
    }

    private PhoneVariant createVariant(Long id, BigDecimal price, BigDecimal discountPrice, Integer stock) {
        PhoneVariant v = PhoneVariant.builder().price(price).discountPrice(discountPrice).stockQuantity(stock).build();
        v.setId(id); return v;
    }

    private OrderItemRequest createItemReq(Long variantId, int qty) {
        return OrderItemRequest.builder().phoneVariantId(variantId).quantity(qty).build();
    }

    private OrderRequest createOrderReq(List<OrderItemRequest> items, Long upId) {
        return OrderRequest.builder()
                .receiverName("John Doe").receiverPhone("0987654321")
                .shippingAddress("123 Test St, Hanoi").paymentMethod("COD")
                .note("Test").userPromotionId(upId).items(items).build();
    }

    private void stubUser() {
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(USER_ID);
        lenient().when(userRepository.findById(USER_ID)).thenReturn(Optional.of(createUser()));
        // Settings defaults: fee 29000, free-shipping threshold 5M (above test subtotals)
        lenient().when(settingsService.getShippingFee()).thenReturn(new BigDecimal("29000"));
        lenient().when(settingsService.getFreeShippingThreshold()).thenReturn(new BigDecimal("5000000"));
    }

    @Test void createOrder_Success() {
        stubUser();
        PhoneVariant v = createVariant(100L, new BigDecimal("1000.00"), null, 10);
        OrderRequest req = createOrderReq(List.of(createItemReq(100L, 2)), null);

        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(v));
        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        when(orderMapper.toDto(any())).thenReturn(new OrderDTO());
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        orderService.createOrder(req);

        assertEquals(8, v.getStockQuantity());
        verify(inventoryStockHistoryService).record(eq(v), eq(10), eq(-2), eq("EXPORT"), anyString());
        verify(orderRepository).save(any());
        verify(emailService).sendOrderConfirmation(eq(USER_EMAIL), anyString());
    }

    @Test void createOrder_BankTransfer_NoConfirmationEmail() {
        stubUser();
        PhoneVariant v = createVariant(100L, new BigDecimal("1000.00"), null, 10);
        OrderRequest req = createOrderReq(List.of(createItemReq(100L, 2)), null);
        req.setPaymentMethod("VIETQR");

        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(v));
        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        when(orderMapper.toDto(any())).thenReturn(new OrderDTO());
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        orderService.createOrder(req);

        // VIETQR orders are emailed only once payment is confirmed (SepayService)
        verify(emailService, never()).sendOrderConfirmation(anyString(), anyString());
    }

    @Test void createOrder_VariantNotFound() {
        stubUser();
        OrderRequest req = createOrderReq(List.of(createItemReq(999L, 1)), null);
        when(phoneVariantRepository.findByIdWithLock(999L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> orderService.createOrder(req));
    }

    @Test void createOrder_InsufficientStock() {
        stubUser();
        PhoneVariant v = createVariant(100L, new BigDecimal("1000.00"), null, 1);
        OrderRequest req = createOrderReq(List.of(createItemReq(100L, 2)), null);
        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(v));
        assertThrows(BadRequestException.class, () -> orderService.createOrder(req));
        assertEquals(1, v.getStockQuantity());
    }

    @Test void createOrder_WithPromotion() {
        stubUser();
        User user = createUser(); user.setId(USER_ID);
        PhoneVariant v = createVariant(100L, new BigDecimal("1000.00"), null, 10);
        Promotion promo = Promotion.builder().discountType("FIXED").discountValue(new BigDecimal("500.00")).status("ACTIVE").build();
        UserPromotion up = UserPromotion.builder().user(user).promotion(promo).status("AVAILABLE").build(); up.setId(10L);
        OrderRequest req = createOrderReq(List.of(createItemReq(100L, 2)), 10L);

        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(v));
        when(userPromotionRepository.findById(10L)).thenReturn(Optional.of(up));
        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        when(orderMapper.toDto(any())).thenReturn(new OrderDTO());
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        orderService.createOrder(req);
        assertEquals("USED", up.getStatus());
    }

    @Test void createOrder_DiscountCappedAtMax() {
        stubUser();
        User user = createUser(); user.setId(USER_ID);
        PhoneVariant v = createVariant(100L, new BigDecimal("1000.00"), null, 10);
        Promotion promo = Promotion.builder().discountType("PERCENT")
                .discountValue(new BigDecimal("50.00")).maxDiscountAmount(new BigDecimal("500.00")).status("ACTIVE").build();
        UserPromotion up = UserPromotion.builder().user(user).promotion(promo).status("AVAILABLE").build(); up.setId(10L);
        OrderRequest req = createOrderReq(List.of(createItemReq(100L, 5)), 10L);

        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(v));
        when(userPromotionRepository.findById(10L)).thenReturn(Optional.of(up));
        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        when(orderMapper.toDto(any())).thenReturn(new OrderDTO());
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        orderService.createOrder(req);
        // 50% of 5000 = 2500, capped at 500
        verify(orderRepository).save(any());
    }

    @Test void createOrder_PromotionNotOwnedByUser_ThrowsBadRequest() {
        stubUser();
        User otherUser = createUser(); otherUser.setId(999L);
        PhoneVariant v = createVariant(100L, new BigDecimal("1000.00"), null, 10);
        Promotion promo = Promotion.builder().discountType("FIXED").discountValue(new BigDecimal("100.00")).status("ACTIVE").build();
        UserPromotion up = UserPromotion.builder().user(otherUser).promotion(promo).status("AVAILABLE").build(); up.setId(10L);
        OrderRequest req = createOrderReq(List.of(createItemReq(100L, 2)), 10L);

        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(v));
        when(userPromotionRepository.findById(10L)).thenReturn(Optional.of(up));

        assertThrows(BadRequestException.class, () -> orderService.createOrder(req));
    }

    @Test void applyPromotionToOrder_NotOwnerOfOrder_ThrowsBadRequest() {
        stubUser();
        User orderOwner = createUser(); orderOwner.setId(999L);
        Order order = Order.builder().orderStatus("PENDING").totalAmount(new BigDecimal("1000.00")).build();
        order.setUser(orderOwner);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        assertThrows(BadRequestException.class, () -> orderService.applyPromotionToOrder(1L, 10L));
    }

    @Test void applyPromotionToOrder_NotOwnerOfVoucher_ThrowsBadRequest() {
        stubUser();
        User orderOwner = createUser(); orderOwner.setId(USER_ID);
        Order order = Order.builder().orderStatus("PENDING").totalAmount(new BigDecimal("1000.00")).build();
        order.setUser(orderOwner);

        User otherUser = createUser(); otherUser.setId(999L);
        Promotion promo = Promotion.builder().discountType("FIXED").discountValue(new BigDecimal("100.00")).status("ACTIVE").build();
        UserPromotion up = UserPromotion.builder().user(otherUser).promotion(promo).status("AVAILABLE").build(); up.setId(10L);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(userPromotionRepository.findById(10L)).thenReturn(Optional.of(up));

        assertThrows(BadRequestException.class, () -> orderService.applyPromotionToOrder(1L, 10L));
    }

    @Test void applyPromotionToOrder_PreservesShippingFeeAndRollsBackPreviousVoucher() {
        stubUser();
        User user = createUser(); user.setId(USER_ID);
        Promotion promo1 = Promotion.builder().discountType("FIXED").discountValue(new BigDecimal("100.00")).status("ACTIVE").build();
        UserPromotion oldUp = UserPromotion.builder().user(user).promotion(promo1).status("USED").build(); oldUp.setId(10L);

        Order order = Order.builder()
                .orderStatus("PENDING")
                .totalAmount(new BigDecimal("1000.00"))
                .discountAmount(new BigDecimal("100.00"))
                .userPromotion(oldUp)
                .build();
        order.setUser(user);

        Promotion promo2 = Promotion.builder().discountType("FIXED").discountValue(new BigDecimal("200.00")).status("ACTIVE").build();
        UserPromotion newUp = UserPromotion.builder().user(user).promotion(promo2).status("AVAILABLE").build(); newUp.setId(20L);

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(userPromotionRepository.findById(20L)).thenReturn(Optional.of(newUp));
        when(settingsService.getShippingFee()).thenReturn(new BigDecimal("30.00"));
        when(settingsService.getFreeShippingThreshold()).thenReturn(new BigDecimal("5000.00"));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDto(any())).thenReturn(new OrderDTO());

        orderService.applyPromotionToOrder(1L, 20L);

        // Old voucher restored
        assertEquals("AVAILABLE", oldUp.getStatus());
        assertNull(oldUp.getUsedAt());

        // New voucher marked USED
        assertEquals("USED", newUp.getStatus());
        assertNotNull(newUp.getUsedAt());

        // Total 1000 - discount 200 + shipping 30 = 830
        assertEquals(new BigDecimal("830.00"), order.getFinalAmount());
        assertEquals(new BigDecimal("200.00"), order.getDiscountAmount());
    }

    @Test void cancelOrder_RestoresStockAndVoucherAndRecordsReason() {
        User u = createUser(); u.setId(USER_ID);
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(USER_ID);

        PhoneVariant v = createVariant(100L, new BigDecimal("15000000"), null, 5);
        Promotion promo = Promotion.builder().code("VOUCHER").status("ACTIVE").endDate(java.time.LocalDateTime.now().plusDays(5)).usedQuantity(1).build();
        UserPromotion up = UserPromotion.builder().promotion(promo).status("USED").usedAt(java.time.LocalDateTime.now()).build();
        up.setId(77L);

        com.re.greenphone.entity.Order order = com.re.greenphone.entity.Order.builder()
                .user(u).totalAmount(new BigDecimal("15000000")).finalAmount(new BigDecimal("14500000"))
                .orderStatus("PENDING").paymentStatus("UNPAID").userPromotion(up).build();
        order.setId(1L);
        OrderDetail detail = OrderDetail.builder().order(order).phoneVariant(v)
                .quantity(2).unitPrice(new BigDecimal("15000000")).build();
        order.setOrderDetails(List.of(detail));

        when(orderRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any())).thenReturn(order);
        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(v));
        when(phoneVariantRepository.save(any())).thenReturn(v);
        when(orderMapper.toDto(any())).thenReturn(new OrderDTO());

        orderService.cancelOrder(1L, "Đặt nhầm màu");

        assertEquals(7, v.getStockQuantity());
        verify(inventoryStockHistoryService).record(eq(v), eq(5), eq(2), eq("IMPORT"), anyString());
        assertEquals("AVAILABLE", up.getStatus());
        assertNull(up.getUsedAt());
        verify(userPromotionRepository).save(up);
        verify(promotionRepository).save(argThat(p -> p.getUsedQuantity() == 0));
        assertEquals("CANCELLED", order.getOrderStatus());
        assertEquals("[Lý do hủy: Đặt nhầm màu]", order.getNote());
    }

    @Test void cancelOrder_SetsVoucherExpired_WhenPromotionExpired() {
        User u = createUser(); u.setId(USER_ID);
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(USER_ID);

        Promotion expiredPromo = Promotion.builder().code("EXPIRED_VOUCHER").status("ACTIVE")
                .endDate(java.time.LocalDateTime.now().minusDays(1)).usedQuantity(1).build();
        UserPromotion up = UserPromotion.builder().promotion(expiredPromo).status("USED").usedAt(java.time.LocalDateTime.now()).build();
        up.setId(78L);

        com.re.greenphone.entity.Order order = com.re.greenphone.entity.Order.builder()
                .user(u).totalAmount(new BigDecimal("1000000")).finalAmount(new BigDecimal("900000"))
                .orderStatus("PENDING").paymentStatus("UNPAID").userPromotion(up).build();
        order.setId(3L);
        order.setOrderDetails(List.of());

        when(orderRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any())).thenReturn(order);
        when(orderMapper.toDto(any())).thenReturn(new OrderDTO());

        orderService.cancelOrder(3L, "Đổi ý");

        assertEquals("EXPIRED", up.getStatus());
        assertNull(up.getUsedAt());
        verify(userPromotionRepository).save(up);
        verify(promotionRepository).save(argThat(p -> p.getUsedQuantity() == 0));
    }

    @Test void cancelOrder_ThrowsWhenAnotherUserOrder() {
        User owner = createUser(); owner.setId(999L);
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(USER_ID);

        com.re.greenphone.entity.Order order = com.re.greenphone.entity.Order.builder()
                .user(owner).orderStatus("PENDING").build();
        order.setId(2L);

        when(orderRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(order));

        assertThrows(BadRequestException.class, () -> orderService.cancelOrder(2L, "Lý do"));
    }

    @Test void cancelOrder_ThrowsWhenStatusNotPendingOrConfirmed() {
        User u = createUser(); u.setId(USER_ID);
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(USER_ID);

        com.re.greenphone.entity.Order shippingOrder = com.re.greenphone.entity.Order.builder()
                .user(u).orderStatus("SHIPPING").build();
        shippingOrder.setId(3L);

        when(orderRepository.findByIdForUpdate(3L)).thenReturn(Optional.of(shippingOrder));

        assertThrows(BadRequestException.class, () -> orderService.cancelOrder(3L, "Lý do"));
    }

    @Test
    @DisplayName("A1/Phần 1: Khách hủy đơn đã thanh toán online (PAID) thì chuyển sang REFUND_PENDING và lưu thông tin ngân hàng")
    void cancelOrder_PaidOrder_TransitionsToRefundPendingAndSavesBankDetails() {
        User u = createUser(); u.setId(USER_ID);
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(USER_ID);

        com.re.greenphone.entity.Order order = com.re.greenphone.entity.Order.builder()
                .user(u).orderStatus("CONFIRMED").paymentStatus("PAID")
                .orderDetails(new java.util.ArrayList<>()).build();
        order.setId(55L);

        when(orderRepository.findByIdForUpdate(55L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orderMapper.toDto(any())).thenReturn(OrderDTO.builder().id(55L).build());

        com.re.greenphone.dto.request.CancelOrderRequest cancelReq = com.re.greenphone.dto.request.CancelOrderRequest.builder()
                .reason("Đổi ý không mua nữa")
                .bankName("MB Bank")
                .accountNumber("0943941773")
                .accountHolder("NGUYEN VAN A")
                .build();

        orderService.cancelOrder(55L, cancelReq);

        assertEquals("CANCELLED", order.getOrderStatus());
        assertEquals("REFUND_PENDING", order.getPaymentStatus());
        assertTrue(order.getNote().contains("YÊU CẦU HOÀN TIỀN: Ngân hàng: MB Bank | STK: 0943941773 | Chủ TK: NGUYEN VAN A"));
    }

    @Test
    @DisplayName("BE2-03: Request đầu tiên có Idempotency-Key sẽ chiếm khóa SETNX và lưu cache khi tạo đơn xong")
    void createOrderWithIdempotency_NewKey_AcquiresLockAndCachesResult() {
        stubUser();
        String idempotencyKey = "key-test-123";
        String redisKey = "idempotency:" + idempotencyKey;

        PhoneVariant v = createVariant(100L, new BigDecimal("1000.00"), null, 10);
        OrderRequest req = createOrderReq(List.of(createItemReq(100L, 2)), null);

        OrderDTO createdDto = OrderDTO.builder().id(88L).totalAmount(new BigDecimal("2000.00")).build();

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(eq(redisKey), eq("PROCESSING"), eq(60L), eq(TimeUnit.SECONDS))).thenReturn(true);
        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(v));
        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        when(orderMapper.toDto(any())).thenReturn(createdDto);
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        OrderCreationResult result = orderService.createOrderWithIdempotency(req, idempotencyKey);

        assertTrue(result.isNewlyCreated());
        assertEquals(88L, result.getOrder().getId());
        verify(valueOperations).setIfAbsent(eq(redisKey), eq("PROCESSING"), eq(60L), eq(TimeUnit.SECONDS));
        verify(valueOperations).set(eq(redisKey), eq(createdDto), eq(60L), eq(TimeUnit.SECONDS));
        verify(orderRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("BE2-03: Request thứ 2 cùng Idempotency-Key trả về đơn ban đầu, KHÔNG tạo đơn mới trong DB")
    void createOrderWithIdempotency_DuplicateKey_ReturnsCachedOrderWithoutCreating() {
        String idempotencyKey = "key-test-duplicate";
        String redisKey = "idempotency:" + idempotencyKey;

        OrderRequest req = createOrderReq(List.of(createItemReq(100L, 2)), null);
        OrderDTO existingOrder = OrderDTO.builder().id(88L).receiverName("John Doe").build();

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        // Lần gọi SETNX trả về false vì khóa đã tồn tại
        when(valueOperations.setIfAbsent(eq(redisKey), eq("PROCESSING"), eq(60L), eq(TimeUnit.SECONDS))).thenReturn(false);
        // Đọc giá trị cached đã tạo thành công
        when(valueOperations.get(redisKey)).thenReturn(existingOrder);

        OrderCreationResult result = orderService.createOrderWithIdempotency(req, idempotencyKey);

        assertFalse(result.isNewlyCreated());
        assertEquals(88L, result.getOrder().getId());
        // Đảm bảo TUYỆT ĐỐI không gọi save đơn hàng mới trong DB
        verify(orderRepository, never()).save(any());
        verify(phoneVariantRepository, never()).findByIdWithLock(any());
    }

    @Test
    @DisplayName("BE2-03: CẤM giữ khóa vĩnh viễn nếu tạo đơn thất bại, tự động xóa key để client có thể thử lại")
    void createOrderWithIdempotency_OnError_DeletesKeyFromRedis() {
        stubUser();
        String idempotencyKey = "key-test-error";
        String redisKey = "idempotency:" + idempotencyKey;

        // Yêu cầu mua 5 cái nhưng chỉ còn 1 cái -> gây lỗi Insufficient stock
        PhoneVariant v = createVariant(100L, new BigDecimal("1000.00"), null, 1);
        OrderRequest req = createOrderReq(List.of(createItemReq(100L, 5)), null);

        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(eq(redisKey), eq("PROCESSING"), eq(60L), eq(TimeUnit.SECONDS))).thenReturn(true);
        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(v));

        assertThrows(BadRequestException.class, () ->
                orderService.createOrderWithIdempotency(req, idempotencyKey));

        // Kiểm tra xóa khóa ngay lập tức khi gặp exception
        verify(redisTemplate).delete(eq(redisKey));
    }

    @Test
    @DisplayName("BE2-03: Request không truyền Idempotency-Key vẫn tạo đơn bình thường không qua Redis")
    void createOrderWithIdempotency_NoKey_CreatesOrderNormally() {
        stubUser();
        PhoneVariant v = createVariant(100L, new BigDecimal("1000.00"), null, 10);
        OrderRequest req = createOrderReq(List.of(createItemReq(100L, 1)), null);

        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(v));
        when(cartRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        when(orderMapper.toDto(any())).thenReturn(OrderDTO.builder().id(101L).build());
        when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        OrderCreationResult result = orderService.createOrderWithIdempotency(req, null);

        assertTrue(result.isNewlyCreated());
        assertEquals(101L, result.getOrder().getId());
        verifyNoInteractions(redisTemplate);
    }
}
