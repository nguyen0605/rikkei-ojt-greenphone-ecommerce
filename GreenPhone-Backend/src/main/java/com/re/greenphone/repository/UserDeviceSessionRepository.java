package com.re.greenphone.repository;

import com.re.greenphone.entity.UserDeviceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserDeviceSessionRepository extends JpaRepository<UserDeviceSession, Long> {

    Optional<UserDeviceSession> findByRefreshTokenHash(String refreshTokenHash);

    @Query("SELECT s FROM UserDeviceSession s WHERE s.user.id = :userId AND s.isRevoked = false AND (s.expiresAt IS NULL OR s.expiresAt > :now) ORDER BY s.lastActiveAt DESC")
    List<UserDeviceSession> findActiveSessionsByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE UserDeviceSession s SET s.refreshTokenHash = :newHash, s.lastActiveAt = :now, s.expiresAt = :expiresAt " +
           "WHERE s.id = :sessionId AND s.refreshTokenHash = :oldHash AND s.isRevoked = false AND (s.expiresAt IS NULL OR s.expiresAt > :now)")
    int rotateSessionTokenAtomically(@Param("sessionId") Long sessionId,
                                    @Param("oldHash") String oldHash,
                                    @Param("newHash") String newHash,
                                    @Param("now") LocalDateTime now,
                                    @Param("expiresAt") LocalDateTime expiresAt);

    @Modifying
    @Query("UPDATE UserDeviceSession s SET s.isRevoked = true WHERE s.id = :sessionId AND s.user.id = :userId AND s.isRevoked = false")
    int revokeSessionByIdAndUserId(@Param("sessionId") Long sessionId, @Param("userId") Long userId);

    @Modifying
    @Query("UPDATE UserDeviceSession s SET s.isRevoked = true WHERE s.user.id = :userId AND s.id <> :currentSessionId AND s.isRevoked = false")
    int revokeAllOtherSessionsById(@Param("userId") Long userId, @Param("currentSessionId") Long currentSessionId);

    @Modifying
    @Query("UPDATE UserDeviceSession s SET s.isRevoked = true WHERE s.user.id = :userId AND s.isRevoked = false")
    int revokeAllSessionsByUserId(@Param("userId") Long userId);
}
