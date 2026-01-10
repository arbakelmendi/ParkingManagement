IF DB_ID('parking_management') IS NOT NULL
BEGIN
  USE parking_management;
  IF OBJECT_ID('dbo.__migrations', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.__migrations (
      id INT IDENTITY(1,1) PRIMARY KEY,
      filename NVARCHAR(200) NOT NULL UNIQUE,
      applied_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
  END
END
GO

IF DB_ID('parking_auth') IS NOT NULL
BEGIN
  USE parking_auth;
  IF OBJECT_ID('dbo.__migrations', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.__migrations (
      id INT IDENTITY(1,1) PRIMARY KEY,
      filename NVARCHAR(200) NOT NULL UNIQUE,
      applied_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
  END
END
GO
