'use strict';

/* global require, exports */
var utils = require('utils');
var manager = require('homescreen-manager');
var svoperapps = require('./homescreen-svoperapps');

var VerticalHomeAppBuilder = function() {
};

VerticalHomeAppBuilder.prototype.execute = function(options) {
  var homescreen = manager.getHomescreen(options);

  var stageDir = utils.getFile(options.STAGE_APP_DIR);
  var configFile = utils.getFile(stageDir.path, 'js', 'init.json');
  utils.writeContent(configFile, JSON.stringify(homescreen));

  if (options.VARIANT_PATH) {
    svoperapps.execute(options, homescreen, stageDir);
  }
};

exports.execute = function(options) {
  (new VerticalHomeAppBuilder()).execute(options);
};
