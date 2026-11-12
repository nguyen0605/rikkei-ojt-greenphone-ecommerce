package com.re.greenphone.service;

import com.re.greenphone.dto.request.OrderItemRequirement;
import com.re.greenphone.dto.response.NearestWarehouseResponse;
import com.re.greenphone.entity.Warehouse;

import java.util.List;

public interface WarehouseRoutingService {

    /**
     * Calculates the distance between two coordinates using the Haversine formula.
     *
     * @param lat1 Latitude of point 1 in degrees [-90, 90]
     * @param lng1 Longitude of point 1 in degrees [-180, 180]
     * @param lat2 Latitude of point 2 in degrees [-90, 90]
     * @param lng2 Longitude of point 2 in degrees [-180, 180]
     * @return Distance in kilometers rounded to 2 decimal places
     */
    double calculateDistance(Double lat1, Double lng1, Double lat2, Double lng2);

    /**
     * Finds the nearest active warehouse for public lookup.
     *
     * @param lat Delivery latitude (nullable)
     * @param lng Delivery longitude (nullable)
     * @return NearestWarehouseResponse
     */
    NearestWarehouseResponse findNearestWarehouse(Double lat, Double lng);

    /**
     * Selects the nearest active warehouse that has sufficient stock for all requested items.
     * Cascades to next nearest if nearest lacks inventory.
     * Fallbacks to WH-HN-MAIN if coordinates are null.
     *
     * @param lat Delivery latitude (nullable)
     * @param lng Delivery longitude (nullable)
     * @param items List of requested variant items and their quantities
     * @return Selected Warehouse entity
     */
    Warehouse routeWarehouseForOrder(Double lat, Double lng, List<OrderItemRequirement> items);

    /**
     * Lập kế hoạch gom đơn và điều chuyển hàng liên kho (INV-08 Phương án B).
     *
     * @param lat Vĩ độ giao hàng (nullable)
     * @param lng Kinh độ giao hàng (nullable)
     * @param items Danh sách sản phẩm và số lượng yêu cầu
     * @return Kế hoạch điều chuyển chi tiết (InterWarehouseTransferPlan)
     */
    com.re.greenphone.dto.response.InterWarehouseTransferPlan routeInterWarehouseFulfillment(Double lat, Double lng, List<OrderItemRequirement> items);
}

