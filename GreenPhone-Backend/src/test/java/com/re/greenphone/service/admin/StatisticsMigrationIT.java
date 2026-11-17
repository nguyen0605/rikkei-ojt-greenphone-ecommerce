package com.re.greenphone.service.admin;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.*;
import java.sql.DriverManager;
import static org.assertj.core.api.Assertions.*;
@Testcontainers
class StatisticsMigrationIT {
    @Container static final MySQLContainer<?> MYSQL=new MySQLContainer<>("mysql:8.0").withDatabaseName("statistics_migration").withUsername("test").withPassword("test");
    @Test void additiveMigrationPreservesHistoricalRows() throws Exception {
        Flyway.configure().dataSource(MYSQL.getJdbcUrl(),MYSQL.getUsername(),MYSQL.getPassword()).locations("classpath:db/migration").target("24").load().migrate();
        try(var connection=DriverManager.getConnection(MYSQL.getJdbcUrl(),MYSQL.getUsername(),MYSQL.getPassword());var statement=connection.createStatement()) {
            long before; try(var rs=statement.executeQuery("select count(*) from order_detail")) { rs.next(); before=rs.getLong(1); }
            Flyway.configure().dataSource(MYSQL.getJdbcUrl(),MYSQL.getUsername(),MYSQL.getPassword()).locations("classpath:db/migration").target("25").load().migrate();
            try(var rs=statement.executeQuery("select count(*) from order_detail where unit_cost is null")) { rs.next(); assertThat(rs.getLong(1)).isEqualTo(before); }
        }
    }
}
