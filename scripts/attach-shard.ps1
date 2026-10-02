<#
.SYNOPSIS
    Adds an extra world (shard) to a world the user is hosting from the
    regular DST client ("Host Game"), beyond the client's limit of two.

.DESCRIPTION
    The client can only launch two shards: TheSystemService:
    StartDedicatedServers (servercreationscreen.lua) takes just world1gen/
    world2gen, engine side. But the cluster it hosts is a normal cluster
    (shard_enabled, master_port 10888, cluster_key defaultPass), so a third
    process can join its Master like any secondary shard.

    This script clones the command line of the shard the client already
    launched for that cluster - same exe (the client's own bundled dedicated
    server), same -token, same Workshop folder, same -monitor_parent_process
    (so the extra world shuts down together with the client) - swapping only
    the shard name. The user must be hosting (in-game) before running it.

    It works on a REAL save folder, so it never deletes anything: the new
    shard's folder is created once, and later runs reuse its existing save.
    Mods always mirror the Master's modoverrides.lua.

.PARAMETER Cluster
    The hosted save's folder name (e.g. Cluster_5). Omitted = the one cluster
    currently being hosted by the client.

.PARAMETER Name
    The new shard's [SHARD] name (default Volcano).

.PARAMETER Id
    The new shard's [SHARD] id; must be unique in the cluster (default 5001).

.PARAMETER Preset
    World preset used the first time the shard generates (default
    SURVIVAL_VOLCANO_CLASSIC, from IA - Shipwrecked's map/levels/volcano.lua).

.PARAMETER TimeoutSeconds
    How long to wait for the new world to connect to the Master (default 420).

.EXAMPLE
    .\scripts\attach-shard.ps1
    .\scripts\attach-shard.ps1 -Cluster Cluster_5 -Name Volcano -Id 5001 -Preset SURVIVAL_VOLCANO_CLASSIC
#>
param(
    [string]$Cluster,
    [string]$Name = 'Volcano',
    [string]$Id = '5001',
    [string]$Preset = 'SURVIVAL_VOLCANO_CLASSIC',
    [int]$TimeoutSeconds = 420
)

$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "== $msg ==" -ForegroundColor Cyan }

# The client quotes every argument ("-cluster" "Cluster_5"); none of them
# contain spaces, so dropping the quotes gives a plain, matchable line.
function Get-PlainCommandLine($proc) { $proc.CommandLine -replace '"', '' }

# Client-launched shards are the only ones with -ownerdir on their command
# line (the test scripts' dedicated-server processes never pass it).
$hosted = Get-CimInstance Win32_Process -Filter "Name='dontstarve_dedicated_server_nullrenderer_x64.exe'" |
    Where-Object { (Get-PlainCommandLine $_) -match '-ownerdir\s' -and (Get-PlainCommandLine $_) -match '-shard\s+Master\b' }
if ($Cluster) {
    $hosted = $hosted | Where-Object { (Get-PlainCommandLine $_) -match "-cluster\s+$Cluster\b" }
}
$hosted = @($hosted)
if ($hosted.Count -eq 0) {
    throw 'No world is being hosted from the client right now. Host it first (Host Game, wait until you are in-game), then run this again.'
}
if ($hosted.Count -gt 1) {
    throw 'More than one hosted world found - pass -Cluster <Cluster_N>.'
}
$master = $hosted[0]
$cmd = Get-PlainCommandLine $master

$Cluster = [regex]::Match($cmd, '-cluster\s+(\S+)').Groups[1].Value
$ownerDir = [regex]::Match($cmd, '-ownerdir\s+(\S+)').Groups[1].Value
$DocsRoot = [Environment]::GetFolderPath('MyDocuments')
$ClusterDir = Join-Path $DocsRoot "Klei\DoNotStarveTogether\$ownerDir\$Cluster"
if (-not (Test-Path (Join-Path $ClusterDir 'cluster.ini'))) {
    throw "Found the hosted Master for $Cluster but not its folder at '$ClusterDir' (cloud save slot?)."
}
if ((Get-Content (Join-Path $ClusterDir 'cluster.ini') -Raw) -notmatch 'shard_enabled\s*=\s*true') {
    throw "$Cluster is hosted as a single world (shard_enabled = false). Host it with two worlds so the Master accepts shards."
}
Write-Step "Attaching '$Name' to $Cluster ($ClusterDir)"

# Refuse to double-launch the same shard.
$already = Get-CimInstance Win32_Process -Filter "Name='dontstarve_dedicated_server_nullrenderer_x64.exe'" |
    Where-Object { (Get-PlainCommandLine $_) -match "-cluster\s+$Cluster\b" -and (Get-PlainCommandLine $_) -match "-shard\s+$Name\b" }
if ($already) { throw "'$Name' is already running for $Cluster (PID $($already.ProcessId))." }

$dir = Join-Path $ClusterDir $Name
$firstRun = -not (Test-Path (Join-Path $dir 'save'))
New-Item -ItemType Directory -Force -Path $dir | Out-Null

# Ports: the client's own shards use 10999/10998 and Steam ports
# 27016-27017 / 8766-8767, so stay clear of those.
$serverIni = @(
    '[NETWORK]',
    'server_port = 11001',
    '',
    '[SHARD]',
    'is_master = false',
    "name = $Name",
    "id = $Id",
    '',
    '[ACCOUNT]',
    'encode_user_path = true',
    '',
    '[STEAM]',
    'master_server_port = 27030',
    'authentication_port = 8780'
)
Set-Content -Path (Join-Path $dir 'server.ini') -Value $serverIni -Encoding ASCII

# Only consulted when the shard has no save yet - an existing world keeps
# whatever it generated with.
if ($firstRun) {
    $worldgen = "return { override_enabled = true, preset = `"$Preset`" }"
    Set-Content -Path (Join-Path $dir 'worldgenoverride.lua') -Value $worldgen -Encoding ASCII
    Write-Step "First run: '$Name' will generate with preset $Preset"
}
else {
    Write-Step "Existing save found: '$Name' resumes its world"
}

# Same mods as the Master, always - a prefab missing on one side breaks
# migration there.
Copy-Item (Join-Path $ClusterDir 'Master\modoverrides.lua') (Join-Path $dir 'modoverrides.lua') -Force

# Clone the Master's command line, swapping only its shard identity.
$exe = $master.ExecutablePath
$argsLine = $cmd -replace '^\s*\S+\.exe\s*', ''
$argsLine = $argsLine -replace '-shard\s+\S+', "-shard $Name"
$argsLine = $argsLine -replace '-secondary_log_prefix\s+\S+', "-secondary_log_prefix $($Name.ToLower())"
$argsLine = $argsLine -replace '-sigprefix\s+\S+', '-sigprefix DST_Secondary'

$log = Join-Path $dir 'server_log.txt'

Write-Step "Launching '$Name' (the client's own dedicated server, same token and mods)"
# The client launches it as "../bin64/<exe>", i.e. from the install's data
# folder - match that so relative paths (../mods) resolve the same way.
$workDir = Join-Path (Split-Path (Split-Path $exe)) 'data'
if (-not (Test-Path $workDir)) { $workDir = Split-Path $exe }
$proc = Start-Process -FilePath $exe -ArgumentList $argsLine -WorkingDirectory $workDir -PassThru -WindowStyle Hidden

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$result = $null
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 3
    if ($proc.HasExited) { $result = 'CRASHED'; break }
    if (-not (Test-Path $log)) { continue }
    # A fresh process rewrites the log from the start; read it all.
    $content = Get-Content $log -Raw
    if ($content -match 'LUA ERROR|MOD ERROR') { $result = 'FAIL'; break }
    if ($content -match '\(Master\) is now connected') { $result = 'PASS'; break }
}

switch ($result) {
    'PASS' {
        Write-Host "PASS: '$Name' (id $Id) joined $Cluster. It shuts down by itself when you stop hosting." -ForegroundColor Green
        Get-Content $log | Select-String -Pattern 'is now connected'
    }
    default {
        Write-Host "$(if ($result) { $result } else { 'TIMEOUT' }): '$Name' did not connect. Log tail:" -ForegroundColor Red
        if (Test-Path $log) { Get-Content $log -Tail 30 }
        if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
    }
}
