-- Database Schema
-- MySQL 

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

START TRANSACTION;

CREATE TABLE Users (
    user_id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_username (username),
    KEY idx_users_created_by (created_by),

    CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by)
        REFERENCES Users (user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT chk_users_role
        CHECK (role IN ('guest', 'employee', 'admin'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;


CREATE TABLE Galleries (
    gallery_id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    description VARCHAR(255) NULL,
    image_url VARCHAR(2048) NULL,

    PRIMARY KEY (gallery_id),

    CONSTRAINT chk_galleries_capacity
        CHECK (capacity > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;


CREATE TABLE Rooms (
    room_id INT NOT NULL AUTO_INCREMENT,
    gallery_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    description VARCHAR(255) NULL,
    image_url VARCHAR(2048) NULL,

    PRIMARY KEY (room_id),
    KEY idx_rooms_gallery_id (gallery_id),

    CONSTRAINT fk_rooms_gallery
        FOREIGN KEY (gallery_id)
        REFERENCES Galleries (gallery_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT chk_rooms_capacity
        CHECK (capacity > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;


CREATE TABLE Paintings (
    painting_id INT NOT NULL AUTO_INCREMENT,
    room_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    image_url VARCHAR(2048) NULL,

    PRIMARY KEY (painting_id),
    KEY idx_paintings_room_id (room_id),

    CONSTRAINT fk_paintings_room
        FOREIGN KEY (room_id)
        REFERENCES Rooms (room_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;


-- Gallery Events
-- Records people entering/leaving a gallery
CREATE TABLE GalleryEvents (
    event_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    gallery_id INT NOT NULL,
    type VARCHAR(20) NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (event_id),
    KEY idx_gallery_events_user_id (user_id),
    KEY idx_gallery_events_gallery_id (gallery_id),
    KEY idx_gallery_events_occurred_at (occurred_at),

    CONSTRAINT fk_gallery_events_user
        FOREIGN KEY (user_id)
        REFERENCES Users (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_gallery_events_gallery
        FOREIGN KEY (gallery_id)
        REFERENCES Galleries (gallery_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT chk_gallery_events_type
        CHECK (type IN ('ENTER', 'LEAVE'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;


-- Room events
-- Records people entering/leaving rooms
CREATE TABLE RoomEvents (
    event_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    type VARCHAR(20) NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (event_id),
    KEY idx_room_events_user_id (user_id),
    KEY idx_room_events_room_id (room_id),
    KEY idx_room_events_occurred_at (occurred_at),

    CONSTRAINT fk_room_events_user
        FOREIGN KEY (user_id)
        REFERENCES Users (user_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_room_events_room
        FOREIGN KEY (room_id)
        REFERENCES Rooms (room_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT chk_room_events_type
        CHECK (type IN ('ENTER', 'LEAVE'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;


-- Audit logs
-- Records security-sensitive actions performed by users
CREATE TABLE AuditLogs (
    log_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (log_id),
    KEY idx_audit_logs_user_id (user_id),
    KEY idx_audit_logs_occurred_at (occurred_at),

    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id)
        REFERENCES Users (user_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;


COMMIT;