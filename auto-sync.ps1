$folder = "c:\Users\smkang\.gemini\stair_climber"

# .env 파일에서 환경 변수 로드
if (Test-Path "$folder\.env") {
    Get-Content "$folder\.env" | ForEach-Object {
        if ($_ -match "^(?<name>[^=]+)=(?<value>.*)$") {
            $name = $Matches['name'].Trim()
            $value = $Matches['value'].Trim()
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$token = [System.Environment]::GetEnvironmentVariable("NOTION_TOKEN")
$dbId = [System.Environment]::GetEnvironmentVariable("NOTION_DB_ID")
$gitPath = "C:\Program Files\Git\bin\git.exe"

# 파일 변경 감시 설정
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $folder
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

Write-Host "🚀 실시간 자동 동기화가 시작되었습니다! (GitHub & Notion) ✅" -ForegroundColor Green
Write-Host "감시 중인 폴더: $folder"

$action = {
    $name = $Event.SourceEventArgs.Name
    if ($name -match "\.git") { return }

    Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] 파일 변경 감지: $name" -ForegroundColor Cyan

    # 1. GitHub 업로드 (Git)
    try {
        Write-Host "📤 GitHub에 업로드 중..." -NoNewline
        & $gitPath add .
        & $gitPath commit -m "Auto-sync: $name changed ✅" -q
        & $gitPath push origin main -q
        Write-Host " 완료! ✅" -ForegroundColor Green
    } catch {
        Write-Host " 실패! (리모트 주소 확인 필요) ⚠️" -ForegroundColor Yellow
    }

    # 2. Notion 업로드 (API)
    try {
        Write-Host "📝 Notion에 기록 중..." -NoNewline
        $json = @{
            parent = @{ database_id = $dbId }
            properties = @{
                "이름" = @{
                    title = @( @{ text = @{ content = "자동 업데이트: $name ✅" } } )
                }
            }
        } | ConvertTo-Json -Depth 10

        Invoke-RestMethod -Uri "https://api.notion.com/v1/pages" `
            -Method Post `
            -Headers @{
                "Authorization" = "Bearer $token"
                "Notion-Version" = "2022-06-28"
                "Content-Type"  = "application/json"
            } `
            -Body $json
        Write-Host " 완료! ✅" -ForegroundColor Green
    } catch {
        Write-Host " 실패! ⚠️" -ForegroundColor Red
    }
}

Register-ObjectEvent $watcher "Changed" -Action $action
Register-ObjectEvent $watcher "Created" -Action $action

# 스크립트 유지
while ($true) { Start-Sleep -Seconds 5 }
