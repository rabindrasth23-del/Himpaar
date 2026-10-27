# Banned-claims search across apps/web. Prints raw hits (CSS/attr noise filtered).
# Usage: pwsh scripts/banned-words.ps1   (exit 1 if any hits)
$pattern = 'guaranteed|mid-market|compliant|licensed|authori[sz]ed|partner|regulated|official|secure|faster|cheaper|zero-fee|zero fee|instant|bank-grade|bank-level|trusted by|Nepal Rastra|transparent|tax proof|hidden|encrypt|\bSOC\b|\bPCI\b|GDPR|\bISO\b'
$noise = 'aria-hidden|overflow-hidden|outline-hidden|bg-transparent|border-transparent|text-transparent|\bhidden\s+(sm|md|lg|xl):|className="hidden|[" ]hidden["` ]|toISOString|sr-only'
$files = Get-ChildItem -Path apps/web -Recurse -File -Include *.ts,*.tsx,*.html,*.json,*.css,*.txt,*.xml,*.webmanifest |
  Where-Object { $_.FullName -notmatch '\\(node_modules|dist)\\' }
$hits = $files | Select-String -Pattern $pattern | Where-Object { $_.Line -notmatch $noise }
$hits | ForEach-Object { "{0}:{1}: {2}" -f (Resolve-Path -Relative $_.Path), $_.LineNumber, $_.Line.Trim() }
"--- $($hits.Count) hit(s)"
if ($hits.Count -gt 0) { exit 1 }
