package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.ConflictException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.OptionItemRequest;
import com.re.greenphone.dto.request.OptionRequest;
import com.re.greenphone.dto.response.OptionDTO;
import com.re.greenphone.dto.response.OptionItemDTO;
import com.re.greenphone.dto.response.PhoneDTO;
import com.re.greenphone.entity.Option;
import com.re.greenphone.entity.OptionItem;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.mapper.OptionItemMapper;
import com.re.greenphone.mapper.OptionMapper;
import com.re.greenphone.mapper.PhoneMapper;
import com.re.greenphone.repository.OptionItemRepository;
import com.re.greenphone.repository.OptionRepository;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminOptionService {

    private final OptionRepository optionRepository;
    private final OptionItemRepository optionItemRepository;
    private final OptionMapper optionMapper;
    private final OptionItemMapper optionItemMapper;
    private final PhoneVariantRepository phoneVariantRepository;
    private final PhoneRepository phoneRepository;
    private final PhoneMapper phoneMapper;

    // ---- Categories ----

    @Transactional(readOnly = true)
    public List<OptionDTO> getCategories() {
        return optionMapper.toDtoList(optionRepository.findAllByOrderBySortOrderAscIdAsc());
    }

    @Transactional(readOnly = true)
    public List<String> getTypes() {
        return optionRepository.findAll().stream().map(Option::getType).toList();
    }

    public OptionDTO createCategory(OptionRequest request) {
        String type = request.getType().trim();
        if (optionRepository.existsByType(type)) {
            throw new ConflictException("Category already exists: " + type);
        }
        int nextSort = optionRepository.findAll().stream()
                .mapToInt(o -> o.getSortOrder() != null ? o.getSortOrder() : 0)
                .max().orElse(0) + 1;
        Option option = Option.builder()
                .type(type)
                .label(request.getLabel().trim())
                .enabled(request.getEnabled() != null ? request.getEnabled() : true)
                .maxItems(request.getMaxItems() != null ? request.getMaxItems() : 5)
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : nextSort)
                .build();
        return optionMapper.toDto(optionRepository.save(option));
    }

    public OptionDTO updateCategory(Long id, OptionRequest request) {
        Option option = optionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Option", "id", id));
        if (request.getType() != null && !request.getType().isBlank()) option.setType(request.getType().trim());
        if (request.getLabel() != null && !request.getLabel().isBlank()) option.setLabel(request.getLabel().trim());
        if (request.getEnabled() != null) option.setEnabled(request.getEnabled());
        if (request.getMaxItems() != null) option.setMaxItems(request.getMaxItems());
        if (request.getSortOrder() != null) option.setSortOrder(request.getSortOrder());
        return optionMapper.toDto(optionRepository.save(option));
    }

    public void deleteCategory(Long id) {
        Option option = optionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Option", "id", id));
        if (!option.getItems().isEmpty()) {
            throw new ConflictException("Category has " + option.getItems().size() + " item(s) — delete items first");
        }
        optionRepository.delete(option);
    }

    // ---- Items ----

    @Transactional(readOnly = true)
    public List<OptionItemDTO> getItems(Long optionId) {
        return optionItemMapper.toDtoList(optionItemRepository.findByOptionIdOrderBySortOrderAscIdAsc(optionId));
    }

    public OptionItemDTO createItem(OptionItemRequest request) {
        Option option = optionRepository.findById(request.getOptionId())
                .orElseThrow(() -> new ResourceNotFoundException("Option", "id", request.getOptionId()));
        String value = request.getValue().trim();
        if (optionItemRepository.existsByOptionIdAndValue(option.getId(), value)) {
            throw new ConflictException("Item already exists in " + option.getType() + ": " + value);
        }
        int nextSort = optionItemRepository.findByOptionIdOrderBySortOrderAscIdAsc(option.getId()).stream()
                .mapToInt(i -> i.getSortOrder() != null ? i.getSortOrder() : 0)
                .max().orElse(0) + 1;
        OptionItem item = OptionItem.builder()
                .option(option)
                .value(value)
                .hexColor(request.getHexColor())
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : nextSort)
                .build();
        return optionItemMapper.toDto(optionItemRepository.save(item));
    }

    public OptionItemDTO updateItem(Long id, OptionItemRequest request) {
        OptionItem item = optionItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OptionItem", "id", id));
        if (request.getValue() != null && !request.getValue().isBlank()) item.setValue(request.getValue().trim());
        if (request.getHexColor() != null) item.setHexColor(request.getHexColor());
        if (request.getSortOrder() != null) item.setSortOrder(request.getSortOrder());
        return optionItemMapper.toDto(optionItemRepository.save(item));
    }

    /** Hard delete an item — block if any phone variant references it. */
    public void deleteItem(Long id) {
        OptionItem item = optionItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OptionItem", "id", id));
        long usage = phoneVariantRepository.findPhonesByOptionItemId(item.getId()).size()
                + phoneRepository.findByDescriptionContainingIgnoreCase(item.getValue()).size();
        if (usage > 0) {
            throw new ConflictException("Item is in use by " + usage + " phone(s)");
        }
        optionItemRepository.delete(item);
    }

    /** Paginated phones using a specific option item (RAM/STORAGE/COLOR via FK, FEATURE via description LIKE). */
    @Transactional(readOnly = true)
    public PageResponse<PhoneDTO> findItemUsage(Long itemId, PageRequest pageRequest) {
        OptionItem item = optionItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("OptionItem", "id", itemId));
        Map<Long, Phone> byId = new LinkedHashMap<>();
        for (Phone p : phoneVariantRepository.findPhonesByOptionItemId(itemId)) byId.put(p.getId(), p);
        for (Phone p : phoneRepository.findByDescriptionContainingIgnoreCase(item.getValue())) byId.put(p.getId(), p);
        List<Phone> all = byId.values().stream().toList();

        int page = pageRequest.getPage();
        int size = pageRequest.getSize();
        int from = Math.min(page * size, all.size());
        int to = Math.min(from + size, all.size());
        List<PhoneDTO> content = all.subList(from, to).stream().map(this::toUsageDto).toList();
        return new PageResponse<>(content, page, size, all.size(),
                (int) Math.ceil((double) all.size() / size), to >= all.size());
    }

    private PhoneDTO toUsageDto(Phone phone) {
        PhoneDTO dto = phoneMapper.toDto(phone);
        if (!phone.getImages().isEmpty()) {
            var img = phone.getImages().stream()
                    .filter(i -> Boolean.TRUE.equals(i.getIsMain()))
                    .findFirst().orElse(phone.getImages().get(0));
            String url = img.getImageUrl();
            if (url != null && url.contains("pexels.com")) {
                url += (url.contains("?") ? "&" : "?") + "auto=compress&w=400&h=400&fit=crop";
            }
            dto.setMainImageUrl(url);
        }
        return dto;
    }
}
