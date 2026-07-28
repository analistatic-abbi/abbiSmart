$base = 'c:\Users\ALEJANDRO MARTINEZ P\OneDrive\Escritorio\smartLicitaciones-back\.stitch-export\stitch_sistema_de_gesti_n_abbi'
$out = 'c:\Users\ALEJANDRO MARTINEZ P\OneDrive\Escritorio\smartLicitaciones-back\.stitch-export\batches'
$batchSize = 4

New-Item -ItemType Directory -Force -Path $out | Out-Null
$screens = Get-ChildItem $base -Directory | Sort-Object Name

for ($i = 0; $i -lt $screens.Count; $i += $batchSize) {
  $num = [math]::Floor($i / $batchSize) + 1
  $batchDir = Join-Path $out ("batch$num")
  if (Test-Path $batchDir) { Remove-Item $batchDir -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $batchDir | Out-Null

  $end = [math]::Min($i + $batchSize - 1, $screens.Count - 1)
  $slice = $screens[$i..$end]
  foreach ($s in $slice) {
    Copy-Item $s.FullName (Join-Path $batchDir $s.Name) -Recurse -Force
  }

  $zip = Join-Path $out ("stitch_batch$num.zip")
  if (Test-Path $zip) { Remove-Item $zip -Force }
  Compress-Archive -Path (Join-Path $batchDir '*') -DestinationPath $zip -Force
  Write-Output "batch$num`: $($slice.Count) screens -> $zip"
}
