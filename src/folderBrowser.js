const { spawn } = require('child_process');

// Opens the OS-native folder picker. Windows only for now — the server and
// browser are always on the same machine for this tool, so spawning a real
// WinForms dialog is simpler and more reliable than a browser-based picker
// (which can't return a real filesystem path anyway).
function browseForFolder(initialPath) {
  if (process.platform !== 'win32') {
    return Promise.reject(new Error('Native folder browsing is only implemented on Windows right now.'));
  }

  const escaped = String(initialPath || '').replace(/'/g, "''");
  // The dialog has no parent window, so without an explicit TopMost owner it can
  // open behind whatever window (e.g. the browser) currently has focus.
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
    "$dialog.Description = 'Select a notes folder'",
    `$dialog.SelectedPath = '${escaped}'`,
    '$owner = New-Object System.Windows.Forms.Form',
    '$owner.TopMost = $true',
    '$owner.StartPosition = "CenterScreen"',
    '$owner.ShowInTaskbar = $false',
    'if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }',
    '$owner.Dispose()',
  ].join('; ');

  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
    let output = '';
    let errorOutput = '';
    child.stdout.on('data', (d) => { output += d.toString(); });
    child.stderr.on('data', (d) => { errorOutput += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      const selected = output.trim();
      if (code !== 0 && !selected) return reject(new Error(errorOutput.trim() || 'Folder picker failed'));
      resolve(selected || null); // null means the user cancelled
    });
  });
}

module.exports = { browseForFolder };
