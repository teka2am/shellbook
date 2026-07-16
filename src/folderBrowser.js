const { spawn } = require('child_process');

// Opens the OS-native folder picker. The server and browser are always on the
// same machine for this tool, so spawning a real native dialog is simpler and
// more reliable than a browser-based picker (which can't return a real
// filesystem path anyway).
function browseForFolder(initialPath) {
  if (process.platform === 'win32') return browseWindows(initialPath);
  if (process.platform === 'darwin') return browseMac(initialPath);
  if (process.platform === 'linux') return browseLinux(initialPath);
  return Promise.reject(new Error(`Native folder browsing is not implemented for platform "${process.platform}".`));
}

function browseWindows(initialPath) {
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

  return runPicker('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
}

function browseMac(initialPath) {
  const escaped = String(initialPath || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  // AppleScript's `choose folder` throws error -128 when the user cancels, and
  // throws if the default location doesn't exist — both are handled below.
  const script = [
    'try',
    `  set startLoc to POSIX file "${escaped}"`,
    'on error',
    '  set startLoc to (path to home folder)',
    'end try',
    'try',
    '  set chosenFolder to choose folder with prompt "Select a notes folder" default location startLoc',
    'on error number -128',
    '  return ""',
    'end try',
    'return POSIX path of chosenFolder',
  ].join('\n');

  return runPicker('osascript', ['-e', script]);
}

function browseLinux(initialPath) {
  // Try zenity first (GNOME/most distros), fall back to kdialog (KDE) if it's not installed.
  return runPicker('zenity', ['--file-selection', '--directory', '--title=Select a notes folder', `--filename=${String(initialPath || '')}/`])
    .catch((err) => {
      if (err.code !== 'ENOENT') throw err;
      return runPicker('kdialog', ['--getexistingdirectory', String(initialPath || '')]);
    })
    .catch((err) => {
      if (err.code === 'ENOENT') {
        throw new Error('Native folder browsing requires "zenity" or "kdialog" to be installed.');
      }
      throw err;
    });
}

function runPicker(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
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
