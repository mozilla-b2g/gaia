'use strict';

var r = require('r-wrapper');
var utils = require('utils');

function createPresetsFile(options) {
  var presetsFile = utils.getFile(options.APP_DIR, 'js/common', 'presets.js');

  var config = JSON.parse(
    utils.getFileContent(
      utils.getFile(options.APP_DIR, 'build', 'config.json')
    )
  );

  var presets = utils.getDistributionFileContent(
    'calendar',
    config,
    options.GAIA_DISTRIBUTION_DIR
  );

  utils.writeContent(presetsFile, 'define(' + presets + ');');
}

exports.execute = function(options) {
  var config = utils.getFile(options.APP_DIR, 'build', 'calendar.build.js');
  var requirejs = r.get(options.GAIA_DIR);

  createPresetsFile(options);
  utils.ensureFolderExists(utils.getFile(options.STAGE_APP_DIR));

  dump('Will run rjs optimizer...\n');
  var optimize = new Promise((accept, reject) => {
    requirejs.optimize([config.path], accept, reject);
  });

  optimize.then(() => {
    dump('[OK] rjs optimize\n');
  })
  .catch((err) => {
    dump(err + '\n');
  });
};
