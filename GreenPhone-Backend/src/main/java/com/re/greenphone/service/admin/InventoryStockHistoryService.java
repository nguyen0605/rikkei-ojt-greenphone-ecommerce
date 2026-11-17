package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.dto.request.InventoryStockMovementRequest;
import com.re.greenphone.dto.response.InventoryHistoryDTO;
import com.re.greenphone.dto.response.InventoryHistoryItemDTO;
import com.re.greenphone.entity.InventoryStockHistory;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.entity.User;
import com.re.greenphone.repository.InventoryStockHistoryRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.repository.UserRepository;
import com.re.greenphone.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// [INV-02] Dịch vụ quản lý kiểm toán biến động kho (Audit Log)
@Service
@RequiredArgsConstructor
@Transactional
public class InventoryStockHistoryService {

    private final InventoryStockHistoryRepository historyRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final UserRepository userRepository;
    private final WarehouseStockLedgerService warehouseLedger;

    public Long defaultWarehouseId() { return warehouseLedger.mainWarehouse().getId(); }

    // Ghi biến động kho tại chi nhánh cụ thể (dùng cho đặt hàng ORD-04 / hủy đơn ORD-05)
    public void recordAtWarehouse(PhoneVariant variant, int before, int delta, String type, String reason, Long warehouseId) {
        warehouseLedger.apply(variant, warehouseLedger.warehouse(warehouseId), before, delta, type, reason, null);
        saveCurrentUserRecord(variant, before, delta, type, reason);
    }

    // Nhập/Xuất kho thủ công từ Admin (dùng khóa bi quan chống tranh chấp)
    public PhoneVariant applyMovement(Long variantId, InventoryStockMovementRequest request) {
        if (request.getQuantity() == null || request.getQuantity() <= 0
                || !("IMPORT".equals(request.getChangeType()) || "EXPORT".equals(request.getChangeType()))) {
            throw new BadRequestException("Yêu cầu biến động kho không hợp lệ");
        }

        // Khóa bi quan bản ghi biến thể máy (chống race condition)
        PhoneVariant variant = phoneVariantRepository.findByIdWithLock(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("PhoneVariant", "id", variantId));
        warehouseLedger.requireActiveMain();

        int quantityBefore = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
        int quantityChange = "IMPORT".equals(request.getChangeType()) ? request.getQuantity() : -request.getQuantity();

        // Chống tràn số nguyên
        final int quantityAfter;
        try { quantityAfter = Math.addExact(quantityBefore, quantityChange); }
        catch (ArithmeticException ex) { throw new BadRequestException("Số lượng tồn kho vượt quá giới hạn"); }

        // Chống xuất quá số lượng tồn (chống âm kho)
        if (quantityAfter < 0) {
            throw new BadRequestException("Số lượng xuất kho không được vượt quá tồn kho");
        }

        variant.setStockQuantity(quantityAfter);
        PhoneVariant saved = phoneVariantRepository.save(variant);

        record(saved, quantityBefore, quantityChange, request.getChangeType(), request.getReason());
        return saved;
    }

    // Ghi biến động kho cho kho mặc định
    public void record(PhoneVariant variant, int quantityBefore, int quantityChange,
                       String changeType, String reason) {
        if (quantityChange != 0) warehouseLedger.applyDefault(variant, quantityBefore, quantityChange, changeType, reason);
        saveCurrentUserRecord(variant, quantityBefore, quantityChange, changeType, reason);
    }

    // Ghi biến động mức tổng khi chờ gom hàng liên kho
    public void recordAggregateOnly(PhoneVariant variant, int quantityBefore, int quantityChange,
                                    String changeType, String reason) {
        saveCurrentUserRecord(variant, quantityBefore, quantityChange, changeType, reason);
    }

    // Lấy thông tin người thực hiện từ phiên đăng nhập (nếu chạy ngầm thì ghi là SYSTEM)
    private void saveCurrentUserRecord(PhoneVariant variant, int quantityBefore, int quantityChange,
                                      String changeType, String reason) {
        Long userId = null;
        String userName = "SYSTEM";
        try {
            var principal = SecurityUtils.getCurrentUser();
            userId = principal.getId();
            userName = principal.getFullName();
        } catch (RuntimeException ignored) {
            // Không có người dùng đăng nhập (ví dụ: Scheduler) -> ghi là SYSTEM
        }
        saveRecord(variant, quantityBefore, quantityChange, changeType, reason, userId, userName);
    }

    // Ghi biến động kho với thông tin người thực hiện cụ thể
    public void record(PhoneVariant variant, int quantityBefore, int quantityChange,
                       String changeType, String reason, Long userId, String userName) {
        if (quantityChange != 0) warehouseLedger.applyDefault(variant, quantityBefore, quantityChange, changeType, reason);
        saveRecord(variant, quantityBefore, quantityChange, changeType, reason, userId, userName);
    }

    // Lưu bản ghi lịch sử vào database (chặn số lượng âm)
    private void saveRecord(PhoneVariant variant, int quantityBefore, int quantityChange,
                       String changeType, String reason, Long userId, String userName) {
        int quantityAfter = quantityBefore + quantityChange;
        if (quantityAfter < 0) {
            throw new IllegalArgumentException("Số lượng tồn kho sau biến động không được là số âm");
        }

        User changedBy = userId == null ? null : userRepository.findById(userId).orElse(null);
        historyRepository.save(InventoryStockHistory.builder()
                .phoneVariant(variant)
                .changedByUser(changedBy)
                .changedByName(userName == null || userName.isBlank() ? "SYSTEM" : userName)
                .changeType(changeType)
                .quantityBefore(quantityBefore)
                .quantityChange(quantityChange)
                .quantityAfter(quantityAfter)
                .reason(reason)
                .build());
    }

    // Lấy danh sách lịch sử biến động kho theo thứ tự mới nhất
    @Transactional(readOnly = true)
    public InventoryHistoryDTO getHistory(Long variantId) {
        PhoneVariant variant = phoneVariantRepository.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("PhoneVariant", "id", variantId));

        List<InventoryHistoryItemDTO> entries = historyRepository
                .findByPhoneVariantIdOrderByCreatedAtDescIdDesc(variantId)
                .stream()
                .map(this::toDto)
                .toList();

        return InventoryHistoryDTO.builder()
                .variantId(variantId)
                .currentStock(variant.getStockQuantity())
                .entries(entries)
                .build();
    }

    // Chuyển đổi Entity sang DTO cho giao diện Admin
    private InventoryHistoryItemDTO toDto(InventoryStockHistory history) {
        return InventoryHistoryItemDTO.builder()
                .id(history.getId())
                .changeType(history.getChangeType())
                .quantityBefore(history.getQuantityBefore())
                .quantityChange(history.getQuantityChange())
                .quantityAfter(history.getQuantityAfter())
                .reason(history.getReason())
                .changedByUserId(history.getChangedByUser() != null ? history.getChangedByUser().getId() : null)
                .changedByName(history.getChangedByName())
                .createdAt(history.getCreatedAt())
                .build();
    }
}
