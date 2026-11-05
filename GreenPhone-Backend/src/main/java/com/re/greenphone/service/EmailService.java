package com.re.greenphone.service;

import com.re.greenphone.entity.Order;
import com.re.greenphone.entity.OrderDetail;
import com.re.greenphone.repository.OrderRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final OrderRepository orderRepository;
    private final String fromEmail;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public EmailService(JavaMailSender mailSender, @Lazy OrderRepository orderRepository) {
        this.mailSender = mailSender;
        this.orderRepository = orderRepository;
        this.fromEmail = getEnv("MAIL_USERNAME", "noreply@greenphone.vn");
    }

    @Async("mailTaskExecutor")
    public void sendOTP(String toEmail, String otp) {
        String subject = "Mã xác thực OTP - GreenPhone";
        String body = buildOTPEmail(otp);
        send(toEmail, subject, body);
    }

    @Async("mailTaskExecutor")
    public void sendOrderConfirmation(String toEmail, String orderId) {
        String subject = "Hóa đơn xác nhận đơn hàng #" + orderId + " - GreenPhone";
        String body = null;
        try {
            Long id = Long.parseLong(orderId);
            Order order = orderRepository.findByIdWithDetails(id).orElse(null);
            if (order != null) {
                body = buildInvoiceEmail(order);
            }
        } catch (Exception e) {
            log.debug("Could not load full order details for id {}: {}", orderId, e.getMessage());
        }

        if (body == null) {
            body = buildSimpleOrderEmail(orderId);
        }

        send(toEmail, subject, body);
    }

    @Async("mailTaskExecutor")
    public void sendWelcome(String toEmail, String fullName) {
        String subject = "Chào mừng đến với GreenPhone!";
        String body = buildWelcomeEmail(fullName);
        send(toEmail, subject, body);
    }

    @Async("mailTaskExecutor")
    public void sendOrderDelivered(String toEmail, String orderId, String receiverName, List<String> productNames) {
        String subject = "Đơn hàng #" + orderId + " đã giao thành công - GreenPhone";
        String body = buildOrderDeliveredEmail(orderId, receiverName, productNames);
        send(toEmail, subject, body);
    }

    private void send(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("[Async Mail] Email sent successfully to {}: {}", to, subject);
        } catch (Exception e) {
            log.error("[Async Mail] Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    private String getEnv(String key, String defaultValue) {
        String value = System.getProperty(key);
        if (value == null) {
            value = System.getenv(key);
        }
        return value != null ? value : defaultValue;
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "0 ₫";
        NumberFormat formatter = NumberFormat.getInstance(new Locale("vi", "VN"));
        return formatter.format(amount) + " ₫";
    }

    // =========================================================================
    // HTML TEMPLATES
    // =========================================================================

    private String buildOTPEmail(String otp) {
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 24px 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
                <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #16a34a 0%%, #15803d 100%%); padding: 28px 24px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">GreenPhone</h1>
                        <p style="margin: 6px 0 0 0; color: #dcfce7; font-size: 13px;">Điện thoại chính hãng - Giá tốt mỗi ngày</p>
                    </div>

                    <!-- Content -->
                    <div style="padding: 32px 28px;">
                        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #111827; font-weight: 700; text-align: center;">Xác thực mã OTP</h2>
                        <p style="margin: 0 0 24px 0; font-size: 14px; color: #4b5563; line-height: 1.6; text-align: center;">
                            Bạn vừa yêu cầu mã xác thực để đăng ký hoặc đặt lại mật khẩu cho tài khoản GreenPhone. Dưới đây là mã xác thực OTP của bạn:
                        </p>

                        <!-- OTP Box -->
                        <div style="background: #f0fdf4; border: 2px dashed #86efac; border-radius: 10px; padding: 18px 24px; text-align: center; margin: 0 auto 24px auto;">
                            <span style="display: inline-block; font-size: 36px; font-weight: 800; color: #15803d; letter-spacing: 10px; font-family: 'Courier New', Courier, monospace;">%s</span>
                        </div>

                        <!-- Notice -->
                        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px;">
                            <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                                ⏱️ Mã có hiệu lực trong <strong>5 phút</strong>.<br>
                                🔒 <strong>Bảo mật:</strong> Tuyệt đối không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên GreenPhone.
                            </p>
                        </div>

                        <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5; text-align: center;">
                            Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ với bộ phận hỗ trợ của chúng tôi.
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
                        <p style="margin: 0 0 4px 0;">GreenPhone Store • Hotline: <strong>1900 1234</strong> • Email: support@greenphone.vn</p>
                        <p style="margin: 0;">© %d GreenPhone. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(otp, java.time.Year.now().getValue());
    }

    private String buildInvoiceEmail(Order order) {
        String frontendUrl = getEnv("FRONTEND_URL", "http://localhost:5173");
        String orderTrackingUrl = frontendUrl + "/tai-khoan/don-hang";
        String orderDate = order.getCreatedAt() != null ? order.getCreatedAt().format(DATE_FORMATTER) : "Vừa xong";

        String paymentMethodText = "COD".equalsIgnoreCase(order.getPaymentMethod())
                ? "Thanh toán khi nhận hàng (COD)"
                : "Chuyển khoản ngân hàng (VietQR)";

        String paymentStatusBadge = "PAID".equalsIgnoreCase(order.getPaymentStatus())
                ? "<span style=\"background: #dcfce7; color: #15803d; padding: 3px 10px; border-radius: 9999px; font-weight: 600; font-size: 12px;\">Đã thanh toán</span>"
                : "<span style=\"background: #fef3c7; color: #b45309; padding: 3px 10px; border-radius: 9999px; font-weight: 600; font-size: 12px;\">Chờ thanh toán khi nhận hàng</span>";

        StringBuilder itemRows = new StringBuilder();
        if (order.getOrderDetails() != null) {
            for (OrderDetail detail : order.getOrderDetails()) {
                String specs = String.format("%s • %s • %s",
                        detail.getRam() != null ? detail.getRam() : "",
                        detail.getStorage() != null ? detail.getStorage() : "",
                        detail.getColor() != null ? detail.getColor() : "").replaceAll("^\\s*•\\s*|\\s*•\\s*$", "");

                itemRows.append("""
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 12px 10px; vertical-align: top;">
                            <div style="font-weight: 600; color: #111827; font-size: 14px;">%s</div>
                            <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">%s</div>
                        </td>
                        <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-size: 14px; color: #374151;">%d</td>
                        <td style="padding: 12px 10px; text-align: right; vertical-align: top; font-size: 14px; color: #374151;">%s</td>
                        <td style="padding: 12px 10px; text-align: right; vertical-align: top; font-weight: 600; font-size: 14px; color: #111827;">%s</td>
                    </tr>
                    """.formatted(
                        detail.getProductName(),
                        specs,
                        detail.getQuantity(),
                        formatCurrency(detail.getUnitPrice()),
                        formatCurrency(detail.getSubtotal())
                ));
            }
        }

        String discountRow = "";
        if (order.getDiscountAmount() != null && order.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
            discountRow = """
                <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Giảm giá Voucher:</td>
                    <td style="padding: 6px 0; text-align: right; color: #dc2626; font-size: 13px; font-weight: 600;">-%s</td>
                </tr>
                """.formatted(formatCurrency(order.getDiscountAmount()));
        }

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 24px 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
                <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #16a34a 0%%, #15803d 100%%); padding: 26px 24px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800;">GreenPhone</h1>
                        <p style="margin: 4px 0 0 0; color: #dcfce7; font-size: 13px;">HÓA ĐƠN XÁC NHẬN ĐƠN HÀNG #%d</p>
                    </div>

                    <!-- Customer & Order Meta -->
                    <div style="padding: 24px 28px; border-bottom: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 16px 0; font-size: 15px; color: #111827;">
                            Xin chào <strong>%s</strong>, cảm ơn bạn đã đặt hàng tại GreenPhone! Đơn hàng của bạn đã được tiếp nhận thành công.
                        </p>

                        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; border: 1px solid #f3f4f6;">
                            <table style="width: 100%%; font-size: 13px; line-height: 1.6; border-collapse: collapse;">
                                <tr>
                                    <td style="color: #6b7280; width: 140px; padding: 4px 0;">Mã đơn hàng:</td>
                                    <td style="color: #111827; font-weight: 600; padding: 4px 0;">#%d</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; padding: 4px 0;">Ngày đặt hàng:</td>
                                    <td style="color: #111827; padding: 4px 0;">%s</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; padding: 4px 0;">Người nhận:</td>
                                    <td style="color: #111827; font-weight: 600; padding: 4px 0;">%s • %s</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; padding: 4px 0; vertical-align: top;">Địa chỉ giao:</td>
                                    <td style="color: #111827; padding: 4px 0;">%s</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; padding: 4px 0;">Hình thức:</td>
                                    <td style="color: #111827; padding: 4px 0;">%s</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; padding: 4px 0;">Thanh toán:</td>
                                    <td style="padding: 4px 0;">%s</td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <!-- Products Table -->
                    <div style="padding: 24px 28px;">
                        <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #111827;">Chi tiết sản phẩm</h3>
                        <table style="width: 100%%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #475569; text-transform: uppercase;">
                                    <th style="padding: 10px 10px; text-align: left;">Sản phẩm</th>
                                    <th style="padding: 10px 10px; text-align: center; width: 40px;">SL</th>
                                    <th style="padding: 10px 10px; text-align: right; width: 110px;">Đơn giá</th>
                                    <th style="padding: 10px 10px; text-align: right; width: 120px;">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                %s
                            </tbody>
                        </table>

                        <!-- Calculation Summary -->
                        <div style="margin-top: 16px; margin-left: auto; max-width: 280px;">
                            <table style="width: 100%%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Tạm tính:</td>
                                    <td style="padding: 6px 0; text-align: right; color: #111827; font-size: 13px; font-weight: 500;">%s</td>
                                </tr>
                                %s
                                <tr>
                                    <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Phí vận chuyển:</td>
                                    <td style="padding: 6px 0; text-align: right; color: #16a34a; font-size: 13px; font-weight: 500;">Miễn phí</td>
                                </tr>
                                <tr style="border-top: 2px solid #e5e7eb;">
                                    <td style="padding: 10px 0; color: #111827; font-size: 15px; font-weight: 700;">Tổng thanh toán:</td>
                                    <td style="padding: 10px 0; text-align: right; color: #16a34a; font-size: 18px; font-weight: 800;">%s</td>
                                </tr>
                            </table>
                        </div>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin-top: 28px;">
                            <a href="%s" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px;">Theo dõi đơn hàng</a>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background: #f9fafb; padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
                        <p style="margin: 0 0 4px 0;">Mọi thắc mắc xin vui lòng liên hệ Hotline: <strong>1900 1234</strong> (8:00 - 21:00 hàng ngày).</p>
                        <p style="margin: 0;">GreenPhone • Điện thoại chính hãng - Giá tốt mỗi ngày</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                order.getId(),
                order.getReceiverName() != null ? order.getReceiverName() : "Quý khách",
                order.getId(),
                orderDate,
                order.getReceiverName() != null ? order.getReceiverName() : "",
                order.getReceiverPhone() != null ? order.getReceiverPhone() : "",
                order.getShippingAddress() != null ? order.getShippingAddress() : "",
                paymentMethodText,
                paymentStatusBadge,
                itemRows.toString(),
                formatCurrency(order.getTotalAmount()),
                discountRow,
                formatCurrency(order.getFinalAmount()),
                orderTrackingUrl
        );
    }

    private String buildSimpleOrderEmail(String orderId) {
        String frontendUrl = getEnv("FRONTEND_URL", "http://localhost:5173");
        String orderTrackingUrl = frontendUrl + "/tai-khoan/don-hang";
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 24px 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
                <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
                    <div style="background: linear-gradient(135deg, #16a34a 0%%, #15803d 100%%); padding: 24px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">GreenPhone</h1>
                        <p style="margin: 4px 0 0 0; color: #dcfce7; font-size: 13px;">Xác nhận đơn hàng</p>
                    </div>
                    <div style="padding: 28px 24px; text-align: center;">
                        <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #111827;">Cảm ơn bạn đã đặt hàng!</h2>
                        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                            Đơn hàng <strong>#%s</strong> của bạn đã được ghi nhận trên hệ thống và đang được xử lý.
                        </p>
                        <a href="%s" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 8px;">Kiểm tra đơn hàng</a>
                    </div>
                    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
                        GreenPhone • Hotline: 1900 1234 • support@greenphone.vn
                    </div>
                </div>
            </body>
            </html>
            """.formatted(orderId, orderTrackingUrl);
    }

    private String buildWelcomeEmail(String fullName) {
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="UTF-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 24px 0;">
                <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; padding: 24px;">
                    <h2 style="color: #16a34a; margin-top: 0;">Chào mừng đến với GreenPhone!</h2>
                    <p style="font-size: 14px; color: #374151;">Xin chào <strong>%s</strong>,</p>
                    <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">Cảm ơn bạn đã đăng ký tài khoản tại GreenPhone. Khám phá hàng trăm mẫu smartphone chính hãng với mức giá tốt nhất ngay hôm nay!</p>
                    <div style="text-align: center; margin-top: 24px;">
                        <a href="http://localhost:5173" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Khám phá ngay</a>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(fullName);
    }

    private String buildOrderDeliveredEmail(String orderId, String receiverName, List<String> productNames) {
        String frontendUrl = getEnv("FRONTEND_URL", "http://localhost:5173");
        String reviewUrl = frontendUrl + "/tai-khoan/danh-gia";
        String productList = productNames.stream()
                .map(name -> "<li style=\"margin: 6px 0; color: #374151;\">• " + name + "</li>")
                .collect(java.util.stream.Collectors.joining("\n"));
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="UTF-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 24px 0;">
                <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; padding: 24px;">
                    <h2 style="color: #16a34a; margin-top: 0;">GreenPhone</h2>
                    <p style="font-size: 14px; color: #374151;">Xin chào <strong>%s</strong>,</p>
                    <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">Đơn hàng <strong>#%s</strong> của bạn đã được <strong>giao thành công</strong>! 🎉</p>
                    <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #bbf7d0;">
                        <p style="margin: 0 0 8px; font-weight: bold; color: #166534; font-size: 13px;">Sản phẩm trong đơn:</p>
                        <ul style="margin: 0; padding-left: 0; list-style: none; font-size: 13px;">
                            %s
                        </ul>
                    </div>
                    <p style="font-size: 14px; color: #4b5563;">Cảm ơn bạn đã tin tưởng mua sắm tại GreenPhone! Hãy chia sẻ cảm nhận để giúp chúng tôi phục vụ bạn tốt hơn:</p>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="%s" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">Đánh giá sản phẩm</a>
                    </div>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">GreenPhone - Điện thoại chính hãng - Giá tốt mỗi ngày</p>
                </div>
            </body>
            </html>
            """.formatted(receiverName, orderId, productList, reviewUrl);
    }
}
