package com.re.greenphone.enums;

/**
 * Known option catalog types. Plain string constants (not a Java enum on the
 * entity) so new types can be added at runtime without redeploying.
 */
public final class OptionType {
    public static final String RAM = "RAM";
    public static final String STORAGE = "STORAGE";
    public static final String COLOR = "COLOR";
    public static final String FEATURE = "FEATURE";

    private OptionType() {}
}
