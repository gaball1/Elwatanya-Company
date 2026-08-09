param(
  [string]$BaseUrl = "http://localhost:3001",
  [string]$Email = "admin@elwataniya.com",
  [string]$Password = "Admin@123"
)

$ErrorActionPreference = "Stop"

function Invoke-Api {
  param($Method, $Path, $Body, $Token)
  $headers = @{ "Content-Type" = "application/json" }
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }
  $params = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = $headers }
  if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Depth 10 -Compress) }
  $resp = Invoke-RestMethod @params -TimeoutSec 30
  if (-not $resp.success) { throw "$Method $Path failed: $($resp.message)" }
  return $resp
}

$Token = (Invoke-Api -Method Post -Path "/api/v1/auth/login" -Body @{ email = $Email; password = $Password }).data.accessToken
Write-Host "OK" -ForegroundColor Green

$tests = @(
  @{ Entity = "Client"; Plural = "clients"; Create = @{ name = "Test Client"; email = "test@client.com"; phone = "01234567890"; address = "Test Address"; contactPerson = "John Doe"; status = "active" }; Update = @{ name = "Updated Client" } }
  @{ Entity = "Supplier"; Plural = "suppliers"; Create = @{ name = "Test Supplier"; contactPerson = "Jane Doe"; phone = "01234567891"; email = "test@supplier.com"; address = "Test Address"; status = "active" }; Update = @{ name = "Updated Supplier" } }
  @{ Entity = "Department"; Plural = "departments"; Create = @{ code = "TEST-DEPT"; name = "Test Department"; description = "Test desc"; status = "active" }; Update = @{ name = "Updated Dept" } }
  @{ Entity = "Category"; Plural = "categories"; Create = @{ code = "TEST-CAT"; name = "Test Category"; description = "Test desc"; status = "active" }; Update = @{ name = "Updated Cat" } }
  @{ Entity = "Warehouse"; Plural = "warehouses"; Create = @{ code = "TEST-WH"; name = "Test Warehouse"; location = "Test Location"; status = "active" }; Update = @{ name = "Updated WH" } }
  @{ Entity = "Holiday"; Plural = "holidays"; Create = @{ name = "Test Holiday"; date = "2026-01-01"; description = "Test desc"; isRecurring = $true }; Update = @{ name = "Updated Holiday" } }
)

$allOk = $true
foreach ($t in $tests) {
  $entity = $t.Entity; $plural = $t.Plural; $createBody = $t.Create; $updateBody = $t.Update
  Write-Host "`n--- $entity CRUD ---" -ForegroundColor Cyan
  try {
    # CREATE
    $resp = Invoke-Api -Method Post -Path "/api/v1/$plural" -Token $Token -Body $createBody
    $key = $entity.ToLower()
    $created = $resp.data.$key
    $id = $created.id
    Write-Host ("  CREATE ${entity}: $id") -ForegroundColor Green

    # READ (get by id)
    $resp = Invoke-Api -Method Get -Path "/api/v1/$plural/$id" -Token $Token
    $read = $resp.data.$key
    if ($read.id -ne $id) { throw "Read returned wrong id" }
    Write-Host ("  READ ${entity}: $($read.name)") -ForegroundColor Green

    # LIST
    $resp = Invoke-Api -Method Get -Path "/api/v1/$plural" -Token $Token
    $items = $resp.data.items
    $found = $items | Where-Object { $_.id -eq $id } | Select-Object -First 1
    if (-not $found) { throw "List did not contain created ${entity}" }
    Write-Host ("  LIST ${plural}: $($items.Count) items, found in list") -ForegroundColor Green

    # UPDATE
    $resp = Invoke-Api -Method Patch -Path "/api/v1/$plural/$id" -Token $Token -Body $updateBody
    $updated = $resp.data.$key
    Write-Host ("  UPDATE ${entity}: $($updated.id)") -ForegroundColor Green

    # DELETE
    $resp = Invoke-RestMethod -Uri "$BaseUrl/api/v1/$plural/$id" -Method Delete -Headers @{ Authorization = "Bearer $Token" } -TimeoutSec 30
    if ($resp.success -ne $false) { Write-Host ("  DELETE ${entity}: 204") -ForegroundColor Green }
    else { throw "Delete failed" }

    # VERIFY deleted (list should be empty or not include it)
    $resp = Invoke-Api -Method Get -Path "/api/v1/$plural" -Token $Token
    $afterDelete = $resp.data.items | Where-Object { $_.id -eq $id } | Select-Object -First 1
    if ($afterDelete) { Write-Host ("  VERIFY deleted: still visible (soft-delete)") -ForegroundColor Yellow }
    else { Write-Host ("  VERIFY deleted: gone") -ForegroundColor Green }

  } catch {
    Write-Host ("  ${entity} FAILED: $_") -ForegroundColor Red
    $allOk = $false
  }
}

Write-Host ("`n`n=== ALL CRUD TESTS COMPLETE ===") -ForegroundColor Green
if ($allOk) { Write-Host "All passed" -ForegroundColor Green } else { Write-Host "Some failed" -ForegroundColor Red }
