# ==========================================
# HEALTHBRIDGE - RENDER DEPLOYMENT
# Java 17 + Spring Boot
# ==========================================

# Stage 1: Build the application
FROM eclipse-temurin:17-jdk AS build

WORKDIR /app

# Copy Maven wrapper and project configuration
COPY .mvn .mvn
COPY mvnw pom.xml ./

# Make Maven wrapper executable
RUN chmod +x mvnw

# Copy application source
COPY src ./src

# Build Spring Boot application
RUN ./mvnw -B -DskipTests package


# Stage 2: Run the application
FROM eclipse-temurin:17-jre

WORKDIR /app

# Copy the compiled application
COPY --from=build /app/target/*.jar app.jar

# Render provides the server port through
# the PORT environment variable
EXPOSE 8080

# Start Spring Boot
ENTRYPOINT ["java", "-jar", "app.jar"]