const utils = require('./utils');

function execute(options) {
  const WEBAPP_FILENAME = 'manifest.webapp';
  var gaia = utils.getGaia(options);
  var webappsBaseDir = utils.getFile(options.PROFILE_DIR);
  webappsBaseDir.append('webapps');
  gaia.webapps.forEach(function(app) {
    var manifest = app.buildDirectoryFile.clone();
    manifest.append(WEBAPP_FILENAME);
    if (manifest.exists()) {
      if (gaia.l10nManager) {
        var manifestContent = gaia.l10nManager.localizeManifest(app);
        var targetManifest = webappsBaseDir.clone();
        targetManifest.append(app.domain);
        utils.ensureFolderExists(targetManifest);
        targetManifest.append(WEBAPP_FILENAME)

        utils.writeContent(targetManifest, JSON.stringify(manifestContent));
      } else {
        var webappTargetDir = webappsBaseDir.clone();
        webappTargetDir.append(app.domain);
        manifest.copyTo(webappTargetDir, WEBAPP_FILENAME);
      }
    }
  })
}

exports.execute = execute;
