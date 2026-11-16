package com.re.greenphone.service;

import com.re.greenphone.dto.request.DispatchTransferRequest;
import com.re.greenphone.dto.request.ReceiveTransferRequest;
import com.re.greenphone.dto.response.InterWarehouseTransferPlan;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.response.WarehouseTransferDTO;
import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.WarehouseTransfer;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface WarehouseTransferService {

    /**
     * Tạo các phiếu điều chuyển và khóa giữ chỗ tồn kho (reservation) cho đơn hàng phân mảnh.
     */
    List<WarehouseTransfer> createTransfersForOrder(Order order, InterWarehouseTransferPlan plan);

    /**
     * Xác nhận xuất kho điều chuyển từ kho nguồn.
     */
    WarehouseTransferDTO dispatchTransfer(Long transferId, DispatchTransferRequest request);

    /**
     * Xác nhận nhập kho tại kho đích và tự động cập nhật trạng thái đơn hàng khi nhận đủ.
     */
    WarehouseTransferDTO receiveTransfer(Long transferId, ReceiveTransferRequest request);

    /**
     * Hủy phiếu điều chuyển khi hợp lệ.
     */
    WarehouseTransferDTO cancelTransfer(Long transferId, String reason);

    /**
     * Hủy toàn bộ phiếu điều chuyển và hoàn trả reservation khi đơn hàng bị hủy.
     */
    void cancelTransfersForOrder(Long orderId, String reason);

    /**
     * Lấy danh sách phiếu điều chuyển có phân trang và bộ lọc.
     */
    PageResponse<WarehouseTransferDTO> getTransfers(String status, Long sourceWarehouseId, Long destinationWarehouseId, Long orderId, Pageable pageable);

    /**
     * Lấy chi tiết phiếu điều chuyển theo ID.
     */
    WarehouseTransferDTO getTransferById(Long transferId);

    /**
     * Lấy danh sách phiếu điều chuyển theo Order ID.
     */
    List<WarehouseTransferDTO> getTransfersByOrderId(Long orderId);

    /**
     * Khấu trừ dứt điểm tồn kho và giải phóng reservation tại kho đích khi đơn hàng gom được xuất giao khách (FINDING-STOCK-01).
     */
    void deductFulfillmentStockAtDestination(Order order);
}
