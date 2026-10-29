package com.re.greenphone.common.mapper;

import java.util.List;

/**
 * Generic MapStruct mapper interface for Entity <-> DTO conversion.
 * All business mappers should extend this.
 *
 * @param <E> Entity type
 * @param <D> DTO type
 */
public interface GenericMapper<E, D> {

    D toDto(E entity);

    E toEntity(D dto);

    List<D> toDtoList(List<E> entities);

    List<E> toEntityList(List<D> dtos);
}
