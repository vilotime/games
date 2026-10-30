<#
.SYNOPSIS
    一键生成「叶初小游戏」的站点图标：根目录 favicon.ico + assets/icon-*.png + apple-touch-icon.png

.DESCRIPTION
    为什么需要这个脚本（详见 docs/cover-and-icons.md）：
      · 搜索引擎（Bing / Google）只认根目录的 /favicon.ico，没有就直接退回托管域名的小图标；
      · 现代浏览器优先用 SVG，但爬虫不认 SVG，所以两种都要有；
      · 多尺寸 PNG 让抓缩略图的爬虫按 sizes 挑，不会把 512 缩成 16 用。

    跑完会写出：
      · <仓库根>/favicon.ico                     内含 16 / 32 / 48 三个尺寸（PNG 压缩的 ICO）
      · <仓库根>/assets/icon-16.png
      · <仓库根>/assets/icon-32.png
      · <仓库根>/assets/icon-192.png
      · <仓库根>/assets/icon-512.png
      · <仓库根>/assets/apple-touch-icon.png     180x180（iOS 添加到主屏幕）

    然后回读校验：ICO 头是不是真的 ICO、每个 PNG 的实际宽高对不对。
    改完文件后记得跑一次 tools\sync.cmd（或 node tools/export-games.js）把 index.html 的 head 同步一遍。

    assets/favicon.svg 是手写的矢量版，本脚本不会动它 —— 换图标设计时记得把 SVG 一起换掉，
    否则现代浏览器（用 SVG）和搜索引擎（用 ICO）会显示两个不同的图标。

.PARAMETER Design
    mark（默认）：渐变圆角方块 + 白色播放三角，和 assets/favicon.svg 一致。
    photo      ：用 -Source 指定的一张方形图居中裁切当图标（小尺寸下观感一般，慎用）。

.PARAMETER Source
    -Design photo 时要用的图片（PNG / JPG 都行），例如 assets\share-square.png。

.PARAMETER Bg1
    -Design mark 时渐变的亮色，默认 #4f9cf9。

.PARAMETER Bg2
    -Design mark 时渐变的暗色，默认 #2347a8。

.PARAMETER NoPause
    跑完不停留（给其他脚本 / 命令行里连续调用用）。

.EXAMPLE
    .\tools\make-icons.ps1
    渐变底 + 白色播放三角，生成全套图标并校验

.EXAMPLE
    .\tools\make-icons.ps1 -Design photo -Source assets\share-square.png
    用现成的一张方图生成图标

.EXAMPLE
    .\tools\make-icons.ps1 -NoPause
    不停留在窗口里（脚本调用）
#>
[CmdletBinding()]
param(
    [ValidateSet('mark', 'photo')]
    [string]$Design = 'mark',
    [string]$Source = '',
    [string]$Bg1 = '#4f9cf9',
    [string]$Bg2 = '#2347a8',
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$assetsDir = Join-Path $repoRoot 'assets'
$icoPath = Join-Path $repoRoot 'favicon.ico'
$icoSizes = @(16, 32, 48)                 # ICO 里内置的尺寸
$pngTargets = @(
    @{ File = 'icon-16.png'; Size = 16 },
    @{ File = 'icon-32.png'; Size = 32 },
    @{ File = 'icon-192.png'; Size = 192 },
    @{ File = 'icon-512.png'; Size = 512 },
    @{ File = 'apple-touch-icon.png'; Size = 180 }
)
$superSample = 4                          # 先放大 4 倍画，再缩回去，小尺寸边缘才不糙

function Write-Head($text) {
    Write-Host ''
    Write-Host "=== $text ===" -ForegroundColor Cyan
    Write-Host ("仓库：{0}" -f $repoRoot) -ForegroundColor DarkGray
}
function Fail($text) {
    Write-Host ''
    Write-Host "[失败] $text" -ForegroundColor Red
    if (-not $NoPause) { Read-Host '按回车关闭' | Out-Null }
    exit 1
}

Add-Type -AssemblyName System.Drawing

# ---------- 画图工具 ----------

# 圆角矩形路径（GDI+ 的弧线参数是外接矩形的宽高，所以半径要乘 2）
function New-RoundRectPath([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
    $p = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $d = [single]($r * 2)
    $p.AddArc($x, $y, $d, $d, 180, 90)
    $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    return $p
}

# 高质量绘图上下文
function New-Canvas([System.Drawing.Bitmap]$bmp) {
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    return $g
}

function New-Blank([int]$size) {
    $b = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $b.SetResolution(96, 96)
    return $b
}

# 画一遍「渐变圆角方块 + 白色播放三角」的基准图（4 倍超采样，缩到目标尺寸更干净）
function New-MarkBitmap([int]$size) {
    $n = [int]($size * $superSample)
    $big = New-Blank $n
    $g = New-Canvas $big
    try {
        $rect = [System.Drawing.Rectangle]::new(0, 0, $n, $n)
        $bg = New-RoundRectPath 0 0 $n $n ($n * 0.22)
        $grad = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
            $rect,
            [System.Drawing.ColorTranslator]::FromHtml($Bg1),
            [System.Drawing.ColorTranslator]::FromHtml($Bg2),
            [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)
        $g.FillPath($grad, $bg)

        # 播放三角：和 assets/favicon.svg 里那条 path 用同一套单位坐标
        $tri = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $tri.AddPolygon(([System.Drawing.PointF[]]@(
            [System.Drawing.PointF]::new([single]($n * 0.38), [single]($n * 0.28)),
            [System.Drawing.PointF]::new([single]($n * 0.68), [single]($n * 0.50)),
            [System.Drawing.PointF]::new([single]($n * 0.38), [single]($n * 0.72))
        )))
        $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
        $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, [single]($n * 0.08))
        $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
        $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $g.FillPath($white, $tri)
        $g.DrawPath($pen, $tri)

        $pen.Dispose(); $white.Dispose(); $tri.Dispose(); $grad.Dispose(); $bg.Dispose()
    } finally {
        $g.Dispose()
    }

    $out = New-Blank $size
    $g2 = New-Canvas $out
    try {
        $g2.DrawImage($big, [System.Drawing.Rectangle]::new(0, 0, $size, $size))
    } finally {
        $g2.Dispose()
        $big.Dispose()
    }
    return $out
}

# 用一张照片做图标：居中裁成正方形 → 套圆角 → 缩放到目标尺寸
function New-PhotoBitmap([int]$size) {
    $n = [int]($size * $superSample)
    $src = [System.Drawing.Image]::FromFile($Source)
    try {
        $side = [Math]::Min($src.Width, $src.Height)
        $sx = [int](($src.Width - $side) / 2)
        $sy = [int](($src.Height - $side) / 2)
        $big = New-Blank $n
        $g = New-Canvas $big
        $clip = New-RoundRectPath 0 0 $n $n ($n * 0.22)
        try {
            $g.SetClip($clip)
            $g.DrawImage($src, [System.Drawing.Rectangle]::new(0, 0, $n, $n),
                [System.Drawing.Rectangle]::new($sx, $sy, $side, $side),
                [System.Drawing.GraphicsUnit]::Pixel)
        } finally {
            $g.Dispose()
            $clip.Dispose()
        }
    } finally {
        $src.Dispose()
    }

    $out = New-Blank $size
    $g2 = New-Canvas $out
    try {
        $g2.DrawImage($big, [System.Drawing.Rectangle]::new(0, 0, $size, $size))
    } finally {
        $g2.Dispose()
        $big.Dispose()
    }
    return $out
}

function Get-PngBytes([System.Drawing.Bitmap]$bmp) {
    $ms = [System.IO.MemoryStream]::new()
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $ms.Dispose()
    return $bytes
}

# 写 ICO：6 字节文件头 + 每个尺寸 16 字节目录项 + 各尺寸的 PNG 数据（Vista 之后都认这种）
function Write-IcoFile([string]$path, [int[]]$sizes, [hashtable]$pngBytes) {
    $fs = [System.IO.File]::Create($path)
    $bw = [System.IO.BinaryWriter]::new($fs)
    try {
        $bw.Write([uint16]0)                # reserved
        $bw.Write([uint16]1)                # type：1 = 图标
        $bw.Write([uint16]$sizes.Count)

        $offset = 6 + 16 * $sizes.Count
        foreach ($s in $sizes) {
            $len = $pngBytes[$s].Length
            $b = if ($s -ge 256) { 0 } else { $s }   # 0 表示 256
            $bw.Write([byte]$b)             # 宽
            $bw.Write([byte]$b)             # 高
            $bw.Write([byte]0)              # 调色板色数（真彩写 0）
            $bw.Write([byte]0)              # reserved
            $bw.Write([uint16]1)            # color planes
            $bw.Write([uint16]32)           # 每像素位数
            $bw.Write([uint32]$len)         # 数据长度
            $bw.Write([uint32]$offset)      # 数据偏移
            $offset += $len
        }
        # 必须显式转成 byte[]：直接写 hashtable 取出来的 [object]，PowerShell 会挑
        # BinaryWriter.Write(byte) 这个重载，只写进去第一个字节
        foreach ($s in $sizes) {
            $data = [byte[]]$pngBytes[$s]
            $bw.Write($data, 0, $data.Length)
        }
        $bw.Flush()
    } finally {
        $bw.Dispose()
        $fs.Dispose()
    }
}

function Get-PngSize($bytes) {
    if ($null -eq $bytes -or $bytes.Length -lt 24) { return $null }
    # PNG 签名 89 50 4E 47 0D 0A 1A 0A
    if (-not ($bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47)) { return $null }
    # 注意：byte 参与 -shl 会按 byte 截断（[byte]2 -shl 8 = 0），所以先转 [int64] 再乘
    $w = [int64]$bytes[16] * 16777216 + [int64]$bytes[17] * 65536 + [int64]$bytes[18] * 256 + [int64]$bytes[19]
    $h = [int64]$bytes[20] * 16777216 + [int64]$bytes[21] * 65536 + [int64]$bytes[22] * 256 + [int64]$bytes[23]
    return [pscustomobject]@{ Width = $w; Height = $h }
}

# 回读 ICO：不是真 ICO（比如只是把 PNG 改了扩展名）就返回 $null
function Test-IcoFile([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) { return $null }
    $b = [System.IO.File]::ReadAllBytes($path)
    if ($b.Length -lt 22) { return $null }
    if ([System.BitConverter]::ToUInt16($b, 0) -ne 0) { return $null }
    if ([System.BitConverter]::ToUInt16($b, 2) -ne 1) { return $null }
    $count = [System.BitConverter]::ToUInt16($b, 4)
    if ($count -lt 1) { return $null }
    $sizes = @()
    for ($i = 0; $i -lt $count; $i++) {
        $off = 6 + 16 * $i
        if ($off + 16 -gt $b.Length) { return $null }
        $w = [int]$b[$off]
        if ($w -eq 0) { $w = 256 }
        $len = [System.BitConverter]::ToUInt32($b, $off + 8)
        $pos = [System.BitConverter]::ToUInt32($b, $off + 12)
        if ([int64]$pos + [int64]$len -gt $b.Length) { return $null }
        $sizes += $w
    }
    return $sizes
}

# ---------- 开始 ----------

Write-Head '叶初小游戏 · 生成图标'

if (-not (Test-Path -LiteralPath $assetsDir)) { Fail "找不到 assets 目录：$assetsDir" }
if ($Design -eq 'photo') {
    if (-not $Source) { Fail '-Design photo 需要同时给 -Source（例如 -Source assets\share-square.png）' }
    if (-not (Test-Path -LiteralPath (Resolve-Path -LiteralPath $Source))) { Fail "找不到 -Source 指定的图片：$Source" }
    $Source = (Resolve-Path -LiteralPath $Source).Path
    Write-Host ("设计：photo（{0}）" -f $Source) -ForegroundColor Gray
} else {
    Write-Host ("设计：mark（渐变 {0} → {1} + 白色播放三角）" -f $Bg1, $Bg2) -ForegroundColor Gray
}

$allSizes = @($icoSizes + ($pngTargets | ForEach-Object { $_.Size }) | Sort-Object -Unique)
$bitmaps = @{}
$pngBytes = @{}

foreach ($s in $allSizes) {
    if ($Design -eq 'photo') { $bmp = New-PhotoBitmap $s } else { $bmp = New-MarkBitmap $s }
    $bitmaps[$s] = $bmp
    $pngBytes[$s] = Get-PngBytes $bmp
}

# 1. 各尺寸 PNG
foreach ($t in $pngTargets) {
    $path = Join-Path $assetsDir $t.File
    $data = [byte[]]$pngBytes[$t.Size]
    [System.IO.File]::WriteAllBytes($path, $data)
    $info = Get-PngSize $data
    Write-Host ("  · assets\{0,-22} {1,5} 字节  {2}x{3}" -f $t.File, $data.Length, $info.Width, $info.Height) -ForegroundColor Gray
}

# 2. 根目录 favicon.ico
Write-IcoFile $icoPath $icoSizes $pngBytes
Write-Host ("  · favicon.ico（根目录）                      {0,5} 字节" -f (Get-Item -LiteralPath $icoPath).Length) -ForegroundColor Gray

foreach ($b in $bitmaps.Values) { $b.Dispose() }

# ---------- 回读校验 ----------
Write-Head '回读校验'
$bad = 0

$icoSizesRead = Test-IcoFile $icoPath
if (-not $icoSizesRead) {
    Write-Host '  ✖ favicon.ico 不是合法的 ICO（文件头不对）' -ForegroundColor Red
    $bad++
} else {
    $want = ($icoSizes | Sort-Object) -join ' / '
    $got = ($icoSizesRead | Sort-Object) -join ' / '
    if ($want -eq $got) {
        Write-Host ("  ✓ favicon.ico：内置 {0} —— 真 ICO，size 对得上" -f $got) -ForegroundColor Green
    } else {
        Write-Host ("  ✖ favicon.ico：内置 {0}，期望 {1}" -f $got, $want) -ForegroundColor Red
        $bad++
    }
}

foreach ($t in $pngTargets) {
    $path = Join-Path $assetsDir $t.File
    $info = Get-PngSize ([System.IO.File]::ReadAllBytes($path))
    if (-not $info) {
        Write-Host ("  ✖ {0}：不是合法的 PNG" -f $t.File) -ForegroundColor Red
        $bad++
    } elseif ($info.Width -ne $t.Size -or $info.Height -ne $t.Size) {
        Write-Host ("  ✖ {0}：实际 {1}x{2}，期望 {0}" -f $t.File, $info.Width, $info.Height) -ForegroundColor Red
        $bad++
    } else {
        Write-Host ("  ✓ {0}：{1}x{1}" -f $t.File, $t.Size) -ForegroundColor Green
    }
}

Write-Host ''
if ($bad -eq 0) {
    Write-Host '[完成] 全部生成并校验通过' -ForegroundColor Green
    Write-Host '下一步：跑一次 tools\sync.cmd 把 index.html 的 head（图标 / 分享卡片）同步一遍' -ForegroundColor DarkGray
} else {
    Write-Host ("[失败] {0} 个文件没通过校验" -f $bad) -ForegroundColor Red
}

if (-not $NoPause) {
    Write-Host ''
    Write-Host '按回车关闭…' -ForegroundColor DarkGray
    Read-Host | Out-Null
}
exit $(if ($bad -eq 0) { 0 } else { 1 })
