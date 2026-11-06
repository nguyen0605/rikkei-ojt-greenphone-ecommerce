package com.re.greenphone.enums;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class OrderStatusTest {

    @Test
    @DisplayName("DELIVERED and CANCELLED must be terminal states")
    void testTerminalStates() {
        assertTrue(OrderStatus.DELIVERED.isTerminal());
        assertTrue(OrderStatus.CANCELLED.isTerminal());

        assertFalse(OrderStatus.PENDING.isTerminal());
        assertFalse(OrderStatus.CONFIRMED.isTerminal());
        assertFalse(OrderStatus.PROCESSING.isTerminal());
        assertFalse(OrderStatus.SHIPPING.isTerminal());
    }

    @Test
    @DisplayName("PENDING can only transition to CONFIRMED or CANCELLED")
    void testPendingTransitions() {
        assertEquals(Set.of(OrderStatus.CONFIRMED, OrderStatus.CANCELLED), OrderStatus.PENDING.nextValidStatuses());
        assertTrue(OrderStatus.PENDING.canTransitionTo(OrderStatus.CONFIRMED));
        assertTrue(OrderStatus.PENDING.canTransitionTo(OrderStatus.CANCELLED));

        assertFalse(OrderStatus.PENDING.canTransitionTo(OrderStatus.PROCESSING));
        assertFalse(OrderStatus.PENDING.canTransitionTo(OrderStatus.SHIPPING));
        assertFalse(OrderStatus.PENDING.canTransitionTo(OrderStatus.DELIVERED));
        assertFalse(OrderStatus.PENDING.canTransitionTo(OrderStatus.PENDING));
    }

    @Test
    @DisplayName("CONFIRMED can only transition to PROCESSING or CANCELLED")
    void testConfirmedTransitions() {
        assertEquals(Set.of(OrderStatus.PROCESSING, OrderStatus.CANCELLED), OrderStatus.CONFIRMED.nextValidStatuses());
        assertTrue(OrderStatus.CONFIRMED.canTransitionTo(OrderStatus.PROCESSING));
        assertTrue(OrderStatus.CONFIRMED.canTransitionTo(OrderStatus.CANCELLED));

        assertFalse(OrderStatus.CONFIRMED.canTransitionTo(OrderStatus.PENDING));
        assertFalse(OrderStatus.CONFIRMED.canTransitionTo(OrderStatus.SHIPPING));
        assertFalse(OrderStatus.CONFIRMED.canTransitionTo(OrderStatus.DELIVERED));
        assertFalse(OrderStatus.CONFIRMED.canTransitionTo(OrderStatus.CONFIRMED));
    }

    @Test
    @DisplayName("PROCESSING can only transition to SHIPPING or CANCELLED")
    void testProcessingTransitions() {
        assertEquals(Set.of(OrderStatus.SHIPPING, OrderStatus.CANCELLED), OrderStatus.PROCESSING.nextValidStatuses());
        assertTrue(OrderStatus.PROCESSING.canTransitionTo(OrderStatus.SHIPPING));
        assertTrue(OrderStatus.PROCESSING.canTransitionTo(OrderStatus.CANCELLED));

        assertFalse(OrderStatus.PROCESSING.canTransitionTo(OrderStatus.PENDING));
        assertFalse(OrderStatus.PROCESSING.canTransitionTo(OrderStatus.CONFIRMED));
        assertFalse(OrderStatus.PROCESSING.canTransitionTo(OrderStatus.DELIVERED));
        assertFalse(OrderStatus.PROCESSING.canTransitionTo(OrderStatus.PROCESSING));
    }

    @Test
    @DisplayName("SHIPPING can only transition to DELIVERED or CANCELLED")
    void testShippingTransitions() {
        assertEquals(Set.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED), OrderStatus.SHIPPING.nextValidStatuses());
        assertTrue(OrderStatus.SHIPPING.canTransitionTo(OrderStatus.DELIVERED));
        assertTrue(OrderStatus.SHIPPING.canTransitionTo(OrderStatus.CANCELLED));

        assertFalse(OrderStatus.SHIPPING.canTransitionTo(OrderStatus.PENDING));
        assertFalse(OrderStatus.SHIPPING.canTransitionTo(OrderStatus.CONFIRMED));
        assertFalse(OrderStatus.SHIPPING.canTransitionTo(OrderStatus.PROCESSING));
        assertFalse(OrderStatus.SHIPPING.canTransitionTo(OrderStatus.SHIPPING));
    }

    @ParameterizedTest
    @EnumSource(OrderStatus.class)
    @DisplayName("DELIVERED cannot transition to any status (terminal locked)")
    void testDeliveredTerminalTransition(OrderStatus target) {
        assertTrue(OrderStatus.DELIVERED.nextValidStatuses().isEmpty());
        assertFalse(OrderStatus.DELIVERED.canTransitionTo(target));
    }

    @ParameterizedTest
    @EnumSource(OrderStatus.class)
    @DisplayName("CANCELLED cannot transition to any status (terminal locked)")
    void testCancelledTerminalTransition(OrderStatus target) {
        assertTrue(OrderStatus.CANCELLED.nextValidStatuses().isEmpty());
        assertFalse(OrderStatus.CANCELLED.canTransitionTo(target));
    }

    @Test
    @DisplayName("canTransitionTo should return false when target is null")
    void testNullTarget() {
        assertFalse(OrderStatus.PENDING.canTransitionTo(null));
        assertFalse(OrderStatus.DELIVERED.canTransitionTo(null));
    }
}

