require('/tests/js/integration_helper.js');

var AppIntegration = (function() {

  // remember we don't have window.atob here
  function decode(data) {
    // http://kevin.vanzonneveld.net
    // +   original by: Tyler Akins (http://rumkin.com)
    // +   improved by: Thunder.m
    // +      input by: Aman Gupta
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: Onno Marsman
    // +   bugfixed by: Pellentesque Malesuada
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +      input by: Brett Zamir (http://brett-zamir.me)
    // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==');
    // *     returns 1: 'Kevin van Zonneveld'
    // mozilla has this native
    // - but breaks in 2.0.0.12!
    //if (typeof this.window['btoa'] == 'function') {
    //    return btoa(data);
    //}
    var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
              'abcdefghijklmnopqrstuvwxyz0123456789+/=';
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
      ac = 0,
      dec = '',
      tmp_arr = [];

    if (!data) {
      return data;
    }

    data += '';

    do { // unpack four hexets into three octets using index points in b64
      h1 = b64.indexOf(data.charAt(i++));
      h2 = b64.indexOf(data.charAt(i++));
      h3 = b64.indexOf(data.charAt(i++));
      h4 = b64.indexOf(data.charAt(i++));

      bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

      o1 = bits >> 16 & 0xff;
      o2 = bits >> 8 & 0xff;
      o3 = bits & 0xff;

      if (h3 == 64) {
        tmp_arr[ac++] = String.fromCharCode(o1);
      } else if (h4 == 64) {
        tmp_arr[ac++] = String.fromCharCode(o1, o2);
      } else {
        tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
      }
    } while (i < data.length);

    dec = tmp_arr.join('');

    return dec;
  }

  /**
   * Returns parsed test variables from the file denoted by the
   * TESTVARS environment variable or "testvars.json" if it exists.
   *
   * If the file doesn't exist, then this logs an error to the console
   * and returns {}.
   */
  function getTestVars() {
    var env = window.xpcModule.require('env');
    var testvars = env.get('TESTVARS') || 'testvars.json';
    var fs = window.xpcModule.require('fs');

    if ((testvars.slice(0, 1) !== '/') && (!fs.existsSync(testvars))) {
      // This starts in the tests/js/ directory, so we go up two
      // directories and start relative to there.
      testvars = '../../' + testvars;
    }

    if (fs.existsSync(testvars)) {
      return JSON.parse(fs.readFileSync(testvars));
    }

    console.error('ERROR: "' + testvars + '" does not exist.');
    return {};
  }

  function AppIntegration(device) {
    this.device = device;
    this.defaultCallback = device.defaultCallback;
    this.allTestVars = getTestVars();
  }

  AppIntegration.prototype = {

    /**
     * Directory where screenshots get dumped by default (root of gaia).
     */
    screenshotDir: IntegrationHelper.appPath(''),

    /**
     * Default screenshot format.
     */
    screenshotFormat: 'screenshot_%y_%m_%d_%T.png',

    /**
     * To be overriden by subclasses.
     * @type String
     */
    appName: null,

    origin: null,

    src: null,

    name: null,

    frame: null,

    /** selector tables */

    /**
     * Simple selector table to be overridden by subclasses.
     *
     * @type {Object}
     */
    selectors: {
      //settingsView: '#settings'
    },

    /**
     * Returns the test vars for this app (as specified
     * by this.appName) or {}.
     */
    getAppTestVars: function() {
      return this.allTestVars[this.appName] || {};
    },

    /**
     * Task helper so this class and its children
     * can use generator functions internally.
     *
     * @param {Function} generator steps to task.
     * @param {Function} callback callback function.
     * @param {Object} [context=this] optional context.
     */
    task: function(generator, callback, context) {
      callback = (callback || this.defaultCallback);
      context = (context || this);

      var instance;

      function next(err, value) {
        if (err && !(err instanceof StopIteration)) {
          try {
            instance.throw(err);
          } catch (e) {
            callback(e, null);
            instance.close();
          }
        } else {
          try {
            instance.send(value);
          } catch (e) {
            if (!(e instanceof StopIteration)) {
              throw e;
            }
          }
        }
      }

      // ugly but awesome hack
      // this is how we can switch
      // generators in .task
      var app = Object.create(this);
      app.defaultCallback = next;
      app.device = Object.create(app.device);
      app.device.defaultCallback = next;

      var instance = generator.call(context, app, next, callback);
      instance.next();
    },

    createCommand: function(func) {
      var command = func + '(' + this.manifestURL.quote();
      if (this.entryPoint) {
        command += ', ' + this.entryPoint.quote();
      }
      command += ')';

      return command;
    },

    /**
     * Closes the app and switches focus back to system.
     */
    close: function(callback) {
      var self = this;

      this.task(function(app, next, done) {
        var device = app.device;

        // calling switchToFrame without an argument
        // will switch back to the main frame.
        yield device.switchToFrame();

        var closeCommand = self.createCommand('GaiaApps.closeWithManifestURL');
        var result = yield device.executeAsyncScript(closeCommand);

        done();
      }, callback);
    },

    /**
     * Launches application and switches focus to its frame.
     *
     * @param {Boolean} [waitForBody=true] when true will wait until body is displayed.
     * @param {Function} [callback] for inheritance purposes.
     */
    launch: function(waitForBody, callback) {
      var self = this;

      if (typeof(waitForBody) === 'undefined') {
        waitForBody = true;
      }

      this.task(function(app, next, done) {
        var device = app.device;

        yield IntegrationHelper.importScript(
          device,
          '/tests/atoms/gaia_lock_screen.js',
          MochaTask.nodeNext
        );

        yield device.executeAsyncScript(
          'GaiaLockScreen.unlock();'
        );

        yield IntegrationHelper.importScript(
          device,
          '/tests/atoms/gaia_apps.js',
          MochaTask.nodeNext
        );

        var launchCommand = self.createCommand('GaiaApps.launchWithManifestURL');
        var result = yield device.executeAsyncScript(launchCommand);

        yield device.switchToFrame(result.frame);

        self.origin = result.origin;
        self.src = result.src;
        self.name = result.name;
        self.frame = result.frame;

        if (waitForBody) {
          var body = yield device.findElement('body');
          yield app.waitUntilElement(body, 'displayed');
        }

        done(null, self);

      }, callback);
    },

    /**
     * Take a screenshot (includes statusbar, etc..).
     *
     * @param {String} [name] optional name
     *                        something like "screenshot_[time].png" by default.
     *
     * @param {Function} [callback] optional callback.
     */
    screenshot: function(name, callback) {
      var defaultName = (new Date()).toLocaleFormat(
        this.screenshotFormat
      );

      if (typeof(name) === 'undefined') {
        name = defaultName;
      }

      if (typeof(name) === 'function') {
        callback = name;
        name = defaultName;
      }

      if (name.indexOf('.png') === -1) {
        name += '.png';
      }

      // xpcmodule helper for writing to files. uses node FS api.
      var fs = window.xpcModule.require('fs');
      var path = this.screenshotDir + name;

      this.task(function(app, next, done) {
        var device = app.device;

        yield device.setContext('chrome');

        var base64 = yield IntegrationHelper.sendAtom(
          device,
          '/tests/atoms/screenshot',
          false,
          next
        );

        // remove the data-uri information;
        base64 = base64.slice(22);
        fs.writeFileSync(path, decode(base64));

        yield device.setContext('content');

        done(null, path);
      }, callback);
    },

    /**
     * Wait until element condition is met.
     */
    waitUntilElement: function(element, method, callback) {
      this.waitFor(element[method].bind(element), 15000, callback);
    },

    /**
     * Fired callback when condition is true or after
     * it has timed out.
     */
    waitFor: function(test, timeout, callback) {
      IntegrationHelper.waitFor(
        test, timeout, callback || this.defaultCallback
      );
    },

    /**
     * Finds a named selector.
     *
     * @param {String} name aliased css selector.
     * @return {String} css selector.
     */
    selector: function(name) {
      var selector;
      if (!(name in this.selectors)) {
        throw new Error('unknown element "' + name + '"');
      }

      return this.selectors[name];
    },

    /**
     * Finds a group of elements based on named selector.
     * (see .selectors)
     *
     * @param {String} name selector alias.
     * @param {Function} [callback] uses driver by default.
     */
    elements: function(name, callback) {
      this.device.findElements(this.selector(name), callback);
    },

    /**
     * Returns the current remote time in MS
     *
     *    var time = yield app.remoteTime();
     *    var date = new Date(time);
     */
    remoteTime: function(callback) {
      this.task(function(app, next, done) {

        // Function.toString is busted (804404)
        var ms = yield app.device.executeScript(
          'return Date.now();'
        );

        done(null, ms);
      }, callback);
    },

    /**
     * Given a date object returns an object with
     * date information relative to the remote runtime.
     *
     *    var result = yield app.deviceDate(new Date());
     *    // { year: .., month: ..., date: ...,
     *    //   hours: ..., minutes: .., seconds: ... }
     *
     * @param {Date} date date object local to test runtime.
     */
    remoteDate: function(callback) {
      this.task(function(app, next, done) {

        var remote = yield IntegrationHelper.sendAtom(
          app.device,
          '/tests/atoms/remote_date',
          false,
          next
        );

        done(null, new Date(
          remote.year,
          remote.month,
          remote.date,
          remote.hours,
          remote.minutes,
          remote.seconds
        ));

      }, callback, this);
    },

    /**
     * Find a named selector.
     * (see .selectors)
     *
     *
     *    var dayView = yield app.element('dayView');
     *
     *
     * @param {String} name selector alias.
     * @param {Function} [callback] uses driver by default.
     */
    element: function(name, callback) {
      this.device.findElement(this.selector(name), callback);
    },

    /**
     * gets all values from the form.
     *
     * @param {Array|String|Marionette.Element} form
     *  named element array of elements or element.
     */
    formValues: function(form, callback) {
      this.task(function(app, next, done) {
        var elements;

        if (typeof(form) === 'string') {
          elements = yield app.elements(form);
        } else if (form instanceof Marionette.Element) {
          elements = yield form.findElements('[name]', next);
        } else {
          elements = form;
        }

        var values = {};
        var i = 0;
        var len = elements.length;

        for (; i < len; i++) {
          var element = elements[i];
          var tagName = yield element.tagName(next);
          var type = yield element.getAttribute('type', next);
          var name = yield element.getAttribute('name', next);
          var atts = name.match(/\[(.*?)\]/g);
          var value = yield element.getAttribute('value', next);
          if (!atts) {
            values[name] = value;
          } else {
            var name = name.substring(0, name.indexOf('['));
            values[name] = values[name] || {};
            values[name] = this._nameToHash(values[name], atts, value);
          }
        }
        done(null, values);
      }, callback);
    },

    _nameToHash: function(result, atts, value) {
      var pointer = result;
      for (var i = 0; i < atts.length; i++) {
        var name = atts[i].substring(1, atts[i].length - 1);
        if (i == atts.length - 1) {
          pointer[name] = value;
          break;
        }
        if (!pointer[name])
          pointer[name] = {};
        pointer = pointer[name];
      }
      return result;
    },

    /**
     * Updates form values.
     * Will clear the original value then
     * send the inputs keys for the given string.
     *
     *
     *     var values = {
     *       title': 'my title',
     *       location: 'foobar'
     *     };
     *
     *     yield app.updateForm(form, values);
     *
     *
     * @param {Marionette.Element} formElement form or container for inputs.
     * @param {Object} values object of key/value pairs
     *                        (where key is the name attr).
     * @param {Function} [callback] optional uses default callback of driver.
     */

    updateForm: function(formElement, values, callback) {
      var self = this;
      var values = this._resolveNames(values);
      this.task(function(app, next, done) {
        for (var field in values) {
          var el = yield formElement.findElement(
            '[name="' + field + '"]',
            'css selector',
            next
          );
          yield el.clear(next);
          yield el.sendKeys([values[field]], next);
        }

        done();
      }.bind(this), callback);
    },

    /**
     * Private method that flatten a object
     * Arrays will be named as attr[i]
     * Nested objects will be named as attr[attr2]
     *
     *
     *     var values = {
     *       email: [
     *        {type: 'personal', email: 'test@test.com'},
     *        {type: 'personal', email: 'test2@test.com'},
     *       ],
     *       name: 'Test'
     *     };
     *
     *     Will return
     *     {
     *       email[0][type]: 'personal',
     *       email[0][email]: 'test@test.com',
     *       email[1][type]: 'personal',
     *       email[1][email]: 'test2@test.com',
     *       name: 'Test'
     *     };
     *
     *
     * @param {Object} values object of key/value pairs
     *                        (where key is the name attr).
     */

    _resolveNames: function(values) {
      var flatten = function(obj) {
        var toReturn = {};
        for (var i in obj) {
          if ((typeof obj[i]) == 'object') {
            var flatObject = flatten(obj[i]);
            for (var x in flatObject) {
              toReturn['[' + i + ']' + x] = flatObject[x];
            }
          } else {
            toReturn['[' + i + ']'] = obj[i];
          }
        }
        return toReturn;
      };

      var toUpdate = {};

      for (var field in values) {
        // the use of 'next' here is required because
        // we are using the externally found formElement.
        var currentValue = values[field];
        if (typeof currentValue === 'string') {
          toUpdate[field] = currentValue;
        } else {
          var flattenValue = flatten(currentValue);
          for (var elem in flattenValue) {
            var fieldName = field + elem;
            var value = flattenValue[elem];
            toUpdate[fieldName] = value;
          }
        }
      }
      return toUpdate;
    },

    observePerfEvents: function(stopEventName) {
      var self = this;

      this.task(function (app, next, done) {
        yield IntegrationHelper.importScript(
          app.device,
          'tests/performance/performance_helper_atom.js',
          next
        );

        var helperObject = 'window.wrappedJSObject.PerformanceHelperAtom';
        yield app.device.executeAsyncScript(
          helperObject + '.register();'
        );

        var results = yield app.device.executeAsyncScript(
          helperObject + '.waitForEvent("' + stopEventName + '");'
        );

        yield app.device.executeAsyncScript(
          helperObject + '.unregister();'
        );

        done(null, results);
      });
    }
  };

  return AppIntegration;
}());
