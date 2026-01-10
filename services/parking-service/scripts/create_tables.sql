IF OBJECT_ID('dbo.Parkings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Parkings (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Capacity INT NOT NULL,
        Occupied INT NOT NULL
    );
END
GO

IF OBJECT_ID('dbo.ParkingSpots', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ParkingSpots (
        id INT IDENTITY(1,1) PRIMARY KEY,
        spot_number INT NOT NULL,
        status NVARCHAR(20) NOT NULL DEFAULT ('free'),
        ParkingId INT NOT NULL,
        CONSTRAINT UQ_ParkingSpots_ParkingId_SpotNumber UNIQUE (ParkingId, spot_number),
        CONSTRAINT FK_ParkingSpots_Parkings FOREIGN KEY (ParkingId) REFERENCES dbo.Parkings(Id)
    );
END
GO
