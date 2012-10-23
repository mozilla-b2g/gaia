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

  function AppIntegration(device) {
    this.device = device;
    this.defaultCallback = device.defaultCallback;
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

        var script = 'window.wrappedJSObject.WindowManager.kill("' +
                        self.origin +
                      '")';

        // Function.toString is busted (804404)
        yield device.executeScript(script);

        done();
      }, callback);
    },

    /**
     * Launches application and switches focus to its frame.
     */
    launch: function(callback) {
      var self = this;

      this.task(function(app, next, done) {
        var device = app.device;

        yield device.setScriptTimeout(15000);
        yield IntegrationHelper.sendAtom(
          device,
          '/tests/atoms/gaia_unlock',
          true,
          next
        );


        yield IntegrationHelper.importScript(
          device,
          '/tests/atoms/gaia_apps.js',
          MochaTask.nodeNext
        );

        var result = yield device.executeAsyncScript(
          'GaiaApps.launchWithName("' + self.appName + '");'
        );

        yield device.switchToFrame(result.frame);

        self.origin = result.origin;
        self.src = result.src;
        self.name = result.name;
        self.frame = result.frame;

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
      this.waitFor(element[method].bind(element), 3000, callback);
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

    remoteDate: function(date, callback) {
      callback = (callback || this.defaultCallback);

      this.remoteDateObject(date, function(err, result) {
        if (err) {
          callback(err);
          return;
        }

        callback(null, new Date(
          result.year,
          result.month,
          result.date,
          result.hours,
          result.minutes,
          result.seconds
        ));
      });
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
    remoteDateObject: function(date, callback) {
      if (typeof(date) === 'undefined') {
        date = new Date();
      }

      this.task(function(app, next, done) {
        var result = yield IntegrationHelper.sendAtom(
          app.device,
          '/tests/atoms/remote_date',
          false,
          [date.valueOf()],
          next
        );

        done(null, result);

      }, callback);
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
          var value = yield element.getAttribute('value', next);

          values[name] = value;
        }


        done(null, values);
      }, callback);
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

      this.task(function(app, next, done) {
        for (var field in values) {

          // the use of 'next' here is required because
          // we are using the externally found formElement.
          var el = yield formElement.findElement(
            '[name="' + field + '"]',
            'css selector',
            next
          );

          yield el.clear(next);
          yield el.sendKeys([values[field]], next);
        }

        done();
      }, callback);
    }

  };

  return AppIntegration;
}());
