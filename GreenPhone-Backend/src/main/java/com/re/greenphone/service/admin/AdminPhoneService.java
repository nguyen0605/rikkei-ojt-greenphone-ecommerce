package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.PhoneRequest;
import com.re.greenphone.dto.request.PhoneVariantRequest;
import com.re.greenphone.dto.response.PhoneDTO;
import com.re.greenphone.dto.response.PhoneDetailDTO;
import com.re.greenphone.dto.response.PhoneImageDTO;
import com.re.greenphone.dto.response.PhoneVariantDTO;
import com.re.greenphone.entity.Brand;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.PhoneImage;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.mapper.PhoneImageMapper;
import com.re.greenphone.mapper.PhoneMapper;
import com.re.greenphone.mapper.PhoneVariantMapper;
import com.re.greenphone.repository.BrandRepository;
import com.re.greenphone.repository.CartItemRepository;
import com.re.greenphone.repository.OptionItemRepository;
import com.re.greenphone.repository.OrderDetailRepository;
import com.re.greenphone.repository.PhoneImageRepository;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.repository.ReviewRepository;
import com.re.greenphone.service.CloudinaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminPhoneService {

    private final PhoneRepository phoneRepository;
    private final BrandRepository brandRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final PhoneImageRepository phoneImageRepository;
    private final OptionItemRepository optionItemRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final CartItemRepository cartItemRepository;
    private final ReviewRepository reviewRepository;
    private final PhoneMapper phoneMapper;
    private final PhoneVariantMapper phoneVariantMapper;
    private final PhoneImageMapper phoneImageMapper;
    private final CloudinaryService cloudinaryService;

    public PageResponse<PhoneDTO> getPhones(String keyword, Long brandId, String status,
                                            com.re.greenphone.common.pagination.PageRequest pageRequest) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize(),
                Sort.by(Sort.Direction.fromString(pageRequest.getSortDir()), pageRequest.getSortBy()));

        // Admin spec — search theo tên, lọc brand + status (admin xem cả INACTIVE)
        org.springframework.data.jpa.domain.Specification<Phone> spec = (root, cq, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if (keyword != null && !keyword.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + keyword.toLowerCase() + "%"));
            }
            if (brandId != null) {
                predicates.add(cb.equal(root.get("brand").get("id"), brandId));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        Page<Phone> page = phoneRepository.findAll(spec, pageable);
        List<PhoneDTO> dtos = page.getContent().stream()
                .map(this::toAdminListingDto)
                .toList();
        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    public PhoneDetailDTO getPhoneDetail(Long id) {
        Phone phone = phoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Phone", "id", id));
        return buildDetailDTO(phone);
    }

    public PhoneDTO createPhone(PhoneRequest request) {
        Brand brand = brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Brand", "id", request.getBrandId()));

        Phone phone = Phone.builder()
                .brand(brand)
                .name(request.getName())
                .description(request.getDescription())
                .screen(request.getScreen())
                .os(request.getOs())
                .chip(request.getChip())
                .rearCamera(request.getRearCamera())
                .frontCamera(request.getFrontCamera())
                .battery(request.getBattery())
                .warranty(request.getWarranty())
                .status("ACTIVE")
                .build();

        phone = phoneRepository.save(phone);
        return phoneMapper.toDto(phone);
    }

    public PhoneDTO updatePhone(Long id, PhoneRequest request) {
        Phone phone = phoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Phone", "id", id));

        Brand brand = brandRepository.findById(request.getBrandId())
                .orElseThrow(() -> new ResourceNotFoundException("Brand", "id", request.getBrandId()));

        phone.setBrand(brand);
        phone.setName(request.getName());
        phone.setDescription(request.getDescription());
        phone.setScreen(request.getScreen());
        phone.setOs(request.getOs());
        phone.setChip(request.getChip());
        phone.setRearCamera(request.getRearCamera());
        phone.setFrontCamera(request.getFrontCamera());
        phone.setBattery(request.getBattery());
        phone.setWarranty(request.getWarranty());

        phone = phoneRepository.save(phone);
        return phoneMapper.toDto(phone);
    }

    /**
     * Hard-delete a phone: images → variants → phone.
     * Blocked when the phone is referenced by any order detail (historical orders),
     * review, or cart item — those keep the FK alive, so the phone cannot be removed.
     * Use the status toggle (INACTIVE) to hide such phones from the store instead.
     */
    public void deletePhone(Long id) {
        Phone phone = phoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Phone", "id", id));

        List<PhoneVariant> variants = phoneVariantRepository.findByPhoneId(id);
        for (PhoneVariant variant : variants) {
            if (orderDetailRepository.existsByPhoneVariantId(variant.getId())
                    || cartItemRepository.existsByPhoneVariantId(variant.getId())) {
                throw new BadRequestException(
                        "Không thể xóa sản phẩm đã được đặt trong đơn hàng/giỏ hàng. Hãy tắt trạng thái để ẩn sản phẩm.");
            }
        }
        if (reviewRepository.existsByPhoneId(id)) {
            throw new BadRequestException(
                    "Không thể xóa sản phẩm đã có đánh giá. Hãy tắt trạng thái để ẩn sản phẩm.");
        }

        // Xóa ảnh khỏi Cloudinary trước, rồi xóa row ảnh
        List<PhoneImage> images = phoneImageRepository.findByPhoneId(id);
        images.forEach(img -> {
            try {
                cloudinaryService.deleteImage(img.getImageUrl());
            } catch (Exception e) {
                log.warn("Failed to delete Cloudinary image {}: {}", img.getImageUrl(), e.getMessage());
            }
        });
        phoneImageRepository.deleteAll(images);

        phoneVariantRepository.deleteAll(variants);
        phoneRepository.delete(phone);
    }

    public PhoneDTO updateStatus(Long id, String status) {
        if (!List.of("ACTIVE", "INACTIVE").contains(status)) {
            throw new BadRequestException("Invalid status: " + status);
        }
        Phone phone = phoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Phone", "id", id));
        phone.setStatus(status);
        phone = phoneRepository.save(phone);
        return toAdminListingDto(phone);
    }

    public List<PhoneVariantDTO> getVariants(Long phoneId) {
        return phoneVariantMapper.toDtoList(
                phoneVariantRepository.findByPhoneId(phoneId));
    }

    public PhoneVariantDTO addVariant(Long phoneId, PhoneVariantRequest request) {
        Phone phone = phoneRepository.findById(phoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Phone", "id", phoneId));

        PhoneVariant variant = PhoneVariant.builder()
                .phone(phone)
                .ramItem(requireItem(request.getRamItemId(), "RAM"))
                .storageItem(requireItem(request.getStorageItemId(), "STORAGE"))
                .colorItem(requireItem(request.getColorItemId(), "COLOR"))
                .price(request.getPrice())
                .discountPrice(request.getDiscountPrice())
                .stockQuantity(request.getStockQuantity())
                .status("ACTIVE")
                .build();

        variant = phoneVariantRepository.save(variant);
        return phoneVariantMapper.toDto(variant);
    }

    public PhoneVariantDTO updateVariant(Long variantId, PhoneVariantRequest request) {
        PhoneVariant variant = phoneVariantRepository.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("PhoneVariant", "id", variantId));

        if (request.getRamItemId() != null) variant.setRamItem(requireItem(request.getRamItemId(), "RAM"));
        if (request.getStorageItemId() != null) variant.setStorageItem(requireItem(request.getStorageItemId(), "STORAGE"));
        if (request.getColorItemId() != null) variant.setColorItem(requireItem(request.getColorItemId(), "COLOR"));
        variant.setPrice(request.getPrice());
        variant.setDiscountPrice(request.getDiscountPrice());
        variant.setStockQuantity(request.getStockQuantity());

        variant = phoneVariantRepository.save(variant);
        return phoneVariantMapper.toDto(variant);
    }

    private com.re.greenphone.entity.OptionItem requireItem(Long itemId, String expectedType) {
        if (itemId == null) {
            throw new com.re.greenphone.common.exception.BadRequestException(expectedType + " item is required");
        }
        com.re.greenphone.entity.OptionItem item = optionItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("OptionItem", "id", itemId));
        if (!expectedType.equals(item.getOption().getType())) {
            throw new com.re.greenphone.common.exception.BadRequestException(
                    "Item " + item.getValue() + " is not of type " + expectedType);
        }
        return item;
    }

    public void deleteVariant(Long variantId) {
        PhoneVariant variant = phoneVariantRepository.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("PhoneVariant", "id", variantId));
        variant.setStatus("INACTIVE");
        phoneVariantRepository.save(variant);
    }

    public List<PhoneImageDTO> getImages(Long phoneId) {
        return phoneImageMapper.toDtoList(
                phoneImageRepository.findByPhoneIdOrderBySortOrderAscIdAsc(phoneId));
    }

    public PhoneImageDTO addImage(Long phoneId, MultipartFile file) {
        Phone phone = phoneRepository.findById(phoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Phone", "id", phoneId));

        String imageUrl = cloudinaryService.uploadImage(file, "greenphone/phones");
        List<PhoneImage> existing = phoneImageRepository.findByPhoneIdOrderBySortOrderAscIdAsc(phoneId);
        boolean isMain = existing.isEmpty();
        int nextSort = existing.stream()
                .mapToInt(img -> img.getSortOrder() != null ? img.getSortOrder() : 0)
                .max().orElse(0) + 1;

        PhoneImage image = PhoneImage.builder()
                .phone(phone)
                .imageUrl(imageUrl)
                .isMain(isMain)
                .sortOrder(nextSort)
                .build();

        image = phoneImageRepository.save(image);
        return phoneImageMapper.toDto(image);
    }

    /**
     * Batch reorder: the client sends the full ordered list of image ids;
     * sortOrder is assigned by position (0, 1, 2, ...).
     */
    public List<PhoneImageDTO> reorderImages(Long phoneId, List<Long> imageIds) {
        List<PhoneImage> images = phoneImageRepository.findByPhoneId(phoneId);
        java.util.Map<Long, PhoneImage> byId = images.stream()
                .collect(java.util.stream.Collectors.toMap(PhoneImage::getId, img -> img));
        List<PhoneImage> updated = new java.util.ArrayList<>();
        for (int i = 0; i < imageIds.size(); i++) {
            PhoneImage img = byId.get(imageIds.get(i));
            if (img != null) {
                img.setSortOrder(i);
                updated.add(img);
            }
        }
        // Any images not in the list keep their order but after the listed ones
        int offset = imageIds.size();
        for (PhoneImage img : images) {
            if (!imageIds.contains(img.getId())) {
                img.setSortOrder(offset++);
                updated.add(img);
            }
        }
        phoneImageRepository.saveAll(updated);
        return phoneImageMapper.toDtoList(phoneImageRepository.findByPhoneIdOrderBySortOrderAscIdAsc(phoneId));
    }

    public PhoneImageDTO updateImage(Long imageId, Map<String, Object> body) {
        PhoneImage image = phoneImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("PhoneImage", "id", imageId));

        if (body.containsKey("isMain")) {
            boolean isMain = Boolean.TRUE.equals(body.get("isMain"));
            if (isMain) {
                // Unset previous main image for this phone
                phoneImageRepository.findByPhoneId(image.getPhone().getId())
                        .forEach(img -> {
                            if (img.getIsMain() && !img.getId().equals(imageId)) {
                                img.setIsMain(false);
                                phoneImageRepository.save(img);
                            }
                        });
            }
            image.setIsMain(isMain);
        }

        image = phoneImageRepository.save(image);
        return phoneImageMapper.toDto(image);
    }

    public void deleteImage(Long imageId) {
        PhoneImage image = phoneImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("PhoneImage", "id", imageId));
        Long phoneId = image.getPhone().getId();
        cloudinaryService.deleteImage(image.getImageUrl());
        phoneImageRepository.delete(image);

        // If the deleted image was the main one, promote the next in sort order
        if (Boolean.TRUE.equals(image.getIsMain())) {
            List<PhoneImage> remaining = phoneImageRepository.findByPhoneIdOrderBySortOrderAscIdAsc(phoneId);
            if (!remaining.isEmpty()) {
                PhoneImage next = remaining.get(0);
                next.setIsMain(true);
                phoneImageRepository.save(next);
            }
        }
    }

    /**
     * Listing DTO for the admin table — PhoneMapper.toDto ignores mainImageUrl
     * (it's set manually in the public PhoneService.toListingDto), so admin rows
     * must resolve the first image here too, or the thumbnail is blank.
     */
    private PhoneDTO toAdminListingDto(Phone phone) {
        PhoneDTO dto = phoneMapper.toDto(phone);
        dto.setMainImageUrl(getMainImageUrl(phone));
        return dto;
    }

    /** Main image (isMain=true, else first by sort order), resized for Pexels CDN. */
    private String getMainImageUrl(Phone phone) {
        if (phone.getImages().isEmpty()) return null;
        PhoneImage main = phone.getImages().stream()
                .filter(img -> Boolean.TRUE.equals(img.getIsMain()))
                .findFirst()
                .orElse(phone.getImages().get(0));
        String url = main.getImageUrl();
        if (url == null || url.isBlank()) return null;
        if (url.contains("pexels.com")) {
            String sep = url.contains("?") ? "&" : "?";
            return url + sep + "auto=compress&w=400&h=400&fit=crop";
        }
        return url;
    }

    private PhoneDetailDTO buildDetailDTO(Phone phone) {
        PhoneDetailDTO dto = new PhoneDetailDTO();
        dto.setId(phone.getId());
        dto.setBrandId(phone.getBrand().getId());
        dto.setBrandName(phone.getBrand().getName());
        dto.setName(phone.getName());
        dto.setDescription(phone.getDescription());
        dto.setScreen(phone.getScreen());
        dto.setOs(phone.getOs());
        dto.setChip(phone.getChip());
        dto.setRearCamera(phone.getRearCamera());
        dto.setFrontCamera(phone.getFrontCamera());
        dto.setBattery(phone.getBattery());
        dto.setWarranty(phone.getWarranty());
        dto.setStatus(phone.getStatus());
        dto.setImages(phoneImageMapper.toDtoList(phone.getImages()));
        dto.setVariants(phoneVariantMapper.toDtoList(phone.getVariants()));
        return dto;
    }
}
