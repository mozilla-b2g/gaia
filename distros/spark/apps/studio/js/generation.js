/*global
  MimeMapper
 */

(function(exports) {
  'use strict';

  function proposeDownload(blob) {
    console.log('proposeDownload');
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'app.zip';
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blob);
  }

  function uninstallIfNeeded(theme) {
    if (!theme.manifestURL) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      var all = navigator.mozApps.mgmt.getAll();
      all.onsuccess = (e) => {
        var toDelete = e.target.result.find((app) => {
          return (app.manifestURL === theme.manifestURL);
        });
        if (toDelete) {
          var req = navigator.mozApps.mgmt.uninstall(toDelete);
          req.onsuccess = resolve;
          req.onerror = reject;
        } else {
          reject(new Error('could not find the app to uninstall'));
        }
      };
      all.onerror = reject;
    });
  }

  function importBlob(blob, enable) {
    console.log('importBlob');
    if (!navigator.getDeviceStorage) {
      return Promise.reject(new Error('getDeviceStorage is unavailable.'));
    }
    // Save the blob to a file because we don't support importing memory blobs.
    var sdcard = navigator.getDeviceStorage('sdcard');
    return new Promise((resolve, reject) => {
      function sendError(msg) {
        console.log(msg);
        reject(msg);
      }

      if (!sdcard) {
        sendError('No SDCard!');
        return;
      }

      var fileName = 'temp-app.zip';

      var delReq = sdcard.delete(fileName);
      delReq.onsuccess = delReq.onerror = function() {
        var req = sdcard.addNamed(blob, fileName);
        req.onsuccess = function(e) {
          var getReq = sdcard.get(fileName);
          getReq.onsuccess = function() {
            var file = this.result;
            navigator.mozApps.mgmt.import(file).then(
              function(app) {
                if (enable) {
                  var setting = { 'theme.selected' : app.manifestURL };
                  var req = navigator.mozSettings.createLock().set(setting);
                  req.onsuccess = resolve.bind(null, app.manifestURL);
                  req.onerror = sendError;
                } else {
                  resolve(app.manifestURL);
                }
              },
              function(error) { sendError('Error importing: ' + error.name); }
            );
          }
          getReq.onerror = function() {
            sendError('Error getting file: ' + this.error.name);
          }
        }
        req.onerror = function(e) {
          sendError('Error saving blob: ' + this.error.name);
        }
      };
    });
  }

  function exportTheme(enable, theme) {
    // Worker path configuration.
    zip.workerScriptsPath = './js/libs/';

    console.log('exportTheme ' + theme.title);

    // TODO: use a stable appId.
    var appId = 'app' + Math.round(Math.random() * 100000000);
    var app = new AppZip();
    app.metaData = {
      installOrigin: 'http://gaiamobile.org',
      manifestURL: 'app://theme' + appId + '.gaiamobile.org/update.webapp',
      version: 1
    };

    app.manifest = {
      name: theme.title,
      package_path: '/application.zip',
    };

    // Build a simple package with a manifest and index.html
    var inner = new PackageHelper();

    var manifest = {
      name: theme.title,
      role: "theme",
      type: "certified",
      origin: 'app://theme' + appId + '.gaiamobile.org'
    };

    return inner.init().then(() => {
      function addManifest() {
        return inner.addResource('manifest.webapp', JSON.stringify(manifest));
      }

      function addCSS() {
        return inner.addResource('shared/elements/gaia-theme/gaia-theme.css', userStyle(theme));
      }

      function addWallpaper(blob) {
        // if we don't have a (valid) wallpaper we still want an empty JSON
        var wallpaperFile = null;
        var wallpaper = { homescreen: null };
        if (blob) {
          var type = MimeMapper.guessExtensionFromType(blob.type);
          if (type) {
            wallpaperFile = 'wallpaper.' + type;
            wallpaper.homescreen = '/' + wallpaperFile;
          } else {
            console.error('Unrecognized type: ' + blob.type);
          }
        }

        // We can't use Promise.all to add both files because it corrupts the
        // zip
        return Promise.resolve()
          .then(() => inner.addResource(
            'wallpaper.json', JSON.stringify(wallpaper)))
          .then(function() {
            if (wallpaperFile) {
              inner.addResource(wallpaperFile, blob);
            }
          });
      }

      var zipPromise = addManifest().then(addCSS);
      var image = null;
      if (theme.autotheme) {
        image = theme.autotheme.image;
      }
      zipPromise = zipPromise.then(() => addWallpaper(image));

      return zipPromise.then(inner.asBlob.bind(inner))
        .then((packageBlob) => {
          app.packageblob = packageBlob;
          return app.asBlob();
        }).then((appBlob) => {
          return uninstallIfNeeded(theme)
            .then(() => {
              return importBlob(appBlob, enable);
            })
            .then((manifestURL) => {
              theme.manifestURL = manifestURL;
              return Storage.updateTheme(theme);
            })
            .then(() => Promise.resolve(image &&
              navigator.mozSettings.createLock().set({
                'wallpaper.image': image
              })
            ))
            .catch((e) => {
              console.error('Error while importing blob', e);
              // Desktop debug
              // proposeDownload(appBlob);
              alert('This device is not theming compatible');
            });
        });
    });
  }

  function userStyle(theme) {
    var roots = [':root', '.theme-productivity', '.theme-communications',
                 '.theme-settings', '.theme-media'];

    var str = '';
    roots.forEach(function(root) {
      str += root + ' {\n';
      var group;
      if (root === ':root') {
        group = 'default';
        // Add :root CSS variables here.
        str += '--transition-duration: 0.2s;\n';
      } else {
        group = root.split('-')[1];
      }
      Object.keys(theme.groups[group]).forEach(function(sectionKey) {
        var section = theme.groups[group][sectionKey];
        Object.keys(section).forEach(function(key) {
          str += key + ': ' + section[key] + ';\n';
        });
      });
      str += '}\n';
    });
    return str;
  }

  function fakeInstall(css) {
    var override = document.createElement('style');
    override.innerHTML = css;
    document.body.appendChild(override);
  }

  function checkIfSelected(theme) {
    return new Promise((resolve, reject) => {
      var req = navigator.mozSettings.createLock().get('theme.selected');
      req.onsuccess = function(e) {
        resolve([(req.result['theme.selected'] == theme.manifestURL), theme]);
      };
      req.onerror = reject;
    });
  }

  exports.Generation = {
    installTheme: function(id, enable) {
      return Storage.fetchTheme(id)
      .then(checkIfSelected)
      .then((results) => {
        return exportTheme(results[0] || enable, results[1]);
      });
    },
    uninstallIfNeeded: function(theme) {
      return checkIfSelected(theme)
      .then((results) => {
        var selected = results[0];
        if (selected) {
          alert("You can't remove the selected theme");
        } else {
          return uninstallIfNeeded(theme);
        }
      });
    }
  };
})(window);
