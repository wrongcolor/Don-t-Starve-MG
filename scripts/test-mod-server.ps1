<#
.SYNOPSIS
    Builds a mod and boots it in a disposable, offline DST dedicated server so
    mod-load crashes (Lua errors, missing prefabs, bad globals) show up in
    seconds instead of requiring a full game-client launch + world creation.

.DESCRIPTION
    Internal dev tool, not part of the generated mods themselves. Uses the
    "Don't Starve Together Dedicated Server" Steam app (headless, no
    renderer) against a throwaway cluster (ModTestCluster, offline_cluster =
    true, lan_only, single-player) under the real DST Documents folder - kept
    entirely separate from the user's actual save. Every run wipes and
    regenerates that world, so nothing here is ever worth keeping.

.PARAMETER Slug
    The test-mods/<slug> folder to build and load (e.g. "viana").

.PARAMETER KeepRunning
    Leave the server up after the pass/fail check instead of stopping it, so
    the user can connect via DST's own client (Play -> Browse Games -> LAN)
    and actually test in-game - much faster than hosting fresh each time,
    since there's no character-select/world-gen wait on their end.

.PARAMETER TimeoutSeconds
    How long to wait for a clear pass/fail signal before giving up (default 120).

.EXAMPLE
    .\scripts\test-mod-server.ps1 -Slug viana
    .\scripts\test-mod-server.ps1 -Slug viana -KeepRunning
#>
param(
    [Parameter(Mandatory = $true)][string]$Slug,
    [switch]$KeepRunning,
    [int]$TimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'

# EDIT THESE PATHS if the Dedicated Server app, the regular game client, or
# the repo ever move.
$DedicatedServerRoot = "D:\SteamLibrary\steamapps\common\Don't Starve Together Dedicated Server"
$ClientRoot = "E:\SteamLibrary\steamapps\common\Don't Starve Together"
$RepoRoot = Split-Path -Parent $PSScriptRoot

$DocsRoot = [Environment]::GetFolderPath('MyDocuments')
$ClusterDir = Join-Path $DocsRoot 'Klei\DoNotStarveTogether\ModTestCluster'
$MasterDir = Join-Path $ClusterDir 'Master'
$LogPath = Join-Path $MasterDir 'server_log.txt'
$Exe = Join-Path $DedicatedServerRoot 'bin64\dontstarve_dedicated_server_nullrenderer_x64.exe'

function Write-Step($msg) { Write-Host "== $msg ==" -ForegroundColor Cyan }

if (-not (Test-Path $Exe)) {
    throw "Dedicated server exe not found at '$Exe'. Update DedicatedServerRoot at the top of this script."
}

Write-Step 'Building mods'
Push-Location $RepoRoot
npm run build-test-mods
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'build-test-mods failed. Fix the generator/typecheck errors first.' }
Pop-Location

function Install-TestMod([string]$ModSlug, [string]$SourceDir) {
    if (-not (Test-Path $SourceDir)) {
        throw "No such mod folder '$SourceDir'."
    }

    Write-Step "Installing $ModSlug into the dedicated server's own mods folder"
    $destMod = Join-Path $DedicatedServerRoot "mods\$ModSlug"
    if (Test-Path $destMod) { Remove-Item -Recurse -Force $destMod }
    Copy-Item -Recurse $SourceDir $destMod

    # The regular client (what the user actually opens to connect and play)
    # reads mods from its OWN, entirely separate mods folder - a LAN
    # connection never transfers mod files, so without this the client would
    # still be running whatever was installed there last, silently ignoring
    # every fresh change.
    if (Test-Path $ClientRoot) {
        Write-Step "Installing $ModSlug into the regular client's mods folder too"
        $clientDestMod = Join-Path $ClientRoot "mods\$ModSlug"
        if (Test-Path $clientDestMod) { Remove-Item -Recurse -Force $clientDestMod }
        Copy-Item -Recurse $SourceDir $clientDestMod
    }
    else {
        Write-Host "WARNING: client not found at '$ClientRoot' - update ClientRoot at the top of this script, or the player's client won't see this update." -ForegroundColor Yellow
    }
}

$SourceMod = Join-Path $RepoRoot "test-mods\$Slug"
if (-not (Test-Path $SourceMod)) {
    throw "No such test-mods/$Slug after building. Check the slug (it must match a ModProject export in mods/)."
}
Install-TestMod -ModSlug $Slug -SourceDir $SourceMod

# testtools: always day, no hunger/sanity/health loss - dev-only, hand-written
# (not part of the generator's own output), lives at test-mods/testtools and
# is never rebuilt by npm run build-test-mods, only copied here.
Install-TestMod -ModSlug 'testtools' -SourceDir (Join-Path $RepoRoot 'test-mods\testtools')

# First-run scaffolding for the throwaway cluster - created once, reused after.
if (-not (Test-Path $MasterDir)) {
    Write-Step 'First run: scaffolding the throwaway offline test cluster'
    New-Item -ItemType Directory -Force -Path $MasterDir | Out-Null
    $clusterIni = @(
        '[GAMEPLAY]',
        'game_mode = survival',
        'max_players = 1',
        'pvp = false',
        'pause_when_empty = false',
        '',
        '[NETWORK]',
        'lan_only_cluster = true',
        'cluster_password =',
        'cluster_description = Automated mod smoke test',
        'cluster_name = ModTestCluster',
        'offline_cluster = true',
        '',
        '[MISC]',
        'console_enabled = true',
        '',
        '[SHARD]',
        'shard_enabled = false'
    )
    Set-Content -Path (Join-Path $ClusterDir 'cluster.ini') -Value $clusterIni -Encoding ASCII

    # 11008: inside the LAN-only allowed range [10998,11018] but distinct from
    # 10999, the port the user's own regular-client hosting already uses -
    # collides ("SOCKET_PORT_ALREADY_IN_USE") otherwise if they're playing.
    $serverIni = @(
        '[NETWORK]',
        'server_port = 11008',
        '',
        '[SHARD]',
        'is_master = true',
        '',
        '[ACCOUNT]',
        'encode_user_path = true'
    )
    Set-Content -Path (Join-Path $MasterDir 'server.ini') -Value $serverIni -Encoding ASCII
}

# Grants console-command admin (c_give, c_spawn, etc.) on this test cluster.
# Confirmed in-game: joining ModTestCluster (offline_cluster, no Steam auth)
# assigns the player id "OU_<steamid64>" instead of the usual "KU_..." from a
# real, Steam-authenticated session, and it lands with admin=0 - reproduced
# as console commands silently doing nothing. adminlist.txt grants admin by
# user id; kept idempotent (always rewritten) since a stale/missing file is
# otherwise easy to end up with after the cluster folder already exists.
# Confirmed in-game: the server's own "OnLoadPermissionList" line resolves
# this path as ".../ModTestCluster/adminlist.txt" - the CLUSTER root, not
# Master/ - putting it under Master/ (tried first) left it silently
# unloaded, still admin=0 on connect.
'OU_76561198431532652' | Set-Content -Path (Join-Path $ClusterDir 'adminlist.txt') -Encoding ASCII

$modOverrides = "return { $Slug={ configuration_options={  }, enabled=true }, testtools={ configuration_options={  }, enabled=true } }"
Set-Content -Path (Join-Path $MasterDir 'modoverrides.lua') -Value $modOverrides -Encoding ASCII

Write-Step 'Stopping any leftover test-server process from a previous run'
# Only ModTestCluster's own process - test-three-shards.ps1
# (ThreeShardCluster) may be running alongside and must be left alone.
Get-CimInstance Win32_Process -Filter "Name='dontstarve_dedicated_server_nullrenderer_x64.exe'" |
    Where-Object { $_.CommandLine -match '-cluster\s+ModTestCluster\b' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

if (Test-Path $LogPath) { Remove-Item $LogPath -Force }

# Force a genuinely fresh world every run, not a resumed one - besides
# matching "disposable" (nothing here is ever worth keeping), a resumed
# save logs "Loading world: session/..." instead of "World generated on
# build...", which the PASS check below looks for specifically; without
# this a second run in a row (server already generated a save once) always
# fell through to TIMEOUT even when loading was actually going fine.
foreach ($savePath in @((Join-Path $MasterDir 'save'), (Join-Path $MasterDir 'backup'))) {
    if (Test-Path $savePath) { Remove-Item -Recurse -Force $savePath }
}

Write-Step 'Launching dedicated server (offline, LAN-only, disposable world)'
$proc = Start-Process -FilePath $Exe -ArgumentList '-console', '-cluster', 'ModTestCluster', '-shard', 'Master' -WorkingDirectory (Split-Path $Exe) -PassThru -WindowStyle Hidden

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$result = $null
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    if (-not (Test-Path $LogPath)) { continue }
    $content = Get-Content $LogPath -Raw
    if ($content -match 'LUA ERROR|MOD ERROR') {
        $result = 'FAIL'
        break
    }
    if ($content -match 'World generated on build') {
        $result = 'PASS'
        break
    }
    if ($proc.HasExited) {
        $result = 'CRASHED'
        break
    }
}

switch ($result) {
    'PASS' {
        Write-Host "PASS: $Slug loaded cleanly and the world generated with no Lua/mod errors." -ForegroundColor Green
    }
    'FAIL' {
        Write-Host "FAIL: error while loading $Slug" -ForegroundColor Red
        Get-Content $LogPath | Select-String -Pattern 'LUA ERROR|MOD ERROR' -Context 0, 15
    }
    'CRASHED' {
        Write-Host 'CRASHED: the server process exited unexpectedly. Log tail:' -ForegroundColor Red
        Get-Content $LogPath -Tail 40
    }
    default {
        Write-Host "TIMEOUT: no clear pass/fail signal within $TimeoutSeconds s. Log tail:" -ForegroundColor Yellow
        Get-Content $LogPath -Tail 40
    }
}

if ($KeepRunning -and $result -eq 'PASS') {
    Write-Host "Server left running (PID $($proc.Id)) on the LAN. Open DST, Play -> Browse Games -> LAN, and join 'ModTestCluster' to test in-game." -ForegroundColor Cyan
}
else {
    if (-not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host 'Test server stopped.'
}
