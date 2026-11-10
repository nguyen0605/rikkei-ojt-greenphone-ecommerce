package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.exception.UnauthorizedException;
import com.re.greenphone.dto.request.CreateShipmentRequest;
import com.re.greenphone.dto.request.UpdateShipmentStatusRequest;
import com.re.greenphone.dto.response.ShipmentDTO;
import com.re.greenphone.dto.response.ShipmentHistoryDTO;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.*;
import com.re.greenphone.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final ShipmentHistoryRepository shipmentHistoryRepository;
    private final OrderRepository orderRepository;
    private final WarrantyRepository warrantyRepository;

    private static final Set<String> VALID_CARRIER_CODES = Set.of("GHN", "GHTK", "VIETTEL_POST", "VNPOST", "J&T");
    private static final Set<String> VALID_SHIPMENT_STATUSES = Set.of(
            "READY_TO_SHIP", "PICKED_UP", "DELIVERING", "DELIVERED", "RETURNED", "FAILED"
    );

    private final SecureRandom random = new SecureRandom();

    /**
     * Tạo kiện hàng (Shipment) mới cho đơn hàng.
     * Quy tắc bắt buộc:
     * 1. Đơn hàng phải tồn tại và đang ở trạng thái PROCESSING.
     * 2. Mã vận đơn tracking_number phải là duy nhất trên toàn hệ thống.
     * 3. Sử dụng Transaction để đồng bộ sang Order (chuyển sang SHIPPING).
     */
    @Transactional
    public ShipmentDTO createShipment(CreateShipmentRequest request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", request.getOrderId()));

        // BẮT BUỘC: Kiểm tra trạng thái đơn hàng phải là PROCESSING mới được phép tạo shipment
        if (!"PROCESSING".equalsIgnoreCase(order.getOrderStatus())) {
            throw new BadRequestException("Order must be in PROCESSING status to create shipment. Current status: " + order.getOrderStatus());
        }

        String carrierCode = request.getCarrierCode().trim().toUpperCase();
        if (!VALID_CARRIER_CODES.contains(carrierCode)) {
            throw new BadRequestException("Invalid carrier code: " + carrierCode + ". Valid carriers: " + VALID_CARRIER_CODES);
        }

        // Tạo hoặc kiểm tra tính duy nhất của mã vận đơn
        String trackingNumber = request.getTrackingNumber();
        if (trackingNumber == null || trackingNumber.trim().isEmpty()) {
            trackingNumber = generateTrackingNumber();
        } else {
            trackingNumber = trackingNumber.trim().toUpperCase();
            if (shipmentRepository.existsByTrackingNumber(trackingNumber)) {
                throw new BadRequestException("Tracking number already exists: " + trackingNumber);
            }
        }

        Shipment shipment = Shipment.builder()
                .order(order)
                .trackingNumber(trackingNumber)
                .carrierCode(carrierCode)
                .shippingFee(request.getShippingFee() != null ? request.getShippingFee() : java.math.BigDecimal.ZERO)
                .codAmount(request.getCodAmount() != null ? request.getCodAmount() : java.math.BigDecimal.ZERO)
                .status("READY_TO_SHIP")
                .estimatedDeliveryAt(request.getEstimatedDeliveryAt() != null ? request.getEstimatedDeliveryAt() : LocalDateTime.now().plusDays(3))
                .note(request.getNote())
                .build();

        Shipment savedShipment = shipmentRepository.save(shipment);

        // Lưu bản ghi lịch sử đầu tiên
        String initialHub = request.getHubLocation() != null && !request.getHubLocation().isBlank()
                ? request.getHubLocation().trim()
                : "Kho Tổng GreenPhone";

        ShipmentHistory initialHistory = ShipmentHistory.builder()
                .shipment(savedShipment)
                .status("READY_TO_SHIP")
                .hubLocation(initialHub)
                .shipperNote("Kiện hàng đã được đóng gói và sẵn sàng bàn giao cho bưu cục")
                .build();

        shipmentHistoryRepository.save(initialHistory);

        // Đồng bộ trạng thái đơn hàng sang SHIPPING
        order.setOrderStatus("SHIPPING");
        orderRepository.save(order);

        log.info("Shipment #{} created for order #{} with tracking number: {}",
                savedShipment.getId(), order.getId(), trackingNumber);

        return mapToDTO(savedShipment);
    }

    /**
     * Cập nhật trạng thái kiện hàng và đồng bộ giao dịch sang Order và Warranty.
     * Quy tắc bắt buộc:
     * - Bắt buộc dùng transaction để đồng bộ.
     * - Khi kiện hàng chuyển sang DELIVERED:
     *   + Tự động cập nhật orders.order_status sang COMPLETED.
     *   + Tự động kích hoạt bản ghi bảo hành điện tử warranty (12 tháng) cho các sản phẩm trong đơn.
     */
    @Transactional
    public ShipmentDTO updateShipmentStatus(Long shipmentId, UpdateShipmentStatusRequest request) {
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "id", shipmentId));

        String newStatus = request.getStatus().trim().toUpperCase();
        if (!VALID_SHIPMENT_STATUSES.contains(newStatus)) {
            throw new BadRequestException("Invalid shipment status: " + newStatus);
        }

        shipment.setStatus(newStatus);

        // Ghi nhận lịch sử hành trình
        ShipmentHistory history = ShipmentHistory.builder()
                .shipment(shipment)
                .status(newStatus)
                .hubLocation(request.getHubLocation())
                .shipperNote(request.getShipperNote())
                .build();
        shipmentHistoryRepository.save(history);

        Order order = shipment.getOrder();

        if ("DELIVERED".equals(newStatus)) {
            shipment.setDeliveredAt(LocalDateTime.now());

            // Tự động chuyển đơn hàng sang COMPLETED
            order.setOrderStatus("COMPLETED");

            // Nếu đơn hàng thanh toán COD, tự động cập nhật paymentStatus sang PAID khi đã nhận tiền
            if ("COD".equalsIgnoreCase(order.getPaymentMethod()) && "UNPAID".equalsIgnoreCase(order.getPaymentStatus())) {
                order.setPaymentStatus("PAID");
            }

            orderRepository.save(order);
            log.info("Order #{} automatically set to COMPLETED upon shipment delivery", order.getId());

            // Kích hoạt bản ghi bảo hành điện tử 12 tháng theo IMEI cho các sản phẩm trong đơn
            activateWarrantiesForOrder(order);
        } else if ("RETURNED".equals(newStatus) || "FAILED".equals(newStatus)) {
            log.warn("Shipment #{} marked as {}. Order #{} needs operational inspection",
                    shipmentId, newStatus, order.getId());
        }

        Shipment updatedShipment = shipmentRepository.save(shipment);
        return mapToDTO(updatedShipment);
    }

    /**
     * Kích hoạt tự động bản ghi bảo hành điện tử 12 tháng theo IMEI cho đơn hàng.
     */
    private void activateWarrantiesForOrder(Order order) {
        List<Warranty> existing = warrantyRepository.findByOrderId(order.getId());
        if (!existing.isEmpty()) {
            log.info("Warranties already activated for order #{}", order.getId());
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime endDate = now.plusMonths(12);

        List<OrderDetail> details = order.getOrderDetails();
        if (details == null || details.isEmpty()) {
            log.warn("No order details found for order #{} to activate warranty", order.getId());
            return;
        }

        for (OrderDetail detail : details) {
            int quantity = detail.getQuantity() != null && detail.getQuantity() > 0 ? detail.getQuantity() : 1;
            for (int i = 0; i < quantity; i++) {
                String imei = generateUniqueImei();

                Warranty warranty = Warranty.builder()
                        .order(order)
                        .phoneVariant(detail.getPhoneVariant())
                        .imeiNumber(imei)
                        .customerName(order.getReceiverName())
                        .customerPhone(order.getReceiverPhone())
                        .startDate(now)
                        .endDate(endDate)
                        .status("ACTIVE")
                        .note("Bảo hành điện tử 12 tháng kích hoạt tự động theo đơn hàng #" + order.getId())
                        .build();

                warrantyRepository.save(warranty);
                log.info("Activated e-Warranty for order #{}, variant #{}, IMEI: {}",
                        order.getId(), detail.getPhoneVariant().getId(), imei);
            }
        }
    }

    @Transactional(readOnly = true)
    public ShipmentDTO getShipmentById(Long id) {
        Shipment shipment = shipmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "id", id));
        return mapToDTO(shipment);
    }

    @Transactional(readOnly = true)
    public ShipmentDTO getShipmentByTrackingNumber(String trackingNumber) {
        Shipment shipment = shipmentRepository.findByTrackingNumber(trackingNumber.trim().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "trackingNumber", trackingNumber));
        return mapToDTO(shipment);
    }

    @Transactional(readOnly = true)
    public List<ShipmentDTO> getShipmentsByOrderId(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        Long currentUserId = SecurityUtils.getCurrentUserId();
        boolean isAdmin = SecurityUtils.hasRole("ROLE_ADMIN");
        if (!isAdmin && (order.getUser() == null || !order.getUser().getId().equals(currentUserId))) {
            throw new UnauthorizedException("You do not have permission to view shipments for this order");
        }

        return shipmentRepository.findByOrderId(orderId).stream()
                .map(this::mapToDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<ShipmentDTO> getAllShipments(Pageable pageable) {
        return shipmentRepository.findAll(pageable).map(this::mapToDTO);
    }

    /**
     * Sinh mã vận đơn tự động duy nhất (UNIQUE) theo định dạng chuẩn: GP-YYYYMMDD-XXXXX.
     * Trong đó:
     * - GP: Tiền tố cố định của GreenPhone
     * - YYYYMMDD: Năm tháng ngày hiện tại
     * - XXXXX: 5 ký tự ngẫu nhiên bao gồm chữ số và chữ in hoa
     */
    public String generateTrackingNumber() {
        String datePart = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        String characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder suffix = new StringBuilder(5);
            for (int i = 0; i < 5; i++) {
                suffix.append(characters.charAt(random.nextInt(characters.length())));
            }
            String candidate = "GP-" + datePart + "-" + suffix;
            if (!shipmentRepository.existsByTrackingNumber(candidate)) {
                return candidate;
            }
        }
        StringBuilder fallbackSuffix = new StringBuilder(5);
        for (int i = 0; i < 5; i++) {
            fallbackSuffix.append(characters.charAt(random.nextInt(characters.length())));
        }
        return "GP-" + datePart + "-" + fallbackSuffix;
    }

    /**
     * Sinh số IMEI 15 chữ số hợp lệ tuân thủ thuật toán Luhn (Luhn Checksum Mod 10).
     */
    public String generateUniqueImei() {
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder sb = new StringBuilder("86");
            for (int i = 0; i < 6; i++) {
                sb.append(random.nextInt(10));
            }
            for (int i = 0; i < 6; i++) {
                sb.append(random.nextInt(10));
            }
            int checkDigit = calculateLuhnCheckDigit(sb.toString());
            sb.append(checkDigit);

            String candidate = sb.toString();
            if (!warrantyRepository.existsByImeiNumber(candidate)) {
                return candidate;
            }
        }
        return "86" + System.currentTimeMillis();
    }

    private int calculateLuhnCheckDigit(String digits14) {
        int sum = 0;
        for (int i = 0; i < digits14.length(); i++) {
            int digit = Character.getNumericValue(digits14.charAt(i));
            if (i % 2 == 1) { // Vị trí lẻ (0-indexed: 1, 3, 5, 7, 9, 11, 13) nhân 2
                digit *= 2;
                if (digit > 9) {
                    digit = (digit / 10) + (digit % 10);
                }
            }
            sum += digit;
        }
        int mod = sum % 10;
        return mod == 0 ? 0 : 10 - mod;
    }

    private ShipmentDTO mapToDTO(Shipment shipment) {
        List<ShipmentHistoryDTO> historyDTOs = shipmentHistoryRepository
                .findByShipmentIdOrderByCreatedAtDesc(shipment.getId())
                .stream()
                .map(h -> ShipmentHistoryDTO.builder()
                        .id(h.getId())
                        .status(h.getStatus())
                        .hubLocation(h.getHubLocation())
                        .shipperNote(h.getShipperNote())
                        .createdAt(h.getCreatedAt())
                        .build())
                .toList();

        Order order = shipment.getOrder();

        return ShipmentDTO.builder()
                .id(shipment.getId())
                .orderId(order != null ? order.getId() : null)
                .receiverName(order != null ? order.getReceiverName() : null)
                .receiverPhone(order != null ? order.getReceiverPhone() : null)
                .shippingAddress(order != null ? order.getShippingAddress() : null)
                .trackingNumber(shipment.getTrackingNumber())
                .carrierCode(shipment.getCarrierCode())
                .shippingFee(shipment.getShippingFee())
                .codAmount(shipment.getCodAmount())
                .status(shipment.getStatus())
                .estimatedDeliveryAt(shipment.getEstimatedDeliveryAt())
                .deliveredAt(shipment.getDeliveredAt())
                .note(shipment.getNote())
                .createdAt(shipment.getCreatedAt())
                .updatedAt(shipment.getUpdatedAt())
                .histories(historyDTOs)
                .build();
    }
}
