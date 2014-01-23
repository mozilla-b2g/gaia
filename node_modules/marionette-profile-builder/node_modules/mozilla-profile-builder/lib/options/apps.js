var installApps = require('packaged-webapp').installApps;

function apps(profile, options, callback) {
  // abort if no apps are given
  if (
    // no options
    !options ||
    // no apps
    !options.apps ||
    // empty app object
    (Object.keys(options.apps).length === 0)
  ) {
    return process.nextTick(callback.bind(null, null, profile));
  }

  var apps = [];
  for (var origin in options.apps) {
    apps.push({ origin: origin, source: options.apps[origin] });
  }

  installApps(profile, apps, callback);
}

module.exports = apps;
