package com.re.greenphone.controller.admin;

import com.re.greenphone.dto.request.InventoryStockMovementRequest;
import com.re.greenphone.dto.response.InventoryHistoryDTO;
import com.re.greenphone.dto.response.PhoneVariantDTO;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.mapper.PhoneVariantMapper;
import com.re.greenphone.service.admin.InventoryStockHistoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminInventoryControllerTest {
    @Mock private InventoryStockHistoryService historyService;
    @Mock private PhoneVariantMapper phoneVariantMapper;
    @InjectMocks private AdminInventoryController controller;

    @Test
    void returnsMappedVariantAfterMovement() {
        var request = new InventoryStockMovementRequest("IMPORT", 2, "Delivery");
        var variant = PhoneVariant.builder().stockQuantity(7).build();
        var dto = PhoneVariantDTO.builder().id(1L).stockQuantity(7).build();
        when(historyService.applyMovement(1L, request)).thenReturn(variant);
        when(phoneVariantMapper.toDto(variant)).thenReturn(dto);

        var response = controller.applyMovement(1L, request);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).isSameAs(dto);
        verify(historyService).applyMovement(1L, request);
    }

    @Test
    void returnsVariantHistory() {
        var history = InventoryHistoryDTO.builder().variantId(1L).currentStock(7).entries(List.of()).build();
        when(historyService.getHistory(1L)).thenReturn(history);

        var response = controller.getVariantHistory(1L);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData()).isSameAs(history);
    }
}
