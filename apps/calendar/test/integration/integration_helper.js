var IntegrationHelper = {

  /** static cache of js blobs */
  _fileCache: {},

  cacheFile: function(file, callback) {
    if ((file in IntegrationHelper._fileCache)) {
      callback(null, IntegrationHelper._fileCache[file]);
      return;
    }

    var xhr = new XMLHttpRequest();
    var path = 'file://' + testSupport.appPath(file);
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
      timeout = 3000;

    test(function(err, result) {
      _start = _start || Date.now();

      if (Date.now() - _start > timeout) {
        callback(new Error('Timeout'));
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
          IntegrationHelper.waitFor(test, callback, timeout, _start);
        }, 100);
      }
    });
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

