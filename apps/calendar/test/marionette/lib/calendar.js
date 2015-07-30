'use strict';

var AdvancedSettings = require('./views/advanced_settings'),
    CreateAccount = require('./views/create_account'),
    Day = require('./views/day'),
    EditEvent = require('./views/edit_event'),
    Marionette = require('marionette-client'),
    ModifyAccount = require('./views/modify_account'),
    Month = require('./views/month'),
    MonthDay = require('./views/month_day'),
    ReadEvent = require('./views/read_event'),
    Settings = require('./views/settings'),
    Week = require('./views/week');

function Calendar(client) {
  this.client = client.scope({ searchTimeout: 5000 });
  this.actions = new Marionette.Actions(this.client);

  // Initialize our view remotes.
  this.advancedSettings = new AdvancedSettings(client);
  this.createAccount = new CreateAccount(client);
  this.day = new Day(client);
  this.editEvent = new EditEvent(client);
  this.modifyAccount = new ModifyAccount(client);
  this.month = new Month(client);
  this.monthDay = new MonthDay(client);
  this.readEvent = new ReadEvent(client);
  this.settings = new Settings(client);
  this.week = new Week(client);
}
module.exports = Calendar;

Calendar.ORIGIN = 'app://calendar.gaiamobile.org';

Calendar.prototype = {
  launch: function() {
    var client = this.client;

    client.apps.launch(Calendar.ORIGIN);
    client.apps.switchToApp(Calendar.ORIGIN);

    // Wait for the document body to know we're really 'launched'.
    this.client.helper.waitForElement('body');
  },

  get addEventButton() {
    return this.client.findElement('#time-header a[href="/event/add/"]');
  },

  get headerContent() {
    return this.client.findElement('#current-month-year');
  },

  get timeHeader() {
    return this.client.findElement('#time-header');
  },

  get themeColor() {
    return this.client.findElement('meta[name="theme-color"]')
      .getAttribute('content');
  },

  openModifyEventView: function() {
    this.addEventButton.click();
    this.editEvent.waitForDisplay();
    return this;
  },

  openSettingsView: function() {
    this._toggleSettingsView(true);
    return this;
  },

  closeSettingsView: function() {
    this._toggleSettingsView(false);
    return this;
  },

  _toggleSettingsView: function(isOpen) {
    var client = this.client;
    client.helper
      .waitForElement(this.timeHeader)
      .tap(25, 25);

    // Wait for the animation to be complete before trying to click on
    // items in the drawer.
    var drawer = this.client.findElement('#settings .settings-drawer');

    this.client.waitFor(function() {
      return drawer.getAttribute('data-animstate') === 'done';
    });

    if (!isOpen) {
      var body = this.client.findElement('body');
      // Also wait for the UI to be in a non-settings state after
      // waiting for the animation to finish and the app UI to go
      // back to non-settings state.
      this.client.waitFor(function() {
        return body.getAttribute('data-path') !== '/settings/';
      });
    }
    return this;
  },

  openAdvancedSettingsView: function() {
    this.openSettingsView();
    this.settings.setupAdvancedSettings();
    this.advancedSettings.waitForDisplay();
    return this;
  },

  closeAdvancedSettingsView: function() {
    var advancedSettings = this.advancedSettings;
    advancedSettings.close();
    advancedSettings.waitForHide();
  },

  openDayView: function() {
    this.client
      .findElement('#view-selector a[href="/day/"]')
      .click();
    this.day.waitForDisplay();
    return this;
  },

  openMonthView: function() {
    this.client
      .findElement('#view-selector a[href="/month/"]')
      .click();
    this.month.waitForDisplay();
    return this;
  },

  openWeekView: function() {
    this.client
      .findElement('#view-selector a[href="/week/"]')
      .click();
    this.week.waitForDisplay();
    return this;
  },

  clickToday: function() {
    this.client
      .findElement('#view-selector a[href="#today"]')
      .click();
    return this;
  },

  setupAccount: function(options) {
    this.openAdvancedSettingsView();
    this.advancedSettings.createAccount();
    this.createAccount.waitForDisplay();
    this.createAccount.chooseAccountType(options.accountType);

    var modifyAccount = this.modifyAccount;
    modifyAccount.waitForDisplay();
    [
      'user',
      'password',
      'fullUrl'
    ].forEach(function(key) {
      if (key in options) {
        modifyAccount[key] = options[key];
      }
    });

    modifyAccount.save();
    modifyAccount.waitForHide();
    this.closeSettingsView();
    return this;
  },

  teardownAccount: function(calendarName, user) {
    this.openAdvancedSettingsView();
    this.advancedSettings.clickAccount(calendarName, user);
    var modifyAccount = this.modifyAccount;
    modifyAccount.waitForDisplay();
    modifyAccount.delete();
    modifyAccount.waitForHide();
    this.closeAdvancedSettingsView();
    this.closeSettingsView();
    return this;
  },

  sync: function() {
    this.openSettingsView();
    this.settings.sync();
    this.closeSettingsView();
    return this;
  },

  /**
   * Create an event.
   *
   * Options:
   *   (String) calendar - calendar name [defaults to "Offline calendar"].
   *   (String) title - event title.
   *   (String) location - event location.
   *   (Date) startDate - event start date.
   *   (Date) endDate - event end date.
   *   (Number) startHour - shortcut for creating an event that starts today.
   *   (Number) duration - length of event in hours.
   *   (Boolean) allDay - whether this is an all day event.
   *   (Array) reminders - array of strings like '5 minutes before'.
   */
  createEvent: function(opts) {
    var startDate;
    if (opts.startDate) {
      startDate = opts.startDate;
    } else {
      startDate = new Date();
      // startHour can be zero!
      if (opts.startHour != null) {
        startDate.setHours(opts.startHour, 0, 0, 0);
      }
    }

    var endDate;
    if (opts.endDate) {
      endDate = opts.endDate;
    } else {
      // 1h by default
      var duration = opts.duration || 1;
      endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
    }

    this.openModifyEventView();
    var editEvent = this.editEvent;
    editEvent.title = opts.title;
    editEvent.location = opts.location || '';
    editEvent.description = opts.description || '';
    editEvent.calendar = opts.calendar || 'Offline calendar';
    editEvent.startDate = startDate;
    editEvent.endDate = endDate;
    if (opts.allDay) {
      editEvent.allDay = opts.allDay;
    } else {
      editEvent.startTime = startDate;
      editEvent.endTime = endDate;
    }
    // no reminders by default to avoid triggering notifications by mistake.
    // see: https://bugzil.la/1012507
    editEvent.reminders = opts.reminders == null ? [] : opts.reminders;
    editEvent.save();

    editEvent.waitForHide();
    return this;
  },

  /**
   * Tests if content is bigger than container. If something is wrong it
   * throws errors.
   */
  checkOverflow: function(element, msg) {
    msg = msg ? msg + ': ' : '';

    var wid = element.scriptWith(function(el) {
      return {
        content: el.scrollWidth,
        container: el.clientWidth
      };
    });
    if (!wid.content) {
      throw new Error(msg + 'invalid content width');
    }
    if (!wid.container) {
      throw new Error(msg + 'invalid container width');
    }
    // we use a buffer of 1px to account for potential rounding issues
    // see: Bug 959901
    if (Math.abs(wid.content - wid.container) > 1) {
      msg += 'content (' + wid.content + 'px) is wider than container (' +
        wid.container + 'px)';
      throw new Error(msg);
    }

    return this;
  },

  formatDate: function(date) {
    var month = date.getMonth() + 1,
        day = date.getDate(),
        year = date.getFullYear();
    if (month.toString().length === 1) {
      month = '0' + month;
    }
    if (day.toString().length === 1) {
      day = '0' + day;
    }

    return [month, day, year].join('/');
  },

  swipeLeft: function() {
    return this._swipe({ direction: 'left' });
  },

  swipeRight: function() {
    return this._swipe({ direction: 'right' });
  },

  /**
   * Options:
   *   (String) direction is one of 'left', 'right'.
   */
  _swipe: function(options) {
    var bodySize = this.client.executeScript(function() {
      return {
        height: document.body.clientHeight,
        width: document.body.clientWidth
      };
    });

    // (x1, y1) is swipe start.
    // (x2, y2) is swipe end.
    var x1, x2, y1, y2;
    y1 = y2 = bodySize.height * 0.5;
    if (options.direction === 'left') {
      x1 = bodySize.width * 0.8;
      x2 = 0;
    } else if (options.direction === 'right') {
      x1 = bodySize.width * 0.2;
      x2 = bodySize.width;
    } else {
      throw new Error('swipe needs a direction');
    }

    var body = this.client.findElement('body');
    this.actions
      .flick(body, x1, y1, x2, y2)
      .perform();
    return this;
  },

  switch12HourTimeFormat: function() {
    this._switchTimeFormat(true);
  },

  switch24HourTimeFormat: function() {
    this._switchTimeFormat(false);
  },

  _switchTimeFormat: function(is12Hour) {
    var client = this.client;
    // Switch to System frame to get the permission
    // of writing settings values.
    client.switchToFrame();
    client.settings.set('locale.hour12', is12Hour);
    client.apps.switchToApp(Calendar.ORIGIN);
  }
};
