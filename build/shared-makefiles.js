// The entry point to do build time config for shared/ files.

'use strict';

var utils = require('./utils');
var webappManifests = require('./webapp-manifests');

function execute(options) {
  var webapps = webappManifests.execute(options);
  // Generate the default keyboard layout list by checking the manifestURLs
  // of all the preload keyboard apps.
  require('default-keyboard-customize').genDefaultLayouts(options, webapps);
}

exports.execute = execute;
