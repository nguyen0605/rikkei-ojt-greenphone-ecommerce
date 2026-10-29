package com.re.greenphone.service;

import com.re.greenphone.common.exception.BadRequestException;
import jakarta.annotation.PostConstruct;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
        this.fromEmail = getEnv("MAIL_USERNAME", "noreply@greenphone.vn");
    }

    @Async
    public void sendOTP(String toEmail, String otp) {
        String subject = "Mã xác thực OTP - GreenPhone";
        String body = buildOTPEmail(otp);
        send(toEmail, subject, body);
    }

    @Async
    public void sendOrderConfirmation(String toEmail, String orderId) {
        String subject = "Xác nhận đơn hàng #" + orderId + " - GreenPhone";
        String body = buildOrderEmail(orderId);
        send(toEmail, subject, body);
    }

    @Async
    public void sendWelcome(String toEmail, String fullName) {
        String subject = "Chào mừng đến với GreenPhone!";
        String body = buildWelcomeEmail(fullName);
        send(toEmail, subject, body);
    }

    @Async
    public void sendOrderDelivered(String toEmail, String orderId, String receiverName, java.util.List<String> productNames) {
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
            log.info("Email sent to {}: {}", to, subject);
        } catch (MessagingException e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    private String getEnv(String key, String defaultValue) {
        String value = System.getProperty(key);
        if (value == null) {
            value = System.getenv(key);
        }
        return value != null ? value : defaultValue;
    }

    private String buildOTPEmail(String otp) {
        return """
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #16a34a;">GreenPhone</h2>
                <p>Mã xác thực của bạn là:</p>
                <div style="background: #f0fdf4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #16a34a; letter-spacing: 8px;">%s</span>
                </div>
                <p style="color: #6b7280; font-size: 14px;">Mã có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai.</p>
            </div>
            """.formatted(otp);
    }

    private String buildOrderEmail(String orderId) {
        return """
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #16a34a;">GreenPhone</h2>
                <p>Cảm ơn bạn đã đặt hàng!</p>
                <p>Đơn hàng <strong>#%s</strong> của bạn đã được xác nhận.</p>
                <p>Chúng tôi sẽ sớm liên hệ để giao hàng.</p>
                <p style="color: #6b7280; font-size: 14px;">Theo dõi trạng thái đơn hàng tại website GreenPhone.</p>
            </div>
            """.formatted(orderId);
    }

    private String buildWelcomeEmail(String fullName) {
        return """
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #16a34a;">Chào mừng đến với GreenPhone!</h2>
                <p>Xin chào <strong>%s</strong>,</p>
                <p>Cảm ơn bạn đã đăng ký tài khoản tại GreenPhone.</p>
                <p>Khám phá hàng trăm mẫu điện thoại chính hãng với giá tốt nhất!</p>
                <a href="#" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Khám phá ngay</a>
            </div>
            """.formatted(fullName);
    }

    private String buildOrderDeliveredEmail(String orderId, String receiverName, java.util.List<String> productNames) {
        String frontendUrl = getEnv("FRONTEND_URL", "http://localhost:3000");
        String reviewUrl = frontendUrl + "/tai-khoan/danh-gia";
        String productList = productNames.stream()
                .map(name -> "<li style=\"margin: 6px 0; color: #374151;\">• " + name + "</li>")
                .collect(java.util.stream.Collectors.joining("\n"));
        return """
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #16a34a;">GreenPhone</h2>
                <p>Xin chào <strong>%s</strong>,</p>
                <p>Đơn hàng <strong>#%s</strong> của bạn đã được <strong>giao thành công</strong>! 🎉</p>
                <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 0 0 8px; font-weight: bold; color: #374151;">Sản phẩm trong đơn:</p>
                    <ul style="margin: 0; padding-left: 0; list-style: none;">
                        %s
                    </ul>
                </div>
                <p>Cảm ơn bạn đã tin tưởng mua sắm tại GreenPhone!</p>
                <p>Chia sẻ cảm nhận của bạn về sản phẩm để giúp chúng tôi phục vụ tốt hơn:</p>
                <a href="%s" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 12px; font-weight: bold;">Đánh giá sản phẩm</a>
                <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">GreenPhone - Điện đến vị tin.</p>
            </div>
            """.formatted(receiverName, orderId, productList, reviewUrl);
    }
}
