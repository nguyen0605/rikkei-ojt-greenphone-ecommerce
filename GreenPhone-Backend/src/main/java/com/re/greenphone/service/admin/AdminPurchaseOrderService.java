package com.re.greenphone.service.admin;
import com.re.greenphone.common.exception.*;
import com.re.greenphone.dto.request.PurchaseOrderRequest;
import com.re.greenphone.dto.response.PurchaseOrderResponse;
import com.re.greenphone.entity.*;
import com.re.greenphone.mapper.ProcurementMapper;
import com.re.greenphone.repository.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import java.math.BigDecimal;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class AdminPurchaseOrderService {
    private final PurchaseOrderRepository orders;
    private final SupplierRepository suppliers;
    private final PhoneVariantRepository variants;
    private final WarehouseStockLedgerService ledger;
    private final InventoryStockHistoryService history;
    private final ProcurementMapper mapper;
    private final EntityManager entityManager;
    private static final BigDecimal MAX_COST=new BigDecimal("9999999999999.99");

    @Transactional(readOnly=true)
    public Page<PurchaseOrderResponse> filter(String status,int page,int size,String keyword,Long supplierId,Long warehouseId,String sort) {
        if(status!=null && !Set.of("DRAFT","ORDERED","RECEIVED","CANCELLED").contains(status)) throw new BadRequestException("Trạng thái PO không hợp lệ");
        if(page<0 || size<1 || size>100) throw new BadRequestException("Phân trang không hợp lệ");
        Map<String,String> fields=Map.of("NEWEST","id","OLDEST","id","COST_ASC","totalCost","COST_DESC","totalCost","CODE_ASC","poNumber","CODE_DESC","poNumber");
        if(!fields.containsKey(sort)) throw new BadRequestException("Sắp xếp không hợp lệ");
        var direction=Set.of("NEWEST","COST_DESC","CODE_DESC").contains(sort)?Sort.Direction.DESC:Sort.Direction.ASC;
        org.springframework.data.jpa.domain.Specification<PurchaseOrder> spec=(root,query,cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates=new ArrayList<>();
            if(status!=null) predicates.add(cb.equal(root.get("status"),status));
            if(supplierId!=null) predicates.add(cb.equal(root.get("supplier").get("id"),supplierId));
            if(warehouseId!=null) predicates.add(cb.equal(root.get("warehouse").get("id"),warehouseId));
            if(keyword!=null && !keyword.isBlank()) {
                String term="%"+keyword.strip().toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%";
                predicates.add(cb.or(cb.like(cb.lower(root.get("poNumber")),term,'!'),cb.like(cb.lower(root.get("supplier").get("name")),term,'!')));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        return orders.findAll(spec,PageRequest.of(page,size,Sort.by(direction,fields.get(sort)).and(Sort.by(Sort.Direction.DESC,"id")))).map(mapper::toResponse);
    }

    @Transactional(readOnly=true)
    public Page<PurchaseOrderResponse> list(String status,int page,int size) {
        if(status!=null && !Set.of("DRAFT","ORDERED","RECEIVED","CANCELLED").contains(status)) throw new BadRequestException("Trạng thái PO không hợp lệ");
        if(page<0 || size<1 || size>100) throw new BadRequestException("Phân trang không hợp lệ");
        return orders.search(status,PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"id"))).map(mapper::toResponse);
    }
    @Transactional(readOnly=true)
    public PurchaseOrderResponse detail(Long id) { return mapper.toResponse(orders.findById(id).orElseThrow(() -> missing(id))); }
    private ResourceNotFoundException missing(Long id) { return new ResourceNotFoundException("PurchaseOrder","id",id); }
    private Supplier activeSupplier(Long id) {
        Supplier supplier=suppliers.findById(id).orElseThrow(() -> new ResourceNotFoundException("Supplier","id",id));
        if(!"ACTIVE".equals(supplier.getStatus())) throw new BadRequestException("Nhà cung cấp đã ngừng hoạt động");
        return supplier;
    }
    public PurchaseOrderResponse create(PurchaseOrderRequest request) {
        return mapper.toResponse(orders.saveAndFlush(prepare(request)));
    }
    public PurchaseOrderResponse update(Long id,PurchaseOrderRequest request) {
        PurchaseOrder po=lock(id);
        if(!"DRAFT".equals(po.getStatus())) throw new BadRequestException("Chỉ PO DRAFT được chỉnh sửa");
        if(request.status()!=null && !"DRAFT".equals(request.status())) throw new BadRequestException("Lưu chỉnh sửa không được đổi trạng thái PO; hãy dùng thao tác Đặt hàng");
        PurchaseOrder prepared=prepare(request);
        po.setSupplier(prepared.getSupplier()); po.setWarehouse(prepared.getWarehouse());
        po.setNote(prepared.getNote()); po.setTotalCost(prepared.getTotalCost());
        po.getItems().clear();
        for(PurchaseOrderItem item:prepared.getItems()) { item.setPurchaseOrder(po); po.getItems().add(item); }
        return mapper.toResponse(orders.saveAndFlush(po));
    }
    private PurchaseOrder prepare(PurchaseOrderRequest request) {
        if(request.items()==null || request.items().isEmpty() || request.items().size()>100) throw new BadRequestException("PO cần từ 1 đến 100 dòng hàng");
        String status=request.status()==null?"ORDERED":request.status();
        if(!Set.of("DRAFT","ORDERED").contains(status)) throw new BadRequestException("Trạng thái tạo PO không hợp lệ");
        PurchaseOrder po=new PurchaseOrder(); po.setSupplier(activeSupplier(request.supplierId()));
        po.setWarehouse(ledger.activeWarehouse(request.warehouseId())); po.setStatus(status);
        po.setPoNumber("PO-"+UUID.randomUUID().toString().toUpperCase(Locale.ROOT));
        po.setNote(request.note()==null?null:request.note().strip());
        Set<Long> seen=new HashSet<>(); BigDecimal total=BigDecimal.ZERO;
        for(var line:request.items()) {
            if(line==null || line.variantId()==null || !seen.add(line.variantId())) throw new BadRequestException("Biến thể không được để trống hoặc trùng dòng");
            if(line.quantity()==null || line.quantity()<=0 || line.unitCost()==null || line.unitCost().compareTo(BigDecimal.ONE)<0
                || line.unitCost().stripTrailingZeros().scale()>0) throw new BadRequestException("Số lượng và đơn giá VND phải là số nguyên dương");
            PhoneVariant variant=variants.findById(line.variantId()).orElseThrow(() -> new ResourceNotFoundException("PhoneVariant","id",line.variantId()));
            if(!"ACTIVE".equals(variant.getStatus())) throw new BadRequestException("Biến thể đã ngừng kinh doanh");
            total=total.add(line.unitCost().multiply(BigDecimal.valueOf(line.quantity())));
            if(total.compareTo(MAX_COST)>0) throw new BadRequestException("Tổng tiền vượt giới hạn");
            PurchaseOrderItem item=new PurchaseOrderItem(); item.setPurchaseOrder(po); item.setPhoneVariant(variant);
            item.setQuantityOrdered(line.quantity()); item.setUnitCost(line.unitCost()); po.getItems().add(item);
        }
        po.setTotalCost(total); return po;
    }
    private PurchaseOrder lock(Long id) {
        PurchaseOrder po=orders.findByIdWithLock(id).orElseThrow(() -> missing(id));
        entityManager.refresh(po,LockModeType.PESSIMISTIC_WRITE);
        return po;
    }
    public PurchaseOrderResponse order(Long id) {
        PurchaseOrder po=lock(id);
        if(!"DRAFT".equals(po.getStatus())) throw new BadRequestException("Chỉ PO nháp mới được đặt hàng");
        activeSupplier(po.getSupplier().getId()); ledger.activeWarehouse(po.getWarehouse().getId());
        po.setStatus("ORDERED"); return mapper.toResponse(orders.saveAndFlush(po));
    }
    public PurchaseOrderResponse cancel(Long id) {
        PurchaseOrder po=lock(id);
        if(!Set.of("DRAFT","ORDERED").contains(po.getStatus())) throw new BadRequestException("PO đã kết thúc, không thể hủy");
        po.setStatus("CANCELLED"); return mapper.toResponse(orders.saveAndFlush(po));
    }
    // Ledger allocation reads must see the previous lock holder's committed inserts,
    // including when this transaction read the supplier before waiting for the variant.
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public PurchaseOrderResponse receive(Long id) {
        PurchaseOrder po=lock(id);
        if(!"ORDERED".equals(po.getStatus())) throw new BadRequestException("Chỉ PO ORDERED được nhận hàng; đơn đã nhận không thể nhận lại");
        activeSupplier(po.getSupplier().getId()); ledger.activeWarehouse(po.getWarehouse().getId());
        if(po.getItems().isEmpty()) throw new BadRequestException("PO không có dòng hàng");
        for(var item:po.getItems().stream().sorted(Comparator.comparing(i -> i.getPhoneVariant().getId())).toList()) {
            if(item.getQuantityOrdered()<=0 || item.getQuantityReceived()!=0) throw new BadRequestException("Dữ liệu nhận hàng không hợp lệ");
            PhoneVariant variant=variants.findByIdWithLock(item.getPhoneVariant().getId()).orElseThrow(() -> new BadRequestException("Biến thể không tồn tại"));
            entityManager.refresh(variant,LockModeType.PESSIMISTIC_WRITE);
            int before=variant.getStockQuantity()==null?0:variant.getStockQuantity();
            final int after;
            try { after=Math.addExact(before,item.getQuantityOrdered()); }
            catch(ArithmeticException ex) { throw new BadRequestException("Số lượng tồn kho vượt giới hạn"); }
            history.recordAtWarehouse(variant,before,item.getQuantityOrdered(),"IMPORT","Nhập hàng theo đơn PO #"+po.getPoNumber(),po.getWarehouse().getId());
            variant.setStockQuantity(after); variants.save(variant); item.setQuantityReceived(item.getQuantityOrdered());
        }
        po.setStatus("RECEIVED"); return mapper.toResponse(orders.saveAndFlush(po));
    }
}
