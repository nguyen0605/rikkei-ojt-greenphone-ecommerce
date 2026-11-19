package com.re.greenphone.service.impl;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.OrderItemRequirement;
import com.re.greenphone.dto.response.InterWarehouseTransferPlan;
import com.re.greenphone.dto.response.NearestWarehouseResponse;
import com.re.greenphone.dto.response.NearestWarehouseStockResponse;
import com.re.greenphone.dto.response.WarehouseBranchStockResponse;
import com.re.greenphone.dto.response.TransferPlanItem;
import com.re.greenphone.entity.PhoneVariant;
import com.re.greenphone.entity.Warehouse;
import com.re.greenphone.entity.WarehouseStock;
import com.re.greenphone.repository.PhoneVariantRepository;
import com.re.greenphone.repository.WarehouseRepository;
import com.re.greenphone.repository.WarehouseStockRepository;
import com.re.greenphone.service.WarehouseRoutingService;
import com.re.greenphone.service.admin.WarehouseStockLedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WarehouseRoutingServiceImpl implements WarehouseRoutingService {

    private static final double EARTH_RADIUS_KM = 6371.0;

    private final WarehouseRepository warehouseRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final PhoneVariantRepository phoneVariantRepository;

    @Override
    public double calculateDistance(Double lat1, Double lng1, Double lat2, Double lng2) {
        if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
            throw new IllegalArgumentException("Coordinates cannot be null");
        }
        if (!Double.isFinite(lat1) || !Double.isFinite(lng1) || !Double.isFinite(lat2) || !Double.isFinite(lng2)) {
            throw new IllegalArgumentException("Coordinates must be finite numbers");
        }
        if (lat1 < -90.0 || lat1 > 90.0 || lat2 < -90.0 || lat2 > 90.0) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90 degrees");
        }
        if (lng1 < -180.0 || lng1 > 180.0 || lng2 < -180.0 || lng2 > 180.0) {
            throw new IllegalArgumentException("Longitude must be between -180 and 180 degrees");
        }

        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double rLat1 = Math.toRadians(lat1);
        double rLat2 = Math.toRadians(lat2);

        double sinHalfDlat = Math.sin(dLat / 2.0);
        double sinHalfDlng = Math.sin(dLng / 2.0);

        double a = sinHalfDlat * sinHalfDlat + Math.cos(rLat1) * Math.cos(rLat2) * sinHalfDlng * sinHalfDlng;
        // Clamp numerical rounding errors within [0.0, 1.0]
        a = Math.max(0.0, Math.min(1.0, a));
        double c = 2.0 * Math.asin(Math.sqrt(a));

        double distance = EARTH_RADIUS_KM * c;
        return Math.round(distance * 100.0) / 100.0;
    }

    @Override
    public NearestWarehouseResponse findNearestWarehouse(Double lat, Double lng) {
        List<Warehouse> activeWarehouses = warehouseRepository.findByStatus("ACTIVE");
        if (activeWarehouses.isEmpty()) {
            throw new ResourceNotFoundException("Warehouse", "status", "ACTIVE");
        }

        if (lat == null || lng == null) {
            Warehouse defaultWarehouse = activeWarehouses.stream()
                    .filter(w -> WarehouseStockLedgerService.MAIN_CODE.equals(w.getCode()))
                    .findFirst()
                    .orElse(activeWarehouses.get(0));

            return NearestWarehouseResponse.builder()
                    .id(defaultWarehouse.getId())
                    .code(defaultWarehouse.getCode())
                    .name(defaultWarehouse.getName())
                    .address(defaultWarehouse.getAddress())
                    .latitude(defaultWarehouse.getLatitude())
                    .longitude(defaultWarehouse.getLongitude())
                    .distanceKm(null)
                    .status(defaultWarehouse.getStatus())
                    .build();
        }

        validateCoordinates(lat, lng);

        Warehouse nearest = null;
        double minDistance = Double.MAX_VALUE;

        for (Warehouse w : activeWarehouses) {
            if (w.getLatitude() != null && w.getLongitude() != null) {
                double dist = calculateDistance(lat, lng, w.getLatitudeAsDouble(), w.getLongitudeAsDouble());
                if (dist < minDistance) {
                    minDistance = dist;
                    nearest = w;
                }
            }
        }

        if (nearest == null) {
            nearest = activeWarehouses.stream()
                    .filter(w -> WarehouseStockLedgerService.MAIN_CODE.equals(w.getCode()))
                    .findFirst()
                    .orElse(activeWarehouses.get(0));
            minDistance = 0.0;
        }

        return NearestWarehouseResponse.builder()
                .id(nearest.getId())
                .code(nearest.getCode())
                .name(nearest.getName())
                .address(nearest.getAddress())
                .latitude(nearest.getLatitude())
                .longitude(nearest.getLongitude())
                .distanceKm(minDistance == Double.MAX_VALUE ? null : minDistance)
                .status(nearest.getStatus())
                .build();
    }

    @Override
    public NearestWarehouseStockResponse findNearestWarehouseStock(
            Double lat, Double lng, String province, List<Long> variantIds) {
        List<Warehouse> activeWarehouses = warehouseRepository.findByStatus("ACTIVE");
        if (activeWarehouses.isEmpty()) {
            throw new ResourceNotFoundException("Warehouse", "status", "ACTIVE");
        }

        Warehouse target = null;
        Double distanceKm = null;

        if (lat != null && lng != null) {
            try {
                validateCoordinates(lat, lng);
                List<Warehouse> sorted = sortWarehousesByProximity(activeWarehouses, lat, lng);
                target = sorted.get(0);
                if (target.getLatitude() != null && target.getLongitude() != null) {
                    distanceKm = calculateDistance(lat, lng, target.getLatitudeAsDouble(), target.getLongitudeAsDouble());
                }
            } catch (Exception ignored) {
                // Toa do khong hop le, fallback tinh thanh hoac mac dinh
            }
        }

        if (target == null && province != null && !province.isBlank()) {
            target = resolveWarehouseByProvince(activeWarehouses, province);
        }

        if (target == null) {
            target = activeWarehouses.stream()
                    .filter(w -> WarehouseStockLedgerService.MAIN_CODE.equals(w.getCode()))
                    .findFirst()
                    .orElse(activeWarehouses.get(0));
        }

        Map<Long, Integer> stockMap = new LinkedHashMap<>();
        if (variantIds != null && !variantIds.isEmpty()) {
            List<WarehouseStock> stockRecords = warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(
                    List.of(target.getId()), variantIds);
            for (WarehouseStock s : stockRecords) {
                stockMap.put(s.getPhoneVariant().getId(), s.getAvailableQuantity());
            }
            for (Long vid : variantIds) {
                stockMap.putIfAbsent(vid, 0);
            }
        } else {
            List<WarehouseStock> stockRecords = warehouseStockRepository.findByWarehouseIdOrderByIdAsc(target.getId());
            for (WarehouseStock s : stockRecords) {
                stockMap.put(s.getPhoneVariant().getId(), s.getAvailableQuantity());
            }
        }

        return NearestWarehouseStockResponse.builder()
                .warehouseId(target.getId())
                .warehouseCode(target.getCode())
                .warehouseName(target.getName())
                .warehouseAddress(target.getAddress())
                .latitude(target.getLatitude())
                .longitude(target.getLongitude())
                .distanceKm(distanceKm)
                .status(target.getStatus())
                .stocks(stockMap)
                .build();
    }

    @Override
    public List<WarehouseBranchStockResponse> getBranchStocksForVariant(Long variantId, Double lat, Double lng) {
        if (variantId == null) {
            throw new BadRequestException("Mã biến thể không được để trống");
        }

        List<Warehouse> activeWarehouses = warehouseRepository.findByStatus("ACTIVE");
        if (activeWarehouses.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> warehouseIds = activeWarehouses.stream().map(Warehouse::getId).toList();
        List<WarehouseStock> stocks = warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(
                warehouseIds, List.of(variantId));

        Map<Long, Integer> stockMap = new HashMap<>();
        for (WarehouseStock s : stocks) {
            stockMap.put(s.getWarehouse().getId(), s.getAvailableQuantity());
        }

        List<WarehouseBranchStockResponse> result = new ArrayList<>();
        for (Warehouse w : activeWarehouses) {
            int qty = stockMap.getOrDefault(w.getId(), 0);
            Double dist = null;
            if (lat != null && lng != null && w.getLatitude() != null && w.getLongitude() != null) {
                try {
                    validateCoordinates(lat, lng);
                    dist = calculateDistance(lat, lng, w.getLatitudeAsDouble(), w.getLongitudeAsDouble());
                } catch (Exception ignored) {
                }
            }

            String province = "Toàn quốc";
            String district = "";
            String phone = "1800 2097";

            String code = w.getCode() != null ? w.getCode().toUpperCase() : "";
            if (code.contains("HN") || (w.getAddress() != null && w.getAddress().contains("Hà Nội"))) {
                province = "Hà Nội";
                district = "Cầu Giấy";
                phone = "024 7106 9999";
            } else if (code.contains("HCM") || (w.getAddress() != null && (w.getAddress().contains("Hồ Chí Minh") || w.getAddress().contains("TP.HCM")))) {
                province = "TP. Hồ Chí Minh";
                district = "Quận 1";
                phone = "028 7108 9999";
            } else if (code.contains("DN") || (w.getAddress() != null && w.getAddress().contains("Đà Nẵng"))) {
                province = "Đà Nẵng";
                district = "Hải Châu";
                phone = "0236 7109 999";
            } else if (w.getAddress() != null) {
                String[] parts = w.getAddress().split(",");
                if (parts.length > 0) {
                    province = parts[parts.length - 1].trim();
                }
                if (parts.length > 1) {
                    district = parts[parts.length - 2].trim();
                }
            }

            result.add(WarehouseBranchStockResponse.builder()
                    .id(w.getId())
                    .code(w.getCode())
                    .name(w.getName())
                    .address(w.getAddress())
                    .province(province)
                    .district(district)
                    .phone(phone)
                    .latitude(w.getLatitudeAsDouble())
                    .longitude(w.getLongitudeAsDouble())
                    .distanceKm(dist)
                    .quantity(qty)
                    .inStock(qty > 0)
                    .status(w.getStatus())
                    .build());
        }

        if (lat != null && lng != null) {
            result.sort(Comparator.comparing(r -> r.getDistanceKm() != null ? r.getDistanceKm() : Double.MAX_VALUE));
        }

        return result;
    }

    private String unaccent(String s) {
        if (s == null) return "";
        String temp = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD);
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(temp).replaceAll("").replace('đ', 'd').replace('Đ', 'd').toLowerCase();
    }

    public Warehouse resolveWarehouseByProvince(List<Warehouse> activeWarehouses, String province) {
        if (province == null || province.isBlank() || activeWarehouses.isEmpty()) {
            return null;
        }
        String p = province.toLowerCase();
        String un = unaccent(province);

        // Mien Nam -> WH-HCM-Q1
        boolean isSouth = p.contains("hồ chí minh") || p.contains("tp.hcm") || p.contains("tphcm")
                || p.contains("sài gòn") || p.contains("thủ đức") || p.contains("bình dương")
                || p.contains("đồng nai") || p.contains("long an") || p.contains("cần thơ")
                || p.contains("vũng tàu") || p.contains("bà rịa") || p.contains("tiền giang")
                || p.contains("bến tre") || p.contains("vĩnh long") || p.contains("trà vinh")
                || p.contains("hậu giang") || p.contains("sóc trăng") || p.contains("an giang")
                || p.contains("kiên giang") || p.contains("bạc liêu") || p.contains("cà mau")
                || p.contains("tây ninh") || p.contains("bình phước") || p.contains("lâm đồng")
                || p.contains("đà lạt") || p.contains("đắk lắk") || p.contains("buôn ma thuột")
                || p.contains("đắk nông") || p.contains("gia lai") || p.contains("pleiku") || p.contains("kon tum")
                || un.contains("ho chi minh") || un.contains("sai gon") || un.contains("thu duc")
                || un.contains("binh duong") || un.contains("dong nai") || un.contains("long an")
                || un.contains("can tho") || un.contains("vung tau") || un.contains("ba ria")
                || un.contains("tien giang") || un.contains("ben tre") || un.contains("vinh long")
                || un.contains("tra vinh") || un.contains("hau giang") || un.contains("soc trang")
                || un.contains("an giang") || un.contains("kien giang") || un.contains("bac lieu")
                || un.contains("ca mau") || un.contains("tay ninh") || un.contains("binh phuoc")
                || un.contains("lam dong") || un.contains("da lat") || un.contains("dak lak")
                || un.contains("buon ma thuot") || un.contains("dak nong") || un.contains("gia lai")
                || un.contains("pleiku") || un.contains("kon tum");

        if (isSouth) {
            return activeWarehouses.stream()
                    .filter(w -> "WH-HCM-Q1".equalsIgnoreCase(w.getCode()) || w.getName().contains("TP.HCM") || (w.getAddress() != null && w.getAddress().contains("Hồ Chí Minh")))
                    .findFirst()
                    .orElse(null);
        }

        // Mien Trung -> WH-DN-HAI
        boolean isCentral = p.contains("đà nẵng") || p.contains("quảng nam") || p.contains("hội an")
                || p.contains("tam kỳ") || p.contains("quảng ngãi") || p.contains("bình định")
                || p.contains("quy nhơn") || p.contains("phú yên") || p.contains("tuy hòa")
                || p.contains("khánh hòa") || p.contains("nha trang") || p.contains("ninh thuận")
                || p.contains("phan rang") || p.contains("bình thuận") || p.contains("phan thiết")
                || p.contains("huế") || p.contains("thừa thiên") || p.contains("quảng trị")
                || p.contains("đông hà") || p.contains("quảng bình") || p.contains("đồng hới")
                || p.contains("hà tĩnh") || p.contains("nghệ an") || p.contains("vinh")
                || un.contains("da nang") || un.contains("quang nam") || un.contains("hoi an")
                || un.contains("tam ky") || un.contains("quang ngai") || un.contains("binh dinh")
                || un.contains("quy nhon") || un.contains("phu yen") || un.contains("tuy hoa")
                || un.contains("khanh hoa") || un.contains("nha trang") || un.contains("ninh thuan")
                || un.contains("phan rang") || un.contains("binh thuan") || un.contains("phan thiet")
                || un.contains("hue") || un.contains("thua thien") || un.contains("quang tri")
                || un.contains("dong ha") || un.contains("quang binh") || un.contains("dong hoi")
                || un.contains("ha tinh") || un.contains("nghe an") || un.contains("vinh");

        if (isCentral) {
            return activeWarehouses.stream()
                    .filter(w -> "WH-DN-HAI".equalsIgnoreCase(w.getCode()) || w.getName().contains("Đà Nẵng") || (w.getAddress() != null && w.getAddress().contains("Đà Nẵng")))
                    .findFirst()
                    .orElse(null);
        }

        // Mien Bac -> WH-HN-MAIN
        return activeWarehouses.stream()
                .filter(w -> WarehouseStockLedgerService.MAIN_CODE.equalsIgnoreCase(w.getCode()) || w.getName().contains("Hà Nội"))
                .findFirst()
                .orElse(null);
    }

    @Override
    public Warehouse routeWarehouseForOrder(Double lat, Double lng, List<OrderItemRequirement> items) {
        if (items == null || items.isEmpty()) {
            throw new BadRequestException("Danh sách sản phẩm trong đơn hàng không được để trống");
        }

        Map<Long, Integer> consolidatedRequirements = new LinkedHashMap<>();
        for (OrderItemRequirement item : items) {
            if (item.getPhoneVariantId() == null) {
                throw new BadRequestException("ID biến thể không hợp lệ");
            }
            int qty = item.getQuantity() != null ? item.getQuantity() : 0;
            if (qty <= 0) {
                throw new BadRequestException("Số lượng sản phẩm đặt mua phải lớn hơn 0");
            }
            consolidatedRequirements.merge(item.getPhoneVariantId(), qty, Integer::sum);
        }

        List<Warehouse> activeWarehouses = warehouseRepository.findByStatus("ACTIVE");
        if (activeWarehouses.isEmpty()) {
            throw new BadRequestException("Hệ thống hiện không có kho hàng nào đang hoạt động");
        }

        List<Warehouse> candidates;
        if (lat != null && lng != null) {
            validateCoordinates(lat, lng);

            candidates = activeWarehouses.stream()
                    .sorted(Comparator.comparingDouble(w -> {
                        if (w.getLatitude() != null && w.getLongitude() != null) {
                            return calculateDistance(lat, lng, w.getLatitudeAsDouble(), w.getLongitudeAsDouble());
                        }
                        return Double.MAX_VALUE;
                    }))
                    .toList();
        } else {
            // Null coordinates: Prioritize WH-HN-MAIN then remaining active warehouses
            candidates = activeWarehouses.stream()
                    .sorted((w1, w2) -> {
                        if (WarehouseStockLedgerService.MAIN_CODE.equals(w1.getCode())) return -1;
                        if (WarehouseStockLedgerService.MAIN_CODE.equals(w2.getCode())) return 1;
                        return w1.getId().compareTo(w2.getId());
                    })
                    .toList();
        }

        // Batch query stock for all candidates and requested variants to prevent N+1 queries
        List<Long> warehouseIds = candidates.stream().map(Warehouse::getId).toList();
        List<Long> variantIds = new ArrayList<>(consolidatedRequirements.keySet());

        List<WarehouseStock> stockRecords = warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(warehouseIds, variantIds);

        Map<Long, Map<Long, Integer>> stockByWarehouse = new HashMap<>();
        for (WarehouseStock ws : stockRecords) {
            stockByWarehouse
                    .computeIfAbsent(ws.getWarehouse().getId(), k -> new HashMap<>())
                    .put(ws.getPhoneVariant().getId(), ws.getQuantity());
        }

        for (Warehouse warehouse : candidates) {
            Map<Long, Integer> variantStockMap = stockByWarehouse.getOrDefault(warehouse.getId(), Collections.emptyMap());
            boolean canFulfillAll = true;

            for (Map.Entry<Long, Integer> req : consolidatedRequirements.entrySet()) {
                Long variantId = req.getKey();
                int requiredQty = req.getValue();

                int availableQty = variantStockMap.getOrDefault(variantId, 0);

                // Fallback check for unmigrated fixture stock on WH-HN-MAIN
                if (availableQty == 0 && WarehouseStockLedgerService.MAIN_CODE.equals(warehouse.getCode())) {
                    if (!warehouseStockRepository.existsByPhoneVariantId(variantId)) {
                        PhoneVariant pv = phoneVariantRepository.findById(variantId).orElse(null);
                        if (pv != null && pv.getStockQuantity() != null) {
                            availableQty = pv.getStockQuantity();
                        }
                    }
                }

                if (availableQty < requiredQty) {
                    canFulfillAll = false;
                    break;
                }
            }

            if (canFulfillAll) {
                log.info("Routed order (lat: {}, lng: {}) to warehouse {} (id: {})", lat, lng, warehouse.getCode(), warehouse.getId());
                return warehouse;
            }
        }

        throw new BadRequestException("Không có kho nào có đủ tồn kho cho toàn bộ sản phẩm trong đơn hàng");
    }

    @Override
    public InterWarehouseTransferPlan routeInterWarehouseFulfillment(Double lat, Double lng, List<OrderItemRequirement> items) {
        if (items == null || items.isEmpty()) {
            throw new BadRequestException("Danh sách sản phẩm trong đơn hàng không được để trống");
        }

        Map<Long, Integer> consolidatedRequirements = new LinkedHashMap<>();
        for (OrderItemRequirement item : items) {
            if (item.getPhoneVariantId() == null) {
                throw new BadRequestException("ID biến thể không hợp lệ");
            }
            int qty = item.getQuantity() != null ? item.getQuantity() : 0;
            if (qty <= 0) {
                throw new BadRequestException("Số lượng sản phẩm đặt mua phải lớn hơn 0");
            }
            consolidatedRequirements.merge(item.getPhoneVariantId(), qty, Integer::sum);
        }

        List<Warehouse> activeWarehouses = warehouseRepository.findByStatus("ACTIVE");
        if (activeWarehouses.isEmpty()) {
            throw new BadRequestException("Hệ thống hiện không có kho hàng nào đang hoạt động");
        }

        if (lat != null && lng != null) {
            validateCoordinates(lat, lng);
        }

        // Sắp xếp các kho theo thứ tự gần khách hàng nhất
        List<Warehouse> sortedWarehouses = sortWarehousesByProximity(activeWarehouses, lat, lng);

        // Truy vấn batch tồn kho khả dụng của tất cả các kho active cho các biến thể được yêu cầu
        List<Long> warehouseIds = sortedWarehouses.stream().map(Warehouse::getId).toList();
        List<Long> variantIds = new ArrayList<>(consolidatedRequirements.keySet());
        List<WarehouseStock> stockRecords = warehouseStockRepository.findByWarehouseIdInAndPhoneVariantIdIn(warehouseIds, variantIds);

        Map<Long, Map<Long, Integer>> availableStockByWarehouse = new HashMap<>();
        for (WarehouseStock ws : stockRecords) {
            availableStockByWarehouse
                    .computeIfAbsent(ws.getWarehouse().getId(), k -> new HashMap<>())
                    .put(ws.getPhoneVariant().getId(), ws.getAvailableQuantity());
        }

        // 1. Kiểm tra TRƯỜNG HỢP 1: Có một kho đơn lẻ đáp ứng toàn bộ giỏ hàng
        for (Warehouse warehouse : sortedWarehouses) {
            Map<Long, Integer> variantStockMap = availableStockByWarehouse.getOrDefault(warehouse.getId(), Collections.emptyMap());
            boolean canFulfillAll = true;

            for (Map.Entry<Long, Integer> req : consolidatedRequirements.entrySet()) {
                int availableQty = getEffectiveAvailable(warehouse, req.getKey(), variantStockMap);
                if (availableQty < req.getValue()) {
                    canFulfillAll = false;
                    break;
                }
            }

            if (canFulfillAll) {
                Double distance = calculateDistanceToCustomer(warehouse, lat, lng);
                Map<Long, Integer> destAvailable = new HashMap<>();
                for (Map.Entry<Long, Integer> req : consolidatedRequirements.entrySet()) {
                    destAvailable.put(req.getKey(), req.getValue());
                }

                return InterWarehouseTransferPlan.builder()
                        .destinationWarehouse(warehouse)
                        .directFulfillment(true)
                        .feasible(true)
                        .totalItemsToTransfer(0)
                        .referenceDistanceKm(distance)
                        .destinationAvailableStock(destAvailable)
                        .transferItems(Collections.emptyList())
                        .build();
            }
        }

        // 2. Kiểm tra TRƯỜNG HỢP 3: Tổng tồn kho khả dụng toàn hệ thống có đủ không
        for (Map.Entry<Long, Integer> req : consolidatedRequirements.entrySet()) {
            Long variantId = req.getKey();
            int requiredQty = req.getValue();
            int totalAvailableAcrossSystem = 0;
            for (Warehouse w : sortedWarehouses) {
                Map<Long, Integer> variantStockMap = availableStockByWarehouse.getOrDefault(w.getId(), Collections.emptyMap());
                totalAvailableAcrossSystem += getEffectiveAvailable(w, variantId, variantStockMap);
            }
            if (totalAvailableAcrossSystem < requiredQty) {
                // Không đủ hàng toàn hệ thống
                return InterWarehouseTransferPlan.builder()
                        .destinationWarehouse(null)
                        .directFulfillment(false)
                        .feasible(false)
                        .totalItemsToTransfer(0)
                        .referenceDistanceKm(null)
                        .destinationAvailableStock(Collections.emptyMap())
                        .transferItems(Collections.emptyList())
                        .build();
            }
        }

        // 3. TRƯỜNG HỢP 2: Kích hoạt điều chuyển liên kho
        // Đánh giá từng kho đích khả dĩ và chọn phương án tối ưu
        InterWarehouseTransferPlan bestPlan = null;
        CandidateScore bestScore = null;

        for (Warehouse candidateDest : sortedWarehouses) {
            Map<Long, Integer> destStockMap = availableStockByWarehouse.getOrDefault(candidateDest.getId(), Collections.emptyMap());
            Map<Long, Integer> remainingNeeded = new HashMap<>();
            Map<Long, Integer> usedFromDest = new HashMap<>();

            for (Map.Entry<Long, Integer> req : consolidatedRequirements.entrySet()) {
                Long variantId = req.getKey();
                int requiredQty = req.getValue();
                int availAtDest = getEffectiveAvailable(candidateDest, variantId, destStockMap);
                int takeFromDest = Math.min(requiredQty, availAtDest);
                usedFromDest.put(variantId, takeFromDest);
                int needed = requiredQty - takeFromDest;
                if (needed > 0) {
                    remainingNeeded.put(variantId, needed);
                }
            }

            // Sắp xếp các kho nguồn theo thứ tự gần kho đích nhất, tie-breaker bằng ID ASC
            List<Warehouse> candidateSources = activeWarehouses.stream()
                    .filter(w -> !w.getId().equals(candidateDest.getId()))
                    .sorted(Comparator.comparingDouble((Warehouse w) -> {
                        if (w.getLatitude() != null && w.getLongitude() != null
                                && candidateDest.getLatitude() != null && candidateDest.getLongitude() != null) {
                            return calculateDistance(candidateDest.getLatitudeAsDouble(), candidateDest.getLongitudeAsDouble(),
                                    w.getLatitudeAsDouble(), w.getLongitudeAsDouble());
                        }
                        return Double.MAX_VALUE;
                    }).thenComparing(Warehouse::getId))
                    .toList();

            List<TransferPlanItem> transferItems = new ArrayList<>();
            Map<Long, Integer> neededCopy = new HashMap<>(remainingNeeded);
            Set<Long> uniqueSourceWarehouseIds = new HashSet<>();
            int totalTransferred = 0;

            for (Warehouse source : candidateSources) {
                Map<Long, Integer> srcStockMap = availableStockByWarehouse.getOrDefault(source.getId(), Collections.emptyMap());
                double distBetween = calculateWarehouseToWarehouseDistance(candidateDest, source);

                for (Map.Entry<Long, Integer> neededEntry : neededCopy.entrySet()) {
                    Long variantId = neededEntry.getKey();
                    int stillNeeded = neededEntry.getValue();
                    if (stillNeeded <= 0) continue;

                    int srcAvail = getEffectiveAvailable(source, variantId, srcStockMap);
                    int take = Math.min(stillNeeded, srcAvail);
                    if (take > 0) {
                        transferItems.add(TransferPlanItem.builder()
                                .sourceWarehouse(source)
                                .destinationWarehouse(candidateDest)
                                .phoneVariantId(variantId)
                                .quantity(take)
                                .distanceBetweenWarehousesKm(distBetween)
                                .build());
                        neededEntry.setValue(stillNeeded - take);
                        uniqueSourceWarehouseIds.add(source.getId());
                        totalTransferred += take;
                    }
                }
            }

            boolean allSatisfied = neededCopy.values().stream().allMatch(needed -> needed <= 0);
            if (allSatisfied) {
                Double distToCust = calculateDistanceToCustomer(candidateDest, lat, lng);
                CandidateScore score = new CandidateScore(
                        distToCust != null ? distToCust : Double.MAX_VALUE,
                        uniqueSourceWarehouseIds.size(),
                        totalTransferred,
                        candidateDest.getId()
                );

                if (bestScore == null || score.compareTo(bestScore) < 0) {
                    bestScore = score;
                    bestPlan = InterWarehouseTransferPlan.builder()
                            .destinationWarehouse(candidateDest)
                            .directFulfillment(false)
                            .feasible(true)
                            .totalItemsToTransfer(totalTransferred)
                            .referenceDistanceKm(distToCust)
                            .destinationAvailableStock(usedFromDest)
                            .transferItems(transferItems)
                            .build();
                }
            }
        }

        if (bestPlan != null) {
            return bestPlan;
        }

        return InterWarehouseTransferPlan.builder()
                .feasible(false)
                .build();
    }

    private List<Warehouse> sortWarehousesByProximity(List<Warehouse> warehouses, Double lat, Double lng) {
        if (lat != null && lng != null) {
            return warehouses.stream()
                    .sorted(Comparator.comparingDouble((Warehouse w) -> {
                        if (w.getLatitude() != null && w.getLongitude() != null) {
                            return calculateDistance(lat, lng, w.getLatitudeAsDouble(), w.getLongitudeAsDouble());
                        }
                        return Double.MAX_VALUE;
                    }).thenComparing(Warehouse::getId))
                    .toList();
        }
        return warehouses.stream()
                .sorted((w1, w2) -> {
                    if (WarehouseStockLedgerService.MAIN_CODE.equals(w1.getCode())) return -1;
                    if (WarehouseStockLedgerService.MAIN_CODE.equals(w2.getCode())) return 1;
                    return w1.getId().compareTo(w2.getId());
                })
                .toList();
    }

    private Double calculateDistanceToCustomer(Warehouse w, Double lat, Double lng) {
        if (lat != null && lng != null && w.getLatitude() != null && w.getLongitude() != null) {
            return calculateDistance(lat, lng, w.getLatitudeAsDouble(), w.getLongitudeAsDouble());
        }
        return null;
    }

    private double calculateWarehouseToWarehouseDistance(Warehouse w1, Warehouse w2) {
        if (w1.getLatitude() != null && w1.getLongitude() != null && w2.getLatitude() != null && w2.getLongitude() != null) {
            return calculateDistance(w1.getLatitudeAsDouble(), w1.getLongitudeAsDouble(),
                    w2.getLatitudeAsDouble(), w2.getLongitudeAsDouble());
        }
        return 0.0;
    }

    private int getEffectiveAvailable(Warehouse warehouse, Long variantId, Map<Long, Integer> stockMap) {
        int avail = stockMap.getOrDefault(variantId, 0);
        if (avail == 0 && WarehouseStockLedgerService.MAIN_CODE.equals(warehouse.getCode())) {
            if (!warehouseStockRepository.existsByPhoneVariantId(variantId)) {
                PhoneVariant pv = phoneVariantRepository.findById(variantId).orElse(null);
                if (pv != null && pv.getStockQuantity() != null) {
                    avail = pv.getStockQuantity();
                }
            }
        }
        return avail;
    }

    private static class CandidateScore implements Comparable<CandidateScore> {
        final double distanceToCustomer;
        final int sourceCount;
        final int transferQuantity;
        final Long destinationId;

        CandidateScore(double distanceToCustomer, int sourceCount, int transferQuantity, Long destinationId) {
            this.distanceToCustomer = distanceToCustomer;
            this.sourceCount = sourceCount;
            this.transferQuantity = transferQuantity;
            this.destinationId = destinationId;
        }

        @Override
        public int compareTo(CandidateScore other) {
            int cmp = Double.compare(this.distanceToCustomer, other.distanceToCustomer);
            if (cmp != 0) return cmp;
            cmp = Integer.compare(this.sourceCount, other.sourceCount);
            if (cmp != 0) return cmp;
            cmp = Integer.compare(this.transferQuantity, other.transferQuantity);
            if (cmp != 0) return cmp;
            return Long.compare(this.destinationId, other.destinationId);
        }
    }

    private void validateCoordinates(Double lat, Double lng) {
        if (!Double.isFinite(lat) || !Double.isFinite(lng)) {
            throw new BadRequestException("Tọa độ phải là số hữu hạn hợp lệ");
        }
        if (lat < -90.0 || lat > 90.0) {
            throw new BadRequestException("Vĩ độ (latitude) phải nằm trong khoảng [-90, 90]");
        }
        if (lng < -180.0 || lng > 180.0) {
            throw new BadRequestException("Kinh độ (longitude) phải nằm trong khoảng [-180, 180]");
        }
    }
}

