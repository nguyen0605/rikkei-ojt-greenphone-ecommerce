package com.re.greenphone.mapper;

import com.re.greenphone.common.mapper.GenericMapper;
import com.re.greenphone.dto.response.OptionDTO;
import com.re.greenphone.entity.Option;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface OptionMapper extends GenericMapper<Option, OptionDTO> {
}
