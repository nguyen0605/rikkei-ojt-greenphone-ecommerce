package com.re.greenphone.service.admin;

import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.request.CreateStaffRequest;
import com.re.greenphone.dto.request.UpdateStaffRoleRequest;
import com.re.greenphone.dto.response.StaffDTO;

public interface AdminStaffService {

    PageResponse<StaffDTO> getStaffList(String search, String role, PageRequest pageRequest);

    StaffDTO getStaffDetail(Long id);

    StaffDTO createStaff(CreateStaffRequest request);

    StaffDTO updateStaffRole(Long id, UpdateStaffRoleRequest request, String currentUsername);

    StaffDTO updateStaffStatus(Long id, String status, String currentUsername);
}
