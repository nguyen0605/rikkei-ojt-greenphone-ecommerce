package com.re.greenphone.service;

import com.re.greenphone.repository.PurchaseOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class OrderCostService {
    private final PurchaseOrderRepository purchaseOrderRepository;

    /** Weighted received-PO average under the variant lock held by OrderService. */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public BigDecimal snapshot(Long variantId) {
        var rows = purchaseOrderRepository.receivedCost(variantId);
        if (rows.isEmpty() || rows.get(0)[0] == null || rows.get(0)[1] == null) return null;
        BigDecimal quantity = new BigDecimal(rows.get(0)[1].toString());
        return quantity.signum() == 0 ? null : new BigDecimal(rows.get(0)[0].toString()).divide(quantity, 6, RoundingMode.HALF_UP);
    }
}
