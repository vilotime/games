<#
.SYNOPSIS
    一键同步「叶初小游戏」的游戏清单（games.json → 主页卡片 / 侧栏入口 / 各处数量）

.DESCRIPTION
    改了 games.json 之后跑一次，把 HTML 里的静态兜底（没网 / 禁用 JS 时用的副本）对齐 json。
    底层就是 node tools/export-games.js，这里负责：找 node、先校验 json、跑完把结果留住、报错看得懂。

.PARAMETER Check
    只检查有没有不一致，不写文件。

.PARAMETER Serve
    同步完顺手起本地预览（node tools/dev.js），改完 json 保存会自动再同步。

.PARAMETER NoPause
    跑完不停留（给其他脚本 / 命令行里连续调用用）。双击运行时不要加这个，否则窗口会一闪而过。

.EXAMPLE
    .\tools\sync.ps1
    同步并停留，看结果

.EXAMPLE
    .\tools\sync.ps1 -Check -NoPause
    只检查，供脚本调用
#>
[CmdletBinding()]
param(
    [switch]$Check,
    [switch]$Serve,
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$exporter = Join-Path $repoRoot 'tools\export-games.js'
$dataFile = Join-Path $repoRoot 'games.json'
$devScript = Join-Path $repoRoot 'tools\dev.js'

function Write-Head($text) {
    Write-Host ''
    Write-Host "=== $text ===" -ForegroundColor Cyan
}
function Fail($text) {
    Write-Host ''
    Write-Host "[失败] $text" -ForegroundColor Red
}

Write-Head '叶初小游戏 · 游戏清单同步'
Write-Host ("仓库：{0}" -f $repoRoot) -ForegroundColor DarkGray

# ---------- 1. 环境检查 ----------
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Fail '没找到 node。装一个 Node.js（https://nodejs.org/）后重开这个窗口。'
    if (-not $NoPause) { Read-Host '按回车关闭' | Out-Null }
    exit 1
}
Write-Host ("node：{0}" -f (& node -v)) -ForegroundColor DarkGray

if (-not (Test-Path $dataFile)) {
    Fail "找不到 games.json：$dataFile"
    if (-not $NoPause) { Read-Host '按回车关闭' | Out-Null }
    exit 1
}
if (-not (Test-Path $exporter)) {
    Fail "找不到同步脚本：$exporter"
    if (-not $NoPause) { Read-Host '按回车关闭' | Out-Null }
    exit 1
}

# ---------- 2. 先校验 json 能不能读 ----------
try {
    $raw = Get-Content -LiteralPath $dataFile -Raw -Encoding UTF8
    $json = $raw | ConvertFrom-Json
} catch {
    Fail ('games.json 不是合法 JSON，先修好再同步：' + $_.Exception.Message)
    if (-not $NoPause) { Read-Host '按回车关闭' | Out-Null }
    exit 1
}

$cats = @($json.categories)
$total = 0
foreach ($c in $cats) { $total += @($c.games).Count }
Write-Host ("games.json：{0} 款游戏，{1} 个分类" -f $total, $cats.Count) -ForegroundColor Gray
foreach ($c in $cats) {
    Write-Host ("  · {0}：{1} 款" -f $c.name, @($c.games).Count) -ForegroundColor Gray
}

# ---------- 3. 跑同步 ----------
Write-Head ($(if ($Check) { '检查（不写文件）' } else { '同步静态兜底' }))
$args = @($exporter)
if ($Check) { $args += '--check' }

$before = (Get-Date)
& node @args
$code = $LASTEXITCODE
$elapsed = [math]::Round(((Get-Date) - $before).TotalMilliseconds)

Write-Host ''
if ($code -eq 0) {
    Write-Host ("[完成] 用时 {0} ms" -f $elapsed) -ForegroundColor Green
} else {
    Fail "同步脚本返回 $code，看上面的报错。"
}

# ---------- 4. 可选：起本地预览 ----------
if ($Serve -and $code -eq 0) {
    Write-Head '启动本地预览（Ctrl + C 结束）'
    & node $devScript
}

if (-not $NoPause) {
    Write-Host ''
    Write-Host '按回车关闭…' -ForegroundColor DarkGray
    Read-Host | Out-Null
}
exit $code
