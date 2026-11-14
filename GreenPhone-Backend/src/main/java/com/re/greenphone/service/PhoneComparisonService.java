package com.re.greenphone.service;

import com.re.greenphone.dto.response.PhoneComparisonResponse;

import java.util.List;

public interface PhoneComparisonService {
    /**
     * So sánh danh sách điện thoại theo danh sách ID sản phẩm (từ 2 đến 4 điện thoại).
     *
     * @param phoneIds danh sách ID điện thoại cần so sánh
     * @return PhoneComparisonResponse chi tiết các dòng máy, bảng thông số phân nhóm và danh sách điểm khác biệt
     */
    PhoneComparisonResponse comparePhones(List<Long> phoneIds);
}
