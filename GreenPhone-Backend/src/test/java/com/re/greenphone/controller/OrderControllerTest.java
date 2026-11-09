package com.re.greenphone.controller;

import com.re.greenphone.common.dto.ApiResponse;
import com.re.greenphone.dto.request.OrderItemRequest;
import com.re.greenphone.dto.request.OrderRequest;
import com.re.greenphone.dto.response.OrderCreationResult;
import com.re.greenphone.dto.response.OrderDTO;
import com.re.greenphone.service.OrderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderControllerTest {

    @Mock
    private OrderService orderService;

    @InjectMocks
    private OrderController controller;

    private OrderRequest createOrderRequest() {
        return OrderRequest.builder()
                .receiverName("John Doe")
                .receiverPhone("0987654321")
                .shippingAddress("123 Test St, Hanoi")
                .paymentMethod("COD")
                .items(List.of(OrderItemRequest.builder().phoneVariantId(1L).quantity(1).build()))
                .build();
    }

    @Test
    @DisplayName("BE2-03 Demo Step 1: Request 1 tạo đơn mới với Idempotency-Key trả về HTTP 201 Created mã đơn #88")
    void createOrder_FirstRequest_Returns201Created() {
        OrderRequest request = createOrderRequest();
        OrderDTO orderDTO = OrderDTO.builder().id(88L).totalAmount(new BigDecimal("15000000")).build();
        when(orderService.createOrderWithIdempotency(eq(request), eq("idemp-key-1")))
                .thenReturn(new OrderCreationResult(orderDTO, true));

        ResponseEntity<ApiResponse<?>> response = controller.create(request, "idemp-key-1");

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo(201);
        assertThat(response.getBody().getMessage()).isEqualTo("Created");
        assertThat(response.getBody().getData()).isEqualTo(orderDTO);
        verify(orderService).createOrderWithIdempotency(request, "idemp-key-1");
    }

    @Test
    @DisplayName("BE2-03 Demo Step 2: Request 2 trùng Idempotency-Key trả về HTTP 200 OK cũng mã đơn #88")
    void createOrder_DuplicateRequest_Returns200OK() {
        OrderRequest request = createOrderRequest();
        OrderDTO orderDTO = OrderDTO.builder().id(88L).totalAmount(new BigDecimal("15000000")).build();
        when(orderService.createOrderWithIdempotency(eq(request), eq("idemp-key-1")))
                .thenReturn(new OrderCreationResult(orderDTO, false));

        ResponseEntity<ApiResponse<?>> response = controller.create(request, "idemp-key-1");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo(200);
        assertThat(response.getBody().getMessage()).isEqualTo("Success");
        assertThat(response.getBody().getData()).isEqualTo(orderDTO);
        verify(orderService).createOrderWithIdempotency(request, "idemp-key-1");
    }

    @Test
    @DisplayName("Request không truyền Idempotency-Key trả về HTTP 201 Created bình thường")
    void createOrder_WithoutIdempotencyKey_Returns201Created() {
        OrderRequest request = createOrderRequest();
        OrderDTO orderDTO = OrderDTO.builder().id(89L).build();
        when(orderService.createOrderWithIdempotency(eq(request), isNull()))
                .thenReturn(new OrderCreationResult(orderDTO, true));

        ResponseEntity<ApiResponse<?>> response = controller.create(request, null);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo(201);
        verify(orderService).createOrderWithIdempotency(request, null);
    }
}

