#!/usr/bin/env sh
set -e

SQLCMD="/opt/mssql-tools/bin/sqlcmd"
# nëse te image yt është tools18, përdore:
if [ -f /opt/mssql-tools18/bin/sqlcmd ]; then
  SQLCMD="/opt/mssql-tools18/bin/sqlcmd"
fi

echo "Waiting for SQL Server..."
until $SQLCMD -S sqlserver -U sa -P "$SA_PASSWORD" -C -Q "SELECT 1" >/dev/null 2>&1
do
  echo "...still waiting"
  sleep 2
done

echo "SQL Server ready. Running migrations..."

apply() {
  FILE="$1"
  DB="$2"
  NAME=$(basename "$FILE")

  echo "Applying $NAME on $DB (if not applied)..."

  # insert në __migrations nëse nuk ekziston; nëse u fut me sukses, e ekzekuton file-in
  $SQLCMD -S sqlserver -U sa -P "$SA_PASSWORD" -C -d "$DB" -b -Q "
IF NOT EXISTS (SELECT 1 FROM dbo.__migrations WHERE filename = '$NAME')
BEGIN
  INSERT INTO dbo.__migrations(filename) VALUES('$NAME');
  PRINT 'RUN';
END
ELSE
  PRINT 'SKIP';
" | grep -q "RUN" && \
  $SQLCMD -S sqlserver -U sa -P "$SA_PASSWORD" -C -d "$DB" -b -i "$FILE" || \
  echo "Skipped $NAME"
}

# 0) history tables (run once on both DBs but file contains both)
$SQLCMD -S sqlserver -U sa -P "$SA_PASSWORD" -C -b -i /migrations/000_migration_history.sql

# 1) create DBs (këtu s'ka DB target, le të jetë master)
$SQLCMD -S sqlserver -U sa -P "$SA_PASSWORD" -C -b -d master -i /migrations/001_create_databases.sql

# pastaj sigurohu që __migrations ekziston (se 001 mund i krijon DB)
$SQLCMD -S sqlserver -U sa -P "$SA_PASSWORD" -C -b -i /migrations/000_migration_history.sql

# 2+) run sipas DB
apply /migrations/002_auth_tables.sql parking_auth
apply /migrations/003_parking_tables.sql parking_management
apply /migrations/004_reservation_tables.sql parking_management

echo "Migrations done."
