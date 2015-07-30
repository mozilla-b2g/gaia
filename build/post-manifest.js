'use strict';

/**
 * Updates manifest.webapp
 */

var utils = require('./utils');

function execute(options) {
  var webapp = options.webapp;
  if (utils.isExternalApp(webapp)) {
    return;
  }

  var buildManifestFile = utils.getFile(webapp.buildManifestFilePath);
  var manifest = utils.getJSON(buildManifestFile);

  // Forces the presence of `origin` field in order to help WebIDE overriding
  // the app, with the same origin.
  manifest.origin = webapp.url;

  // Get the Gaia version and set it as an app version in manifest.webapp.
  // It's used by Langpack API
  var settingsFile = utils.getFile(options.GAIA_DIR, 'build', 'config',
      'common-settings.json');
  var settings = utils.getJSON(settingsFile);

  manifest.version = settings['moz.b2g.version'];

  utils.writeContent(buildManifestFile, JSON.stringify(manifest));
}

exports.execute = execute;
