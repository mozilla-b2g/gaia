'use strict';

var AdvancedSettings = require('./views/advanced_settings'),
    Day = require('./views/day'),
    EditEvent = require('./views/edit_event'),
    Marionette = require('marionette-client'),
    Month = require('./views/month'),
    MonthDay = require('./views/month_day'),
    ReadEvent = require('./views/read_event'),
    Week = require('./views/week');

function Calendar(client) {
  this.client = client.scope({ searchTimeout: 5000 });
  this.actions = new Marionette.Actions(this.client);

  // Initialize our view remotes. Keep the top-level
  // views private so that we can sneakily navigate to
  // them when they're requested.
  this.advancedSettings = new AdvancedSettings(client);
  this.day = new Day(client);
  this.editEvent = new EditEvent(client);
  this.month = new Month(client);
  this.monthDay = new MonthDay(client);
  this.readEvent = new ReadEvent(client);
  this.week = new Week(client);
}
module.exports = Calendar;

Calendar.ORIGIN = 'app://calendar.gaiamobile.org';

Calendar.prototype = {
  launch: function(opts) {
    this.client.apps.launch(Calendar.ORIGIN);
    this.client.apps.switchToApp(Calendar.ORIGIN);

    // Wait for the document body to know we're really 'launched'.
    this.client.helper.waitForElement('body');

    if (opts) {
      if (opts.hideSwipeHint) {
        this.client.helper
          .waitForElement('#hint-swipe-to-navigate')
          .click();
      }
    }
  },

  get addEventButton() {
    return this.client.findElement('#time-header a[href="/event/add/"]');
  },

  openAdvancedSettingsView: function() {
    // TODO(gareth)
  },

  openDayView: function() {
    this.client
      .findElement('#view-selector a[href="/day/"]')
      .click();
  },

  openMonthView: function() {
    this.client
      .findElement('#view-selector a[href="/month/"]')
      .click();
  },

  openWeekView: function() {
    this.client
      .findElement('#view-selector a[href="/week/"]')
      .click();
  },

  clickToday: function() {
    this.client
      .findElement('#view-selector a[href="#today"]')
      .click();
  },

  /**
   * Create an event.
   *
   * Options:
   *   (String) title - event title.
   *   (String) location - event location.
   *   (Date) startDate - event start date.
   *   (Date) endDate - event end date.
   *   (Number) startHour - shortcut for creating an event that starts today.
   *   (Number) duration - length of event in hours.
   *   (Array) reminders - array of strings like '5 minutes before'.
   */
  createEvent: function(opts) {
    var startDate;
    if (opts.startDate) {
      startDate = opts.startDate;
    } else if (opts.startHour) {
      startDate = new Date();
      startDate.setHours(opts.startHour);
      startDate.setMinutes(0);
      startDate.setSeconds(0);
      startDate.setMilliseconds(0);
    } else {
      startDate = new Date();
    }

    var endDate;
    if (opts.endDate) {
      endDate = opts.endDate;
    } else if (opts.duration) {
      endDate = new Date();
      endDate.setTime(startDate.getTime() + opts.duration * 60 * 60 * 1000);
    }

    this.addEventButton.click();
    var editEvent = this.editEvent;
    editEvent.waitForDisplay();
    editEvent.title = opts.title;
    editEvent.location = opts.location || '';
    editEvent.description = opts.description || '';
    editEvent.startDate = startDate;
    editEvent.startTime = startDate;
    editEvent.endDate = endDate;
    editEvent.endTime = endDate;
    // TODO(gareth)
    // editEvent.reminders = opts.reminders || [];
    editEvent.save();

    this.waitForKeyboardHide();
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
  },

  // TODO: extract this logic into the marionette-helper repository since this
  // can be useful for other apps as well
  waitForKeyboardHide: function() {
    // FIXME: keyboard might affect the click if test is being executed on
    // a slow machine (eg. travis-ci) so we do this hack until Bug 965131 is
    // fixed
    var client = this.client;

    // need to go back to top most frame before being able to switch to
    // a different app!!!
    client.switchToFrame();
    client.apps.switchToApp('app://keyboard.gaiamobile.org');
    client.waitFor(function() {
      return client.executeScript(function() {
        return document.hidden;
      });
    });

    client.switchToFrame();
    client.apps.switchToApp(Calendar.ORIGIN);
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
  }
};
