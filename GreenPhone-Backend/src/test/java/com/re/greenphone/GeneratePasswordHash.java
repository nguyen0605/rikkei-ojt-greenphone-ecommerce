package com.re.greenphone;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Utility to generate BCrypt password hashes for seed data.
 * Run: ./gradlew test --tests "com.re.greenphone.GeneratePasswordHash"
 * Or run main() directly from IDE.
 */
public class GeneratePasswordHash {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String[] passwords = {"password123", "admin123"};
        for (String pw : passwords) {
            String hash = encoder.encode(pw);
            System.out.println(pw + " → " + hash);
        }
    }
}
