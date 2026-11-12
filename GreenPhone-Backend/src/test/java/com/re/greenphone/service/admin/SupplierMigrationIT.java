package com.re.greenphone.service.admin;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;
import java.nio.file.*;
import java.sql.DriverManager;
import static org.assertj.core.api.Assertions.*;

/** Isolates the additive V20 against the actual V6 supplier schema; full-chain tests remain separate. */
@Testcontainers
class SupplierMigrationIT {
    @Container static final MySQLContainer<?> MYSQL=new MySQLContainer<>("mysql:8.0").withDatabaseName("supplier_migration").withUsername("test").withPassword("test");
    @TempDir Path directory;
    @Test void taxCodeMigrationPreservesThreeSeededSuppliers() throws Exception {
        Flyway.configure().dataSource(MYSQL.getJdbcUrl(),MYSQL.getUsername(),MYSQL.getPassword()).locations("classpath:db/migration").target("6").load().migrate();
        String file="V20__supplier_tax_code.sql";
        try(var input=getClass().getResourceAsStream("/db/migration/"+file)) { Files.copy(java.util.Objects.requireNonNull(input),directory.resolve(file)); }
        Flyway.configure().dataSource(MYSQL.getJdbcUrl(),MYSQL.getUsername(),MYSQL.getPassword()).locations("filesystem:"+directory.toAbsolutePath())
            .ignoreMigrationPatterns("*:missing").load().migrate();
        try(var connection=DriverManager.getConnection(MYSQL.getJdbcUrl(),MYSQL.getUsername(),MYSQL.getPassword());var statement=connection.createStatement()) {
            try(var result=statement.executeQuery("SELECT code,tax_code FROM supplier ORDER BY id")) {
                java.util.List<String> codes=new java.util.ArrayList<>(); while(result.next()) { codes.add(result.getString(1)); assertThat(result.getString(2)).isNull(); }
                assertThat(codes).containsExactly("SUP-APL-VN","SUP-FPT-SYN","SUP-DGW-VN");
            }
            assertThat(statement.executeUpdate("UPDATE supplier SET tax_code='1234567890' WHERE code='SUP-DGW-VN'")).isEqualTo(1);
        }
    }
}
