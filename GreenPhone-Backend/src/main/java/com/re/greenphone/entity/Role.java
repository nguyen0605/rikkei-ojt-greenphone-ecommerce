package com.re.greenphone.entity;

import com.re.greenphone.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "ROLE")
public class Role extends BaseEntity {

    @Column(name = "NAME", nullable = false, unique = true, length = 50)
    private String name;

    @Column(name = "DESCRIPTION", length = 255)
    private String description;

    @OneToMany(mappedBy = "role")
    @Builder.Default
    private List<User> users = new ArrayList<>();
}
