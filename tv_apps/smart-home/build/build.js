'use strict';

/* global require, exports */
var utils = require('utils');

var SmartHomeAppBuilder = function() {
};

SmartHomeAppBuilder.prototype.execute = function(options) {
  var stageDir = utils.getFile(options.STAGE_APP_DIR);
  var configFile = utils.getFile(stageDir.path, 'js', 'init.json');
  var defaultConfigFile =
    utils.getFile(options.APP_DIR, 'build', 'smart-home.json');
  var defaultConfig = utils.getJSON(defaultConfigFile);
  // TODO: to verify correctness of defaultConfig
  utils.writeContent(configFile, JSON.stringify(defaultConfig));
};

exports.execute = function(options) {
  utils.copyToStage(options);
  (new SmartHomeAppBuilder()).execute(options);
};
