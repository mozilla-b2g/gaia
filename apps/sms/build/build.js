'use strict';

/* global require, exports */
var utils = require('utils');

var SmsAppBuilder = function() {
};

// set options
SmsAppBuilder.prototype.setOptions = function(options) {
  this.stageDir = utils.getFile(options.STAGE_APP_DIR);
  this.distDirPath = options.GAIA_DISTRIBUTION_DIR;
};

SmsAppBuilder.prototype.writeBlacklist = function() {
  var defaultContent = ['4850', '7000'];
  var file =
    utils.getFile(this.stageDir.path, 'js', 'blacklist.json');
  utils.writeContent(file,
    utils.getDistributionFileContent('sms-blacklist',
      defaultContent, this.distDirPath));
};

SmsAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  this.writeBlacklist();
};

exports.execute = function(options) {
  (new SmsAppBuilder()).execute(options);
};
