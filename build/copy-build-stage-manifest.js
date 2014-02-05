const utils = require('./utils');

function execute(options) {
  const WEBAPP_FILENAME = 'manifest.webapp';
  const STAGE_FOLDER = utils.getEnv('STAGE_FOLDER');
  var gaia = utils.getGaia(options);
  var webappsBaseDir = utils.getFile(options.PROFILE_DIR);
  webappsBaseDir.append('webapps');
  gaia.webapps.forEach(function(app) {
    if (app.buildDirectoryFile.parent.leafName !== STAGE_FOLDER) {
      return;
    }

    var manifest = app.buildDirectoryFile.clone();
    manifest.append(WEBAPP_FILENAME);
    if (manifest.exists()) {
      var webappTargetDir = webappsBaseDir.clone();
      webappTargetDir.append(app.domain);
      manifest.copyTo(webappTargetDir, WEBAPP_FILENAME);
    }
  })
}

exports.execute = execute;