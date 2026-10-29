package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Filter category (RAM, STORAGE, COLOR, FEATURE, ...).
 * TYPE is a unique plain string so new categories can be added without redeploy.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "`OPTION`") // OPTION is a MySQL reserved word — must be quoted
public class Option extends BaseEntity {

    /** Category code, e.g. "RAM". Unique. */
    @Column(name = "TYPE", nullable = false, length = 30, unique = true)
    private String type;

    /** Display name, e.g. "Dung lượng bộ nhớ". */
    @Column(name = "LABEL", nullable = false, length = 100)
    private String label;

    @Column(name = "ENABLED", nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    /** Max items shown in the /san-pham filter. */
    @Column(name = "MAX_ITEMS", nullable = false)
    @Builder.Default
    private Integer maxItems = 5;

    @Column(name = "SORT_ORDER", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @OneToMany(mappedBy = "option", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    @Builder.Default
    private List<OptionItem> items = new ArrayList<>();
}
