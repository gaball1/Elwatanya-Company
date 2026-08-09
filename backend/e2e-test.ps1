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
  $resp = Invoke-RestMethod @params -TimeoutSec 60
  if (-not $resp.success) { throw "$Method $Path failed: $($resp.message)" }
  return $resp
}

$global:Token = $null

Write-Host "=== Phase 1: Login ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Post -Path "/api/v1/auth/login" -Body @{ email = $Email; password = $Password }
$global:Token = $resp.data.accessToken
Write-Host "Logged in as $($resp.data.user.email)" -ForegroundColor Green

Write-Host "`n=== Phase 2: Project ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Get -Path "/api/v1/projects" -Token $global:Token
$projects = $resp.data.projects
$project = $projects | Where-Object { $_.code -eq "E2E-PROJ" } | Select-Object -First 1
if (-not $project) {
  $resp = Invoke-Api -Method Post -Path "/api/v1/projects" -Token $global:Token -Body @{
    code = "E2E-PROJ"; name = "E2E Test Project"; location = "Test Location"
    description = "Project for E2E testing"; client = "Test Client"
    startDate = (Get-Date -Format "yyyy-MM-dd"); status = "active"; progress = 0
  }
  $project = $resp.data.project
  Write-Host "Created project: $($project.id)" -ForegroundColor Green
} else {
  Write-Host "Using existing project: $($project.id)" -ForegroundColor Yellow
}

Write-Host "`n=== Phase 3: Building ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Get -Path "/api/v1/projects/$($project.id)/buildings" -Token $global:Token
$buildings = $resp.data.buildings
$building = $buildings | Where-Object { $_.code -eq "E2E-BLD" } | Select-Object -First 1
if (-not $building) {
  $resp = Invoke-Api -Method Post -Path "/api/v1/projects/$($project.id)/buildings" -Token $global:Token -Body @{
    code = "E2E-BLD"; name = "E2E Test Building"
  }
  $building = $resp.data.building
  Write-Host "Created building: $($building.id)" -ForegroundColor Green
} else {
  Write-Host "Using existing building: $($building.id)" -ForegroundColor Yellow
}

Write-Host "`n=== Phase 4: Employer BOQ ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Get -Path "/api/v1/buildings/$($building.id)/boq/employer" -Token $global:Token
$empBoqItems = $resp.data.items
if ($empBoqItems.Count -eq 0) {
  $resp = Invoke-Api -Method Put -Path "/api/v1/buildings/$($building.id)/boq/employer" -Token $global:Token -Body @{
    items = @(
      @{ itemCode = "EMP-001"; description = "Foundation Work"; unit = "m3"; quantity = 100; unitPrice = 1500; totalValue = 150000 }
      @{ itemCode = "EMP-002"; description = "Structural Frame"; unit = "m3"; quantity = 200; unitPrice = 2500; totalValue = 500000 }
    )
  }
  Write-Host "Created Employer BOQ items" -ForegroundColor Green
  $resp = Invoke-Api -Method Get -Path "/api/v1/buildings/$($building.id)/boq/employer" -Token $global:Token
  $empBoqItems = $resp.data.items
}
Write-Host "Employer BOQ items: $($empBoqItems.Count)" -ForegroundColor Green

Write-Host "`n=== Phase 5: Analytical BOQ (import from employer) ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Get -Path "/api/v1/buildings/$($building.id)/boq/analytical" -Token $global:Token
$existingAnalytical = $resp.data.items
$existingCodes = $existingAnalytical | ForEach-Object { $_.itemCode }
foreach ($emp in $empBoqItems) {
  if ($existingCodes -contains $emp.itemCode) {
    Write-Host "$($emp.itemCode) already in analytical BOQ" -ForegroundColor Yellow
  } else {
    $resp = Invoke-Api -Method Post -Path "/api/v1/buildings/$($building.id)/boq/analytical/import" -Token $global:Token -Body @{ itemCode = $emp.itemCode }
    Write-Host "Imported $($emp.itemCode) to analytical BOQ" -ForegroundColor Green
  }
}

Write-Host "`n=== Phase 6: Final BOQ sync ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Post -Path "/api/v1/buildings/$($building.id)/boq/final/sync-from-analytical" -Token $global:Token -Body @{}
Write-Host "Synced Final BOQ" -ForegroundColor Green
$resp = Invoke-Api -Method Get -Path "/api/v1/buildings/$($building.id)/boq/final" -Token $global:Token
$finalBoqItems = $resp.data.items
Write-Host "Final BOQ items: $($finalBoqItems.Count)" -ForegroundColor Green

Write-Host "`n=== Phase 7: Analyze ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Post -Path "/api/v1/buildings/$($building.id)/boq/final/items/$($finalBoqItems[0].itemCode)/analyze" -Token $global:Token -Body @{
  components = @(
    @{ name = "Cement"; unit = "ton"; unitPrice = 3500 }
    @{ name = "Steel"; unit = "ton"; unitPrice = 12000 }
    @{ name = "Labor"; unit = "day"; unitPrice = 500 }
  )
}
Write-Host "Analyzed item: $($resp.data.item.itemCode)" -ForegroundColor Green

Write-Host "`n=== Phase 8: Subcontractor ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Get -Path "/api/v1/subcontractors" -Token $global:Token
$subs = $resp.data.items
if ($subs.Count -eq 0) {
  $resp = Invoke-Api -Method Post -Path "/api/v1/subcontractors" -Token $global:Token -Body @{
    name = "E2E Subcontractor"; workType = "structural"; phone = "01234567890"
    marginType = "percentage"; marginValue = 10
  }
  $sub = $resp.data.subcontractor
  Write-Host "Created subcontractor: $($sub.id)" -ForegroundColor Green
} else {
  $sub = $subs[0]
  Write-Host "Using existing subcontractor: $($sub.id)" -ForegroundColor Yellow
}

Write-Host "`n=== Phase 9: Get Final BOQ detail (components) ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Get -Path "/api/v1/buildings/$($building.id)/boq/final" -Token $global:Token
$finalDetail = $resp.data
$finalItem = $finalDetail.items[0]
Write-Host "Final item: $($finalItem.itemCode) - components: $($finalItem.components.Count)" -ForegroundColor Green
if ($finalItem.components.Count -eq 0) { throw "No components found on final item" }
$compId = $finalItem.components[0].id
$compName = $finalItem.components[0].name
Write-Host "Using component: $compName ($compId)" -ForegroundColor Green

Write-Host "`n=== Phase 10: Distribute ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Post -Path "/api/v1/buildings/$($building.id)/boq/final/items/$($finalItem.itemCode)/components/$compId/distribute" -Token $global:Token -Body @{
  distribution = @(
    @{ contractorId = $sub.id; quantity = 100 }
  )
}
Write-Host "Distribution successful!" -ForegroundColor Green

Write-Host "`n=== Phase 11: Contractor BOQ ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Get -Path "/api/v1/buildings/$($building.id)/contractors/$($sub.id)/boq" -Token $global:Token
$contBoqItems = $resp.data.items
Write-Host "Contractor BOQ items: $($contBoqItems.Count)" -ForegroundColor Green
if ($contBoqItems.Count -eq 0) { throw "No contractor BOQ items found" }
Write-Host "First item: $($contBoqItems[0].itemCode) - qty: $($contBoqItems[0].quantity)" -ForegroundColor Green

Write-Host "`n=== Phase 12: Extract ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Post -Path "/api/v1/buildings/$($building.id)/contractors/$($sub.id)/extracts" -Token $global:Token -Body @{
  status = "running"
  date = (Get-Date -Format "yyyy-MM-dd")
  insurancePercent = 0
  previousPaid = 0
  items = @(
    @{
      itemCode = $contBoqItems[0].itemCode
      description = $contBoqItems[0].description
      unit = $contBoqItems[0].unit
      contractQuantity = $contBoqItems[0].quantity
      previous = 0
      current = 20
      executionPercent = 20
      unitPrice = 3500
    }
  )
}
$extract = $resp.data.extract
Write-Host "Extract created: $($extract.code) ($($extract.id))" -ForegroundColor Green

Write-Host "`n=== Phase 13: Project Fund ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Get -Path "/api/v1/project-funds" -Token $global:Token
$funds = $resp.data.items
$fund = $funds | Where-Object { $_.projectId -eq $project.id } | Select-Object -First 1
if (-not $fund) {
  $resp = Invoke-Api -Method Post -Path "/api/v1/project-funds" -Token $global:Token -Body @{
    projectId = $project.id; initialBalance = 1000000
  }
  $fund = $resp.data.fund
  Write-Host "Created fund: $($fund.id)" -ForegroundColor Green
} else {
  Write-Host "Using existing fund: $($fund.id)" -ForegroundColor Yellow
}

Write-Host "`n=== Phase 14: Payment ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Post -Path "/api/v1/buildings/$($building.id)/contractors/$($sub.id)/payments" -Token $global:Token -Body @{
  date = (Get-Date -Format "yyyy-MM-dd")
  amount = 70000
  extractId = $extract.id
  notes = "E2E Test Payment"
}
Write-Host "Payment created: $($resp.data.payment.id)" -ForegroundColor Green

Write-Host "`n=== Phase 15: Fund Transactions ===" -ForegroundColor Cyan
$resp = Invoke-Api -Method Get -Path "/api/v1/project-funds/$($fund.id)" -Token $global:Token
$fundDetail = $resp.data.fund
Write-Host "Fund balance: $($fundDetail.currentBalance)" -ForegroundColor Green
$resp = Invoke-Api -Method Get -Path "/api/v1/fund-transactions" -Token $global:Token
$txs = $resp.data.items
Write-Host "Transactions: $($txs.Count)" -ForegroundColor Green
if ($txs.Count -gt 0) { $txs[0] | ConvertTo-Json -Depth 2 }

Write-Host "`n`n=== ALL PHASES COMPLETE ===" -ForegroundColor Green -BackgroundColor Black
Write-Host "BOQ Chain verified end-to-end!" -ForegroundColor Green
