package com.re.greenphone.service;

import com.re.greenphone.entity.Settings;
import com.re.greenphone.repository.SettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Key-value store for shop settings (shipping fee, free-shipping threshold, ...).
 * Read side is public; write side is admin-only via AdminSettingsController.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SettingsService {

    public static final String KEY_SHIPPING_FEE = "SHIPPING_FEE";
    public static final String KEY_FREE_SHIPPING_THRESHOLD = "FREE_SHIPPING_THRESHOLD";
    public static final String KEY_TERMS_CONDITIONS = "TERMS_CONDITIONS";
    public static final String KEY_PRIVACY_POLICY = "PRIVACY_POLICY";

    private final SettingsRepository settingsRepository;

    @Transactional(readOnly = true)
    public Map<String, String> getPublicSettings() {
        return settingsRepository.findAll().stream()
                .collect(Collectors.toMap(Settings::getSettingKey, Settings::getSettingValue));
    }

    @Transactional(readOnly = true)
    public BigDecimal getShippingFee() {
        return getDecimal(KEY_SHIPPING_FEE, new BigDecimal("29000"));
    }

    @Transactional(readOnly = true)
    public BigDecimal getFreeShippingThreshold() {
        return getDecimal(KEY_FREE_SHIPPING_THRESHOLD, new BigDecimal("5000000"));
    }

    /** Admin: bulk upsert settings. */
    public Map<String, String> updateSettings(Map<String, String> values) {
        if (values == null || values.isEmpty()) {
            return getPublicSettings();
        }
        for (Map.Entry<String, String> entry : values.entrySet()) {
            if (entry.getKey() == null || entry.getKey().isBlank()) continue;
            Settings setting = settingsRepository.findBySettingKey(entry.getKey())
                    .orElseGet(() -> Settings.builder().settingKey(entry.getKey()).build());
            setting.setSettingValue(entry.getValue());
            settingsRepository.save(setting);
        }
        return getPublicSettings();
    }

    private BigDecimal getDecimal(String key, BigDecimal fallback) {
        return settingsRepository.findBySettingKey(key)
                .map(Settings::decimalValue)
                .filter(v -> v.compareTo(BigDecimal.ZERO) >= 0)
                .orElse(fallback);
    }

    public List<Settings> findAll() {
        return settingsRepository.findAll();
    }
}
