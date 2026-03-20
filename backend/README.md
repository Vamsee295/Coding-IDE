# OLLAMA AI — Backend

The backend of OLLAMA AI is a Spring Boot application that provides RESTful APIs for file/project management and a WebSocket handler for real-time terminal execution.

## 🛠️ Technology Stack

- **Framework**: [Spring Boot 3](https://spring.io/projects/spring-boot)
- **Language**: Java 21
- **Database**: MySQL 8.0
- **Build Tool**: [Maven](https://maven.apache.org/)
- **Real-time Communication**: Spring WebSocket

## ✨ Core Components

### Terminal WebSocket Handler (`TerminalWebSocketHandler.java`)
- Handles WebSocket connections at `/terminal`.
- Each session tracks its own Current Working Directory (CWD).
- Spawns a native shell process (`cmd.exe` or `bash`) for each command.
- Streams stdout and stderr back to the frontend in real-time.
- **Safety Features**: Intercepts `cd` commands to manage paths in Java; blocks dangerous commands (e.g., `format`, `rm -rf /`).

### Security Configuration (`SecurityConfig.java`)
- Configured for development mode.
- Permits all requests to `/api/**` and WebSocket/terminal endpoints.
- Disables CSRF for simplified development API interaction.

### Controllers
- **IdeController**: Manages projects and file structures in the database.

## 🚀 Getting Started

### Prerequisites

- **Java 21+**
- **Maven**
- **MySQL 8.0+**

### Database Setup

1. Create a MySQL database (e.g., `ide_db`).
2. Update `src/main/resources/application.properties` with your MySQL credentials:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/ide_db
   spring.datasource.username=your_username
   spring.datasource.password=your_password
   ```

### Execution

```bash
./mvnw spring-boot:run
```

## ⚙️ Key Endpoints

- **WebSocket**: `ws://localhost:8080/terminal`
- **Rest API**: `http://localhost:8080/api/...`
