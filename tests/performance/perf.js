var perfUtils = require('./perf-utils');

global.config = perfUtils.configure( require('./config.json') );

var appPath = config.appPath;

function handleExcludedApp() {
  var output = {
    stats: {
      application: appPath,
      suites: 0
    }
  };
  console.log(JSON.stringify(output));
  process.exit(1);
}


if (perfUtils.isBlacklisted(config.blacklists.global, appPath)) {
  if (config.verbose) {
    console.error('"%s" is an excluded app, skipping tests.', appPath);
  }

  handleExcludedApp();
}

global.requireGaia = function(path)  {
  return require(config.gaiaDir + '/' + path);
};

var Manifests = requireGaia('tests/performance/manifests.js');
var appManifest = Manifests.readForApp(appPath);
if (appManifest == null) {
  console.error('Manifest for "%s" not found.', appPath);

  handleExcludedApp();
}

if (appManifest.role) {
  if (config.verbose) {
    console.error('Found role "%s". Skipping %s', appManifest.role, appPath);
  }

  handleExcludedApp();
}

if (config.verbose) {
  console.error('testing "%s"', appPath);
}

marionette.plugin('apps', require('marionette-apps'));
marionette.plugin('contentScript', require('marionette-content-script'));
