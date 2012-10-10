function CalendarIntegration(device) {
  this.device = device;
  this.defaultCallback = device.defaultCallback;
}

CalendarIntegration.prototype = {
  appName: 'Calendar',

  origin: null,

  src: null,

  name: null,

  frame: null,

  /** selector tables */

  selectors: {
    /** views */
    settingsView: '#settings',
    monthView: '#month-view',
    monthsDayView: '#months-day-view',
    weekView: '#week-view',
    dayView: '#day-view',
    modifyEventView: '#modify-event-view',

    /** buttons */
    showSettingsBtn: '#time-header button.settings',
    addEventBtn: '#time-header a[href="/add/"]',
    eventSaveBtn: '#modify-event-view > header .save',

    /** lists */
    calendarList: '#settings .calendars',

    /** forms */
    eventForm: '#modify-event-view > form',
    eventFormFields: '#modify-event-view form [name]',

    /** generic */
    present: '.present'
  },

  task: function(generator, callback) {
    callback = (callback || this.defaultCallback);
    var instance;

    function next(err, value) {
      if (err) {
        instance.close();
        callback(err, null);
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
    var app = Object.create(this);
    app.defaultCallback = next;
    app.device = Object.create(app.device);
    app.device.defaultCallback = next;

    var instance = generator(app, next, callback);
    instance.next();
  },

  /**
   * Deletes the calendar database and closes the app.
   */
  close: function(callback) {
    var self = this;

    this.task(function(app, next, done) {
      var device = app.device;

      yield device.executeScript(function() {
        window.wrappedJSObject.Calendar.App.db.deleteDatabase(function() {
        });
      });

      yield device.switchToFrame();

      yield device.executeScript(function(app) {
        window.wrappedJSObject.WindowManager.kill(app);
      }, [self.origin]);

      done();

    }, callback);
  },

  /**
   * Launch calendar application and focus on its frame.
   */
  launch: function(callback) {
    var self = this;

    this.task(function(app, next, done) {
      var device = app.device;

      yield IntegrationHelper.sendAtom(
        device,
        '/apps/calendar/test/integration/atoms/gaia_unlock',
        true,
        next
      );

      var result = yield device.executeAsyncScript(
        'launchAppWithName("' + self.appName + '")'
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
    IntegrationHelper.waitFor(test, timeout, callback || this.defaultCallback);
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
      var ms = yield app.device.executeScript(function() {
        return Date.now();
      });

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
        '/apps/calendar/test/integration/atoms/remote_date',
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
   * @param {Array|String|Marionette.Element} form named element,
   *                                               array of elements or element.
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
