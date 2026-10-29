package com.re.greenphone.config;

import com.re.greenphone.entity.*;
import com.re.greenphone.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Auto-seeds sample data on first startup if the database is empty.
 * Skips seeding if brands already exist.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final BrandRepository brandRepository;
    private final PhoneRepository phoneRepository;
    private final PhoneVariantRepository phoneVariantRepository;
    private final PhoneImageRepository phoneImageRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final PromotionRepository promotionRepository;
    private final UserPromotionRepository userPromotionRepository;
    private final OrderRepository orderRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final PaymentRepository paymentRepository;
    private final ReviewRepository reviewRepository;
    private final BannerRepository bannerRepository;
    private final SettingsRepository settingsRepository;
    private final OptionRepository optionRepository;
    private final OptionItemRepository optionItemRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        // Option catalog seeds run always (idempotent) — the filter UI depends on them
        seedOptions();

        // Only check brands — roles are pre-seeded by greenphone.sql (CREATE DATABASE + INSERT ROLE)
        if (brandRepository.count() > 0) {
            log.info("Seed data already exists (brands={}) — skipping.", brandRepository.count());
            // Still ensure default settings exist (idempotent)
            seedSettings();
            return;
        }

        seedSettings();

        log.info("No brand data found — seeding sample data...");

        // 1. Brands
        Brand apple     = brandRepository.save(newBrand("Apple",     "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"));
        Brand samsung   = brandRepository.save(newBrand("Samsung",   "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8B1TcHuGgrDXF8o__I_LqtKyJXIHAANU9gK3x9qtHyg&s=10"));
        Brand xiaomi    = brandRepository.save(newBrand("Xiaomi",    "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg"));
        Brand oppo      = brandRepository.save(newBrand("OPPO",      "https://upload.wikimedia.org/wikipedia/commons/a/a2/OPPO_LOGO_2019.png"));
        Brand realme    = brandRepository.save(newBrand("Realme",    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS3rHDOe64vJVdUTI2uXONCBRTw5Joj__at6t4rR3dzxg&s=10"));
        Brand vivo      = brandRepository.save(newBrand("Vivo",      "https://crystalpng.com/wp-content/uploads/2025/05/vivo-logo.png"));

        // 2. Roles — reuse pre-seeded roles from greenphone.sql, create only if missing
        Role customerRole = roleRepository.findByName("CUSTOMER")
                .orElseGet(() -> roleRepository.save(Role.builder().name("CUSTOMER").description("Khach hang").build()));
        Role adminRole = roleRepository.findByName("ADMIN")
                .orElseGet(() -> roleRepository.save(Role.builder().name("ADMIN").description("Quan tri vien").build()));

        // 3. Phones
        Phone ip15pm = phoneRepository.save(newPhone(apple, "iPhone 15 Pro Max",
                "iPhone 15 Pro Max với khung Titan, chip A17 Pro, camera 48MP, màn hình Super Retina XDR 120Hz, cổng USB-C.",
                "6.7 inch Super Retina XDR OLED 120Hz", "iOS 17", "Apple A17 Pro (3nm)",
                "48MP + 12MP ultrawide + 12MP 5x tele", "12MP TrueDepth", "4441mAh", "12 tháng"));
        Phone ip15 = phoneRepository.save(newPhone(apple, "iPhone 15",
                "iPhone 15 Dynamic Island, chip A16 Bionic, camera 48MP, USB-C.",
                "6.1 inch Super Retina XDR OLED 60Hz", "iOS 17", "Apple A16 Bionic (4nm)",
                "48MP + 12MP ultrawide", "12MP TrueDepth", "3349mAh", "12 tháng"));
        Phone s24u = phoneRepository.save(newPhone(samsung, "Samsung Galaxy S24 Ultra",
                "Galaxy S24 Ultra với Galaxy AI, Snapdragon 8 Gen 3, S Pen, camera 200MP.",
                "6.8 inch Dynamic AMOLED 2X 120Hz", "Android 14", "Snapdragon 8 Gen 3 for Galaxy",
                "200MP + 12MP UW + 10MP 3x + 50MP 5x", "12MP", "5000mAh", "12 tháng"));
        Phone a55 = phoneRepository.save(newPhone(samsung, "Samsung Galaxy A55 5G",
                "Galaxy A55 5G khung kim loại, Exynos 1480, camera 50MP OIS, pin 5000mAh.",
                "6.6 inch Super AMOLED 120Hz", "Android 14", "Exynos 1480 (4nm)",
                "50MP OIS + 12MP UW + 5MP macro", "32MP", "5000mAh", "12 tháng"));
        Phone x14u = phoneRepository.save(newPhone(xiaomi, "Xiaomi 14 Ultra",
                "Xiaomi 14 Ultra Leica, Snapdragon 8 Gen 3, cảm biến 1 inch, sạc 90W.",
                "6.73 inch AMOLED LTPO 120Hz", "Android 14", "Snapdragon 8 Gen 3",
                "50MP (1 inch) + 50MP UW + 50MP 3.2x + 50MP 5x", "32MP", "5000mAh", "12 tháng"));
        Phone rn13p = phoneRepository.save(newPhone(xiaomi, "Xiaomi Redmi Note 13 Pro",
                "Redmi Note 13 Pro camera 200MP, Helio G99-Ultra, AMOLED 120Hz, pin 5000mAh.",
                "6.67 inch AMOLED 120Hz", "Android 13", "MediaTek Helio G99-Ultra",
                "200MP + 8MP UW + 2MP macro", "16MP", "5000mAh", "12 tháng"));

        // 4. Variants (simplified: 1-2 per phone)
        PhoneVariant v1  = phoneVariantRepository.save(newVariant(ip15pm, "8GB", "256GB", "Titan Tự Nhiên", 34990000L, 33990000L, 25, "IP15PM-256-TN"));
        PhoneVariant v2  = phoneVariantRepository.save(newVariant(ip15pm, "8GB", "512GB", "Titan Xanh",     39990000L, 38490000L, 15, "IP15PM-512-TX"));
        PhoneVariant v3  = phoneVariantRepository.save(newVariant(ip15,   "6GB", "128GB", "Xanh Mint",      21990000L, 20690000L, 40, "IP15-128-XM"));
        PhoneVariant v4  = phoneVariantRepository.save(newVariant(ip15,   "6GB", "256GB", "Hồng",           24990000L, (Long) null, 30, "IP15-256-H"));
        PhoneVariant v5  = phoneVariantRepository.save(newVariant(s24u,   "12GB","256GB", "Titan Xám",      30990000L, 29490000L, 20, "S24U-256-TX"));
        PhoneVariant v6  = phoneVariantRepository.save(newVariant(s24u,   "12GB","512GB", "Titan Đen",      34990000L, (Long) null, 10, "S24U-512-TD"));
        PhoneVariant v7  = phoneVariantRepository.save(newVariant(a55,    "8GB", "128GB", "Xanh Navy",      8990000L,  8490000L,  50, "GA55-128-XN"));
        PhoneVariant v8  = phoneVariantRepository.save(newVariant(a55,    "8GB", "256GB", "Tím Lilac",      9990000L,  (Long) null, 35, "GA55-256-TL"));
        PhoneVariant v9  = phoneVariantRepository.save(newVariant(x14u,   "16GB","512GB", "Đen",            27990000L, 26990000L, 12, "X14U-512-D"));
        PhoneVariant v10 = phoneVariantRepository.save(newVariant(x14u,   "16GB","1TB",  "Trắng",           32990000L, (Long) null, 5,  "X14U-1TB-T"));
        PhoneVariant v11 = phoneVariantRepository.save(newVariant(rn13p,  "8GB", "256GB", "Xanh Forest",    6490000L,  5990000L,  60, "RN13P-256-XF"));
        PhoneVariant v12 = phoneVariantRepository.save(newVariant(rn13p,  "12GB","512GB", "Đen Midnight",   7990000L,  (Long) null, 40, "RN13P-512-DM"));

        // 5. Images — Pexels photos (free stock)
        // iPhone 15 Pro Max
        phoneImageRepository.save(newImage(ip15pm, "https://images.pexels.com/photos/12794488/pexels-photo-12794488.jpeg", true));
        phoneImageRepository.save(newImage(ip15pm, "https://images.pexels.com/photos/33632613/pexels-photo-33632613.jpeg", false));
        phoneImageRepository.save(newImage(ip15pm, "https://images.pexels.com/photos/3945679/pexels-photo-3945679.jpeg", false));
        // iPhone 15
        phoneImageRepository.save(newImage(ip15,   "https://images.pexels.com/photos/19800760/pexels-photo-19800760.jpeg", true));
        phoneImageRepository.save(newImage(ip15,   "https://images.pexels.com/photos/33632613/pexels-photo-33632613.jpeg", false));
        phoneImageRepository.save(newImage(ip15,   "https://images.pexels.com/photos/34928916/pexels-photo-34928916.jpeg", false));
        // Samsung Galaxy S24 Ultra
        phoneImageRepository.save(newImage(s24u,   "https://images.pexels.com/photos/13780425/pexels-photo-13780425.jpeg", true));
        phoneImageRepository.save(newImage(s24u,   "https://images.pexels.com/photos/30466736/pexels-photo-30466736.jpeg", false));
        phoneImageRepository.save(newImage(s24u,   "https://images.pexels.com/photos/9045119/pexels-photo-9045119.jpeg", false));
        // Samsung Galaxy A55 5G
        phoneImageRepository.save(newImage(a55,    "https://images.pexels.com/photos/13780425/pexels-photo-13780425.jpeg", true));
        phoneImageRepository.save(newImage(a55,    "https://images.pexels.com/photos/13780425/pexels-photo-13780425.jpeg", false));
        // Xiaomi 14 Ultra
        phoneImageRepository.save(newImage(x14u,   "https://images.pexels.com/photos/10902915/pexels-photo-10902915.jpeg", true));
        phoneImageRepository.save(newImage(x14u,   "https://images.pexels.com/photos/12563780/pexels-photo-12563780.jpeg", false));
        // Xiaomi Redmi Note 13 Pro
        phoneImageRepository.save(newImage(rn13p,  "https://images.pexels.com/photos/28381528/pexels-photo-28381528.jpeg", true));
        phoneImageRepository.save(newImage(rn13p,  "https://images.pexels.com/photos/33376220/pexels-photo-33376220.jpeg", false));

        // 6. Users
        User admin  = userRepository.save(newUser("Admin GreenPhone", "admin@greenphone.vn",     passwordEncoder.encode("123456789"), "0900000000", adminRole));
        User an     = userRepository.save(newUser("Nguyễn Văn An",   "an.nguyen@example.com",   passwordEncoder.encode("123456789"), "0912345678", customerRole));
        User binh   = userRepository.save(newUser("Trần Thị Bình",   "binh.tran@example.com",   passwordEncoder.encode("123456789"), "0923456789", customerRole));
        User cuong  = userRepository.save(newUser("Lê Văn Cường",    "cuong.le@example.com",    passwordEncoder.encode("123456789"), "0934567890", customerRole));
        User dung   = userRepository.save(newUser("Phạm Thị Dung",   "dung.pham@example.com",   passwordEncoder.encode("123456789"), "0945678901", customerRole));

        // 7. Carts
        Cart cartAn    = cartRepository.save(Cart.builder().user(an).build());
        Cart cartBinh  = cartRepository.save(Cart.builder().user(binh).build());
        Cart cartCuong = cartRepository.save(Cart.builder().user(cuong).build());
        Cart cartDung  = cartRepository.save(Cart.builder().user(dung).build());

        // 8. Cart items
        cartItemRepository.save(CartItem.builder().cart(cartAn).phoneVariant(v1).quantity(1).build());
        cartItemRepository.save(CartItem.builder().cart(cartAn).phoneVariant(v7).quantity(2).build());
        cartItemRepository.save(CartItem.builder().cart(cartBinh).phoneVariant(v3).quantity(1).build());
        cartItemRepository.save(CartItem.builder().cart(cartCuong).phoneVariant(v11).quantity(1).build());

        // 9. Promotions
        Promotion p1 = promotionRepository.save(Promotion.builder()
                .code("CHAOMUNG").name("Chào mừng thành viên mới").description("Giảm 10% tối đa 500K").discountType("PERCENT")
                .discountValue(new BigDecimal("10.00")).maxDiscountAmount(new BigDecimal("500000")).minOrderValue(new BigDecimal("1000000"))
                .quantity(100).claimedQuantity(0).usedQuantity(0)
                .startDate(LocalDateTime.of(2026,6,1,0,0)).endDate(LocalDateTime.of(2026,12,31,23,59)).status("ACTIVE").build());
        Promotion p2 = promotionRepository.save(Promotion.builder()
                .code("HOT200").name("Giảm ngay 200K").description("Giảm 200K cho đơn từ 5 triệu").discountType("FIXED")
                .discountValue(new BigDecimal("200000")).minOrderValue(new BigDecimal("5000000"))
                .quantity(200).claimedQuantity(0).usedQuantity(0)
                .startDate(LocalDateTime.of(2026,7,1,0,0)).endDate(LocalDateTime.of(2026,8,31,23,59)).status("ACTIVE").build());
        Promotion p3 = promotionRepository.save(Promotion.builder()
                .code("SUMMER500").name("Sale hè bùng nổ").description("Giảm 500K cho đơn từ 15 triệu").discountType("FIXED")
                .discountValue(new BigDecimal("500000")).minOrderValue(new BigDecimal("15000000"))
                .quantity(50).claimedQuantity(0).usedQuantity(0)
                .startDate(LocalDateTime.of(2026,7,1,0,0)).endDate(LocalDateTime.of(2026,7,31,23,59)).status("ACTIVE").build());

        // 10. User promotions
        userPromotionRepository.save(UserPromotion.builder().user(an).promotion(p1).status("AVAILABLE").build());
        userPromotionRepository.save(UserPromotion.builder().user(an).promotion(p2).status("AVAILABLE").build());
        userPromotionRepository.save(UserPromotion.builder().user(binh).promotion(p1).status("AVAILABLE").build());
        userPromotionRepository.save(UserPromotion.builder().user(binh).promotion(p3).status("AVAILABLE").build());
        userPromotionRepository.save(UserPromotion.builder().user(dung).promotion(p1).status("AVAILABLE").build());

        // 11. Banners — Pexels photos
        bannerRepository.save(Banner.builder().title("Sale hè bùng nổ - Giảm đến 3 triệu")
                .imageUrl("https://images.pexels.com/photos/17571892/pexels-photo-17571892.jpeg")
                .linkUrl("/san-pham?sort=discount").status("ACTIVE").build());
        bannerRepository.save(Banner.builder().title("iPhone 15 Series - Trả góp 0%")
                .imageUrl("https://images.pexels.com/photos/18538670/pexels-photo-18538670.jpeg")
                .linkUrl("/san-pham?brandIds=1").status("ACTIVE").build());
        bannerRepository.save(Banner.builder().title("Samsung Galaxy S24 Ultra - AI đột phá")
                .imageUrl("https://images.pexels.com/photos/8166978/pexels-photo-8166978.jpeg")
                .linkUrl("/san-pham/3").status("ACTIVE").build());

        log.info("Seed data created: 6 brands, 6 phones, 12 variants, 6 images, 5 users, 4 carts, 3 promotions, 3 banners");
    }

    // ---- helpers ----

    private Brand newBrand(String name, String logoUrl) {
        Brand b = new Brand();
        b.setName(name);
        b.setLogoUrl(logoUrl);
        b.setStatus("ACTIVE");
        return b;
    }

    private Phone newPhone(Brand brand, String name, String desc, String screen, String os,
                           String chip, String rear, String front, String battery, String warranty) {
        return Phone.builder().brand(brand).name(name).description(desc)
                .screen(screen).os(os).chip(chip).rearCamera(rear).frontCamera(front)
                .battery(battery).warranty(warranty).status("ACTIVE").build();
    }

    private PhoneVariant newVariant(Phone phone, String ram, String storage, String color,
                                     long price, Long discountPrice, int stock, String sku) {
        BigDecimal discPrice = discountPrice != null ? BigDecimal.valueOf(discountPrice) : null;
        return PhoneVariant.builder().phone(phone)
                .ramItem(optionItem(com.re.greenphone.enums.OptionType.RAM, ram))
                .storageItem(optionItem(com.re.greenphone.enums.OptionType.STORAGE, storage))
                .colorItem(optionItem(com.re.greenphone.enums.OptionType.COLOR, color))
                .price(BigDecimal.valueOf(price))
                .discountPrice(discPrice)
                .stockQuantity(stock).sku(sku).status("ACTIVE").build();
    }

    private com.re.greenphone.entity.OptionItem optionItem(String type, String value) {
        return optionItemRepository.findByOptionTypeAndValue(type, value)
                .orElseThrow(() -> new IllegalStateException("Missing option item: " + type + "/" + value));
    }

    private PhoneImage newImage(Phone phone, String url, boolean isMain) {
        return PhoneImage.builder().phone(phone).imageUrl(url).isMain(isMain).build();
    }

    private User newUser(String name, String email, String password, String phone, Role role) {
        User u = new User();
        u.setFullName(name);
        u.setEmail(email);
        u.setPassword(password);
        u.setPhone(phone);
        u.setStatus("ACTIVE");
        u.setRole(role);
        return u;
    }

    /**
     * Idempotent: seed the option catalog (categories + items) if missing.
     * The filter UI (/san-pham) and admin dropdowns read from these tables.
     * COLOR items include every Vietnamese color used by the seeded variants.
     */
    private void seedOptions() {
        seedCategory(com.re.greenphone.enums.OptionType.RAM, "RAM", 5, 1,
                "4GB", "6GB", "8GB", "12GB", "16GB");
        seedCategory(com.re.greenphone.enums.OptionType.STORAGE, "Dung lượng bộ nhớ", 5, 2,
                "64GB", "128GB", "256GB", "512GB", "1TB");
        seedCategory(com.re.greenphone.enums.OptionType.FEATURE, "Tính năng nổi bật", 5, 3,
                "5G", "Sạc nhanh", "Camera AI", "Chống nước", "Màn hình 120Hz");
        seedCategory(com.re.greenphone.enums.OptionType.COLOR, "Màu sắc", 10, 4,
                "black", "white", "blue", "pink", "green", "yellow",
                "Titan Tự Nhiên", "Titan Xanh", "Xanh Mint", "Hồng", "Titan Xám", "Titan Đen",
                "Xanh Navy", "Tím Lilac", "Đen", "Trắng", "Xanh Forest", "Đen Midnight", "Xanh Dương");
    }

    private void seedCategory(String type, String label, int maxItems, int sortOrder, String... values) {
        Option category = optionRepository.findByType(type).orElseGet(() -> {
            Option c = Option.builder()
                    .type(type).label(label).enabled(true).maxItems(maxItems).sortOrder(sortOrder).build();
            return optionRepository.save(c);
        });
        var colorHex = new java.util.HashMap<String, String>();
        colorHex.put("black", "#1F1F1F"); colorHex.put("white", "#F8F8F8");
        colorHex.put("blue", "#5DADE2"); colorHex.put("pink", "#FFB6C1");
        colorHex.put("green", "#22C55E"); colorHex.put("yellow", "#E8C547");
        colorHex.put("Titan Tự Nhiên", "#C0C0C0"); colorHex.put("Titan Xanh", "#5B9BD5");
        colorHex.put("Xanh Mint", "#A8E6CF"); colorHex.put("Hồng", "#FFB6C1");
        colorHex.put("Titan Xám", "#6E6E6E"); colorHex.put("Titan Đen", "#2C2C2C");
        colorHex.put("Xanh Navy", "#1F3A5F"); colorHex.put("Tím Lilac", "#C8A2C8");
        colorHex.put("Đen", "#1F1F1F"); colorHex.put("Trắng", "#F8F8F8");
        colorHex.put("Xanh Forest", "#228B22"); colorHex.put("Đen Midnight", "#2E2E2E");
        colorHex.put("Xanh Dương", "#4A90D9");
        int i = 1;
        for (String value : values) {
            if (optionItemRepository.findByOptionIdAndValue(category.getId(), value).isEmpty()) {
                optionItemRepository.save(OptionItem.builder()
                        .option(category).value(value)
                        .hexColor(colorHex.get(value))
                        .sortOrder(i)
                        .build());
            }
            i++;
        }
    }

    /**
     * Idempotent: seed default shop settings if the row is missing.
     */
    private void seedSettings() {
        seedSetting(com.re.greenphone.service.SettingsService.KEY_SHIPPING_FEE, "29000",
                "Phí giao hàng cố định (VND)");
        seedSetting(com.re.greenphone.service.SettingsService.KEY_FREE_SHIPPING_THRESHOLD, "5000000",
                "Đơn trên mức này được miễn phí giao hàng (VND)");
        seedSetting(com.re.greenphone.service.SettingsService.KEY_TERMS_CONDITIONS, DEFAULT_TERMS,
                "Điều khoản sử dụng (HTML)");
        seedSetting(com.re.greenphone.service.SettingsService.KEY_PRIVACY_POLICY, DEFAULT_PRIVACY,
                "Chính sách bảo mật (HTML)");
    }

    private static final String DEFAULT_TERMS = """
            <h2>Điều khoản sử dụng</h2>
            <p>Chào mừng bạn đến với GreenPhone. Khi truy cập và sử dụng website, bạn đồng ý với các điều khoản sau:</p>
            <h3>1. Tài khoản</h3>
            <p>Bạn phải cung cấp thông tin chính xác khi đăng ký tài khoản và chịu trách nhiệm bảo mật mật khẩu của mình.</p>
            <h3>2. Đặt hàng & thanh toán</h3>
            <p>Mọi đơn hàng phải được thanh toán đầy đủ trước khi giao hàng. Giá và khuyến mãi có thể thay đổi mà không cần báo trước.</p>
            <h3>3. Bảo hành & đổi trả</h3>
            <p>Sản phẩm được bảo hành 12 tháng theo chính sách của nhà sản xuất. Đổi trả trong 30 ngày nếu lỗi nhà sản xuất.</p>
            <h3>4. Trách nhiệm pháp lý</h3>
            <p>GreenPhone không chịu trách nhiệm cho các thiệt hại phát sinh từ việc sử dụng sai mục đích thông tin trên website.</p>
            """;

    private static final String DEFAULT_PRIVACY = """
            <h2>Chính sách bảo mật</h2>
            <p>GreenPhone cam kết bảo vệ thông tin cá nhân của khách hàng. Chính sách này mô tả cách chúng tôi thu thập và sử dụng dữ liệu.</p>
            <h3>1. Thông tin chúng tôi thu thập</h3>
            <p>Họ tên, email, số điện thoại, địa chỉ giao hàng và lịch sử mua hàng.</p>
            <h3>2. Mục đích sử dụng</h3>
            <p>Xử lý đơn hàng, giao hàng, hỗ trợ khách hàng và gửi thông báo khuyến mãi (khi bạn đồng ý).</p>
            <h3>3. Chia sẻ thông tin</h3>
            <p>Chúng tôi không bán thông tin cho bên thứ ba. Thông tin chỉ chia sẻ cho đối tác vận chuyển để giao hàng.</p>
            <h3>4. Bảo mật dữ liệu</h3>
            <p>Thông tin được mã hóa và bảo vệ bằng các biện pháp kỹ thuật phù hợp.</p>
            <h3>5. Quyền của bạn</h3>
            <p>Bạn có quyền truy cập, chỉnh sửa hoặc yêu cầu xóa thông tin cá nhân bất kỳ lúc nào qua email hỗ trợ.</p>
            """;

    private void seedSetting(String key, String value, String desc) {
        if (settingsRepository.findBySettingKey(key).isEmpty()) {
            settingsRepository.save(Settings.builder()
                    .settingKey(key).settingValue(value).description(desc).build());
            log.info("Seeded setting {}={}", key, value);
        }
    }
}
