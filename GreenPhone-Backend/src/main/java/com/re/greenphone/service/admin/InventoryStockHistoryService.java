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

@Service
@RequiredArgsConstructor
@Transactional
public class InventoryStockHistoryService {

    private final InventoryStockHistoryRepository historyRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final UserRepository userRepository;
    private final WarehouseStockLedgerService warehouseLedger;

    public Long defaultWarehouseId() { return warehouseLedger.mainWarehouse().getId(); }

    public void recordAtWarehouse(PhoneVariant variant, int before, int delta, String type, String reason, Long warehouseId) {
        warehouseLedger.apply(variant, warehouseLedger.warehouse(warehouseId), before, delta, type, reason, null);
        saveCurrentUserRecord(variant, before, delta, type, reason);
    }

    public PhoneVariant applyMovement(Long variantId, InventoryStockMovementRequest request) {
        if (request.getQuantity() == null || request.getQuantity() <= 0
                || !("IMPORT".equals(request.getChangeType()) || "EXPORT".equals(request.getChangeType()))) {
            throw new BadRequestException("Invalid stock movement");
        }
        PhoneVariant variant = phoneVariantRepository.findByIdWithLock(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("PhoneVariant", "id", variantId));
        warehouseLedger.requireActiveMain();

        int quantityBefore = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
        int quantityChange = "IMPORT".equals(request.getChangeType())
                ? request.getQuantity()
                : -request.getQuantity();
        final int quantityAfter;
        try { quantityAfter = Math.addExact(quantityBefore, quantityChange); }
        catch (ArithmeticException ex) { throw new BadRequestException("Stock quantity overflow"); }
        if (quantityAfter < 0) {
            throw new BadRequestException("Export quantity cannot exceed current stock");
        }

        variant.setStockQuantity(quantityAfter);
        PhoneVariant saved = phoneVariantRepository.save(variant);
        record(saved, quantityBefore, quantityChange, request.getChangeType(), request.getReason());
        return saved;
    }

    public void record(PhoneVariant variant, int quantityBefore, int quantityChange,
                       String changeType, String reason) {
        if (quantityChange != 0) warehouseLedger.applyDefault(variant, quantityBefore, quantityChange, changeType, reason);
        saveCurrentUserRecord(variant, quantityBefore, quantityChange, changeType, reason);
    }

    private void saveCurrentUserRecord(PhoneVariant variant, int quantityBefore, int quantityChange,
                                      String changeType, String reason) {
        Long userId = null;
        String userName = "SYSTEM";
        try {
            var principal = SecurityUtils.getCurrentUser();
            userId = principal.getId();
            userName = principal.getFullName();
        } catch (RuntimeException ignored) {
            // Scheduled jobs do not have an authenticated principal.
        }
        saveRecord(variant, quantityBefore, quantityChange, changeType, reason, userId, userName);
    }

    public void record(PhoneVariant variant, int quantityBefore, int quantityChange,
                       String changeType, String reason, Long userId, String userName) {
        if (quantityChange != 0) warehouseLedger.applyDefault(variant, quantityBefore, quantityChange, changeType, reason);
        saveRecord(variant, quantityBefore, quantityChange, changeType, reason, userId, userName);
    }

    private void saveRecord(PhoneVariant variant, int quantityBefore, int quantityChange,
                       String changeType, String reason, Long userId, String userName) {
        int quantityAfter = quantityBefore + quantityChange;
        if (quantityAfter < 0) {
            throw new IllegalArgumentException("Inventory quantity cannot be negative");
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
