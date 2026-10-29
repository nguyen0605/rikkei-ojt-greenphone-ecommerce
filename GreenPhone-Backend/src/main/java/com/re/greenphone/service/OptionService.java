package com.re.greenphone.service;

import com.re.greenphone.dto.response.OptionItemDTO;
import com.re.greenphone.dto.response.OptionTreeDTO;
import com.re.greenphone.entity.Option;
import com.re.greenphone.mapper.OptionItemMapper;
import com.re.greenphone.repository.OptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Public option catalog — returns enabled categories (sorted by sortOrder)
 * with their items. This is what the /san-pham filter reads.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OptionService {

    private final OptionRepository optionRepository;
    private final OptionItemMapper optionItemMapper;

    public List<OptionTreeDTO> getCatalog() {
        return optionRepository.findByEnabledTrueOrderBySortOrderAscIdAsc().stream()
                .map(this::toTree)
                .toList();
    }

    private OptionTreeDTO toTree(Option option) {
        List<OptionItemDTO> items = optionItemMapper.toDtoList(option.getItems());
        // Respect maxItems (the category may allow more than shown in the filter)
        List<OptionItemDTO> visible = option.getMaxItems() != null && option.getMaxItems() > 0
                ? items.stream().limit(option.getMaxItems()).toList()
                : items;
        return OptionTreeDTO.builder()
                .id(option.getId())
                .type(option.getType())
                .label(option.getLabel())
                .enabled(option.getEnabled())
                .maxItems(option.getMaxItems())
                .sortOrder(option.getSortOrder())
                .items(visible)
                .build();
    }
}
