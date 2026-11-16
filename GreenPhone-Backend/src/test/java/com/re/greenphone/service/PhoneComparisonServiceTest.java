package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.response.PhoneComparisonResponse;
import com.re.greenphone.entity.*;
import com.re.greenphone.repository.PhoneRepository;
import com.re.greenphone.service.impl.PhoneComparisonServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PhoneComparisonServiceTest {

    @Mock
    private PhoneRepository phoneRepository;

    @InjectMocks
    private PhoneComparisonServiceImpl phoneComparisonService;

    private Phone phone1;
    private Phone phone2;
    private Brand brandApple;
    private Brand brandSamsung;

    @BeforeEach
    void setUp() {
        brandApple = Brand.builder().name("Apple").build();
        brandApple.setId(10L);

        brandSamsung = Brand.builder().name("Samsung").build();
        brandSamsung.setId(20L);

        Option ramOption = Option.builder().type("RAM").label("RAM").build();
        Option storageOption = Option.builder().type("STORAGE").label("Storage").build();
        Option colorOption = Option.builder().type("COLOR").label("Color").build();

        OptionItem ram8gb = OptionItem.builder().option(ramOption).value("8GB").build();
        OptionItem storage128gb = OptionItem.builder().option(storageOption).value("128GB").build();
        OptionItem colorBlack = OptionItem.builder().option(colorOption).value("Titan Đen").build();

        OptionItem ram12gb = OptionItem.builder().option(ramOption).value("12GB").build();
        OptionItem storage256gb = OptionItem.builder().option(storageOption).value("256GB").build();
        OptionItem colorTitan = OptionItem.builder().option(colorOption).value("Titan Xám").build();

        phone1 = Phone.builder()
                .brand(brandApple)
                .name("iPhone 15 Pro")
                .screen("6.1 inch, Super Retina XDR OLED")
                .os("iOS 17")
                .chip("Apple A17 Pro")
                .rearCamera("Chính 48 MP & Phụ 12 MP, 12 MP")
                .frontCamera("12 MP")
                .battery("3274 mAh, Sạc nhanh 20W")
                .warranty("12 tháng chính hãng")
                .status("ACTIVE")
                .variants(new ArrayList<>())
                .images(new ArrayList<>())
                .reviews(new ArrayList<>())
                .build();
        phone1.setId(1L);

        PhoneVariant variant1 = PhoneVariant.builder()
                .phone(phone1)
                .ramItem(ram8gb)
                .storageItem(storage128gb)
                .colorItem(colorBlack)
                .price(BigDecimal.valueOf(28990000))
                .discountPrice(BigDecimal.valueOf(25990000))
                .stockQuantity(15)
                .build();
        phone1.getVariants().add(variant1);

        PhoneImage img1 = PhoneImage.builder()
                .phone(phone1)
                .imageUrl("https://example.com/iphone15pro.jpg")
                .isMain(true)
                .build();
        phone1.getImages().add(img1);

        phone2 = Phone.builder()
                .brand(brandSamsung)
                .name("Samsung Galaxy S24 Ultra")
                .screen("6.8 inch, Dynamic AMOLED 2X")
                .os("Android 14")
                .chip("Snapdragon 8 Gen 3 for Galaxy")
                .rearCamera("Chính 200 MP & Phụ 50 MP, 12 MP, 10 MP")
                .frontCamera("12 MP")
                .battery("5000 mAh, Sạc nhanh 45W")
                .warranty("12 tháng chính hãng")
                .status("ACTIVE")
                .variants(new ArrayList<>())
                .images(new ArrayList<>())
                .reviews(new ArrayList<>())
                .build();
        phone2.setId(2L);

        PhoneVariant variant2 = PhoneVariant.builder()
                .phone(phone2)
                .ramItem(ram12gb)
                .storageItem(storage256gb)
                .colorItem(colorTitan)
                .price(BigDecimal.valueOf(31990000))
                .discountPrice(BigDecimal.valueOf(29990000))
                .stockQuantity(20)
                .build();
        phone2.getVariants().add(variant2);

        PhoneImage img2 = PhoneImage.builder()
                .phone(phone2)
                .imageUrl("https://example.com/s24ultra.jpg")
                .isMain(true)
                .build();
        phone2.getImages().add(img2);
    }

    @Test
    @DisplayName("comparePhones - Thành công khi so sánh 2 điện thoại hợp lệ và phát hiện các thông số khác biệt")
    void comparePhones_WhenValidTwoPhones_ShouldReturnComparisonResponseWithDifferences() {
        // Arrange
        List<Long> ids = List.of(1L, 2L);
        when(phoneRepository.findPhonesForComparison(ids)).thenReturn(List.of(phone1, phone2));

        // Act
        PhoneComparisonResponse response = phoneComparisonService.comparePhones(ids);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getPhones()).hasSize(2);
        assertThat(response.getPhones().get(0).getName()).isEqualTo("iPhone 15 Pro");
        assertThat(response.getPhones().get(0).getMainImageUrl()).isEqualTo("https://example.com/iphone15pro.jpg");
        assertThat(response.getPhones().get(1).getName()).isEqualTo("Samsung Galaxy S24 Ultra");

        // Kiểm tra phát hiện khác biệt
        assertThat(response.getDifferencesKeys()).contains("brand", "screen", "os", "chip", "ram", "storage", "rearCamera", "battery");
        // frontCamera & warranty giống nhau giữa 2 máy -> không nằm trong differencesKeys
        assertThat(response.getDifferencesKeys()).doesNotContain("frontCamera", "warranty");

        // Kiểm tra nhóm thông số
        assertThat(response.getSpecGroups()).isNotEmpty();
        var generalGroup = response.getSpecGroups().stream()
                .filter(g -> "general".equals(g.getGroupKey()))
                .findFirst()
                .orElse(null);
        assertThat(generalGroup).isNotNull();

        var warrantyItem = generalGroup.getItems().stream()
                .filter(i -> "warranty".equals(i.getKey()))
                .findFirst()
                .orElse(null);
        assertThat(warrantyItem).isNotNull();
        assertThat(warrantyItem.isDifferent()).isFalse();
        assertThat(warrantyItem.getValues().get(1L)).isEqualTo("12 tháng chính hãng");
        assertThat(warrantyItem.getValues().get(2L)).isEqualTo("12 tháng chính hãng");
    }

    @Test
    @DisplayName("comparePhones - Ném ngoại lệ BadRequestException khi số lượng ID nhỏ hơn 2")
    void comparePhones_WhenLessThanTwoIds_ShouldThrowBadRequestException() {
        // Act & Assert
        assertThatThrownBy(() -> phoneComparisonService.comparePhones(List.of(1L)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cần chọn ít nhất 2 sản phẩm");

        assertThatThrownBy(() -> phoneComparisonService.comparePhones(null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cần chọn ít nhất 2 sản phẩm");

        verifyNoInteractions(phoneRepository);
    }

    @Test
    @DisplayName("comparePhones - Ném ngoại lệ BadRequestException khi số lượng ID lớn hơn 4")
    void comparePhones_WhenMoreThanFourIds_ShouldThrowBadRequestException() {
        // Act & Assert
        assertThatThrownBy(() -> phoneComparisonService.comparePhones(List.of(1L, 2L, 3L, 4L, 5L)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chỉ hỗ trợ so sánh tối đa 4 sản phẩm");

        verifyNoInteractions(phoneRepository);
    }

    @Test
    @DisplayName("comparePhones - Ném ngoại lệ BadRequestException khi so sánh trùng sản phẩm")
    void comparePhones_WhenDuplicateIds_ShouldThrowBadRequestException() {
        // Act & Assert
        assertThatThrownBy(() -> phoneComparisonService.comparePhones(List.of(1L, 1L)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể so sánh cùng một sản phẩm ở cả hai vị trí");

        verifyNoInteractions(phoneRepository);
    }

    @Test
    @DisplayName("comparePhones - Ném ngoại lệ ResourceNotFoundException khi có sản phẩm không tồn tại hoặc không ACTIVE")
    void comparePhones_WhenPhoneNotFound_ShouldThrowResourceNotFoundException() {
        // Arrange
        List<Long> ids = List.of(1L, 999L);
        when(phoneRepository.findPhonesForComparison(ids)).thenReturn(List.of(phone1));

        // Act & Assert
        assertThatThrownBy(() -> phoneComparisonService.comparePhones(ids))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("comparePhones - Bảo toàn đúng thứ tự các sản phẩm theo thứ tự danh sách ID truyền vào")
    void comparePhones_ShouldPreserveRequestedIdsOrder() {
        // Arrange
        List<Long> ids = List.of(2L, 1L);
        // Repository trả về không đảm bảo thứ tự
        when(phoneRepository.findPhonesForComparison(ids)).thenReturn(List.of(phone1, phone2));

        // Act
        PhoneComparisonResponse response = phoneComparisonService.comparePhones(ids);

        // Assert
        assertThat(response.getPhones().get(0).getId()).isEqualTo(2L);
        assertThat(response.getPhones().get(0).getName()).isEqualTo("Samsung Galaxy S24 Ultra");
        assertThat(response.getPhones().get(1).getId()).isEqualTo(1L);
        assertThat(response.getPhones().get(1).getName()).isEqualTo("iPhone 15 Pro");
    }
}
