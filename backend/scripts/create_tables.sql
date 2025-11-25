CREATE TABLE IF NOT EXISTS parkings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    capacity INT,
    occupied INT
);
