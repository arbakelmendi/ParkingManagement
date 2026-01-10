USE parking_management;
GO

IF OBJECT_ID('dbo.reservations', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.reservations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    parking_id INT NOT NULL,
    start_time DATETIME2 NOT NULL,
    end_time DATETIME2 NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
  );
END
GO
