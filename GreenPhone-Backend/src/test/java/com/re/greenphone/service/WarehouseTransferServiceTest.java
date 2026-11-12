package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.dto.request.DispatchTransferRequest;
import com.re.greenphone.dto.request.ReceiveTransferRequest;
import com.re.greenphone.dto.response.InterWarehouseTransferPlan;
import com.re.greenphone.dto.response.TransferPlanItem;
import com.re.greenphone.dto.response.WarehouseTransferDTO;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.*;
import com.re.greenphone.service.impl.WarehouseTransferServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WarehouseTransferServiceTest {

    @Mock
    private WarehouseTransferRepository warehouseTransferRepository;

    @Mock
    private WarehouseTransferItemRepository warehouseTransferItemRepository;

    @Mock
    private WarehouseStockRepository warehouseStockRepository;

    @Mock
    private WarehouseStockHistoryRepository warehouseStockHistoryRepository;

    @Mock
    private WarehouseRepository warehouseRepository;

    @Mock
    private PhoneVariantRepository phoneVariantRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderHistoryRepository orderHistoryRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private WarehouseTransferServiceImpl transferService;

    private Warehouse whHn;
    private Warehouse whHcm;
    private PhoneVariant variant1;
    private PhoneVariant variant2;
    private Order order;

    @BeforeEach
    void setUp() {
        whHn = new Warehouse();
        whHn.setId(1L);
        whHn.setCode("WH-HN-MAIN");
        whHn.setName("Kho Hà Nội");
        whHn.setStatus("ACTIVE");

        whHcm = new Warehouse();
        whHcm.setId(2L);
        whHcm.setCode("WH-HCM-Q1");
        whHcm.setName("Kho TP.HCM");
        whHcm.setStatus("ACTIVE");

        Phone phone = new Phone();
        phone.setId(10L);
        phone.setName("iPhone 15 Pro");

        variant1 = new PhoneVariant();
        variant1.setId(101L);
        variant1.setPhone(phone);
        variant1.setSku("IP15P-128-BLU");
        variant1.setPrice(BigDecimal.valueOf(25000000));
        variant1.setStockQuantity(10);

        variant2 = new PhoneVariant();
        variant2.setId(102L);
        variant2.setPhone(phone);
        variant2.setSku("IP15P-256-BLK");
        variant2.setPrice(BigDecimal.valueOf(28000000));
        variant2.setStockQuantity(5);

        order = new Order();
        order.setId(1001L);
        order.setOrderStatus("WAITING_FOR_TRANSFER");
        order.setFulfillmentWarehouse(whHcm);
        order.setOrderDetails(new ArrayList<>());
    }

    private WarehouseStock createStock(Warehouse w, PhoneVariant v, int onHand, int reserved) {
        WarehouseStock ws = new WarehouseStock();
        ws.setId((long) (w.getId() * 1000 + v.getId()));
        ws.setWarehouse(w);
        ws.setPhoneVariant(v);
        ws.setQuantity(onHand);
        ws.setReservedQuantity(reserved);
        return ws;
    }

    @Test
    @DisplayName("Tạo phiếu điều chuyển cho đơn hàng: Tăng reservedQuantity tại kho nguồn và đích")
    void createTransfersForOrder_success() {
        WarehouseStock stockHn = createStock(whHn, variant1, 5, 0);
        WarehouseStock stockHcm = createStock(whHcm, variant2, 2, 0);

        when(warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(1L, 101L))
                .thenReturn(Optional.of(stockHn));
        when(warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(2L, 102L))
                .thenReturn(Optional.of(stockHcm));

        when(warehouseRepository.findById(1L)).thenReturn(Optional.of(whHn));
        when(phoneVariantRepository.findById(101L)).thenReturn(Optional.of(variant1));
        when(warehouseTransferRepository.existsByTransferCode(anyString())).thenReturn(false);
        when(warehouseTransferRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        TransferPlanItem planItem = TransferPlanItem.builder()
                .sourceWarehouse(whHn)
                .destinationWarehouse(whHcm)
                .phoneVariantId(101L)
                .quantity(2)
                .build();

        InterWarehouseTransferPlan plan = InterWarehouseTransferPlan.builder()
                .destinationWarehouse(whHcm)
                .directFulfillment(false)
                .feasible(true)
                .totalItemsToTransfer(2)
                .destinationAvailableStock(Map.of(102L, 1))
                .transferItems(List.of(planItem))
                .build();

        List<WarehouseTransfer> result = transferService.createTransfersForOrder(order, plan);

        assertNotNull(result);
        assertEquals(1, result.size());
        WarehouseTransfer transfer = result.get(0);
        assertEquals("PENDING", transfer.getStatus());
        assertEquals(whHn.getId(), transfer.getSourceWarehouse().getId());
        assertEquals(whHcm.getId(), transfer.getDestinationWarehouse().getId());
        assertEquals(1, transfer.getItems().size());
        assertEquals(2, transfer.getItems().get(0).getRequestedQuantity());

        // Kiểm tra reservation tại kho nguồn đã tăng lên 2
        assertEquals(2, stockHn.getReservedQuantity());
        // Kiểm tra reservation tại kho đích đã tăng lên 1
        assertEquals(1, stockHcm.getReservedQuantity());

        verify(warehouseStockHistoryRepository, atLeast(2)).save(any(WarehouseStockHistory.class));
    }

    @Test
    @DisplayName("Tạo phiếu thất bại khi tồn kho khả dụng tại kho nguồn không đủ giữ chỗ")
    void createTransfersForOrder_insufficientAvailableStock() {
        // Kho Hà Nội có onHand = 2, nhưng đã bị reserved = 2 -> Available = 0
        WarehouseStock stockHn = createStock(whHn, variant1, 2, 2);
        when(warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(1L, 101L))
                .thenReturn(Optional.of(stockHn));

        TransferPlanItem planItem = TransferPlanItem.builder()
                .sourceWarehouse(whHn)
                .destinationWarehouse(whHcm)
                .phoneVariantId(101L)
                .quantity(1)
                .build();

        InterWarehouseTransferPlan plan = InterWarehouseTransferPlan.builder()
                .destinationWarehouse(whHcm)
                .directFulfillment(false)
                .feasible(true)
                .totalItemsToTransfer(1)
                .transferItems(List.of(planItem))
                .build();

        assertThrows(BadRequestException.class, () -> transferService.createTransfersForOrder(order, plan));
    }

    @Test
    @DisplayName("Xuất kho điều chuyển: Giảm On-hand và Reserved tại kho nguồn, chuyển sang DISPATCHED")
    void dispatchTransfer_success() {
        WarehouseTransfer transfer = new WarehouseTransfer();
        transfer.setId(501L);
        transfer.setTransferCode("TRF-20261112-TEST01");
        transfer.setStatus("PENDING");
        transfer.setSourceWarehouse(whHn);
        transfer.setDestinationWarehouse(whHcm);

        WarehouseTransferItem item = WarehouseTransferItem.builder()
                .transfer(transfer)
                .phoneVariant(variant1)
                .requestedQuantity(3)
                .dispatchedQuantity(0)
                .receivedQuantity(0)
                .build();
        transfer.getItems().add(item);

        when(warehouseTransferRepository.findById(501L)).thenReturn(Optional.of(transfer));
        when(warehouseTransferRepository.findByIdForUpdate(501L)).thenReturn(Optional.of(transfer));

        WarehouseStock stockHn = createStock(whHn, variant1, 5, 3);
        when(warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(1L, 101L))
                .thenReturn(Optional.of(stockHn));

        WarehouseTransferDTO dto = transferService.dispatchTransfer(501L, new DispatchTransferRequest());

        assertNotNull(dto);
        assertEquals("DISPATCHED", dto.getStatus());
        assertEquals(3, item.getDispatchedQuantity());
        // On-hand giảm từ 5 xuống 2
        assertEquals(2, stockHn.getQuantity());
        // Reserved giảm từ 3 xuống 0
        assertEquals(0, stockHn.getReservedQuantity());

        verify(warehouseStockHistoryRepository).save(argThat(h ->
                "TRANSFER_OUT".equals(h.getChangeType()) && h.getQuantityChange() == -3
        ));
    }

    @Test
    @DisplayName("Xuất kho thất bại: Chống double-dispatch khi phiếu đã xuất trước đó")
    void dispatchTransfer_rejectDoubleDispatch() {
        WarehouseTransfer transfer = new WarehouseTransfer();
        transfer.setId(502L);
        transfer.setStatus("DISPATCHED");

        when(warehouseTransferRepository.findById(502L)).thenReturn(Optional.of(transfer));
        when(warehouseTransferRepository.findByIdForUpdate(502L)).thenReturn(Optional.of(transfer));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                transferService.dispatchTransfer(502L, new DispatchTransferRequest()));

        assertTrue(ex.getMessage().contains("không thể xuất trùng lặp"));
    }

    @Test
    @DisplayName("Nhập kho điều chuyển: Tăng On-hand và Reserved tại kho đích, chuyển sang RECEIVED")
    void receiveTransfer_success_andCompleteOrder() {
        WarehouseTransfer transfer = new WarehouseTransfer();
        transfer.setId(503L);
        transfer.setTransferCode("TRF-20261112-TEST03");
        transfer.setStatus("DISPATCHED");
        transfer.setSourceWarehouse(whHn);
        transfer.setDestinationWarehouse(whHcm);
        transfer.setOrder(order);

        WarehouseTransferItem item = WarehouseTransferItem.builder()
                .transfer(transfer)
                .phoneVariant(variant1)
                .requestedQuantity(2)
                .dispatchedQuantity(2)
                .receivedQuantity(0)
                .build();
        transfer.getItems().add(item);

        when(warehouseTransferRepository.findById(503L)).thenReturn(Optional.of(transfer));
        when(orderRepository.findByIdForUpdate(order.getId())).thenReturn(Optional.of(order));
        when(warehouseTransferRepository.findByIdForUpdate(503L)).thenReturn(Optional.of(transfer));

        WarehouseStock stockHcm = createStock(whHcm, variant1, 0, 0);
        when(warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(2L, 101L))
                .thenReturn(Optional.of(stockHcm));

        when(warehouseTransferRepository.findByOrderId(order.getId())).thenReturn(List.of(transfer));

        WarehouseTransferDTO dto = transferService.receiveTransfer(503L, new ReceiveTransferRequest());

        assertNotNull(dto);
        assertEquals("RECEIVED", dto.getStatus());
        assertEquals(2, item.getReceivedQuantity());
        // Tồn kho kho đích tăng lên 2 và được giữ chỗ 2 (không cho bán tự do)
        assertEquals(2, stockHcm.getQuantity());
        assertEquals(2, stockHcm.getReservedQuantity());

        // Kiểm tra order được tự động chuyển sang PROCESSING
        assertEquals("PROCESSING", order.getOrderStatus());
        verify(orderRepository).save(order);
        verify(orderHistoryRepository).save(any(OrderHistory.class));
    }

    @Test
    @DisplayName("Nhập kho thất bại: Chống double-receive khi phiếu đã hoàn tất nhập kho")
    void receiveTransfer_rejectDoubleReceive() {
        WarehouseTransfer transfer = new WarehouseTransfer();
        transfer.setId(504L);
        transfer.setStatus("RECEIVED");

        when(warehouseTransferRepository.findById(504L)).thenReturn(Optional.of(transfer));
        when(warehouseTransferRepository.findByIdForUpdate(504L)).thenReturn(Optional.of(transfer));

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                transferService.receiveTransfer(504L, new ReceiveTransferRequest()));

        assertTrue(ex.getMessage().contains("không thể nhập trùng lặp"));
    }

    @Test
    @DisplayName("Hủy phiếu điều chuyển PENDING: Hoàn trả reservation tại kho nguồn")
    void cancelTransfer_success() {
        WarehouseTransfer transfer = new WarehouseTransfer();
        transfer.setId(505L);
        transfer.setTransferCode("TRF-20261112-CANCEL");
        transfer.setStatus("PENDING");
        transfer.setSourceWarehouse(whHn);
        transfer.setDestinationWarehouse(whHcm);

        WarehouseTransferItem item = WarehouseTransferItem.builder()
                .transfer(transfer)
                .phoneVariant(variant1)
                .requestedQuantity(3)
                .build();
        transfer.getItems().add(item);

        when(warehouseTransferRepository.findById(505L)).thenReturn(Optional.of(transfer));
        when(warehouseTransferRepository.findByIdForUpdate(505L)).thenReturn(Optional.of(transfer));

        WarehouseStock stockHn = createStock(whHn, variant1, 10, 3);
        when(warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(1L, 101L))
                .thenReturn(Optional.of(stockHn));

        WarehouseTransferDTO dto = transferService.cancelTransfer(505L, "Khách đổi ý");

        assertNotNull(dto);
        assertEquals("CANCELLED", dto.getStatus());
        // Reserved tại kho nguồn được hoàn trả về 0
        assertEquals(0, stockHn.getReservedQuantity());
        // On-hand không đổi
        assertEquals(10, stockHn.getQuantity());
    }

    @Test
    @DisplayName("Hủy toàn bộ điều chuyển cho đơn hàng: Hoàn trả đầy đủ các kho")
    void cancelTransfersForOrder_releasesAllReservations() {
        WarehouseTransfer transfer = new WarehouseTransfer();
        transfer.setId(506L);
        transfer.setTransferCode("TRF-ORDER-CANCEL");
        transfer.setStatus("PENDING");
        transfer.setSourceWarehouse(whHn);
        transfer.setDestinationWarehouse(whHcm);

        WarehouseTransferItem item = WarehouseTransferItem.builder()
                .transfer(transfer)
                .phoneVariant(variant1)
                .requestedQuantity(2)
                .build();
        transfer.getItems().add(item);

        when(warehouseTransferRepository.findByOrderId(order.getId())).thenReturn(List.of(transfer));
        when(warehouseTransferRepository.findById(506L)).thenReturn(Optional.of(transfer));
        when(warehouseTransferRepository.findByIdForUpdate(506L)).thenReturn(Optional.of(transfer));

        WarehouseStock stockHn = createStock(whHn, variant1, 5, 2);
        when(warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(1L, 101L))
                .thenReturn(Optional.of(stockHn));

        when(orderRepository.findByIdForUpdate(order.getId())).thenReturn(Optional.of(order));

        transferService.cancelTransfersForOrder(order.getId(), "Khách hủy đơn hàng");

        assertEquals("CANCELLED", transfer.getStatus());
        assertEquals(0, stockHn.getReservedQuantity());
    }

    @Test
    @DisplayName("FINDING-IDEMPOTENCY-01: createTransfersForOrder trả về danh sách có sẵn nếu đã tạo")
    void createTransfersForOrder_idempotent() {
        WarehouseTransfer existing = new WarehouseTransfer();
        existing.setId(999L);
        existing.setTransferCode("TRF-EXISTING");
        existing.setOrder(order);
        existing.setSourceWarehouse(whHn);
        existing.setDestinationWarehouse(whHcm);
        existing.setStatus("PENDING");

        when(warehouseTransferRepository.findByOrderId(order.getId())).thenReturn(List.of(existing));

        InterWarehouseTransferPlan plan = InterWarehouseTransferPlan.builder()
                .destinationWarehouse(whHcm)
                .feasible(true)
                .transferItems(List.of(TransferPlanItem.builder()
                        .sourceWarehouse(whHn)
                        .destinationWarehouse(whHcm)
                        .phoneVariantId(variant1.getId())
                        .quantity(2)
                        .build()))
                .build();

        List<WarehouseTransfer> result = transferService.createTransfersForOrder(order, plan);

        assertEquals(1, result.size());
        assertEquals(999L, result.get(0).getId());
        verify(warehouseTransferRepository, never()).save(any());
    }

    @Test
    @DisplayName("FINDING-STOCK-01: deductFulfillmentStockAtDestination trừ dứt điểm tồn kho và giải phóng reservation")
    void deductFulfillmentStockAtDestination_success() {
        WarehouseTransfer transfer = new WarehouseTransfer();
        transfer.setId(888L);
        transfer.setSourceWarehouse(whHn);
        transfer.setDestinationWarehouse(whHcm);

        OrderDetail detail = OrderDetail.builder()
                .phoneVariant(variant1)
                .quantity(2)
                .build();
        order.setFulfillmentWarehouse(whHcm);
        order.setOrderDetails(new ArrayList<>(List.of(detail)));

        when(orderRepository.findByIdForUpdate(order.getId())).thenReturn(Optional.of(order));
        when(warehouseTransferRepository.findByOrderId(order.getId())).thenReturn(List.of(transfer));
        when(warehouseStockHistoryRepository.existsByTransferReference("FULFILL-ORDER-" + order.getId())).thenReturn(false);

        WarehouseStock destStock = createStock(whHcm, variant1, 10, 2);
        when(warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(whHcm.getId(), variant1.getId()))
                .thenReturn(Optional.of(destStock));

        transferService.deductFulfillmentStockAtDestination(order);

        // Quantity giảm từ 10 xuống 8
        assertEquals(8, destStock.getQuantity());
        // Reserved giảm từ 2 xuống 0
        assertEquals(0, destStock.getReservedQuantity());
        verify(warehouseStockHistoryRepository).save(argThat(h ->
                "EXPORT".equals(h.getChangeType()) && h.getQuantityChange() == -2
        ));
    }

    @Test
    @DisplayName("FINDING-STOCK-01: deductFulfillmentStockAtDestination chống trừ tồn kho lặp lại khi gọi 2 lần")
    void deductFulfillmentStockAtDestination_rejectDuplicateCall() {
        WarehouseTransfer transfer = new WarehouseTransfer();
        transfer.setId(889L);
        transfer.setSourceWarehouse(whHn);
        transfer.setDestinationWarehouse(whHcm);

        order.setFulfillmentWarehouse(whHcm);

        when(orderRepository.findByIdForUpdate(order.getId())).thenReturn(Optional.of(order));
        when(warehouseTransferRepository.findByOrderId(order.getId())).thenReturn(List.of(transfer));
        when(warehouseStockHistoryRepository.existsByTransferReference("FULFILL-ORDER-" + order.getId())).thenReturn(true);

        transferService.deductFulfillmentStockAtDestination(order);

        // BẮT BUỘC: Không gọi khóa tồn kho và không lưu thêm bản ghi EXPORT nào
        verify(warehouseStockRepository, never()).findByWarehouseIdAndPhoneVariantIdForUpdate(anyLong(), anyLong());
        verify(warehouseStockHistoryRepository, never()).save(any());
    }
}
