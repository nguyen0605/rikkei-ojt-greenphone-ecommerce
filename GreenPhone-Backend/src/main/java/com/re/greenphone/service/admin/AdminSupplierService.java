package com.re.greenphone.service.admin;
import com.re.greenphone.entity.Supplier;
import com.re.greenphone.dto.request.SupplierRequest;
import com.re.greenphone.dto.response.SupplierResponse;
import com.re.greenphone.mapper.ProcurementMapper;
import com.re.greenphone.repository.SupplierRepository;
import com.re.greenphone.common.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.*;
@Service @RequiredArgsConstructor @Transactional
public class AdminSupplierService {
    private final SupplierRepository repository;
    private final ProcurementMapper mapper;
    @Transactional(readOnly=true)
    public List<SupplierResponse> list(String keyword) {
        String key=keyword==null?"":keyword.strip().toLowerCase(Locale.ROOT);
        return repository.findAll(org.springframework.data.domain.Sort.by("id")).stream()
            .filter(s -> (s.getName()+" "+s.getCode()+" "+Objects.toString(s.getTaxCode(),"")).toLowerCase(Locale.ROOT).contains(key))
            .map(mapper::toResponse).toList();
    }
    private Supplier get(Long id) { return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Supplier","id",id)); }
    @Transactional(readOnly=true) public SupplierResponse detail(Long id) { return mapper.toResponse(get(id)); }
    public SupplierResponse create(SupplierRequest request) { return save(new Supplier(),request); }
    public SupplierResponse update(Long id,SupplierRequest request) { return save(get(id),request); }
    private SupplierResponse save(Supplier supplier,SupplierRequest request) {
        if (supplier.getId()==null ? repository.existsByCode(request.code()) : repository.existsByCodeAndIdNot(request.code(),supplier.getId()))
            throw new BadRequestException("Mã nhà cung cấp đã tồn tại");
        supplier.setCode(request.code()); supplier.setName(request.name()); supplier.setTaxCode(request.taxCode());
        supplier.setEmail(request.email()); supplier.setPhone(request.phone()); supplier.setAddress(request.address());
        try { return mapper.toResponse(repository.saveAndFlush(supplier)); }
        catch(DataIntegrityViolationException ex) { throw new BadRequestException("Không thể lưu nhà cung cấp; kiểm tra mã bị trùng"); }
    }
    public SupplierResponse status(Long id,String status) {
        if(!Set.of("ACTIVE","INACTIVE").contains(status)) throw new BadRequestException("Trạng thái không hợp lệ");
        Supplier supplier=get(id); supplier.setStatus(status); return mapper.toResponse(repository.save(supplier));
    }
}
