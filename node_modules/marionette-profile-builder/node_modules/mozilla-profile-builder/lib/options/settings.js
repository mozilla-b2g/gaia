/** handles mutation of settings.json */
var SETTINGS = 'settings.json';
var PERMISSIONS_DB = 'permissions.sqlite';

var fs = require('fs'),
    fsPath = require('path');

/**
 * Updates the settings.json file of a given profile
 *
 * @param {String} profile path.
 * @param {Options} options with .settings.
 * @param {Function} callback [Error err, profile].
 */
function settings(profile, options, callback) {
  if (!options || !options.settings) {
    return process.nextTick(callback.bind(null, null, profile));
  }

  // location of settings.json
  var settingsPath = fsPath.join(profile, SETTINGS);
  // location of permissions
  var permissionsPath = fsPath.join(profile, PERMISSIONS_DB);

  function readSettings() {
    fs.readFile(settingsPath, 'utf8', function(err, content) {
      var json;
      try {
        json = JSON.parse(content);
      } catch (e) {
        return callback(e);
      }

      writeSettings(json);
    });
  }

  function writeSettings(original) {
    var permsPath = settingsPath
    // copy new settings over
    var newSettings = options.settings;
    for (var name in newSettings) {
      original[name] = newSettings[name];
    }

    var pending = 2;
    function next(err) {
      if (err) {
        callback && callback(err);
        callback = null;
      }

      if (--pending === 0)
        callback(null, profile);
    }

    fs.exists(permissionsPath, function(itDoes) {
      if (!itDoes)
        return next();

      fs.unlink(permissionsPath, next);
    });

    // and finally write the file back out
    fs.writeFile(
      settingsPath,
      // slows it down a but but makes it readable!
      JSON.stringify(original, null, 2),
      next
    );
  }

  // check if file exists
  fs.exists(settingsPath, function(fileExists) {
    if (fileExists) {
      // when file exists read it then write
      readSettings();
    } else {
      // otherwise simply write
      writeSettings({});
    }
  });
}

module.exports = settings;
