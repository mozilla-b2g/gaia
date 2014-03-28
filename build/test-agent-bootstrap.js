'use strict';

/* global require, exports */
const utils = require('utils');

function updateFile(source, dest) {
  if (!dest.exists()) {
    source.copyTo(dest.parent, dest.leafName);
  } else if (source.lastModifiedTime > dest.lastModifiedTime) {
    dest.remove(false);
    source.copyTo(dest.parent, dest.leafName);
  }
}

exports.execute = function(options) {
  var srcDir = utils.getFile(options.GAIA_DIR, 'test_apps', 'test-agent',
    'common', 'test', 'boilerplate');
  var proxyFile = srcDir.clone();
  proxyFile.append('_proxy.html');

  var sandboxFile = srcDir.clone();
  sandboxFile.append('_sandbox.html');

  options.GAIA_APPDIRS.split(' ').forEach(function(appPath) {
    var testDir = utils.getFile(appPath, 'test');
    var unitDir = testDir.clone();
    unitDir.append('unit');
    var integrationDir = testDir.clone();
    integrationDir.append('integration');

    utils.ensureFolderExists(unitDir);
    utils.ensureFolderExists(integrationDir);

    var destProxyFile = utils.getFile(unitDir.path, proxyFile.leafName);
    updateFile(proxyFile, destProxyFile);

    var destSandboxFile = utils.getFile(unitDir.path, sandboxFile.leafName);
    updateFile(sandboxFile, destSandboxFile);
  });
};
