global.GAIA_DIR = process.env.GAIA_DIR || './';
// define VERBOSE in the env to get more verbose output.
global.mozPerfVerbose = process.env.VERBOSE;

global.mozTestInfo = {
  appPath: process.env.CURRENT_APP,
  runs: process.env.RUNS || 5
};

const excludedApps = [
  'communications/facebook', 'communications/gmail', // part of other apps
  'communications/import', 'communications/live', // part of other apps
  'communications', // not an app
  'email/shared', // not an app
  'template', // XXX not a real thing.
  'system/test/marionette/fullscreen-app', // some test app.
  'system/camera' // copy of the camera app
];

global.excludedApps = excludedApps;

function handleExcludedApp() {
  var output = {};
  output.stats = {application: mozTestInfo.appPath,
                  suites: 0};
  console.log(JSON.stringify(output));
  process.exit(1);
}

if (excludedApps.indexOf(mozTestInfo.appPath) !== -1) {
  if (mozPerfVerbose) {
    console.error('"' + mozTestInfo.appPath +
                '" is an excluded app, skipping tests.');
  }

  handleExcludedApp();
}

global.requireGaia = function(path)  {
  return require(GAIA_DIR + '/' + path);
};

var Manifests = requireGaia('tests/performance/manifests.js');
var appManifest = Manifests.readForApp(mozTestInfo.appPath);
if (appManifest == null) {
  console.error('Manifest for "%s" not found.', mozTestInfo.appPath);

  handleExcludedApp();
}

if (appManifest.role) {
  if (mozPerfVerbose) {
    console.error('Found role "%s". Skipping %s',
                  appManifest.role, mozTestInfo.appPath);
  }

  handleExcludedApp();
}

if (mozPerfVerbose) {
  console.error('testing "' + mozTestInfo.appPath + '"');
}

marionette.plugin('apps', require('marionette-apps'));
marionette.plugin('contentScript', require('marionette-content-script'));
