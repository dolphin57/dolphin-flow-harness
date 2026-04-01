---
name: mvc2springboot
description: Transform Spring MVC projects to Spring Boot. Use when user wants to migrate, convert, or upgrade a Spring MVC project to Spring Boot, including pom.xml modifications, application.yml creation, web.xml to Java config migration, and SpringBootApplication startup class creation.
---

# Spring MVC to Spring Boot Migration

Transform traditional Spring MVC projects to Spring Boot while preserving business logic.

## Migration Steps

### 1. pom.xml Transformation

Add Spring Boot parent and modify packaging:

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>1.4.2.RELEASE</version>
</parent>
<packaging>jar</packaging>
```

Add essential dependencies:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-logging</artifactId>
        </exclusion>
    </exclusions>
</dependency>
<dependency>
    <groupId>org.apache.tomcat.embed</groupId>
    <artifactId>tomcat-embed-jasper</artifactId>
</dependency>
<dependency>
    <groupId>javax.servlet</groupId>
    <artifactId>javax.servlet-api</artifactId>
</dependency>
<dependency>
    <groupId>javax.servlet</groupId>
    <artifactId>jstl</artifactId>
</dependency>
```

Add Maven plugins:

```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <executions>
        <execution>
            <goals><goal>repackage</goal></goals>
            <configuration>
                <mainClass>【项目启动类路径】</mainClass>
            </configuration>
        </execution>
    </executions>
</plugin>
```

Add resources configuration for JSP support:

```xml
<resources>
    <resource>
        <directory>src/main/webapp</directory>
        <targetPath>META-INF/resources</targetPath>
        <includes><include>**/**</include></includes>
    </resource>
    <resource>
        <directory>src/main/resources</directory>
        <includes><include>**/**</include></includes>
    </resource>
</resources>
```

### 2. Create SpringBootApplication Class

In root package, create startup class:

```java
@SpringBootApplication
@ImportResource({
    "classpath:spring-context.xml",
    "classpath:spring-dubbo.xml",
    "classpath:spring-dubbo-client.xml",
    "classpath:spring-dubbo-server.xml",
    "classpath:spring-mvc.xml"
})
public class ModuleSpringBootApplication {
    private static final Logger logger = LoggerFactory.getLogger(ModuleSpringBootApplication.class);
    
    public static void main(String[] args) {
        SpringApplication.run(ModuleSpringBootApplication.class, args);
        logger.info("==================== ModuleSpringBootApplication started ====================");
    }
}
```

### 3. Create application.yml

In `src/main/resources/application.yml`:

```yaml
server:
    port: 8080
    context-path: /【模块名称】
spring:
    profiles:
        active: dev
    application:
        name: 【模块名称】
    http:
        encoding:
            enabled: true
            charset: utf-8
            force: true
    autoconfigure:
        exclude: 
            - org.springframework.boot.autoconfigure.freemarker.FreeMarkerAutoConfiguration
            - org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
    mvc:
        view:
            prefix: /
            suffix: .jsp
```

### 4. Migrate web.xml to Java Config

**Context Parameters:**

```java
@Configuration
public class ContextParamConfig {
    @Bean
    public ServletContextInitializer initializer() {
        return sc -> sc.setInitParameter("webAppRootKey", "【项目.root】");
    }
}
```

**Listeners:**

```java
@Configuration
public class ListenerRegistrationConfig {
    @Bean
    public ServletListenerRegistrationBean<IntrospectorCleanupListener> introspectorCleanupListener() {
        return new ServletListenerRegistrationBean<>(new IntrospectorCleanupListener());
    }
    @Bean
    public ServletListenerRegistrationBean<RequestContextListener> requestContextListener() {
        return new ServletListenerRegistrationBean<>(new RequestContextListener());
    }
}
```

**Filters:**

```java
@Configuration
public class FilterRegistrationConfig {
    @Bean
    public FilterRegistrationBean<XSSSecurityFilter> getXSSSecurityFilter() {
        FilterRegistrationBean bean = new FilterRegistrationBean(new XSSSecurityFilter());
        Map<String, String> map = new HashMap<>();
        map.put("securityconfig", "xss_security_config.xml");
        map.put("filteringconfig", "xss_filter_config.xml");
        map.put("filter.enable", "true");
        bean.setInitParameters(map);
        bean.addUrlPatterns("/*");
        return bean;
    }
    // Add other filters similarly...
}
```

**Servlets:**

```java
@Configuration
public class ServletRegistrationConfig {
    @Bean
    public ServletRegistrationBean<StatViewServlet> druidStatViewServlet() {
        ServletRegistrationBean bean = new ServletRegistrationBean(new StatViewServlet());
        bean.addUrlMappings("/webpage/system/druid/*");
        return bean;
    }
}
```

### 5. Static Resources

Move `IAF_TAGLIB_TEMP` folder to `webapp/` - Spring Boot handles it automatically.

### 6. Create Environment Profiles

- `application-dev.properties`
- `application-test.properties`
- `application-prod.properties`