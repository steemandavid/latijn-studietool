-- VERBA online — tabellen van §13.3. MariaDB 10.11, utf8mb4.
--   mysql -h 127.0.0.1 -u <gebruiker> -p <database> < server/schema.sql

CREATE TABLE IF NOT EXISTS klassen (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  naam          VARCHAR(80)  NOT NULL,
  joincode_hash CHAR(64)     NOT NULL,
  actief        TINYINT(1)   NOT NULL DEFAULT 1,
  aangemaakt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY joincode (joincode_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leerlingen (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  klas_id      INT UNSIGNED NOT NULL,
  naam         VARCHAR(40)  NOT NULL,              -- zoals de leerling hem schreef
  naam_sleutel VARCHAR(40)  NOT NULL,              -- kleine letters, voor de uniciteit
  pin_hash     VARCHAR(255) NOT NULL,              -- argon2id
  aangemaakt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  laatste_sync DATETIME     NULL,
  rev          INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY naam_per_klas (klas_id, naam_sleutel),   -- elke klas mag haar eigen "Lotte" (§13.2)
  CONSTRAINT fk_leerling_klas FOREIGN KEY (klas_id) REFERENCES klassen(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staat (
  leerling_id INT UNSIGNED  NOT NULL PRIMARY KEY,
  staat       LONGTEXT      NOT NULL,             -- de save van §8.2, als JSON
  rev         INT UNSIGNED  NOT NULL DEFAULT 0,
  bijgewerkt  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_staat_leerling FOREIGN KEY (leerling_id) REFERENCES leerlingen(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessies (
  token_hash   CHAR(64)     NOT NULL PRIMARY KEY,
  leerling_id  INT UNSIGNED NOT NULL,
  aangemaakt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  laatst_gezien DATETIME    NULL,
  KEY leerling (leerling_id),
  CONSTRAINT fk_sessie_leerling FOREIGN KEY (leerling_id) REFERENCES leerlingen(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Het logboek van §13.7: één regel per actie, met een kant-en-klare Nederlandse zin.
CREATE TABLE IF NOT EXISTS gebeurtenissen (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tijd        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  klas_id     INT UNSIGNED NULL,
  leerling_id INT UNSIGNED NULL,
  naam        VARCHAR(40)  NOT NULL DEFAULT 'beheer',  -- meegeschreven, zodat de zin leesbaar blijft
  soort       VARCHAR(32)  NOT NULL,
  zin         VARCHAR(500) NOT NULL,
  cijfers     LONGTEXT     NULL,                       -- JSON, om op te tellen
  ip_hash     CHAR(16)     NULL,                       -- nooit het IP zelf (§13.8)
  KEY op_tijd (tijd),
  KEY per_leerling (leerling_id, tijd),
  KEY per_klas (klas_id, tijd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Snelheidslimieten (§13.6): tellers per sleutel, in een venster.
CREATE TABLE IF NOT EXISTS pogingen (
  sleutel VARCHAR(100) NOT NULL PRIMARY KEY,
  aantal  INT UNSIGNED NOT NULL DEFAULT 0,
  sinds   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
