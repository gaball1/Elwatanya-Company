-- Backfill mimeType for records stored with generic application/octet-stream
-- so image assets render correctly (e.g. inside generated PDFs).

UPDATE "FileRecord"
SET "mimeType" = 'image/png'
WHERE "mimeType" = 'application/octet-stream'
  AND LOWER("originalName") LIKE '%.png';

UPDATE "FileRecord"
SET "mimeType" = 'image/jpeg'
WHERE "mimeType" = 'application/octet-stream'
  AND (LOWER("originalName") LIKE '%.jpg' OR LOWER("originalName") LIKE '%.jpeg');

UPDATE "FileRecord"
SET "mimeType" = 'image/gif'
WHERE "mimeType" = 'application/octet-stream'
  AND LOWER("originalName") LIKE '%.gif';

UPDATE "FileRecord"
SET "mimeType" = 'image/webp'
WHERE "mimeType" = 'application/octet-stream'
  AND LOWER("originalName") LIKE '%.webp';

UPDATE "FileRecord"
SET "mimeType" = 'image/bmp'
WHERE "mimeType" = 'application/octet-stream'
  AND LOWER("originalName") LIKE '%.bmp';

UPDATE "FileRecord"
SET "mimeType" = 'image/svg+xml'
WHERE "mimeType" = 'application/octet-stream'
  AND LOWER("originalName") LIKE '%.svg';

UPDATE "FileRecord"
SET "mimeType" = 'image/x-icon'
WHERE "mimeType" = 'application/octet-stream'
  AND LOWER("originalName") LIKE '%.ico';

UPDATE "FileRecord"
SET "mimeType" = 'application/pdf'
WHERE "mimeType" = 'application/octet-stream'
  AND LOWER("originalName") LIKE '%.pdf';

UPDATE "FileRecord"
SET "mimeType" = 'text/csv'
WHERE "mimeType" = 'application/octet-stream'
  AND LOWER("originalName") LIKE '%.csv';

UPDATE "FileRecord"
SET "mimeType" = 'application/json'
WHERE "mimeType" = 'application/octet-stream'
  AND LOWER("originalName") LIKE '%.json';

UPDATE "FileRecord"
SET "mimeType" = 'application/zip'
WHERE "mimeType" = 'application/octet-stream'
  AND LOWER("originalName") LIKE '%.zip';
