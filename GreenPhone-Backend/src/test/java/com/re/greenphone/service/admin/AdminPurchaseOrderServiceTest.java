package com.re.greenphone.service.admin;
import com.re.greenphone.common.exception.*;
import com.re.greenphone.dto.request.PurchaseOrderRequest;
import com.re.greenphone.entity.*;
import com.re.greenphone.mapper.ProcurementMapper;
import com.re.greenphone.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
@ExtendWith(MockitoExtension.class)
class AdminPurchaseOrderServiceTest {
    @Mock PurchaseOrderRepository orders;
    @Mock SupplierRepository suppliers;
    @Mock PhoneVariantRepository variants;
    @Mock WarehouseStockLedgerService ledger;
    @Mock InventoryStockHistoryService history;
    @Mock ProcurementMapper mapper;
    @Mock EntityManager entityManager;
    @InjectMocks AdminPurchaseOrderService service;
    Supplier supplier; Warehouse warehouse; PhoneVariant variant;
    @BeforeEach void setup() {
        supplier=new Supplier(); supplier.setId(1L); supplier.setName("Digiworld");
        warehouse=new Warehouse(); warehouse.setId(2L); warehouse.setStatus("ACTIVE");
        variant=new PhoneVariant(); variant.setId(7L); variant.setStockQuantity(10); variant.setStatus("ACTIVE");
    }
    PurchaseOrderRequest request(List<PurchaseOrderRequest.Item> items) { return new PurchaseOrderRequest(1L,2L,"ORDERED",null,items); }
    PurchaseOrderRequest.Item line(int quantity,String cost) { return new PurchaseOrderRequest.Item(7L,quantity,new BigDecimal(cost)); }
    void creationReady() {
        when(suppliers.findById(1L)).thenReturn(Optional.of(supplier)); when(ledger.activeWarehouse(2L)).thenReturn(warehouse);
    }
    PurchaseOrder po(String status) {
        PurchaseOrder po=new PurchaseOrder(); po.setId(1L); po.setPoNumber("PO-TEST"); po.setStatus(status); po.setSupplier(supplier); po.setWarehouse(warehouse);
        PurchaseOrderItem item=new PurchaseOrderItem(); item.setPhoneVariant(variant); item.setQuantityOrdered(50); item.setUnitCost(BigDecimal.TEN); item.setPurchaseOrder(po); po.getItems().add(item);
        when(orders.findByIdWithLock(1L)).thenReturn(Optional.of(po)); return po;
    }
    @Test void createComputesExactCostWithoutChangingStock() {
        creationReady(); when(variants.findById(7L)).thenReturn(Optional.of(variant));
        when(orders.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        service.create(request(List.of(line(50,"25000000"))));
        var capture=ArgumentCaptor.forClass(PurchaseOrder.class); verify(orders).saveAndFlush(capture.capture());
        assertThat(capture.getValue().getTotalCost()).isEqualByComparingTo("1250000000");
        assertThat(capture.getValue().getStatus()).isEqualTo("ORDERED");
        assertThat(capture.getValue().getItems().get(0).getQuantityReceived()).isZero();
        assertThat(variant.getStockQuantity()).isEqualTo(10); verifyNoInteractions(history);
    }
    @Test void createRejectsEmptyItems() { assertThatThrownBy(() -> service.create(request(List.of()))).isInstanceOf(BadRequestException.class); }
    @Test void createRejectsDuplicateVariant() {
        creationReady(); when(variants.findById(7L)).thenReturn(Optional.of(variant));
        assertThatThrownBy(() -> service.create(request(List.of(line(1,"10"),line(1,"20"))))).isInstanceOf(BadRequestException.class);
        verify(orders,never()).saveAndFlush(any());
    }
    @ParameterizedTest @ValueSource(ints={0,-1}) void createRejectsInvalidQuantity(int quantity) {
        creationReady(); assertThatThrownBy(() -> service.create(request(List.of(line(quantity,"10"))))).isInstanceOf(BadRequestException.class);
    }
    @ParameterizedTest @ValueSource(strings={"0","-1","1.5","99999999999999"}) void createRejectsInvalidCost(String cost) {
        creationReady(); if(cost.equals("99999999999999")) when(variants.findById(7L)).thenReturn(Optional.of(variant));
        assertThatThrownBy(() -> service.create(request(List.of(line(1,cost))))).isInstanceOf(BadRequestException.class);
    }
    @Test void createRejectsInactiveSupplier() {
        supplier.setStatus("INACTIVE"); when(suppliers.findById(1L)).thenReturn(Optional.of(supplier));
        assertThatThrownBy(() -> service.create(request(List.of(line(1,"10"))))).isInstanceOf(BadRequestException.class);
    }
    @Test void createRejectsMissingVariant() {
        creationReady(); when(variants.findById(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.create(request(List.of(line(1,"10"))))).isInstanceOf(ResourceNotFoundException.class);
    }
    @Test void receiveRecordsImportAtDestinationAndCannotRepeat() {
        PurchaseOrder po=po("ORDERED"); creationReady(); when(variants.findByIdWithLock(7L)).thenReturn(Optional.of(variant));
        service.receive(1L);
        assertThat(variant.getStockQuantity()).isEqualTo(60); assertThat(po.getStatus()).isEqualTo("RECEIVED");
        assertThat(po.getItems().get(0).getQuantityReceived()).isEqualTo(50);
        verify(history).recordAtWarehouse(variant,10,50,"IMPORT","Nhập hàng theo đơn PO #PO-TEST",2L);
        assertThatThrownBy(() -> service.receive(1L)).isInstanceOf(BadRequestException.class);
        verify(variants,times(1)).findByIdWithLock(7L);
    }
    @ParameterizedTest @ValueSource(strings={"DRAFT","RECEIVED","CANCELLED"}) void receiveRejectsInvalidState(String state) {
        po(state); assertThatThrownBy(() -> service.receive(1L)).isInstanceOf(BadRequestException.class); verifyNoInteractions(history,variants);
    }
    @Test void receiveRejectsOverflow() {
        po("ORDERED"); creationReady(); variant.setStockQuantity(Integer.MAX_VALUE); when(variants.findByIdWithLock(7L)).thenReturn(Optional.of(variant));
        assertThatThrownBy(() -> service.receive(1L)).isInstanceOf(BadRequestException.class); verifyNoInteractions(history);
    }
    @Test void locksVariantsInAscendingOrder() {
        PurchaseOrder po=po("ORDERED"); creationReady(); PhoneVariant second=new PhoneVariant(); second.setId(3L); second.setStockQuantity(0);
        PurchaseOrderItem item=new PurchaseOrderItem(); item.setPhoneVariant(second); item.setQuantityOrdered(2); po.getItems().add(item);
        when(variants.findByIdWithLock(7L)).thenReturn(Optional.of(variant)); when(variants.findByIdWithLock(3L)).thenReturn(Optional.of(second));
        service.receive(1L); var order=inOrder(variants); order.verify(variants).findByIdWithLock(3L); order.verify(variants).save(second); order.verify(variants).findByIdWithLock(7L);
    }
    @Test void draftCanBeOrderedThenCancelled() {
        PurchaseOrder po=po("DRAFT"); creationReady(); service.order(1L); assertThat(po.getStatus()).isEqualTo("ORDERED");
        service.cancel(1L); assertThat(po.getStatus()).isEqualTo("CANCELLED");
        assertThatThrownBy(() -> service.cancel(1L)).isInstanceOf(BadRequestException.class); verifyNoInteractions(history);
    }
    @Test void missingOrderReturnsNotFound() { assertThatThrownBy(() -> service.receive(999L)).isInstanceOf(ResourceNotFoundException.class); }
    @Test void draftCanBeEditedWithoutChangingStockOrItsNumber() {
        PurchaseOrder po=po("DRAFT"); creationReady(); when(variants.findById(7L)).thenReturn(Optional.of(variant));
        service.update(1L,new PurchaseOrderRequest(1L,2L,"DRAFT","Updated",List.of(line(3,"25"))));
        assertThat(po.getPoNumber()).isEqualTo("PO-TEST"); assertThat(po.getStatus()).isEqualTo("DRAFT");
        assertThat(po.getItems()).hasSize(1); assertThat(po.getItems().get(0).getQuantityOrdered()).isEqualTo(3);
        assertThat(po.getItems().get(0).getPurchaseOrder()).isSameAs(po); assertThat(po.getTotalCost()).isEqualByComparingTo("75");
        assertThat(variant.getStockQuantity()).isEqualTo(10); verifyNoInteractions(history);
    }
    @ParameterizedTest @ValueSource(strings={"ORDERED","RECEIVED","CANCELLED"}) void editRejectsNonDraft(String state) {
        po(state); assertThatThrownBy(() -> service.update(1L,request(List.of(line(1,"10"))))).isInstanceOf(BadRequestException.class);
        verify(orders,never()).saveAndFlush(any()); verifyNoInteractions(history);
    }
    @Test void editCannotBypassOrderTransition() {
        po("DRAFT"); assertThatThrownBy(() -> service.update(1L,request(List.of(line(1,"10"))))).isInstanceOf(BadRequestException.class);
        verify(orders,never()).saveAndFlush(any());
    }
}
