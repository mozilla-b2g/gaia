'use strict';
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

  var list = [];
  for (var origin in options.apps) {
    list.push({ origin: origin, source: options.apps[origin] });
  }

  installApps(profile, list, callback);
}

module.exports = apps;
