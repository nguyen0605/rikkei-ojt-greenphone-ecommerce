package com.re.greenphone.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ForbiddenException;
import com.re.greenphone.dto.request.ReturnCreateRequest;
import com.re.greenphone.dto.request.ReturnReviewRequest;
import com.re.greenphone.dto.response.ReturnResponse;
import com.re.greenphone.entity.*;
import com.re.greenphone.enums.OrderStatus;
import com.re.greenphone.enums.PaymentStatus;
import com.re.greenphone.enums.ReturnStatus;
import com.re.greenphone.enums.ReturnType;
import com.re.greenphone.repository.*;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.security.UserPrincipal;
import com.re.greenphone.service.admin.InventoryStockHistoryService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReturnRequestServiceTest {

    @Mock
    private ReturnRequestRepository returnRequestRepository;

    @Mock
    private RefundRepository refundRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderDetailRepository orderDetailRepository;

    @Mock
    private PhoneVariantRepository phoneVariantRepository;

    @Mock
    private ShipmentRepository shipmentRepository;

    @Mock
    private WarrantyRepository warrantyRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private InventoryStockHistoryService inventoryStockHistoryService;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ReturnRequestService returnRequestService;

    private MockedStatic<SecurityUtils> mockedSecurityUtils;

    private User currentUser;
    private Order completedOrder;
    private PhoneVariant phoneVariant;
    private OrderDetail orderDetail;
    private Shipment deliveredShipment;

    @BeforeEach
    void setUp() {
        currentUser = new User();
        currentUser.setId(1L);
        currentUser.setFullName("Test Customer");
        currentUser.setEmail("test@greenphone.vn");
        currentUser.setStatus("ACTIVE");

        Role role = new Role();
        role.setId(1L);
        role.setName("CUSTOMER");
        currentUser.setRole(role);

        UserPrincipal principal = UserPrincipal.create(currentUser);

        mockedSecurityUtils = Mockito.mockStatic(SecurityUtils.class);
        mockedSecurityUtils.when(SecurityUtils::getCurrentUser).thenReturn(principal);
        mockedSecurityUtils.when(SecurityUtils::getCurrentUserRole).thenReturn("ROLE_CUSTOMER");

        phoneVariant = PhoneVariant.builder()
                .sku("IPHONE15-128-BLK")
                .stockQuantity(10)
                .build();
        phoneVariant.setId(100L);

        completedOrder = Order.builder()
                .user(currentUser)
                .orderStatus(OrderStatus.COMPLETED.name())
                .paymentStatus(PaymentStatus.PAID.name())
                .totalAmount(new BigDecimal("20000000"))
                .finalAmount(new BigDecimal("20000000"))
                .receiverName("Test Customer")
                .receiverPhone("0987654321")
                .paymentMethod("COD")
                .build();
        completedOrder.setId(10L);

        orderDetail = OrderDetail.builder()
                .order(completedOrder)
                .phoneVariant(phoneVariant)
                .productName("iPhone 15 Pro")
                .unitPrice(new BigDecimal("20000000"))
                .quantity(1)
                .subtotal(new BigDecimal("20000000"))
                .build();
        orderDetail.setId(50L);

        deliveredShipment = Shipment.builder()
                .order(completedOrder)
                .trackingNumber("VNPOST-123456")
                .status("DELIVERED")
                .deliveredAt(LocalDateTime.now().minusDays(3)) // 3 ngày trước (hợp lệ <= 7 ngày)
                .build();
    }

    @AfterEach
    void tearDown() {
        if (mockedSecurityUtils != null) {
            mockedSecurityUtils.close();
        }
    }

    @Test
    @DisplayName("Tạo yêu cầu đổi trả thành công trong vòng 7 ngày")
    void testCreateReturnRequest_SuccessWithin7Days() {
        ReturnCreateRequest request = ReturnCreateRequest.builder()
                .orderId(10L)
                .phoneVariantId(100L)
                .reason("Màn hình sọc xanh")
                .errorDescription("Bị sọc màn hình sau 3 ngày sử dụng")
                .type(ReturnType.EXCHANGE)
                .proofImages(List.of("https://r2.greenphone.vn/proof1.png"))
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(currentUser));
        when(orderRepository.findById(10L)).thenReturn(Optional.of(completedOrder));
        when(orderDetailRepository.findByOrderId(10L)).thenReturn(List.of(orderDetail));
        when(shipmentRepository.findByOrderId(10L)).thenReturn(List.of(deliveredShipment));
        when(returnRequestRepository.existsByOrderIdAndPhoneVariantIdAndStatusIn(anyLong(), anyLong(), anyList()))
                .thenReturn(false);

        when(returnRequestRepository.save(any(ReturnRequest.class))).thenAnswer(invocation -> {
            ReturnRequest req = invocation.getArgument(0);
            req.setId(1L);
            return req;
        });

        ReturnResponse response = returnRequestService.createReturnRequest(request);

        assertNotNull(response);
        assertEquals(ReturnType.EXCHANGE, response.getType());
        assertEquals(ReturnStatus.PENDING, response.getStatus());
        verify(returnRequestRepository).save(any(ReturnRequest.class));
    }

    @Test
    @DisplayName("Từ chối yêu cầu đổi trả khi đơn hàng vượt quá 7 ngày kể từ ngày giao")
    void testCreateReturnRequest_FailBeyond7Days() {
        deliveredShipment.setDeliveredAt(LocalDateTime.now().minusDays(8)); // 8 ngày trước

        ReturnCreateRequest request = ReturnCreateRequest.builder()
                .orderId(10L)
                .phoneVariantId(100L)
                .reason("Lỗi loa")
                .errorDescription("Loa rè sau 8 ngày")
                .type(ReturnType.EXCHANGE)
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(currentUser));
        when(orderRepository.findById(10L)).thenReturn(Optional.of(completedOrder));
        when(orderDetailRepository.findByOrderId(10L)).thenReturn(List.of(orderDetail));
        when(shipmentRepository.findByOrderId(10L)).thenReturn(List.of(deliveredShipment));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                returnRequestService.createReturnRequest(request));

        assertTrue(ex.getMessage().contains("vượt quá thời hạn 7 ngày"));
        verify(returnRequestRepository, never()).save(any(ReturnRequest.class));
    }

    @Test
    @DisplayName("Từ chối khi đơn hàng chưa hoàn tất giao hàng (chưa COMPLETED)")
    void testCreateReturnRequest_FailOrderNotCompleted() {
        completedOrder.setOrderStatus(OrderStatus.SHIPPING.name());

        ReturnCreateRequest request = ReturnCreateRequest.builder()
                .orderId(10L)
                .phoneVariantId(100L)
                .reason("Lỗi loa")
                .errorDescription("Chưa nhận mà muốn trả")
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(currentUser));
        when(orderRepository.findById(10L)).thenReturn(Optional.of(completedOrder));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                returnRequestService.createReturnRequest(request));

        assertTrue(ex.getMessage().contains("COMPLETED"));
    }

    @Test
    @DisplayName("Admin duyệt EXCHANGE: Khóa bi quan và trừ tồn kho 1 máy, cập nhật bảo hành")
    void testApproveReturn_Exchange_DecrementsStockAndLocks() {
        ReturnRequest returnReq = ReturnRequest.builder()
                .returnCode("RET-ABC12345")
                .order(completedOrder)
                .phoneVariant(phoneVariant)
                .user(currentUser)
                .reason("Lỗi cảm ứng")
                .errorDescription("Liệt cảm ứng")
                .type(ReturnType.EXCHANGE)
                .status(ReturnStatus.PENDING)
                .refundAmount(BigDecimal.ZERO)
                .build();
        returnReq.setId(99L);

        when(returnRequestRepository.findById(99L)).thenReturn(Optional.of(returnReq));
        when(userRepository.findById(1L)).thenReturn(Optional.of(currentUser));
        when(phoneVariantRepository.findByIdWithLock(100L)).thenReturn(Optional.of(phoneVariant));
        when(phoneVariantRepository.save(any(PhoneVariant.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(returnRequestRepository.save(any(ReturnRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReturnReviewRequest reviewReq = ReturnReviewRequest.builder()
                .adminNote("Đã kiểm tra lỗi phần cứng, đồng ý đổi mới")
                .newImeiNumber("IMEI-NEW-999")
                .build();

        ReturnResponse response = returnRequestService.approveReturn(99L, reviewReq);

        assertNotNull(response);
        assertEquals(ReturnStatus.APPROVED, response.getStatus());
        assertEquals(9, phoneVariant.getStockQuantity());
        verify(phoneVariantRepository).findByIdWithLock(100L);
        verify(inventoryStockHistoryService).record(eq(phoneVariant), eq(10), eq(-1), eq("EXPORT"), anyString(), anyLong(), anyString());
        verify(warrantyRepository).save(any(Warranty.class));
    }

    @Test
    @DisplayName("Admin duyệt REFUND: Tạo Refund record và chuyển trạng thái đơn sang REFUNDED")
    void testApproveReturn_Refund_CreatesRefundRecordAndUpdatesOrder() {
        ReturnRequest returnReq = ReturnRequest.builder()
                .returnCode("RET-REF12345")
                .order(completedOrder)
                .phoneVariant(phoneVariant)
                .user(currentUser)
                .reason("Lỗi nguồn sập liên tục")
                .errorDescription("Không bật lên được")
                .type(ReturnType.REFUND)
                .status(ReturnStatus.PENDING)
                .refundAmount(new BigDecimal("20000000"))
                .build();
        returnReq.setId(98L);

        when(returnRequestRepository.findById(98L)).thenReturn(Optional.of(returnReq));
        when(userRepository.findById(1L)).thenReturn(Optional.of(currentUser));
        when(refundRepository.save(any(Refund.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(returnRequestRepository.save(any(ReturnRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReturnReviewRequest reviewReq = ReturnReviewRequest.builder()
                .adminNote("Đồng ý hoàn tiền 100%")
                .build();

        ReturnResponse response = returnRequestService.approveReturn(98L, reviewReq);

        assertNotNull(response);
        assertEquals(ReturnStatus.APPROVED, response.getStatus());
        assertEquals(OrderStatus.REFUNDED.name(), completedOrder.getOrderStatus());
        assertEquals(PaymentStatus.REFUNDED.name(), completedOrder.getPaymentStatus());
        verify(refundRepository).save(any(Refund.class));
        verify(orderRepository).save(completedOrder);
    }

    @Test
    @DisplayName("Chống IDOR: Người dùng khác không được xem chi tiết yêu cầu đổi trả")
    void testGetReturnDetail_Forbidden_WhenNotOwnerAndNotAdmin() {
        User otherUser = new User();
        otherUser.setId(999L);
        otherUser.setFullName("Other User");

        ReturnRequest returnReq = ReturnRequest.builder()
                .returnCode("RET-OTHER")
                .order(completedOrder)
                .phoneVariant(phoneVariant)
                .user(otherUser) // Chủ sở hữu là user khác (ID 999)
                .reason("Hỏng mic")
                .errorDescription("Mic không thu tiếng")
                .build();
        returnReq.setId(123L);

        when(returnRequestRepository.findById(123L)).thenReturn(Optional.of(returnReq));

        assertThrows(ForbiddenException.class, () ->
                returnRequestService.getReturnDetail(123L));
    }

    @Test
    @DisplayName("Admin xác nhận hoàn tất (APPROVED -> COMPLETED) thành công và giữ nguyên adminNote nếu không nhập mới")
    void testCompleteReturn_FromApproved_SetsCompleted() {
        ReturnRequest returnReq = ReturnRequest.builder()
                .returnCode("RET-COMP001")
                .order(completedOrder)
                .phoneVariant(phoneVariant)
                .user(currentUser)
                .reason("Lỗi màn hình")
                .errorDescription("Sọc dọc")
                .type(ReturnType.EXCHANGE)
                .status(ReturnStatus.APPROVED)
                .adminNote("Đã duyệt xuất kho đổi mới")
                .build();
        returnReq.setId(77L);

        when(returnRequestRepository.findById(77L)).thenReturn(Optional.of(returnReq));
        when(userRepository.findById(1L)).thenReturn(Optional.of(currentUser));
        when(returnRequestRepository.save(any(ReturnRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ReturnResponse response = returnRequestService.completeReturn(77L, new ReturnReviewRequest());

        assertNotNull(response);
        assertEquals(ReturnStatus.COMPLETED, response.getStatus());
        assertEquals("Đã duyệt xuất kho đổi mới", response.getAdminNote());
        verify(returnRequestRepository).save(returnReq);
    }

    @Test
    @DisplayName("Không thể hoàn tất phiếu chưa ở trạng thái APPROVED")
    void testCompleteReturn_WhenPending_ThrowsBadRequest() {
        ReturnRequest returnReq = ReturnRequest.builder()
                .returnCode("RET-PEND001")
                .order(completedOrder)
                .phoneVariant(phoneVariant)
                .user(currentUser)
                .status(ReturnStatus.PENDING)
                .build();
        returnReq.setId(78L);

        when(returnRequestRepository.findById(78L)).thenReturn(Optional.of(returnReq));

        assertThrows(BadRequestException.class, () ->
                returnRequestService.completeReturn(78L, null));
    }
}
