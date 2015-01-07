'use strict';

/* global require, exports */

const utils = require('./utils');

function execute(options, webapp) {
  if (utils.isExternalApp(webapp)) {
    return;
  }

  var manifest = utils.getJSON(webapp.buildManifestFile);

  // Forces the presence of `origin` field in order to help WebIDE overriding
  // the app, with the same origin.
  manifest.origin = webapp.url;

  utils.writeContent(webapp.buildManifestFile,
                     JSON.stringify(manifest));
}
exports.execute = execute;
