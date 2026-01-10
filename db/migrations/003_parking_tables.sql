USE parking_management;
GO

IF OBJECT_ID('dbo.ParkingSpots', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ParkingSpots (
    id INT IDENTITY(1,1) PRIMARY KEY,
    parking_id INT NOT NULL,
    spot_number NVARCHAR(50) NOT NULL,
    is_available BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT FK_ParkingSpots_Parkings
      FOREIGN KEY (parking_id) REFERENCES dbo.parkings(id)
      ON DELETE CASCADE
  );

  CREATE INDEX IX_ParkingSpots_parking_id ON dbo.ParkingSpots(parking_id);
END
GO
