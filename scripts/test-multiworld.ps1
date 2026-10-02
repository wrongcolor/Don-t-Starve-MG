<#
.SYNOPSIS
    Boots a disposable, offline multi-shard cluster on this PC - one process
    per world - to test worlds linked by migration portals.

.DESCRIPTION
    Internal dev experiment, not part of the generated mods. Uses the
    "Don't Starve Together Dedicated Server" Steam app (headless) against a
    throwaway cluster under the real DST Documents folder, separate from the
    user's saves and ModTestCluster. Every run wipes and regenerates every
    world. PASS = the Master's log shows every secondary shard connected.

    Profiles:
      solar - Master (forest) + Caves + Solar (plain forest). The original
              third-shard experiment; pair with -Slug viana for its Solar
              Rift / Homeward Rift portals.
      ia    - Master (forest) + Shipwrecked + Volcano, with Island Adventures
              (Core + Shipwrecked) copied from the user's Steam Workshop
              folder. IA links its own portals (Seaworthy, volcano) by world
              type, not shard name (postinit/shardnetworking.lua).
      iaatc - Master (forest) + Shipwrecked + Porkland, with IA and Above
              the Clouds (Hamlet) loaded together on every shard. Crashes
              at load (see the profile's comment) - kept as the repro.
      iaatc_split - same worlds, but IA only on Forest/Shipwrecked and
              Above the Clouds only on Porkland.

.PARAMETER Profile
    Which set of worlds to boot: solar or ia.

.PARAMETER Slug
    Optional test-mods/<slug> to build and enable on every shard, plus the
    dev-only testtools mod.

.PARAMETER KeepRunning
    Leave every shard up after the check, so the user can join via
    Play -> Browse Games -> LAN and use c_debugshards() / c_migrateto().

.PARAMETER TimeoutSeconds
    How long to wait for every secondary to connect (default 420 - all
    worlds generate in parallel, and modded worldgen is slower).

.EXAMPLE
    .\scripts\test-multiworld.ps1 -Profile ia -KeepRunning
    .\scripts\test-multiworld.ps1 -Profile solar -Slug viana -KeepRunning
#>
param(
    [Parameter(Mandatory = $true)][ValidateSet('solar', 'ia', 'iaatc', 'iaatc_split')][string]$Profile,
    [string]$Slug,
    [switch]$KeepRunning,
    [int]$TimeoutSeconds = 420
)

$ErrorActionPreference = 'Stop'

# EDIT THESE PATHS if the Dedicated Server app, the client, or the Workshop
# download folder ever move.
$DedicatedServerRoot = "D:\SteamLibrary\steamapps\common\Don't Starve Together Dedicated Server"
$ClientRoot = "E:\SteamLibrary\steamapps\common\Don't Starve Together"
$WorkshopRoot = 'E:\SteamLibrary\steamapps\workshop\content\322330'
$Exe = Join-Path $DedicatedServerRoot 'bin64\dontstarve_dedicated_server_nullrenderer_x64.exe'
$RepoRoot = Split-Path -Parent $PSScriptRoot

# Presets: SURVIVAL_TOGETHER / DST_CAVE from the base game's map/levels;
# SURVIVAL_SHIPWRECKED_CLASSIC / SURVIVAL_VOLCANO_CLASSIC from IA -
# Shipwrecked's scripts/map/levels/{shipwrecked,volcano}.lua.
# Workshop ids: 3435352667 = Island Adventures - Core, 1467214795 = IA -
# Shipwrecked.
$Profiles = @{
    solar = @{
        Cluster  = 'ThreeShardCluster'
        Shards   = @(
            @{ Name = 'Master'; Id = $null;  Preset = 'SURVIVAL_TOGETHER' },
            @{ Name = 'Caves';  Id = '2001'; Preset = 'DST_CAVE' },
            @{ Name = 'Solar';  Id = '3001'; Preset = 'SURVIVAL_TOGETHER' }
        )
        Workshop = @()
    }
    ia    = @{
        Cluster  = 'IslandCluster'
        Shards   = @(
            @{ Name = 'Master';      Id = $null;  Preset = 'SURVIVAL_TOGETHER' },
            @{ Name = 'Shipwrecked'; Id = '4001'; Preset = 'SURVIVAL_SHIPWRECKED_CLASSIC' },
            @{ Name = 'Volcano';     Id = '5001'; Preset = 'SURVIVAL_VOLCANO_CLASSIC' }
        )
        Workshop = @('3435352667', '1467214795')
    }
    # Island Adventures + Above the Clouds together. PORKLAND_DEFAULT is
    # ATC's own preset (scripts/map/levels/porkland.lua). ATC is built to be
    # the MASTER world (its modservercreationmain forces world 1 to
    # porkland), so running it as a secondary is exactly what's under test.
    # Volcano left out to spare RAM. Reproduced: loading both in one process
    # crashes at load (ATC main/toolutil.lua MergeTable: "Can not override
    # SMELTER to a table" - IA's generic DESCRIBE.SMELTER is a string, ATC's
    # a table), and they share 76 prefab names and 22 component file names
    # (ATC copied IA's whole boat system) - so iaatc_split keeps them apart.
    iaatc = @{
        Cluster  = 'IslandHamletCluster'
        Shards   = @(
            @{ Name = 'Master';      Id = $null;  Preset = 'SURVIVAL_TOGETHER' },
            @{ Name = 'Shipwrecked'; Id = '4001'; Preset = 'SURVIVAL_SHIPWRECKED_CLASSIC' },
            @{ Name = 'Porkland';    Id = '6001'; Preset = 'PORKLAND_DEFAULT' }
        )
        Workshop = @('3435352667', '1467214795', '3322803908')
    }
    # Same worlds, but each shard loads only its own DLC port: IA on Forest
    # and Shipwrecked, ATC alone on Porkland. A per-shard Workshop list
    # overrides the profile's. The client does a full reset + mod reload on
    # every migration ("Reset() returning" before "resume request" in
    # client_log.txt), which is what might let this work.
    iaatc_split = @{
        Cluster  = 'IslandHamletCluster'
        Shards   = @(
            @{ Name = 'Master';      Id = $null;  Preset = 'SURVIVAL_TOGETHER' },
            @{ Name = 'Shipwrecked'; Id = '4001'; Preset = 'SURVIVAL_SHIPWRECKED_CLASSIC' },
            @{ Name = 'Porkland';    Id = '6001'; Preset = 'PORKLAND_DEFAULT'; Workshop = @('3322803908') }
        )
        Workshop = @('3435352667', '1467214795')
    }
}

$Config = $Profiles[$Profile]
$ClusterName = $Config.Cluster
$Shards = $Config.Shards
$DocsRoot = [Environment]::GetFolderPath('MyDocuments')
$ClusterDir = Join-Path $DocsRoot "Klei\DoNotStarveTogether\$ClusterName"

function Write-Step($msg) { Write-Host "== $msg ==" -ForegroundColor Cyan }

if (-not (Test-Path $Exe)) {
    throw "Dedicated server exe not found at '$Exe'. Update DedicatedServerRoot at the top of this script."
}

# The dedicated server and the regular client each read mods from their OWN
# folder (a LAN join never transfers mod files), so a repo mod goes to both.
function Install-Mod([string]$FolderName, [string]$SourceDir, [switch]$ServerOnly) {
    if (-not (Test-Path $SourceDir)) { throw "No such mod folder '$SourceDir'." }
    $roots = if ($ServerOnly) { @($DedicatedServerRoot) } else { @($DedicatedServerRoot, $ClientRoot) }
    foreach ($root in $roots) {
        if (-not (Test-Path $root)) {
            Write-Host "WARNING: '$root' not found - $FolderName not installed there." -ForegroundColor Yellow
            continue
        }
        $dest = Join-Path $root "mods\$FolderName"
        if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
        Copy-Item -Recurse $SourceDir $dest
    }
}

$repoMods = @()
if ($Slug) {
    Write-Step 'Building mods'
    Push-Location $RepoRoot
    npm run build-test-mods
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'build-test-mods failed. Fix the generator/typecheck errors first.' }
    Pop-Location

    Write-Step "Installing $Slug + testtools"
    Install-Mod -FolderName $Slug -SourceDir (Join-Path $RepoRoot "test-mods\$Slug")
    Install-Mod -FolderName 'testtools' -SourceDir (Join-Path $RepoRoot 'test-mods\testtools')
    $repoMods += $Slug, 'testtools'
}

# A shard's own Workshop list, when set, replaces the profile's.
function Get-ShardWorkshop($shard) {
    if ($shard.ContainsKey('Workshop')) { return @($shard.Workshop) }
    return @($Config.Workshop)
}

# Workshop mods: the client already loads them from its own Workshop folder
# under the same "workshop-<id>" name, so only the server needs a copy.
$allWorkshop = $Shards | ForEach-Object { Get-ShardWorkshop $_ } | Sort-Object -Unique
foreach ($id in $allWorkshop) {
    Write-Step "Installing Workshop mod $id on the dedicated server"
    Install-Mod -FolderName "workshop-$id" -SourceDir (Join-Path $WorkshopRoot $id) -ServerOnly
}

function Get-ModOverrides($shard) {
    $mods = @($repoMods) + @(Get-ShardWorkshop $shard | ForEach-Object { "workshop-$_" })
    $entries = $mods | ForEach-Object { "[`"$_`"]={ configuration_options={  }, enabled=true }" }
    return "return { $($entries -join ', ') }"
}

# Before scaffolding: a still-running shard keeps its server_log.txt and
# save files locked, so wiping them first fails. Only this cluster's own
# processes - other test clusters may be running alongside.
Write-Step "Stopping any leftover $ClusterName processes from a previous run"
Get-CimInstance Win32_Process -Filter "Name='dontstarve_dedicated_server_nullrenderer_x64.exe'" |
    Where-Object { $_.CommandLine -match "-cluster\s+$ClusterName\b" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

Write-Step "Scaffolding $ClusterName ($Profile)"
New-Item -ItemType Directory -Force -Path $ClusterDir | Out-Null

# master_port 10890 (not the client's 10888) so this can run while the user
# hosts their real world.
$clusterIni = @(
    '[GAMEPLAY]',
    'game_mode = survival',
    'max_players = 2',
    'pvp = false',
    'pause_when_empty = false',
    '',
    '[NETWORK]',
    'lan_only_cluster = true',
    'cluster_password =',
    "cluster_description = Multiworld experiment ($Profile)",
    "cluster_name = $ClusterName",
    'offline_cluster = true',
    '',
    '[MISC]',
    'console_enabled = true',
    '',
    '[SHARD]',
    'shard_enabled = true',
    'bind_ip = 127.0.0.1',
    'master_ip = 127.0.0.1',
    'master_port = 10890',
    'cluster_key = multiworldtest'
)
Set-Content -Path (Join-Path $ClusterDir 'cluster.ini') -Value $clusterIni -Encoding ASCII

# Same admin id as ModTestCluster (see test-mod-server.ps1) - cluster root,
# not a shard folder.
'OU_76561198431532652' | Set-Content -Path (Join-Path $ClusterDir 'adminlist.txt') -Encoding ASCII

# Game ports inside the LAN-only range [10998,11018], clear of 10998/10999
# (the user's own client hosting) and 11008 (ModTestCluster). Each shard
# also needs its own Steam ports or later processes fail to bind.
for ($i = 0; $i -lt $Shards.Count; $i++) {
    $s = $Shards[$i]
    $dir = Join-Path $ClusterDir $s.Name
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    $isMaster = $i -eq 0
    $serverIni = @(
        '[NETWORK]',
        "server_port = $(11010 + $i)",
        '',
        '[SHARD]',
        "is_master = $($isMaster.ToString().ToLower())"
    )
    if (-not $isMaster) {
        $serverIni += "name = $($s.Name)"
        $serverIni += "id = $($s.Id)"
    }
    $serverIni += @(
        '',
        '[ACCOUNT]',
        'encode_user_path = true',
        '',
        '[STEAM]',
        "master_server_port = $(27020 + $i)",
        "authentication_port = $(8770 + $i)"
    )
    Set-Content -Path (Join-Path $dir 'server.ini') -Value $serverIni -Encoding ASCII

    $worldgen = "return { override_enabled = true, preset = `"$($s.Preset)`" }"
    Set-Content -Path (Join-Path $dir 'worldgenoverride.lua') -Value $worldgen -Encoding ASCII

    # Normally every shard loads the same mods - a portal or item prefab
    # missing on the arrival side breaks migration there. A per-shard
    # Workshop list is the deliberate exception (iaatc_split).
    Set-Content -Path (Join-Path $dir 'modoverrides.lua') -Value (Get-ModOverrides $s) -Encoding ASCII

    foreach ($stale in @('save', 'backup', 'server_log.txt')) {
        $p = Join-Path $dir $stale
        if (Test-Path $p) { Remove-Item -Recurse -Force $p }
    }
}

$procs = @{}
foreach ($s in $Shards) {
    Write-Step "Launching shard $($s.Name)"
    $procs[$s.Name] = Start-Process -FilePath $Exe `
        -ArgumentList '-console', '-cluster', $ClusterName, '-shard', $s.Name `
        -WorkingDirectory (Split-Path $Exe) -PassThru -WindowStyle Hidden
}

$secondaries = $Shards | Select-Object -Skip 1
$masterLog = Join-Path $ClusterDir 'Master\server_log.txt'
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$result = $null
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 3
    $errored = $Shards | Where-Object {
        $log = Join-Path $ClusterDir "$($_.Name)\server_log.txt"
        (Test-Path $log) -and ((Get-Content $log -Raw) -match 'LUA ERROR|MOD ERROR')
    }
    if ($errored) { $result = 'FAIL'; break }
    $exited = $Shards | Where-Object { $procs[$_.Name].HasExited }
    if ($exited) { $result = 'CRASHED'; break }
    if (Test-Path $masterLog) {
        $content = Get-Content $masterLog -Raw
        $missing = $secondaries | Where-Object { $content -notmatch "\($($_.Name)\) is now connected" }
        if (-not $missing) { $result = 'PASS'; break }
    }
}

switch ($result) {
    'PASS' {
        Write-Host "PASS: every secondary ($(($secondaries | ForEach-Object { $_.Name }) -join ', ')) connected to the Master." -ForegroundColor Green
        Get-Content $masterLog | Select-String -Pattern 'is now connected'
    }
    'FAIL' {
        Write-Host 'FAIL: Lua/mod error. First error per shard:' -ForegroundColor Red
        foreach ($s in $Shards) {
            $log = Join-Path $ClusterDir "$($s.Name)\server_log.txt"
            if (-not (Test-Path $log)) { continue }
            $m = Select-String -Path $log -Pattern 'LUA ERROR|MOD ERROR' | Select-Object -First 1
            if ($m) {
                Write-Host "--- $($s.Name)" -ForegroundColor Yellow
                Get-Content $log | Select-Object -Skip ([Math]::Max(0, $m.LineNumber - 5)) -First 30
            }
        }
    }
    default {
        Write-Host "$(if ($result) { $result } else { 'TIMEOUT' }): log tails below." -ForegroundColor Red
        foreach ($s in $Shards) {
            $log = Join-Path $ClusterDir "$($s.Name)\server_log.txt"
            Write-Host "--- $($s.Name) (exited: $($procs[$s.Name].HasExited))" -ForegroundColor Yellow
            if (Test-Path $log) { Get-Content $log -Tail 25 }
        }
    }
}

if ($KeepRunning -and $result -eq 'PASS') {
    $ids = ($Shards | ForEach-Object { "$($_.Name)=PID $($procs[$_.Name].Id)" }) -join ', '
    Write-Host "Left running ($ids). Join '$ClusterName' via Play -> Browse Games -> LAN." -ForegroundColor Cyan
    $hops = ($secondaries | ForEach-Object { "c_migrateto(`"$($_.Id)`") -> $($_.Name)" }) -join '; '
    Write-Host "In the console: c_debugshards() lists shards; $hops; c_migrateto(`"1`") -> Master." -ForegroundColor Cyan
}
else {
    foreach ($p in $procs.Values) {
        if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue }
    }
    Write-Host 'All shards stopped.'
}
