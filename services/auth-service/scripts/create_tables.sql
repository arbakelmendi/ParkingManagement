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
