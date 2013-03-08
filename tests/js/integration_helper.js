require('/test_apps/test-agent/common/test/helper.js');
require('/tests/js/vendor/marionette.js');
require('/tests/js/marionette_helper.js');

var IntegrationHelper = (function() {

  var IntegrationHelper = {

    /** static cache of js blobs */
    _fileCache: {},

    /**
     * Returns a filesystem apps relative to the root of gaia.
     *
     * @param {String} path relative path.
     * @return {String} absolute path output.
     */
    appPath: function(path) {
      return _IMPORT_ROOT + '/../../' + path;
    },

    cacheFile: function(file, callback) {
      if ((file in IntegrationHelper._fileCache)) {
        callback(null, IntegrationHelper._fileCache[file]);
        return;
      }

      var xhr = new XMLHttpRequest();
      var path = 'file://' + IntegrationHelper.appPath(file);
      xhr.open('GET', path, true);

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status !== 0 && xhr.status !== 200) {
            callback(new Error(
              'cannot load file "' + path + '" status: "' + xhr.status + '"'
            ));
            return;
          }

          IntegrationHelper._fileCache[file] = xhr.responseText;
          callback(null, xhr.responseText);
        }
      }

      xhr.send(null);
    },

    importScript: function(driver, file, callback) {
      IntegrationHelper.cacheFile(file, function(err, content) {
        driver.importScript(content, callback);
      });
    },

    waitFor: function(test, timeout, callback, _start) {
      if (typeof(timeout) === 'function') {
        callback = timeout;
        timeout = null;
      }

      if (!timeout)
        timeout = 10000;

      test(function(err, result) {
        _start = _start || Date.now();

        if (Date.now() - _start > timeout) {
          callback(
            new Error('Timeout more then: "' + timeout + 'ms has passed.')
          );
          return;
        }

        if (err) {
          callback(err);
          return;
        }

        if (result) {
          callback(null, result);
        } else {
          setTimeout(function() {
            IntegrationHelper.waitFor(test, timeout, callback, _start);
          }, 100);
        }
      });
    },

    delay: function(device, timeout, givenCallback) {
      givenCallback = givenCallback || device.defaultCallback;

      var start = Date.now();
      this.waitFor(function(callback) {
        if (Date.now() - start >= timeout) {
          callback(null, true);
        } else {
          callback(null, null);
        }
      }, null, givenCallback);
    },

    unlock: function(device) {
      this.importScript(
        device,
        '/tests/atoms/gaia_lock_screen.js',
        function() {
          device.executeAsyncScript('GaiaLockScreen.unlock();', null,
                                    device.defaultCallback);
        }
      );
    },

    /**
     * send a js blob to marionette.
     *
     * @param {Marionette.Client} driver marionette driver.
     * @param {String} name filename of atom (minus the js).
     * @param {Boolean} async  true for async.
     * @param {Array} [arguments] optional arguments.
     * @param {Function} callback node style callback.
     */
    sendAtom: function(driver, name, async, args, callback) {
      if (typeof(args) === 'function') {
        callback = args;
        args = null;
      }

      var method;

      if (async) {
        method = 'executeAsyncScript';
      } else {
        method = 'executeScript';
      }

      if (name.lastIndexOf('.js', name.length - 1) === -1) {
        name += '.js';
      }

      IntegrationHelper.cacheFile(name, function(err, data) {
        if (err) {
          callback(err);
          return;
        }
        driver[method](data, (args || []), callback);
      });
    }

  };

  return IntegrationHelper;
}(this));
