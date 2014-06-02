'use strict';

/**
 *  This module contains all the build time generation logic needed to
 *  use the import functionality both by the FTU and Comms Applications
 *
 *  The Functions exported by this module are used by the build scripts
 *  of Comms and FTU apps
 *
 */

/* global require, exports */
const utils = require('utils');

// Generates the communications services configuration as JS file
// loaded by the application (parameters.js)
function generateServicesConfig(config) {
  var importServicesFile = utils.resolve(
                        config.CONTACTS_IMPORT_SERVICES_PATH, config.GAIA_DIR);

  if (!importServicesFile.exists()) {
    throw new Error('file not found: ' + importServicesFile.path);
  }

  var importServices = utils.getJSON(importServicesFile);

  // Bug 883344 Only use default facebook app id if is mozilla partner build
  if (config.OFFICIAL === '1') {
    importServices.facebook.applicationId = '395559767228801';
    importServices.live.applicationId = '00000000440F8B08';
  }

  var jsPrefix =  'var oauthflow = this.oauthflow || {}; oauthflow.params = ';

  var resultFile = utils.resolve(
    utils.joinPath('shared', 'pages', 'import', 'js', 'parameters.js'),
                    config.GAIA_DIR);

  utils.writeContent(resultFile, jsPrefix +
                     JSON.stringify(importServices) + ';');
}

exports.execute = function(config) {
  generateServicesConfig(config);
};
