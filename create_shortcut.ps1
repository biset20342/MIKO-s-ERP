Add-Type -AssemblyName System.Drawing

# 1. Draw 256x256 icon
$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background gradient (dark navy to deep purple)
$p1 = New-Object System.Drawing.Point(0, 0)
$p2 = New-Object System.Drawing.Point($size, $size)
$c1 = [System.Drawing.Color]::FromArgb(255, 20, 24, 60)
$c2 = [System.Drawing.Color]::FromArgb(255, 48, 20, 90)
$gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($p1, $p2, $c1, $c2)
$rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
$g.FillRectangle($gradBrush, $rect)
$gradBrush.Dispose()

# ERP text
$fontFamily = New-Object System.Drawing.FontFamily("Segoe UI")
$font1 = New-Object System.Drawing.Font($fontFamily, 56, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$color1 = [System.Drawing.Color]::FromArgb(255, 120, 200, 255)
$brush1 = New-Object System.Drawing.SolidBrush($color1)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$textRect = New-Object System.Drawing.RectangleF(0, 40, $size, 96)
$g.DrawString("ERP", $font1, $brush1, $textRect, $sf)
$font1.Dispose()
$brush1.Dispose()

# Colourful bar chart
$barHeights = @(60, 90, 50, 110, 70)
$barColors = @(
    [System.Drawing.Color]::FromArgb(255, 100, 220, 180),
    [System.Drawing.Color]::FromArgb(255, 170, 130, 255),
    [System.Drawing.Color]::FromArgb(255, 100, 180, 255),
    [System.Drawing.Color]::FromArgb(255, 255, 180, 100),
    [System.Drawing.Color]::FromArgb(255, 255, 120, 150)
)
$barW = 24
$baseY = 210

for ($i = 0; $i -lt 5; $i++) {
    $h = $barHeights[$i]
    $bx = 40 + $i * 36
    $by = $baseY - $h
    $br = New-Object System.Drawing.SolidBrush($barColors[$i])
    $barRect = New-Object System.Drawing.Rectangle($bx, $by, $barW, $h)
    $g.FillRectangle($br, $barRect)
    $br.Dispose()
}

# Baseline
$linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(80, 255, 255, 255), 2)
$g.DrawLine($linePen, 30, ($baseY + 4), 226, ($baseY + 4))
$linePen.Dispose()

# Heart decoration (top right)
$heartFont = New-Object System.Drawing.Font($fontFamily, 30, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$heartColor = [System.Drawing.Color]::FromArgb(255, 255, 120, 150)
$heartBrush = New-Object System.Drawing.SolidBrush($heartColor)
$heartPt = New-Object System.Drawing.PointF(182, 12)
$g.DrawString([char]9829, $heartFont, $heartBrush, $heartPt)
$heartFont.Dispose()
$heartBrush.Dispose()

$g.Dispose()

# 2. Save as ICO (PNG-inside-ICO format)
$iconPath = Join-Path $PSScriptRoot "erp_icon.ico"
$pngStream = New-Object System.IO.MemoryStream
$bmp.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $pngStream.ToArray()
$pngStream.Dispose()
$bmp.Dispose()

$icoStream = [System.IO.File]::OpenWrite($iconPath)
$writer = New-Object System.IO.BinaryWriter($icoStream)
$writer.Write([uint16]0)               # Reserved
$writer.Write([uint16]1)               # Type: icon
$writer.Write([uint16]1)               # Image count
$writer.Write([byte]0)                 # Width (0 = 256)
$writer.Write([byte]0)                 # Height (0 = 256)
$writer.Write([byte]0)                 # Colour count
$writer.Write([byte]0)                 # Reserved
$writer.Write([uint16]1)               # Planes
$writer.Write([uint16]32)              # Bit count
$writer.Write([uint32]$pngBytes.Length)
$writer.Write([uint32]22)              # Offset to image data (6 + 16 = 22)
$writer.Write($pngBytes)
$writer.Close()
$icoStream.Close()

Write-Host "Icon saved: $iconPath"

# 3. Create Desktop shortcut
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$lnkPath = Join-Path $desktop "ProjectERP.lnk"
$lnk = $shell.CreateShortcut($lnkPath)
$lnk.TargetPath = Join-Path $PSScriptRoot "start.bat"
$lnk.WorkingDirectory = $PSScriptRoot
$lnk.IconLocation = "$iconPath, 0"
$lnk.Description = "ProjectERP"
$lnk.Save()

Write-Host "Shortcut created: $lnkPath"
Write-Host "Done!"
