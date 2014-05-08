const utils = require('./utils');

function execute(options) {
  const WEBAPP_FILENAME = 'manifest.webapp';
  var gaia = utils.gaia.getInstance(options);
  var webappsBaseDir = utils.getFile(options.PROFILE_DIR);
  webappsBaseDir.append('webapps');
  gaia.webapps.forEach(function(app) {
    var webappTargetDir = webappsBaseDir.clone();
    var manifest = app.buildDirectoryFile.clone();

    manifest.append(WEBAPP_FILENAME);
    webappTargetDir.append(app.domain);
    if (manifest.exists()) {
      manifest.copyTo(webappTargetDir, WEBAPP_FILENAME);
    }
  });
}

exports.execute = execute;
