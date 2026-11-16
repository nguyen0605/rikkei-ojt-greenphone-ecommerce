package com.re.greenphone.service;
import com.re.greenphone.repository.PurchaseOrderRepository;
import org.junit.jupiter.api.*;
import java.math.BigDecimal;
import java.util.Collections;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class OrderCostServiceTest {
    PurchaseOrderRepository repository=mock(PurchaseOrderRepository.class);
    OrderCostService service=new OrderCostService(repository);
    @Test void weightedReceivedCost() {
        when(repository.receivedCost(1L)).thenReturn(Collections.singletonList(new Object[]{new BigDecimal("1000"),3L}));
        assertThat(service.snapshot(1L)).isEqualByComparingTo("333.333333");
    }
    @Test void missingCostStaysUnknown() {
        when(repository.receivedCost(1L)).thenReturn(Collections.singletonList(new Object[]{null,null})); assertThat(service.snapshot(1L)).isNull();
    }
}
