global.GAIA_DIR = process.env.GAIA_DIR || './';

global.mozTestInfo = {
  appPath: process.env.CURRENT_APP,
  runs: process.env.RUNS || 5
};

const excludedApps = [
  'bluetooth', 'keyboard', 'wallpaper', // no generic way to test yet
  'communications/facebook', 'communications/gmail', // part of other apps
  'communications/import', 'communications/live', // part of other apps
  'communications', // not an app
  'costcontrol', // XXX FIXME. Hang for now
  'email/shared', // not an app
  'fl', 'pdfjs', 'setringtone', // XXX activities
  'template', // XXX not a real thing.
  'homescreen', // we can't "launch" it
  'search', // new rocketbar isn't standalone
  'system', // reboots the phone
  'system/test/marionette/fullscreen-app', // some test app.
  'system/camera' // copy of the camera app
];

global.excludedApps = excludedApps;

if (excludedApps.indexOf(mozTestInfo.appPath) !== -1) {
  if (process.env.VERBOSE) {
    console.log('"' + mozTestInfo.appPath +
                '" is an excluded app, skipping tests.');
  }

  var output = {};
  output.stats = {application: mozTestInfo.appPath,
                  suites: 0};
  console.log(JSON.stringify(output));
  process.exit(1);
}

global.requireGaia = function(path)  {
  return require(GAIA_DIR + '/' + path);
};
