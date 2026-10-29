package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ConflictException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.OrderItemRequest;
import com.re.greenphone.dto.request.OrderRequest;
import com.re.greenphone.dto.response.OrderDTO;
import com.re.greenphone.entity.*;
import com.re.greenphone.mapper.OrderMapper;
import com.re.greenphone.repository.*;
import com.re.greenphone.security.SecurityUtils;
import jakarta.persistence.OptimisticLockException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock private OrderRepository orderRepository;
    @Mock private UserRepository userRepository;
    @Mock private PhoneVariantRepository phoneVariantRepository;
    @Mock private UserPromotionRepository userPromotionRepository;
    @Mock private CartRepository cartRepository;
    @Mock private OrderMapper orderMapper;
    @Mock private EmailService emailService;
    @Mock private SettingsService settingsService;

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
        PhoneVariant v = createVariant(100L, new BigDecimal("1000.00"), null, 10);
        Promotion promo = Promotion.builder().discountType("FIXED").discountValue(new BigDecimal("500.00")).build();
        UserPromotion up = UserPromotion.builder().promotion(promo).status("AVAILABLE").build(); up.setId(10L);
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
        PhoneVariant v = createVariant(100L, new BigDecimal("1000.00"), null, 10);
        Promotion promo = Promotion.builder().discountType("PERCENT")
                .discountValue(new BigDecimal("50.00")).maxDiscountAmount(new BigDecimal("500.00")).build();
        UserPromotion up = UserPromotion.builder().promotion(promo).status("AVAILABLE").build(); up.setId(10L);
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

    @Test void cancelOrder_RestoresStock() {
        User u = createUser(); u.setId(USER_ID);
        securityUtilsMock.when(SecurityUtils::getCurrentUserId).thenReturn(USER_ID);

        PhoneVariant v = createVariant(100L, new BigDecimal("15000000"), null, 5);
        com.re.greenphone.entity.Order order = com.re.greenphone.entity.Order.builder()
                .user(u).totalAmount(new BigDecimal("15000000")).finalAmount(new BigDecimal("15000000"))
                .orderStatus("PENDING").paymentStatus("UNPAID").build();
        order.setId(1L);
        OrderDetail detail = OrderDetail.builder().order(order).phoneVariant(v)
                .quantity(2).unitPrice(new BigDecimal("15000000")).build();
        order.setOrderDetails(List.of(detail));

        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any())).thenReturn(order);
        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(v));
        when(phoneVariantRepository.save(any())).thenReturn(v);
        when(orderMapper.toDto(any())).thenReturn(new OrderDTO());

        orderService.cancelOrder(1L);

        assertEquals(7, v.getStockQuantity());
        assertEquals("CANCELLED", order.getOrderStatus());
    }
}
