package com.re.greenphone.service.impl;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.exception.UnauthorizedException;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.DispatchTransferRequest;
import com.re.greenphone.dto.request.ReceiveTransferRequest;
import com.re.greenphone.dto.response.InterWarehouseTransferPlan;
import com.re.greenphone.dto.response.TransferPlanItem;
import com.re.greenphone.dto.response.WarehouseTransferDTO;
import com.re.greenphone.dto.response.WarehouseTransferItemDTO;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.*;
import com.re.greenphone.security.SecurityUtils;
import com.re.greenphone.service.WarehouseTransferService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class WarehouseTransferServiceImpl implements WarehouseTransferService {

    private final WarehouseTransferRepository warehouseTransferRepository;
    private final WarehouseTransferItemRepository warehouseTransferItemRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final WarehouseStockHistoryRepository warehouseStockHistoryRepository;
    private final WarehouseRepository warehouseRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final OrderRepository orderRepository;
    private final OrderHistoryRepository orderHistoryRepository;
    private final UserRepository userRepository;

    private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private final SecureRandom random = new SecureRandom();

    private record StockLockKey(Long warehouseId, Long variantId) implements Comparable<StockLockKey> {
        @Override
        public int compareTo(StockLockKey o) {
            int cmp = this.warehouseId.compareTo(o.warehouseId);
            return cmp != 0 ? cmp : this.variantId.compareTo(o.variantId);
        }
    }

    @Override
    public List<WarehouseTransfer> createTransfersForOrder(Order order, InterWarehouseTransferPlan plan) {
        if (order == null || plan == null || !plan.isFeasible()) {
            throw new BadRequestException("Kế hoạch điều chuyển không khả thi hoặc thông tin đơn hàng không hợp lệ");
        }

        // FINDING-IDEMPOTENCY-01: Khóa Order và kiểm tra idempotency
        if (order.getId() != null) {
            orderRepository.findByIdForUpdate(order.getId());
            List<WarehouseTransfer> existingTransfers = warehouseTransferRepository.findByOrderId(order.getId());
            if (!existingTransfers.isEmpty()) {
                log.warn("Transfers already created for order #{}, returning existing transfers (idempotency)", order.getId());
                return existingTransfers;
            }
        }

        Warehouse destWarehouse = plan.getDestinationWarehouse();
        if (destWarehouse == null) {
            throw new BadRequestException("Kho đích giao hàng không tồn tại trong kế hoạch");
        }

        // 1. Thu thập tất cả các cặp (warehouseId, variantId) cần giữ chỗ tồn kho
        Map<StockLockKey, Integer> requiredReservations = new HashMap<>();

        // Giữ chỗ tồn kho sẵn có tại kho đích
        if (plan.getDestinationAvailableStock() != null) {
            for (Map.Entry<Long, Integer> entry : plan.getDestinationAvailableStock().entrySet()) {
                if (entry.getValue() > 0) {
                    requiredReservations.put(
                            new StockLockKey(destWarehouse.getId(), entry.getKey()),
                            entry.getValue()
                    );
                }
            }
        }

        // Giữ chỗ tồn kho tại các kho nguồn
        for (TransferPlanItem item : plan.getTransfers()) {
            StockLockKey key = new StockLockKey(item.getSourceWarehouseId(), item.getPhoneVariantId());
            requiredReservations.merge(key, item.getQuantity(), Integer::sum);
        }

        // 2. Khóa và cập nhật reservation theo thứ tự warehouseId ASC, variantId ASC (chống triệt để deadlock)
        List<StockLockKey> sortedKeys = requiredReservations.keySet().stream().sorted().toList();
        for (StockLockKey key : sortedKeys) {
            int requiredQty = requiredReservations.get(key);
            WarehouseStock stock = warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(key.warehouseId(), key.variantId())
                    .orElseThrow(() -> new BadRequestException(
                            String.format("Không tìm thấy tồn kho cho biến thể #%d tại kho #%d", key.variantId(), key.warehouseId())));

            if (stock.getAvailableQuantity() < requiredQty) {
                throw new BadRequestException(String.format(
                        "Tồn kho khả dụng của biến thể #%d tại kho %s không đủ (%d < %d)",
                        key.variantId(), stock.getWarehouse().getName(), stock.getAvailableQuantity(), requiredQty));
            }

            stock.setReservedQuantity(stock.getReservedQuantity() + requiredQty);
            warehouseStockRepository.save(stock);

            // Ghi nhật ký tồn kho: HOLD (On-hand không đổi, Available giảm)
            WarehouseStockHistory history = new WarehouseStockHistory();
            history.setWarehouse(stock.getWarehouse());
            history.setPhoneVariant(stock.getPhoneVariant());
            history.setQuantityBefore(stock.getQuantity());
            history.setQuantityChange(0);
            history.setQuantityAfter(stock.getQuantity());
            history.setChangeType("HOLD");
            history.setReason("Giữ chỗ cho đơn hàng #" + order.getId());
            history.setTransferReference(order.getId() != null ? String.valueOf(order.getId()) : null);
            history.setChangedByName(getCurrentUserName());
            warehouseStockHistoryRepository.save(history);
        }

        // 3. Gom các dòng kế hoạch theo kho nguồn và tạo các phiếu WarehouseTransfer
        Map<Long, List<TransferPlanItem>> itemsBySource = plan.getTransfers().stream()
                .collect(Collectors.groupingBy(TransferPlanItem::getSourceWarehouseId, LinkedHashMap::new, Collectors.toList()));

        List<WarehouseTransfer> createdTransfers = new ArrayList<>();
        String currentUserName = getCurrentUserName();

        for (Map.Entry<Long, List<TransferPlanItem>> entry : itemsBySource.entrySet()) {
            Long sourceWarehouseId = entry.getKey();
            List<TransferPlanItem> transferItems = entry.getValue();

            Warehouse sourceWarehouse = warehouseRepository.findById(sourceWarehouseId)
                    .orElseThrow(() -> new ResourceNotFoundException("Warehouse", "id", sourceWarehouseId));

            String transferCode = generateTransferCode();
            WarehouseTransfer transfer = WarehouseTransfer.builder()
                    .transferCode(transferCode)
                    .order(order)
                    .sourceWarehouse(sourceWarehouse)
                    .destinationWarehouse(destWarehouse)
                    .status("PENDING")
                    .createdBy(currentUserName)
                    .items(new ArrayList<>())
                    .build();

            for (TransferPlanItem itemPlan : transferItems) {
                PhoneVariant variant = phoneVariantRepository.findById(itemPlan.getPhoneVariantId())
                        .orElseThrow(() -> new ResourceNotFoundException("PhoneVariant", "id", itemPlan.getPhoneVariantId()));

                WarehouseTransferItem transferItem = WarehouseTransferItem.builder()
                        .transfer(transfer)
                        .phoneVariant(variant)
                        .requestedQuantity(itemPlan.getQuantity())
                        .dispatchedQuantity(0)
                        .receivedQuantity(0)
                        .build();

                transfer.getItems().add(transferItem);
            }

            WarehouseTransfer savedTransfer = warehouseTransferRepository.save(transfer);
            createdTransfers.add(savedTransfer);
        }

        return createdTransfers;
    }

    @Override
    public WarehouseTransferDTO dispatchTransfer(Long transferId, DispatchTransferRequest request) {
        // FINDING-LOCK-01: Đọc transfer metadata và khóa Order TRƯỚC WarehouseTransfer
        WarehouseTransfer transferMeta = warehouseTransferRepository.findById(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("WarehouseTransfer", "id", transferId));

        if (transferMeta.getOrder() != null) {
            orderRepository.findByIdForUpdate(transferMeta.getOrder().getId());
        }

        WarehouseTransfer transfer = warehouseTransferRepository.findByIdForUpdate(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("WarehouseTransfer", "id", transferId));

        // FINDING-IDOR-01: Kiểm tra quyền chi nhánh nhân viên kho
        validateStaffBranchAccess(transfer.getSourceWarehouse(), "xuất kho");

        if ("DISPATCHED".equalsIgnoreCase(transfer.getStatus())) {
            throw new BadRequestException("Phiếu điều chuyển đã được xuất kho trước đó (không thể xuất trùng lặp)");
        }
        if ("RECEIVED".equalsIgnoreCase(transfer.getStatus())) {
            throw new BadRequestException("Phiếu điều chuyển đã được nhập kho trước đó");
        }
        if ("CANCELLED".equalsIgnoreCase(transfer.getStatus())) {
            throw new BadRequestException("Phiếu điều chuyển đã bị hủy, không thể xuất kho");
        }
        if (!"PENDING".equalsIgnoreCase(transfer.getStatus())) {
            throw new BadRequestException("Trạng thái phiếu điều chuyển không hợp lệ để xuất kho: " + transfer.getStatus());
        }

        // Sắp xếp các item theo variantId ASC để khóa nhất quán
        List<WarehouseTransferItem> items = transfer.getItems().stream()
                .sorted(Comparator.comparing(i -> i.getPhoneVariant().getId()))
                .toList();

        for (WarehouseTransferItem item : items) {
            int qtyToDispatch = item.getRequestedQuantity();
            if (request != null && request.getItemQuantities() != null && request.getItemQuantities().containsKey(item.getId())) {
                qtyToDispatch = request.getItemQuantities().get(item.getId());
                if (qtyToDispatch <= 0 || qtyToDispatch > item.getRequestedQuantity()) {
                    throw new BadRequestException("Số lượng xuất kho không hợp lệ cho sản phẩm #" + item.getPhoneVariant().getId());
                }
            }

            item.setDispatchedQuantity(qtyToDispatch);

            // Khóa và trừ tồn kho tại kho nguồn
            WarehouseStock stock = warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(
                    transfer.getSourceWarehouse().getId(), item.getPhoneVariant().getId())
                    .orElseThrow(() -> new BadRequestException("Không tìm thấy tồn kho tại kho nguồn"));

            if (stock.getQuantity() < qtyToDispatch) {
                throw new BadRequestException(String.format(
                        "Tồn kho thực tế tại %s không đủ để xuất kho (%d < %d)",
                        transfer.getSourceWarehouse().getName(), stock.getQuantity(), qtyToDispatch));
            }

            int before = stock.getQuantity();
            stock.setQuantity(before - qtyToDispatch);
            stock.setReservedQuantity(Math.max(0, stock.getReservedQuantity() - qtyToDispatch));
            warehouseStockRepository.save(stock);

            // Ghi nhật ký TRANSFER_OUT
            WarehouseStockHistory history = new WarehouseStockHistory();
            history.setWarehouse(transfer.getSourceWarehouse());
            history.setPhoneVariant(item.getPhoneVariant());
            history.setQuantityBefore(before);
            history.setQuantityChange(-qtyToDispatch);
            history.setQuantityAfter(stock.getQuantity());
            history.setChangeType("TRANSFER_OUT");
            history.setReason("Xuất kho điều chuyển theo phiếu " + transfer.getTransferCode());
            history.setTransferReference(transfer.getTransferCode());
            history.setChangedByName(getCurrentUserName());
            warehouseStockHistoryRepository.save(history);
        }

        transfer.setStatus("DISPATCHED");
        transfer.setDispatchedAt(LocalDateTime.now());
        transfer.setDispatchedBy(getCurrentUserName());
        if (request != null && request.getNote() != null && !request.getNote().isBlank()) {
            transfer.setNote(request.getNote().trim());
        }

        warehouseTransferRepository.save(transfer);
        return toDTO(transfer);
    }

    @Override
    public WarehouseTransferDTO receiveTransfer(Long transferId, ReceiveTransferRequest request) {
        // FINDING-LOCK-01: Đọc metadata và khóa Order TRƯỚC WarehouseTransfer để triệt tiêu Deadlock đảo khóa với CancelOrder/Refund
        WarehouseTransfer transferMeta = warehouseTransferRepository.findById(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("WarehouseTransfer", "id", transferId));

        Order order = null;
        if (transferMeta.getOrder() != null) {
            order = orderRepository.findByIdForUpdate(transferMeta.getOrder().getId()).orElse(null);
        }

        WarehouseTransfer transfer = warehouseTransferRepository.findByIdForUpdate(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("WarehouseTransfer", "id", transferId));

        // FINDING-IDOR-01: Kiểm tra quyền chi nhánh nhân viên kho
        validateStaffBranchAccess(transfer.getDestinationWarehouse(), "nhập kho");

        if ("RECEIVED".equalsIgnoreCase(transfer.getStatus())) {
            throw new BadRequestException("Phiếu điều chuyển đã được nhập kho trước đó (không thể nhập trùng lặp)");
        }
        if ("CANCELLED".equalsIgnoreCase(transfer.getStatus())) {
            throw new BadRequestException("Phiếu điều chuyển đã bị hủy, không thể nhập kho");
        }
        if ("PENDING".equalsIgnoreCase(transfer.getStatus())) {
            throw new BadRequestException("Phiếu điều chuyển chưa được xuất kho, không thể nhập kho");
        }
        if (!"DISPATCHED".equalsIgnoreCase(transfer.getStatus())) {
            throw new BadRequestException("Trạng thái phiếu điều chuyển không hợp lệ để nhập kho: " + transfer.getStatus());
        }

        if (order == null) {
            order = transfer.getOrder();
        }
        boolean isOrderCancelled = order != null && "CANCELLED".equalsIgnoreCase(order.getOrderStatus());

        List<WarehouseTransferItem> items = transfer.getItems().stream()
                .sorted(Comparator.comparing(i -> i.getPhoneVariant().getId()))
                .toList();

        boolean allItemsFullyReceived = true;

        for (WarehouseTransferItem item : items) {
            int inTransit = item.getInTransitQuantity();
            int qtyToReceive = inTransit;
            if (request != null && request.getItemQuantities() != null && request.getItemQuantities().containsKey(item.getId())) {
                qtyToReceive = request.getItemQuantities().get(item.getId());
                if (qtyToReceive <= 0 || qtyToReceive > inTransit) {
                    throw new BadRequestException("Số lượng nhập kho không hợp lệ cho sản phẩm #" + item.getPhoneVariant().getId());
                }
            }

            item.setReceivedQuantity(item.getReceivedQuantity() + qtyToReceive);
            if (item.getReceivedQuantity() < item.getRequestedQuantity()) {
                allItemsFullyReceived = false;
            }

            // Khóa hoặc tạo mới bản ghi tồn kho tại kho đích
            WarehouseStock destStock = warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(
                    transfer.getDestinationWarehouse().getId(), item.getPhoneVariant().getId())
                    .orElseGet(() -> {
                        WarehouseStock newStock = new WarehouseStock();
                        newStock.setWarehouse(transfer.getDestinationWarehouse());
                        newStock.setPhoneVariant(item.getPhoneVariant());
                        newStock.setQuantity(0);
                        newStock.setReservedQuantity(0);
                        return warehouseStockRepository.save(newStock);
                    });

            int before = destStock.getQuantity();
            destStock.setQuantity(before + qtyToReceive);

            // Bất biến: Nếu đơn hàng còn hoạt động, giữ chỗ cho đơn này (không bán tự do).
            // Nếu đơn đã hủy từ trước, hàng nhập vào kho đích trở thành Available để bán tự do.
            if (!isOrderCancelled) {
                destStock.setReservedQuantity(destStock.getReservedQuantity() + qtyToReceive);
            }
            warehouseStockRepository.save(destStock);

            // Ghi nhật ký TRANSFER_IN
            WarehouseStockHistory history = new WarehouseStockHistory();
            history.setWarehouse(transfer.getDestinationWarehouse());
            history.setPhoneVariant(item.getPhoneVariant());
            history.setQuantityBefore(before);
            history.setQuantityChange(qtyToReceive);
            history.setQuantityAfter(destStock.getQuantity());
            history.setChangeType("TRANSFER_IN");
            history.setReason("Nhập kho điều chuyển theo phiếu " + transfer.getTransferCode() + (isOrderCancelled ? " (Đơn đã hủy - nhập vào tồn khả dụng)" : ""));
            history.setTransferReference(transfer.getTransferCode());
            history.setChangedByName(getCurrentUserName());
            warehouseStockHistoryRepository.save(history);
        }

        if (allItemsFullyReceived) {
            transfer.setStatus("RECEIVED");
            transfer.setReceivedAt(LocalDateTime.now());
            transfer.setReceivedBy(getCurrentUserName());
        }

        if (request != null && request.getNote() != null && !request.getNote().isBlank()) {
            String currentNote = transfer.getNote() != null ? transfer.getNote() + " | " : "";
            transfer.setNote(currentNote + request.getNote().trim());
        }

        warehouseTransferRepository.save(transfer);

        // Kiểm tra xem tất cả các phiếu của đơn hàng đã nhận đủ chưa
        if (order != null && "WAITING_FOR_TRANSFER".equalsIgnoreCase(order.getOrderStatus())) {
            List<WarehouseTransfer> allTransfers = warehouseTransferRepository.findByOrderId(order.getId());
            boolean allTransfersFullyReceived = allTransfers.stream().allMatch(t ->
                    "RECEIVED".equalsIgnoreCase(t.getStatus()) &&
                    t.getItems().stream().allMatch(ti -> ti.getReceivedQuantity() >= ti.getRequestedQuantity()));

            if (allTransfersFullyReceived) {
                order.setOrderStatus("PROCESSING");
                if (order.getOrderDetails() != null) {
                    for (OrderDetail detail : order.getOrderDetails()) {
                        detail.setWarehouseId(transfer.getDestinationWarehouse().getId());
                    }
                }
                orderRepository.save(order);

                orderHistoryRepository.save(OrderHistory.builder()
                        .order(order)
                        .fromStatus("WAITING_FOR_TRANSFER")
                        .toStatus("PROCESSING")
                        .note("Tất cả hàng điều chuyển đã tập kết đủ tại " + transfer.getDestinationWarehouse().getName() + ", đơn hàng sẵn sàng đóng gói và giao khách")
                        .changedBy(getCurrentUserName())
                        .build());
            }
        }

        return toDTO(transfer);
    }

    @Override
    public WarehouseTransferDTO cancelTransfer(Long transferId, String reason) {
        // FINDING-LOCK-01: Khóa Order trước nếu có
        WarehouseTransfer transferMeta = warehouseTransferRepository.findById(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("WarehouseTransfer", "id", transferId));

        if (transferMeta.getOrder() != null) {
            orderRepository.findByIdForUpdate(transferMeta.getOrder().getId());
        }

        WarehouseTransfer transfer = warehouseTransferRepository.findByIdForUpdate(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("WarehouseTransfer", "id", transferId));

        if ("CANCELLED".equalsIgnoreCase(transfer.getStatus())) {
            return toDTO(transfer);
        }

        if (!"PENDING".equalsIgnoreCase(transfer.getStatus())) {
            throw new BadRequestException("Chỉ có thể hủy phiếu điều chuyển ở trạng thái PENDING. Trạng thái hiện tại: " + transfer.getStatus());
        }

        // Hoàn trả reservation tại kho nguồn
        List<WarehouseTransferItem> items = transfer.getItems().stream()
                .sorted(Comparator.comparing(i -> i.getPhoneVariant().getId()))
                .toList();

        for (WarehouseTransferItem item : items) {
            WarehouseStock stock = warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(
                    transfer.getSourceWarehouse().getId(), item.getPhoneVariant().getId())
                    .orElse(null);

            if (stock != null) {
                stock.setReservedQuantity(Math.max(0, stock.getReservedQuantity() - item.getRequestedQuantity()));
                warehouseStockRepository.save(stock);

                WarehouseStockHistory history = new WarehouseStockHistory();
                history.setWarehouse(transfer.getSourceWarehouse());
                history.setPhoneVariant(item.getPhoneVariant());
                history.setQuantityBefore(stock.getQuantity());
                history.setQuantityChange(0);
                history.setQuantityAfter(stock.getQuantity());
                history.setChangeType("RELEASE_HOLD");
                history.setReason("Hủy phiếu điều chuyển: " + (reason != null ? reason : ""));
                history.setTransferReference(transfer.getTransferCode());
                history.setChangedByName(getCurrentUserName());
                warehouseStockHistoryRepository.save(history);
            }
        }

        transfer.setStatus("CANCELLED");
        String prefix = "[Lý do hủy: " + (reason != null ? reason.trim() : "Quản trị viên hủy") + "]";
        transfer.setNote(transfer.getNote() != null ? prefix + " " + transfer.getNote() : prefix);
        warehouseTransferRepository.save(transfer);

        return toDTO(transfer);
    }

    @Override
    public void cancelTransfersForOrder(Long orderId, String reason) {
        // FINDING-LOCK-01: Khóa Order TRƯỚC WarehouseTransfer để đảm bảo thứ tự khóa phân cấp
        Order order = orderRepository.findByIdForUpdate(orderId).orElse(null);

        List<WarehouseTransfer> transfers = warehouseTransferRepository.findByOrderId(orderId).stream()
                .sorted(Comparator.comparing(WarehouseTransfer::getId))
                .toList();

        for (WarehouseTransfer transfer : transfers) {
            if ("PENDING".equalsIgnoreCase(transfer.getStatus())) {
                cancelTransfer(transfer.getId(), reason);
            } else if ("DISPATCHED".equalsIgnoreCase(transfer.getStatus())) {
                // Hàng đang trên đường vận chuyển: Đánh dấu ghi chú để khi nhập kho sẽ giải phóng thành hàng bán tự do
                String cancelNote = "[Đơn hàng đã hủy - hàng sẽ nhập vào tồn kho tự do khi tới] " + (reason != null ? reason : "");
                transfer.setNote(transfer.getNote() != null ? cancelNote + " | " + transfer.getNote() : cancelNote);
                warehouseTransferRepository.save(transfer);
            } else if ("RECEIVED".equalsIgnoreCase(transfer.getStatus())) {
                // Hàng đã về kho đích và đang bị giữ chỗ: Giải phóng reservation tại kho đích
                List<WarehouseTransferItem> items = transfer.getItems().stream()
                        .sorted(Comparator.comparing(i -> i.getPhoneVariant().getId()))
                        .toList();

                for (WarehouseTransferItem item : items) {
                    WarehouseStock stock = warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(
                            transfer.getDestinationWarehouse().getId(), item.getPhoneVariant().getId())
                            .orElse(null);

                    if (stock != null) {
                        stock.setReservedQuantity(Math.max(0, stock.getReservedQuantity() - item.getReceivedQuantity()));
                        warehouseStockRepository.save(stock);

                        WarehouseStockHistory history = new WarehouseStockHistory();
                        history.setWarehouse(transfer.getDestinationWarehouse());
                        history.setPhoneVariant(item.getPhoneVariant());
                        history.setQuantityBefore(stock.getQuantity());
                        history.setQuantityChange(0);
                        history.setQuantityAfter(stock.getQuantity());
                        history.setChangeType("RELEASE_HOLD");
                        history.setReason("Đơn hàng #" + orderId + " bị hủy - giải phóng reservation hàng điều chuyển đã nhận");
                        history.setTransferReference(transfer.getTransferCode());
                        history.setChangedByName(getCurrentUserName());
                        warehouseStockHistoryRepository.save(history);
                    }
                }
            }
        }

        // Giải phóng thêm reservation của lượng tồn kho có sẵn tại kho đích (nếu có)
        if (order != null && order.getFulfillmentWarehouse() != null && order.getOrderDetails() != null) {
            List<OrderDetail> sortedDetails = order.getOrderDetails().stream()
                    .filter(d -> d.getPhoneVariant() != null)
                    .sorted(Comparator.comparing(d -> d.getPhoneVariant().getId()))
                    .toList();

            for (OrderDetail detail : sortedDetails) {
                Long variantId = detail.getPhoneVariant().getId();
                int totalTransferred = transfers.stream()
                        .flatMap(t -> t.getItems().stream())
                        .filter(ti -> ti.getPhoneVariant() != null && ti.getPhoneVariant().getId().equals(variantId))
                        .mapToInt(WarehouseTransferItem::getRequestedQuantity)
                        .sum();

                int destHeld = Math.max(0, detail.getQuantity() - totalTransferred);
                if (destHeld > 0) {
                    WarehouseStock destStock = warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(
                            order.getFulfillmentWarehouse().getId(), variantId)
                            .orElse(null);
                    if (destStock != null) {
                        destStock.setReservedQuantity(Math.max(0, destStock.getReservedQuantity() - destHeld));
                        warehouseStockRepository.save(destStock);

                        WarehouseStockHistory history = new WarehouseStockHistory();
                        history.setWarehouse(order.getFulfillmentWarehouse());
                        history.setPhoneVariant(destStock.getPhoneVariant());
                        history.setQuantityBefore(destStock.getQuantity());
                        history.setQuantityChange(0);
                        history.setQuantityAfter(destStock.getQuantity());
                        history.setChangeType("RELEASE_HOLD");
                        history.setReason("Đơn hàng #" + orderId + " bị hủy - giải phóng reservation tại kho đích");
                        history.setTransferReference(String.valueOf(orderId));
                        history.setChangedByName(getCurrentUserName());
                        warehouseStockHistoryRepository.save(history);
                    }
                }
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<WarehouseTransferDTO> getTransfers(String status, Long sourceWarehouseId, Long destinationWarehouseId, Long orderId, Pageable pageable) {
        User staff = getCurrentStaffUser();
        Page<WarehouseTransfer> page;

        if (staff != null && staff.getRole() != null && !"ROLE_ADMIN".equalsIgnoreCase(staff.getRole().getName()) && staff.getWarehouse() != null) {
            Long staffWhId = staff.getWarehouse().getId();
            if (sourceWarehouseId != null && !sourceWarehouseId.equals(staffWhId) && (destinationWarehouseId == null || !destinationWarehouseId.equals(staffWhId))) {
                throw new UnauthorizedException("Nhân viên kho chỉ được truy cập dữ liệu liên quan đến chi nhánh của mình");
            }
            if (destinationWarehouseId != null && !destinationWarehouseId.equals(staffWhId) && (sourceWarehouseId == null || !sourceWarehouseId.equals(staffWhId))) {
                throw new UnauthorizedException("Nhân viên kho chỉ được truy cập dữ liệu liên quan đến chi nhánh của mình");
            }
            if (sourceWarehouseId == null && destinationWarehouseId == null) {
                page = warehouseTransferRepository.findByFilterAndBranchWarehouse(
                        status != null && !status.isBlank() ? status.trim().toUpperCase() : null,
                        staffWhId,
                        orderId,
                        pageable
                );
            } else {
                page = warehouseTransferRepository.findByFilter(
                        status != null && !status.isBlank() ? status.trim().toUpperCase() : null,
                        sourceWarehouseId,
                        destinationWarehouseId,
                        orderId,
                        pageable
                );
            }
        } else {
            page = warehouseTransferRepository.findByFilter(
                    status != null && !status.isBlank() ? status.trim().toUpperCase() : null,
                    sourceWarehouseId,
                    destinationWarehouseId,
                    orderId,
                    pageable
            );
        }

        List<WarehouseTransferDTO> dtoList = page.getContent().stream().map(this::toDTO).toList();
        return new PageResponse<>(dtoList, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public WarehouseTransferDTO getTransferById(Long transferId) {
        WarehouseTransfer transfer = warehouseTransferRepository.findById(transferId)
                .orElseThrow(() -> new ResourceNotFoundException("WarehouseTransfer", "id", transferId));

        User staff = getCurrentStaffUser();
        if (staff != null && staff.getRole() != null && !"ROLE_ADMIN".equalsIgnoreCase(staff.getRole().getName()) && staff.getWarehouse() != null) {
            Long staffWhId = staff.getWarehouse().getId();
            boolean isSource = transfer.getSourceWarehouse() != null && staffWhId.equals(transfer.getSourceWarehouse().getId());
            boolean isDest = transfer.getDestinationWarehouse() != null && staffWhId.equals(transfer.getDestinationWarehouse().getId());
            if (!isSource && !isDest) {
                throw new UnauthorizedException("Bạn không có quyền truy cập phiếu điều chuyển của chi nhánh khác");
            }
        }

        return toDTO(transfer);
    }

    @Override
    public void deductFulfillmentStockAtDestination(Order order) {
        if (order == null || order.getId() == null) {
            return;
        }

        // FINDING-STOCK-01 & FINDING-LOCK-01: Khóa bi quan Order để serialize hoàn toàn luồng xử lý và tuân thủ thứ tự khóa
        orderRepository.findByIdForUpdate(order.getId());

        List<WarehouseTransfer> transfers = warehouseTransferRepository.findByOrderId(order.getId());
        if (transfers.isEmpty()) {
            return;
        }

        Warehouse destWarehouse = order.getFulfillmentWarehouse();
        if (destWarehouse == null && !transfers.isEmpty()) {
            destWarehouse = transfers.get(0).getDestinationWarehouse();
        }
        if (destWarehouse == null) {
            log.warn("Cannot deduct destination stock for order #{}: Destination warehouse not found", order.getId());
            return;
        }

        String fulfillRef = "FULFILL-ORDER-" + order.getId();
        if (warehouseStockHistoryRepository.existsByTransferReference(fulfillRef)) {
            log.info("Fulfillment stock already deducted for order #{}", order.getId());
            return;
        }

        List<OrderDetail> sortedDetails = order.getOrderDetails() != null
                ? order.getOrderDetails().stream()
                        .filter(d -> d.getPhoneVariant() != null)
                        .sorted(Comparator.comparing(d -> d.getPhoneVariant().getId()))
                        .toList()
                : Collections.emptyList();

        for (OrderDetail detail : sortedDetails) {
            Long variantId = detail.getPhoneVariant().getId();
            int qty = detail.getQuantity();

            WarehouseStock stock = warehouseStockRepository.findByWarehouseIdAndPhoneVariantIdForUpdate(
                    destWarehouse.getId(), variantId)
                    .orElse(null);

            if (stock != null) {
                int before = stock.getQuantity();
                stock.setQuantity(Math.max(0, stock.getQuantity() - qty));
                stock.setReservedQuantity(Math.max(0, stock.getReservedQuantity() - qty));
                warehouseStockRepository.save(stock);

                WarehouseStockHistory history = new WarehouseStockHistory();
                history.setWarehouse(destWarehouse);
                history.setPhoneVariant(stock.getPhoneVariant());
                history.setQuantityBefore(before);
                history.setQuantityChange(-qty);
                history.setQuantityAfter(stock.getQuantity());
                history.setChangeType("EXPORT");
                history.setReason(String.format("Xuất kho giao khách đơn hàng gom liên kho #%d (%s)", order.getId(), destWarehouse.getName()));
                history.setTransferReference(fulfillRef);
                history.setChangedByName(getCurrentUserName());
                warehouseStockHistoryRepository.save(history);
            }
        }
        log.info("Successfully deducted fulfillment stock and released reservation at warehouse #{} for order #{}",
                destWarehouse.getId(), order.getId());
    }

    private User getCurrentStaffUser() {
        try {
            Long userId = SecurityUtils.getCurrentUserId();
            return userRepository.findById(userId).orElse(null);
        } catch (Exception ignored) {
            return null;
        }
    }

    private void validateStaffBranchAccess(Warehouse targetWarehouse, String action) {
        User staff = getCurrentStaffUser();
        if (staff == null) {
            return;
        }
        if (staff.getRole() != null && "ROLE_ADMIN".equalsIgnoreCase(staff.getRole().getName())) {
            return;
        }
        if (staff.getWarehouse() != null) {
            if (targetWarehouse == null || !staff.getWarehouse().getId().equals(targetWarehouse.getId())) {
                throw new UnauthorizedException(String.format(
                        "Nhân viên kho chỉ có quyền %s tại chi nhánh được phân công (%s)",
                        action, staff.getWarehouse().getName()));
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<WarehouseTransferDTO> getTransfersByOrderId(Long orderId) {
        return warehouseTransferRepository.findByOrderIdOrderByCreatedAtAsc(orderId).stream()
                .map(this::toDTO)
                .toList();
    }

    private WarehouseTransferDTO toDTO(WarehouseTransfer transfer) {
        if (transfer == null) return null;

        List<WarehouseTransferItemDTO> itemDTOs = transfer.getItems() != null
                ? transfer.getItems().stream().map(item -> WarehouseTransferItemDTO.builder()
                .id(item.getId())
                .transferId(transfer.getId())
                .phoneVariantId(item.getPhoneVariant() != null ? item.getPhoneVariant().getId() : null)
                .productName(item.getPhoneVariant() != null && item.getPhoneVariant().getPhone() != null
                        ? item.getPhoneVariant().getPhone().getName() : null)
                .sku(item.getPhoneVariant() != null ? item.getPhoneVariant().getSku() : null)
                .requestedQuantity(item.getRequestedQuantity())
                .dispatchedQuantity(item.getDispatchedQuantity())
                .receivedQuantity(item.getReceivedQuantity())
                .inTransitQuantity(item.getInTransitQuantity())
                .build()).toList()
                : Collections.emptyList();

        return WarehouseTransferDTO.builder()
                .id(transfer.getId())
                .transferCode(transfer.getTransferCode())
                .orderId(transfer.getOrder() != null ? transfer.getOrder().getId() : null)
                .sourceWarehouseId(transfer.getSourceWarehouse() != null ? transfer.getSourceWarehouse().getId() : null)
                .sourceWarehouseCode(transfer.getSourceWarehouse() != null ? transfer.getSourceWarehouse().getCode() : null)
                .sourceWarehouseName(transfer.getSourceWarehouse() != null ? transfer.getSourceWarehouse().getName() : null)
                .destinationWarehouseId(transfer.getDestinationWarehouse() != null ? transfer.getDestinationWarehouse().getId() : null)
                .destinationWarehouseCode(transfer.getDestinationWarehouse() != null ? transfer.getDestinationWarehouse().getCode() : null)
                .destinationWarehouseName(transfer.getDestinationWarehouse() != null ? transfer.getDestinationWarehouse().getName() : null)
                .status(transfer.getStatus())
                .note(transfer.getNote())
                .createdBy(transfer.getCreatedBy())
                .dispatchedBy(transfer.getDispatchedBy())
                .receivedBy(transfer.getReceivedBy())
                .dispatchedAt(transfer.getDispatchedAt())
                .receivedAt(transfer.getReceivedAt())
                .createdAt(transfer.getCreatedAt())
                .updatedAt(transfer.getUpdatedAt())
                .items(itemDTOs)
                .build();
    }

    private String generateTransferCode() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder sb = new StringBuilder("TRF-").append(datePart).append("-");
            for (int i = 0; i < 6; i++) {
                sb.append(CHARS.charAt(random.nextInt(CHARS.length())));
            }
            String code = sb.toString();
            if (!warehouseTransferRepository.existsByTransferCode(code)) {
                return code;
            }
        }
        return "TRF-" + datePart + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    private String getCurrentUserName() {
        try {
            var principal = SecurityUtils.getCurrentUser();
            if (principal != null && principal.getFullName() != null && !principal.getFullName().isBlank()) {
                return principal.getFullName();
            }
        } catch (Exception ignored) {
        }
        return "SYSTEM";
    }
}

