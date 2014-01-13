/**
 * @fileoverview Contains some useful helper functions for driving gaia's
 *     calendar application through the marionette js client.
 */
var DateHelper = require('./date_helper'),
    Event = require('./event'),
    Marionette = require('marionette-client'),
    actions = null;


/**
 * Sets a field value.
 *
 * @param {Marionette.Client} client to use.
 * @param {Marionette.Element} element target for value.
 * @param {String} value to set.
 * @private
 */
function setValue(client, element, value) {
  client.executeScript(function(element, value) {
    element.value = value;
  }, [element, value]);
}


/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function Calendar(client) {
  this.client = client.scope({
    searchTimeout: 20000
  });
  actions = new Marionette.Actions(client);
}
module.exports = Calendar;


/**
 * @type {string}
 */
Calendar.DEFAULT_EVENT_LOCATION = 'Knoxville, Tennessee';

/**
 * @type {string}
 */
Calendar.DEFAULT_EVENT_TITLE = 'Go drinking with coworkers';

/**
 * @type {string}
 */
Calendar.OFFLINE_CALENDAR_NAME = 'Offline calendar';

/**
 * @type {string}
 */
Calendar.ORIGIN = 'app://calendar.gaiamobile.org';

/**
 * Month1 Month2 YYYY.
 * @type {RegExp}
 */
Calendar.HEADER_PATTERN = /^([JFMASOND][a-z]+\s){2}\d{4}$/;

/**
 * @type {Object}
 */
Calendar.Selector = Object.freeze({
  todayTabItem: '#today',
  addEventButton: 'a[href="/event/add/"]',
  weekButton: 'a[href="/week/"]',
  hintSwipeToNavigate: '#hint-swipe-to-navigate',
  editEventForm: '#modify-event-view form',
  editEventAlarm: '#modify-event-view select[name="alarm[]"]',
  editEventEndDate: '#modify-event-view input[name="endDate"]',
  editEventEndTime: '#modify-event-view input[name="endTime"]',
  editEventLocation: '#modify-event-view input[name="location"]',
  editEventSaveButton: '#modify-event-view button.save',
  editEventStartDate: '#modify-event-view input[name="startDate"]',
  editEventStartTime: '#modify-event-view input[name="startTime"]',
  editEventTitle: '#modify-event-view input[name="title"]',
  eventListSection: '#event-list',
  modifyEventView: '#modify-event-view',
  monthViewDayEvent: '#event-list .event',
  monthViewDayEventName: 'h5',                // Search beneath .event
  monthViewDayEventLocation: '.location',     // for these guys.
  monthViewpresent: '#month-view li.present',
  monthViewselected: '#month-view li.selected',
  monthYearHeader: '#current-month-year',
  viewEventView: '#event-view',
  viewEventViewAlarm: '#event-view .alarms > .content > div',
  viewEventViewCalendar: '#event-view .current-calendar .content',
  viewEventViewEndDate: '#event-view .end-date > .content',
  viewEventViewEndTime: '#event-view .end-date > .end-time > .content',
  viewEventViewLocation: '#event-view .location > .content',
  viewEventViewStartDate: '#event-view .start-date > .content',
  viewEventViewStartTime: '#event-view .start-date > .start-time > .content',
  viewEventViewTitle: '#event-view .title .content'
});

Calendar.prototype = {
  /**
   * Marionette client to use.
   * @type {Marionette.Client}
   */
  client: null,

  /**
   * Find some element given its name like 'addEventButton' or 'weekButton'.
   *
   * @param {string} name of some calendar element.
   * @return {Marionette.Element} the element.
   */
  findElement: function(name) {
    return this.client.findElement(Calendar.Selector[name]);
  },

  /**
   * @param {string} name of some calendar element.
   * @return {Marionette.Element} the element.
   */
  waitForElement: function(name) {
    return this.client.helper.waitForElement(Calendar.Selector[name]);
  },

  /**
   * Create an offline event with a single reminder (alarm) that fires when
   * the event begins.
   *
   * @param {string} title event title.
   * @param {string} location event location.
   * @param {Date} startDate time when the event starts.
   * @param {Date} endDate time when the event ends.
   * @return {Event} Created event.
   */
  createEvent: function(title, location, startDate, endDate) {
    // Override defaults.
    title = title || Calendar.DEFAULT_EVENT_TITLE;
    location = location || Calendar.DEFAULT_EVENT_LOCATION;
    if (!(startDate && startDate instanceof Date)) {
      startDate = new Date();
    }
    if (!(endDate && endDate instanceof Date)) {
      endDate = new Date();
      endDate.setHours(endDate.getHours() + 1);
    }

    // Convert Date objects into strings with html5 input formats in mind.
    var startDay = DateHelper.formatDay(startDate);
    var startTime = DateHelper.formatTime(startDate);
    var endDay = DateHelper.formatDay(endDate);
    var endTime = DateHelper.formatTime(endDate);

    // Navigate to the add event view.
    var addEventButton = this.waitForElement('addEventButton');
    addEventButton.click();

    // Wait for the add event view to render.
    this.waitForElement('modifyEventView');
    this.client.helper.waitForElement(this.modifyEventView);

    // TODO(gareth): Update these sendKeys calls to use strings instead
    //     of arrays of strings once there's support for that.
    // Fill in the form.
    this.findElement('editEventTitle').sendKeys([title]);
    this.findElement('editEventLocation').sendKeys([location]);

    var form = this.findElement('editEventForm');

    // TODO(gareth): Can we use marionette form helper here?
    var updateFormValues = {
      startDate: startDay,
      startTime: startTime,
      endDate: endDay,
      endTime: endTime
    };

    for (var key in updateFormValues) {
      var element = form.findElement('[name="' + key + '"]');
      setValue(this.client, element, updateFormValues[key]);
    }

    // Save event.
    this.findElement('editEventSaveButton').click();

    // TODO(gareth): Sort out the dates and times here.
    var result = new Event();
    result.calendar = Calendar.OFFLINE_CALENDAR_NAME;
    result.location = location;
    result.title = title;
    return result;
  },


  /**
   * Read the event if we're currently on the read only event view.
   * @return {Event} The event we're currently looking at.
   */
  getViewEventEvent: function() {
    if (!this.isViewEventViewActive) {
      throw new Error('ViewEvent view inactive');
    }

    // TODO(gareth): Sort out the dates and times here.
    var event = new Event();
    event.calendar = this.viewEventViewCalendar.text();
    event.location = this.viewEventViewLocation.text();
    event.title = this.viewEventViewTitle.text();
    return event;
  },


  /**
   * @return {boolean} Whether or not the calendar is active.
   */
  isActive: function() {
    var url = this.client.getUrl();
    return url.indexOf(Calendar.ORIGIN) !== -1;
  },

  isWeekViewActive: function() {
    var actual = this.client.getUrl();
    var expected = Calendar.ORIGIN + '/week/';
    return actual === expected;
  },

  /**
   * @return {boolean} Whether or not the calendar month view is active.
   */
  isMonthViewActive: function() {
    var actual = this.client.getUrl();
    var expected = Calendar.ORIGIN + '/month/';
    return actual === expected;
  },


  /**
   * @return {boolean} Whether or not the read only event view is active.
   */
  isViewEventViewActive: function() {
    var url = this.client.getUrl();
    return url.indexOf('/event/show') !== -1;
  },


  /**
   * Start the calendar, save the client for future ops, and wait for the
   * calendar to finish an initial render.
   *
   * @param {Object} opts options map.
   *     (hideSwipeHint) whether to hide swiping hint.
   */
  launch: function(opts) {
    this.client.apps.launch(Calendar.ORIGIN);
    this.client.apps.switchToApp(Calendar.ORIGIN);

    // Wait for the document body to know we're really 'launched'.
    this.client.helper.waitForElement('body');

    // Hide the hint.
    if (opts && opts.hideSwipeHint) {
      var hint = this.findElement('hintSwipeToNavigate');
      if (hint.displayed()) {
        hint.click();
      }
    }
  },

  /**
   * Swipe on a panel.
   * If no element param, it will swipe on the body element.
   *
   * @param {Marionette.Element} [element] the panel element.
   */
  swipe: function(element) {
    var bodySize = client.executeScript(function() {
          return {
            height: document.body.clientHeight,
            width: document.body.clientWidth
          };
        }),
        panel = null;

    // (X1, Y1) is swipe start.
    // (X2, Y2) is swipe end.
    const X1 = bodySize.width * 0.2,
          Y1 = bodySize.height * 0.2,
          X2 = 0,
          Y2 = bodySize.height * 0.2;

    if (!element) {
      panel = this.client.findElement('body');
    } else {
      panel = element;
    }
    actions.flick(panel, X1, Y1, X2, Y2).perform();
  }
};
