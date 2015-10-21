'use strict';

/* global require, exports */
var utils = require('utils');

exports.execute = function(options) {
  utils.copyToStage(options);

  var file = utils.getFile(options.STAGE_APP_DIR, 'js', 'config.js');
  var content = 'var SERVICE_WORKERS = ' + (options.NGA_SERVICE_WORKERS === '1') + ';'

  utils.writeContent(file, content);
};
