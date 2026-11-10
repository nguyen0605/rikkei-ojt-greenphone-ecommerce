package com.re.greenphone.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class OrderCreationResult {
    private final OrderDTO order;
    private final boolean newlyCreated;
}

