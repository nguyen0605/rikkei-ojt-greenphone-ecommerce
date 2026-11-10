package com.re.greenphone.config;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import javax.sql.DataSource;
import java.lang.reflect.Method;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FlywayConfigTest {

    @InjectMocks
    private FlywayConfig flywayConfig;

    @Mock
    private DataSource dataSource;

    @Mock
    private Connection connection;

    @Mock
    private DatabaseMetaData metaData;

    @Mock
    private Statement statement;

    @Mock
    private ResultSet tablesResultSet;

    @Test
    @DisplayName("Khi spring.flyway.enabled=false thi khong khoi chay migrate")
    void whenFlywayDisabled_returnsConfiguredFlywayWithoutMigrate() {
        ReflectionTestUtils.setField(flywayConfig, "flywayEnabled", false);

        Flyway flyway = flywayConfig.flyway(dataSource);

        assertThat(flyway).isNotNull();
        verifyNoInteractions(dataSource);
    }

    @Test
    @DisplayName("Khi da co flyway_schema_history thi bo qua dong bo schema history")
    void whenFlywaySchemaHistoryExists_skipsSync() throws Exception {
        when(connection.getMetaData()).thenReturn(metaData);
        when(connection.getCatalog()).thenReturn("greenphone");
        when(connection.createStatement()).thenReturn(statement);
        when(metaData.getTables(any(), any(), eq("flyway_schema_history"), any())).thenReturn(tablesResultSet);
        when(tablesResultSet.next()).thenReturn(true);

        Method syncMethod = FlywayConfig.class.getDeclaredMethod("syncExistingSchemaHistoryIfEmpty", Connection.class);
        syncMethod.setAccessible(true);
        syncMethod.invoke(flywayConfig, connection);

        verify(statement, never()).execute(startsWith("CREATE TABLE IF NOT EXISTS `flyway_schema_history`"));
    }

    @Test
    @DisplayName("Khi database co san bang nhung chua co flyway_schema_history thi dong bo baseline")
    void whenExistingTablesWithoutFlywayHistory_syncsBaseline() throws Exception {
        when(connection.getMetaData()).thenReturn(metaData);
        when(connection.getCatalog()).thenReturn("greenphone");
        when(connection.createStatement()).thenReturn(statement);

        // 1. flyway_schema_history -> false
        ResultSet flywayRs = mock(ResultSet.class);
        when(flywayRs.next()).thenReturn(false);
        when(metaData.getTables(any(), any(), eq("flyway_schema_history"), any())).thenReturn(flywayRs);

        // 2. banner -> true (co bang)
        ResultSet bannerRs = mock(ResultSet.class);
        when(bannerRs.next()).thenReturn(true);
        when(metaData.getTables(any(), any(), eq("banner"), any())).thenReturn(bannerRs);

        Method syncMethod = FlywayConfig.class.getDeclaredMethod("syncExistingSchemaHistoryIfEmpty", Connection.class);
        syncMethod.setAccessible(true);
        syncMethod.invoke(flywayConfig, connection);

        // Phai tao bang flyway_schema_history va insert it nhat V1, V2
        verify(statement, atLeastOnce()).execute(contains("CREATE TABLE IF NOT EXISTS `flyway_schema_history`"));
        verify(statement, atLeastOnce()).execute(contains("V1__init_greenphone_schema.sql"));
        verify(statement, atLeastOnce()).execute(contains("V2__seed_greenphone_data.sql"));
    }
}
