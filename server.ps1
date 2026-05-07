$ErrorActionPreference = "Stop"

$Root = $PSScriptRoot
$Port = 4173
$Address = [System.Net.IPAddress]::Any
$Listener = [System.Net.Sockets.TcpListener]::new($Address, $Port)

$Types = @{
  ".css" = "text/css; charset=utf-8"
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".png" = "image/png"
  ".svg" = "image/svg+xml"
  ".webp" = "image/webp"
}

function Send-Response {
  param (
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$Status,
    [string]$ContentType,
    [byte[]]$Body
  )

  $Reason = if ($Status -eq 200) { "OK" } else { "Not Found" }
  $Header = "HTTP/1.1 $Status $Reason`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
  $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Header)
  $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
  $Stream.Write($Body, 0, $Body.Length)
}

try {
  $Listener.Start()
  Write-Host "Jack Kleinick site running locally at http://127.0.0.1:$Port"
  Write-Host "For another computer on this network, use this computer's LAN IP with port $Port."

  while ($true) {
    $Client = $Listener.AcceptTcpClient()
    try {
      $Stream = $Client.GetStream()
      $Reader = [System.IO.StreamReader]::new($Stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $RequestLine = $Reader.ReadLine()

      if (-not $RequestLine) {
        $Client.Close()
        continue
      }

      $PathPart = ($RequestLine -split " ")[1]
      $PathPart = [System.Uri]::UnescapeDataString(($PathPart -split "\?")[0])
      if ($PathPart -eq "/") { $PathPart = "/index.html" }

      $Relative = $PathPart.TrimStart("/") -replace "/", [System.IO.Path]::DirectorySeparatorChar
      $File = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $Relative))

      if (-not $File.StartsWith($Root) -or -not [System.IO.File]::Exists($File)) {
        $Body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        Send-Response -Stream $Stream -Status 404 -ContentType "text/plain; charset=utf-8" -Body $Body
      } else {
        $Ext = [System.IO.Path]::GetExtension($File).ToLowerInvariant()
        $ContentType = if ($Types.ContainsKey($Ext)) { $Types[$Ext] } else { "application/octet-stream" }
        $Body = [System.IO.File]::ReadAllBytes($File)
        Send-Response -Stream $Stream -Status 200 -ContentType $ContentType -Body $Body
      }
    } catch {
      Write-Warning $_.Exception.Message
    } finally {
      $Client.Close()
    }
  }
} finally {
  $Listener.Stop()
}
