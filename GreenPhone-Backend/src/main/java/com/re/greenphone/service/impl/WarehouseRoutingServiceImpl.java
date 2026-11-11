package com.re.greenphone.service.impl;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.OrderItemRequirement;
import com.re.greenphone.dto.response.NearestWarehouseResponse;
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

