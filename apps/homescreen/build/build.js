'use strict';

/* global require, exports */
var utils = require('utils');
var manager = require('homescreen-manager');

var HomeScreenAppBuilder = function() {
};

HomeScreenAppBuilder.prototype.execute = function(options) {
  var homescreen = manager.getHomescreen(options, 'homescreen');

  var stageDir = utils.getFile(options.STAGE_APP_DIR);
  var configFile = utils.getFile(stageDir.path, 'js', 'init.json');
  utils.writeContent(configFile, JSON.stringify(homescreen));
};

exports.execute = function(options) {
  utils.copyToStage(options);
  (new HomeScreenAppBuilder()).execute(options);
};
