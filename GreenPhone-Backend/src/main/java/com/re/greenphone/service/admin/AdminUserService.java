package com.re.greenphone.service.admin;

import com.re.greenphone.common.exception.ResourceNotFoundException;
import com.re.greenphone.common.pagination.PageRequest;
import com.re.greenphone.common.pagination.PageResponse;
import com.re.greenphone.dto.response.UserDTO;
import com.re.greenphone.entity.User;
import com.re.greenphone.mapper.UserMapper;
import com.re.greenphone.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AdminUserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    public PageResponse<UserDTO> getUsers(String search, PageRequest pageRequest) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(
                pageRequest.getPage(), pageRequest.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<User> page;
        if (search != null && !search.isBlank()) {
            page = userRepository.searchByEmailOrName(search, pageable);
        } else {
            page = userRepository.findAll(pageable);
        }

        List<UserDTO> dtos = userMapper.toDtoList(page.getContent());
        return new PageResponse<>(dtos, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    public UserDTO getUserDetail(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return userMapper.toDto(user);
    }

    public UserDTO updateUserStatus(Long id, String status) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        user.setStatus(status);
        user = userRepository.save(user);
        return userMapper.toDto(user);
    }
}
