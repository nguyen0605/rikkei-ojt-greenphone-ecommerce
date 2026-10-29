package com.re.greenphone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
@EnableJpaAuditing
public class GreenPhoneApplication {

    public static void main(String[] args) {
        // Load .env before Spring starts
        io.github.cdimascio.dotenv.Dotenv dotenv = io.github.cdimascio.dotenv.Dotenv
                .configure().ignoreIfMissing().load();
        dotenv.entries().forEach(entry -> {
            String key = entry.getKey();
            if (System.getProperty(key) == null && System.getenv(key) == null) {
                System.setProperty(key, entry.getValue());
            }
        });

        SpringApplication.run(GreenPhoneApplication.class, args);
    }

}
