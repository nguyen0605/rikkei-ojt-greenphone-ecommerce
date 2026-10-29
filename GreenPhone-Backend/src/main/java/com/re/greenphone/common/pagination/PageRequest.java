package com.re.greenphone.common.pagination;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PageRequest {

    private int page = 0;
    private int size = 10;
    private String sortBy = "id";
    private String sortDir = "desc";
}
