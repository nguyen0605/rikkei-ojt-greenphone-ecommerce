package com.re.greenphone.service.impl;

import com.re.greenphone.common.exception.BadRequestException;
import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.dto.request.OrderItemRequirement;
import com.re.greenphone.dto.response.InterWarehouseTransferPlan;
import com.re.greenphone.dto.response.NearestWarehouseResponse;
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

