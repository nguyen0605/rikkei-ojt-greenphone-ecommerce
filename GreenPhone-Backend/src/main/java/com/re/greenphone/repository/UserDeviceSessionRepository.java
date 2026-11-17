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

    // Tìm trạng thái thu hồi của phiên theo sessionId (dùng cho bộ lọc xác thực)
    @Query("SELECT s.isRevoked FROM UserDeviceSession s WHERE s.id = :sessionId")
    Optional<Boolean> findIsRevokedById(@Param("sessionId") Long sessionId);

    // Lấy danh sách các phiên thiết bị đang hoạt động của người dùng
    @Query("SELECT s FROM UserDeviceSession s WHERE s.user.id = :userId AND s.isRevoked = false AND (s.expiresAt IS NULL OR s.expiresAt > :now) ORDER BY s.lastActiveAt DESC")
    List<UserDeviceSession> findActiveSessionsByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    // Xoay vòng Refresh Token một cách nguyên tử (Atomic Token Rotation)
    @Modifying
    @Query("UPDATE UserDeviceSession s SET s.refreshTokenHash = :newHash, s.lastActiveAt = :now, s.expiresAt = :expiresAt " +
           "WHERE s.id = :sessionId AND s.refreshTokenHash = :oldHash AND s.isRevoked = false AND (s.expiresAt IS NULL OR s.expiresAt > :now)")
    int rotateSessionTokenAtomically(@Param("sessionId") Long sessionId,
                                    @Param("oldHash") String oldHash,
                                    @Param("newHash") String newHash,
                                    @Param("now") LocalDateTime now,
                                    @Param("expiresAt") LocalDateTime expiresAt);

    // Thu hồi (đăng xuất) một phiên thiết bị theo ID
    @Modifying
    @Query("UPDATE UserDeviceSession s SET s.isRevoked = true WHERE s.id = :sessionId AND s.user.id = :userId AND s.isRevoked = false")
    int revokeSessionByIdAndUserId(@Param("sessionId") Long sessionId, @Param("userId") Long userId);

    // Thu hồi (đăng xuất) tất cả các phiên thiết bị khác ngoại trừ phiên hiện tại
    @Modifying
    @Query("UPDATE UserDeviceSession s SET s.isRevoked = true WHERE s.user.id = :userId AND s.id <> :currentSessionId AND s.isRevoked = false")
    int revokeAllOtherSessionsById(@Param("userId") Long userId, @Param("currentSessionId") Long currentSessionId);

    // Thu hồi toàn bộ phiên của người dùng (khi đổi mật khẩu hoặc khóa tài khoản)
    @Modifying
    @Query("UPDATE UserDeviceSession s SET s.isRevoked = true WHERE s.user.id = :userId AND s.isRevoked = false")
    int revokeAllSessionsByUserId(@Param("userId") Long userId);
}
