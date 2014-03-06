/**
 * @fileoverview Contains some useful helper functions for driving gaia's
 *     calendar application through the marionette js client.
 */
var Marionette = require('marionette-client');
var DateHelper = require('./date_helper');
var Event = require('./event');


/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function Calendar(client) {
  this.client = client.scope({ searchTimeout: 20000 });
  this.actions = new Marionette.Actions(client);
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
  // main view elements, used by waitForView
  day: '#day-view',
  week: '#week-view',
  month: '#month-view',
  'event/show': '#event-view',
  'event/add': '#modify-event-view.create',
  'event/edit': '#modify-event-view.update',

  addAccountPasswordInput: '#modify-account-view input[name="password"]',
  addAccountSaveButton: '#modify-account-view button.save',
  addAccountUrlInput: '#modify-account-view input[name="fullUrl"]',
  addAccountUsernameInput: '#modify-account-view input[name="user"]',
  addCalDavAccountButton: '#create-account-view ' +
                          'a[href="/create-account/caldav"]',
  addEventButton: 'a[href="/event/add/"]',
  weekButton: 'a[href="/week/"]',
  dayButton: 'a[href="/day/"]',
  hintSwipeToNavigate: '#hint-swipe-to-navigate',
  editEventAlarm: '#modify-event-view select[name="alarm[]"]',
  editEventDescription: '#modify-event-view textarea[name="description"]',
  editEventEndDate: '#modify-event-view input[name="endDate"]',
  editEventEndTime: '#modify-event-view input[name="endTime"]',
  editEventForm: '#modify-event-view form',
  editEventLocation: '#modify-event-view input[name="location"]',
  editEventSaveButton: '#modify-event-view button.save',
  editEventStartDate: '#modify-event-view input[name="startDate"]',
  editEventStartTime: '#modify-event-view input[name="startTime"]',
  editEventTitle: '#modify-event-view input[name="title"]',
  eventListSection: '#event-list',
  modifyEventView: '#modify-event-view',
  monthDayViewEvents: '#months-day-view .day-events',
  monthEventList: '#event-list div.events > section',
  monthEventTitle: 'h5',
  monthViewDayEvent: '#event-list .event',
  monthViewDayEventName: 'h5',                // Search beneath .event
  monthViewDayEventLocation: '.location',     // for these guys.
  monthYearHeader: '#current-month-year',
  dayViewEvent: '#day-view .active .event',
  todayTabItem: '#today',
  toolbarAddAccountButton: '#settings a[href="/select-preset/"]',
  toolbarButton: '#time-header button.settings',
  toolbarSyncButton: '#settings [role="toolbar"] .sync',
  viewEventView: '#event-view',
  viewEventViewAlarm: '#event-view .alarms > .content > div',
  viewEventViewCalendar: '#event-view .current-calendar .content',
  viewEventViewEndDate: '#event-view .end-date > .content',
  viewEventViewEndTime: '#event-view .end-date > .end-time > .content',
  viewEventViewLocation: '#event-view .location > .content',
  viewEventViewStartDate: '#event-view .start-date > .content',
  viewEventViewStartTime: '#event-view .start-date > .start-time > .content',
  viewEventViewTitle: '#event-view .title',
  viewEventViewTitleContent: '#event-view .title .content',
  viewEventViewDescription: '#event-view .description',
  viewEventViewDescriptionContent: '#event-view .description .content',
  viewEventViewCancelButton: '#event-view button.cancel',
  weekButton: '#view-selector .week a',
  weekViewEvent: '#week-view .event'
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
   * findElement and then waitForElement.
   *
   * @param {string} name of some calendar element.
   * @return {Marionette.Element} the element.
   */
  waitForElement: function(name) {
    return this.client.helper.waitForElement(Calendar.Selector[name]);
  },

  waitForMonthView: function() {
    this.client.waitFor(this.isMonthViewActive.bind(this));
  },

  waitForWeekView: function() {
    this.client.waitFor(this.isWeekViewActive.bind(this));
  },

  waitForDayView: function() {
    this.client.waitFor(this.isDayViewActive.bind(this));
  },

  waitForViewEventView: function() {
    this.client.waitFor(this.isViewEventViewActive.bind(this));
  },

  waitForEditEventView: function() {
    this.client.waitFor(this.isEditEventViewActive.bind(this));
  },

  waitForAddEventView: function() {
    this.client.waitFor(this.isAddEventViewActive.bind(this));
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

  /**
   * Create an offline event with a single reminder (alarm) that fires when
   * the event begins.
   *
   * @param {Object} opts options object.
   *   (string) title - event title
   *   (string) location - event location
   *   (Date) startDate - when event starts
   *   (Date) endDate - when event ends
   *   (Number) startHour - shortcut for setting the startDate
   *   (Number) duration - shortcut for setting the endDate based on startDate
   * @return {Event} Created event.
   */
  createEvent: function(opts) {
    // Navigate to the add event view.
    var addEventButton = this.waitForElement('addEventButton');
    addEventButton.click();

    // Wait for the add event view to render.
    this.waitForElement('modifyEventView');

    // Inject form data.
    var titleInput = this.waitForElement('editEventTitle'),
        locationInput = this.waitForElement('editEventLocation'),
        descriptionInput = this.waitForElement('editEventDescription');
    titleInput.sendKeys(opts.title);
    locationInput.sendKeys(opts.location);
    descriptionInput.sendKeys(opts.description);

    var startDate = opts.startDate;
    var endDate = opts.endDate;
    var startHour = opts.startHour || 0;

    if (!startDate) {
      startDate = new Date();
      startDate.setHours(startHour);
      startDate.setMinutes(0);
      startDate.setSeconds(0);
      startDate.setMilliseconds(0);
    }

    if (!endDate) {
      // duration should always be bigger than 0, defaults to 1h
      var duration = opts.duration || 1;
      endDate = new Date(startDate.getTime() + (60 * duration * 60 * 1000));
    }

    var form = this.waitForElement('editEventForm');
    this.client.forms.fill(form, {
      startDate: startDate,
      startTime: startDate,
      endDate: endDate,
      endTime: endDate
    });

    // Save event.
    this.waitForElement('editEventSaveButton').click();

    this.waitForKeyboardHide();

    // TODO(gareth): Sort out the dates and times here.
    return {
      calendar: 'Offline calendar',
      title: opts.title,
      location: opts.location
    };
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

  /**
   * @param {String} id View ID
   * @return {boolean} Whether or not view is active
   */
  isViewActive: function(id) {
    return this._isPath(id) && this._isElementActive(id);
  },

  _isPath: function(id) {
    // we do not use the URL since that might happen before the [data-path] is
    // updated and styles/views are toggled based on [data-path]
    var path = this.client.findElement('body').getAttribute('data-path');
    return path.indexOf(id) !== -1;
  },

  _isElementActive: function(id) {
    return this.findElement(id)
      .getAttribute('class').indexOf('active') !== -1;
  },

  /**
   * @return {boolean} Whether or not week view is active
   */
  isWeekViewActive: function() {
    return this.isViewActive('week');
  },

  /**
   * @return {boolean} Whether or not the calendar month view is active.
   */
  isMonthViewActive: function() {
    return this.isViewActive('month');
  },

  /**
   * @return {boolean} Whether or not the calendar day view is active.
   */
  isDayViewActive: function() {
    return this.isViewActive('day');
  },

  /**
   * @return {boolean} Whether or not the read only event view is active.
   */
  isViewEventViewActive: function() {
    return this.isViewActive('event/show');
  },

  /**
   * @return {boolean} Whether or not the add event view is active.
   */
  isAddEventViewActive: function() {
    return this.isViewActive('event/add');
  },

  /**
   * @return {boolean} Whether or not the edit event view is active.
   */
  isEditEventViewActive: function() {
    return this.isViewActive('event/edit');
  },


  /**
   * Start the calendar, save the client for future ops, and wait for the
   * calendar to finish an initial render.
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
  }
};
