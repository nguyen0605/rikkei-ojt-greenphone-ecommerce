package com.re.greenphone.mapper;

import com.re.greenphone.dto.response.OrderDetailDTO;
import com.re.greenphone.entity.OrderDetail;
import com.re.greenphone.entity.Phone;
import com.re.greenphone.entity.PhoneImage;
import com.re.greenphone.entity.PhoneVariant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class OrderDetailMapperTest {

    private final OrderDetailMapper mapper = Mappers.getMapper(OrderDetailMapper.class);

    @Test
    @DisplayName("Chuyển đổi OrderDetail sang OrderDetailDTO bao gồm chính xác phoneId, productStatus và ảnh chính")
    void testToDtoWithMainImage() {
        Phone phone = Phone.builder()
                .name("Xiaomi 14 Ultra")
                .status("INACTIVE")
                .build();
        phone.setId(10L);

        PhoneImage subImg = PhoneImage.builder()
                .imageUrl("https://example.com/sub.png")
                .isMain(false)
                .build();
        PhoneImage mainImg = PhoneImage.builder()
                .imageUrl("https://example.com/main.png")
                .isMain(true)
                .build();
        phone.setImages(List.of(subImg, mainImg));

        PhoneVariant variant = PhoneVariant.builder()
                .phone(phone)
                .build();
        variant.setId(101L);

        OrderDetail detail = OrderDetail.builder()
                .phoneVariant(variant)
                .productName("Xiaomi 14 Ultra")
                .ram("16GB")
                .storage("512GB")
                .color("Đen")
                .unitPrice(BigDecimal.valueOf(26000000))
                .quantity(1)
                .subtotal(BigDecimal.valueOf(26000000))
                .build();
        detail.setId(1L);

        OrderDetailDTO dto = mapper.toDto(detail);

        assertNotNull(dto);
        assertEquals(1L, dto.getId());
        assertEquals(101L, dto.getPhoneVariantId());
        assertEquals(10L, dto.getPhoneId());
        assertEquals("INACTIVE", dto.getProductStatus());
        assertEquals("https://example.com/main.png", dto.getImageUrl());
        assertEquals("Xiaomi 14 Ultra", dto.getProductName());
    }

    @Test
    @DisplayName("Chuyển đổi OrderDetail sang OrderDetailDTO lấy ảnh đầu tiên khi không có ảnh chính")
    void testToDtoFallbackFirstImage() {
        Phone phone = Phone.builder()
                .name("iPhone 15 Pro Max")
                .status("ACTIVE")
                .build();
        phone.setId(20L);

        PhoneImage img1 = PhoneImage.builder()
                .imageUrl("https://example.com/first.png")
                .isMain(false)
                .build();
        phone.setImages(List.of(img1));

        PhoneVariant variant = PhoneVariant.builder()
                .phone(phone)
                .build();
        variant.setId(202L);

        OrderDetail detail = OrderDetail.builder()
                .phoneVariant(variant)
                .productName("iPhone 15 Pro Max")
                .ram("8GB")
                .storage("256GB")
                .color("Titan")
                .unitPrice(BigDecimal.valueOf(33000000))
                .quantity(1)
                .subtotal(BigDecimal.valueOf(33000000))
                .build();
        detail.setId(2L);

        OrderDetailDTO dto = mapper.toDto(detail);

        assertNotNull(dto);
        assertEquals(20L, dto.getPhoneId());
        assertEquals("ACTIVE", dto.getProductStatus());
        assertEquals("https://example.com/first.png", dto.getImageUrl());
    }

    @Test
    @DisplayName("Chuyển đổi OrderDetail an toàn khi phone không có ảnh")
    void testToDtoWithoutImages() {
        Phone phone = Phone.builder()
                .name("No Image Phone")
                .status("ACTIVE")
                .images(List.of())
                .build();
        phone.setId(30L);

        PhoneVariant variant = PhoneVariant.builder()
                .phone(phone)
                .build();
        variant.setId(303L);

        OrderDetail detail = OrderDetail.builder()
                .phoneVariant(variant)
                .productName("No Image Phone")
                .ram("4GB")
                .storage("64GB")
                .color("Trắng")
                .unitPrice(BigDecimal.valueOf(5000000))
                .quantity(1)
                .subtotal(BigDecimal.valueOf(5000000))
                .build();

        OrderDetailDTO dto = mapper.toDto(detail);

        assertNotNull(dto);
        assertEquals(30L, dto.getPhoneId());
        assertNull(dto.getImageUrl());
    }
}
