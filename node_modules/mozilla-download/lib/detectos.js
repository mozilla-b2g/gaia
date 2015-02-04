/**
 * Determine OS type based on current process.
 *
 *    runner.detectOS(); // mac64
 *
 * @return {String} OS type to use for downloading firefox/b2g.
 */
function detectOS(product, target) {
  product = product || 'firefox';
  target = target || process;

  var arch = target.arch;
  var platform = target.platform;

  switch (platform) {
    case 'darwin':
      return 'mac';
    case 'linux':
      return (arch === 'x64') ? 'linux-x86_64' : 'linux-i686';
    case 'win32':
      return 'win32';
  }
}

module.exports = detectOS;
