-- Rewrite stored company branding asset URLs from the JWT-protected
-- download route to the public company-asset route so images render in
-- PDFs (headless browser sends no auth header) and in the admin previews.

UPDATE "Company"
SET "logo" = regexp_replace("logo", '/api/v1/files/download/', '/api/v1/files/public/', 'g')
WHERE "logo" LIKE '%/api/v1/files/download/%';

UPDATE "Company"
SET "smallLogo" = regexp_replace("smallLogo", '/api/v1/files/download/', '/api/v1/files/public/', 'g')
WHERE "smallLogo" LIKE '%/api/v1/files/download/%';

UPDATE "Company"
SET "watermark" = regexp_replace("watermark", '/api/v1/files/download/', '/api/v1/files/public/', 'g')
WHERE "watermark" LIKE '%/api/v1/files/download/%';

UPDATE "Company"
SET "stamp" = regexp_replace("stamp", '/api/v1/files/download/', '/api/v1/files/public/', 'g')
WHERE "stamp" LIKE '%/api/v1/files/download/%';

UPDATE "Company"
SET "signature" = regexp_replace("signature", '/api/v1/files/download/', '/api/v1/files/public/', 'g')
WHERE "signature" LIKE '%/api/v1/files/download/%';
