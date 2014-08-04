
var fs = require('fs');

var Manifests = {

  makeAppPath: function (path) {
    var appPath = global.GAIA_DIR + '/apps/' + path;
    return appPath;
  },

  read: function (appPath) {
    var manifestPath = appPath + '/manifest.webapp';
    if (!fs.existsSync(manifestPath)) {
      manifestPath = appPath + '/update.webapp';
      if (!fs.existsSync(manifestPath)) {
        return null;
      }
    }
    var content = fs.readFileSync(manifestPath);
    try {
      var manifest = JSON.parse(content.toString());
      return manifest;
    } catch(e) {
      return null;
    }
  },

  readForApp: function (app) {
    var appName, entryPoint;
    var arr = app.split('/');
    appName = arr[0];
    entryPoint = arr[1];

    var path = this.makeAppPath(appName);

    return this.read(path);
  }

};

module.exports = Manifests;
