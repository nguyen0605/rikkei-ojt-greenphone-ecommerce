package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.InventoryStockMovementRequest;
import com.re.greenphone.entity.InventoryStockHistory;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.entity.User;
import com.re.greenphone.repository.InventoryStockHistoryRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryStockHistoryServiceTest {
    @Mock private InventoryStockHistoryRepository historyRepository;
    @Mock private PhoneVariantRepository phoneVariantRepository;
    @Mock private UserRepository userRepository;
    @InjectMocks private InventoryStockHistoryService service;

    @ParameterizedTest
    @CsvSource({"IMPORT, 4, 14", "EXPORT, 4, 6", "EXPORT, 10, 0"})
    void appliesMovementAndRecordsAudit(String type, int quantity, int expectedStock) {
        PhoneVariant variant = PhoneVariant.builder().stockQuantity(10).build();
        variant.setId(1L);
        when(phoneVariantRepository.findByIdWithLock(1L)).thenReturn(Optional.of(variant));
        when(phoneVariantRepository.save(variant)).thenReturn(variant);

        assertThat(service.applyMovement(1L, new InventoryStockMovementRequest(type, quantity, "Stock count")))
                .isSameAs(variant);
        assertThat(variant.getStockQuantity()).isEqualTo(expectedStock);
        ArgumentCaptor<InventoryStockHistory> captor = ArgumentCaptor.forClass(InventoryStockHistory.class);
        verify(historyRepository).save(captor.capture());
        InventoryStockHistory history = captor.getValue();
        assertThat(history.getPhoneVariant()).isSameAs(variant);
        assertThat(history.getQuantityBefore()).isEqualTo(10);
        assertThat(history.getQuantityChange()).isEqualTo(expectedStock - 10);
        assertThat(history.getQuantityAfter()).isEqualTo(expectedStock);
        assertThat(history.getChangeType()).isEqualTo(type);
        assertThat(history.getReason()).isEqualTo("Stock count");
        assertThat(history.getChangedByName()).isEqualTo("SYSTEM");
    }

    @Test
    void rejectsExportAboveStockWithoutSavingOrRecording() {
        PhoneVariant variant = PhoneVariant.builder().stockQuantity(3).build();
        when(phoneVariantRepository.findByIdWithLock(1L)).thenReturn(Optional.of(variant));
        assertThatThrownBy(() -> service.applyMovement(1L,
                new InventoryStockMovementRequest("EXPORT", 4, "Stock count")))
                .isInstanceOf(BadRequestException.class);
        assertThat(variant.getStockQuantity()).isEqualTo(3);
        verify(phoneVariantRepository, never()).save(any());
        verifyNoInteractions(historyRepository);
    }

    @Test
    void returnsHistoryWithAuditFields() {
        PhoneVariant variant = PhoneVariant.builder().stockQuantity(8).build();
        User user = new User();
        user.setId(2L);
        InventoryStockHistory history = InventoryStockHistory.builder().phoneVariant(variant)
                .changedByUser(user).changedByName("Warehouse admin").changeType("EXPORT")
                .quantityBefore(10).quantityChange(-2).quantityAfter(8).reason("Damaged units").build();
        history.setId(3L);
        history.setCreatedAt(LocalDateTime.of(2026, 11, 5, 10, 0));
        when(phoneVariantRepository.findById(1L)).thenReturn(Optional.of(variant));
        when(historyRepository.findByPhoneVariantIdOrderByCreatedAtDescIdDesc(1L)).thenReturn(List.of(history));

        var result = service.getHistory(1L);
        assertThat(result.getVariantId()).isEqualTo(1L);
        assertThat(result.getCurrentStock()).isEqualTo(8);
        assertThat(result.getEntries()).singleElement().satisfies(entry -> {
            assertThat(entry.getId()).isEqualTo(3L);
            assertThat(entry.getChangedByUserId()).isEqualTo(2L);
            assertThat(entry.getChangedByName()).isEqualTo("Warehouse admin");
            assertThat(entry.getChangeType()).isEqualTo("EXPORT");
            assertThat(entry.getQuantityBefore()).isEqualTo(10);
            assertThat(entry.getQuantityChange()).isEqualTo(-2);
            assertThat(entry.getQuantityAfter()).isEqualTo(8);
            assertThat(entry.getReason()).isEqualTo("Damaged units");
            assertThat(entry.getCreatedAt()).isEqualTo(history.getCreatedAt());
        });
    }

    @Test
    void rejectsHistoryForMissingVariant() {
        when(phoneVariantRepository.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getHistory(1L)).isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(historyRepository);
    }
}
