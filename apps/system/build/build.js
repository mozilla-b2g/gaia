'use strict';

/* global require, exports */
var utils = require('utils');

var SystemAppBuilder = function() {
};

// set options
SystemAppBuilder.prototype.setOptions = function(options) {
  this.stageDir = utils.getFile(options.STAGE_APP_DIR);
  this.appDir = utils.getFile(options.APP_DIR);
  this.distDirPath = options.GAIA_DISTRIBUTION_DIR;
};

SystemAppBuilder.prototype.addCustomizeFiles = function() {
  if (!utils.getFile(this.distDirPath, 'power').exists()) {
    return;
  }
  var self = this;
  var fileDir = utils.getFile(this.distDirPath, 'power');
  var files = utils.ls(fileDir);
  files.forEach(function(file) {
    utils.copyFileTo(file.path,
      utils.joinPath(self.stageDir.path, 'resources', 'power'),
        file.leafName, true);
  });
};

SystemAppBuilder.prototype.initConfigJsons = function() {
  var iccDefault = {
    'defaultURL': 'http://www.mozilla.org/en-US/firefoxos/'
  };
  var wapuaprofDefault = {
  };
  var iccFile = utils.getFile(this.stageDir.path, 'resources', 'icc.json');
  var wapFile = utils.getFile(this.stageDir.path, 'resources',
    'wapuaprof.json');

  utils.writeContent(iccFile,
    utils.getDistributionFileContent('icc', iccDefault, this.distDirPath));

  utils.writeContent(wapFile,
    utils.getDistributionFileContent('wapuaprof',
      wapuaprofDefault, this.distDirPath));

};

SystemAppBuilder.prototype.generateManifest = function() {
  var manifest =
    utils.getJSON(utils.getFile(this.appDir.path, 'manifest.webapp'));
  manifest.activities = manifest.activities || {};

  manifest.activities.view = {
    filters: {
      type: 'url',
      url: {
        required: true,
        pattern: '(https?:|data:).{1,16384}',
        patternFlags: 'i'
      }
    }
  };
  // Write content to build_stage
  utils.writeContent(utils.getFile(this.stageDir.path, 'manifest.webapp'),
                     JSON.stringify(manifest));
};

SystemAppBuilder.prototype.execute = function(options) {
  this.setOptions(options);
  this.initConfigJsons();
  if (options.HAIDA) {
    this.generateManifest();
  }
  if (this.distDirPath) {
    this.addCustomizeFiles();
  }
};

exports.execute = function(options) {
  (new SystemAppBuilder()).execute(options);
};
