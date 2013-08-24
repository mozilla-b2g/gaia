/**
 * @fileoverview Contains some useful helper functions for driving gaia's
 *     calendar application through the marionette js client.
 */
var DateHelper = require('./date_helper'),
    Event = require('./event');


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
}

module.exports = Calendar;


/**
 * @const {string}
 */
Calendar.DEFAULT_EVENT_LOCATION = 'Knoxville, Tennessee';


/**
 * @const {string}
 */
Calendar.DEFAULT_EVENT_TITLE = 'Go drinking with coworkers';


/**
 * @const {string}
 */
Calendar.OFFLINE_CALENDAR_NAME = 'Offline calendar';


/**
 * @const {string}
 */
Calendar.ORIGIN = 'app://calendar.gaiamobile.org';


/**
 * @const {Object}
 */
Calendar.Selector = Object.freeze({
  addEventButton: 'a[href="/event/add/"]',
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
   * @return {Marionette.Element} Element to click to get to add event view.
   */
  get addEventButton() {
    return this.client.findElement(Calendar.Selector.addEventButton);
  },


  /**
   * @return {Marionette.Element} Input for event alarm.
   */
  get editEventAlarm() {
    return this.client.findElement(Calendar.Selector.editEventAlarm);
  },


  /**
   * @return {Marionette.Element} Form for editing events.
   */
  get editEventForm() {
    return this.client.findElement(Calendar.Selector.editEventForm);
  },


  /**
   * @return {Marionette.Element} Input for event end date.
   */
  get editEventEndDate() {
    return this.client.findElement(Calendar.Selector.editEventEndDate);
  },


  /**
   * @return {Marionette.Element} Input for event end time.
   */
  get editEventEndTime() {
    return this.client.findElement(Calendar.Selector.editEventEndTime);
  },


  /**
   * @return {Marionette.Element} Input for event location.
   */
  get editEventLocation() {
    return this.client.findElement(Calendar.Selector.editEventLocation);
  },


  get editEventSaveButton() {
    return this.client.findElement(Calendar.Selector.editEventSaveButton);
  },


  /**
   * @return {Marionette.Element} Input for event start time.
   */
  get editEventStartDate() {
    return this.client.findElement(Calendar.Selector.editEventStartDate);
  },


  /**
   * @return {Marionette.Element} Input for event start time.
   */
  get editEventStartTime() {
    return this.client.findElement(Calendar.Selector.editEventStartTime);
  },


  /**
   * @return {Marionette.Element} Input for event title.
   */
  get editEventTitle() {
    return this.client.findElement(Calendar.Selector.editEventTitle);
  },


  /**
   * @return {Marionette.Element} Section for events.
   */
  get eventListSection() {
    return this.client.findElement(Calendar.Selector.eventListSection);
  },


  /**
   * @return {Marionette.Element} Modify event view.
   */
  get modifyEventView() {
    return this.client.findElement(Calendar.Selector.modifyEventView);
  },


  /**
   * @return {Marionette.Element} List of elements at bottom of month view.
   */
  get monthViewDayEvents() {
    return this.client.findElements(Calendar.Selector.monthViewDayEvent);
  },


  /**
   * @return {Marionette.Element} Header with month and year.
   */
  get monthYearHeader() {
    return this.client.findElement(Calendar.Selector.monthYearHeader);
  },


  /**
   * @return {Marionette.Element} Section for read only event.
   */
  get viewEventView() {
    return this.client.findElement(Calendar.Selector.viewEventView);
  },


  /**
   * @return {Marionette.Element} Event alarm in read only event view.
   */
  get viewEventViewAlarm() {
    return this.client.findElement(Calendar.Selector.viewEventViewAlarm);
  },


  /**
   * @return {Marionette.Element} Event calendar in read only event view.
   */
  get viewEventViewCalendar() {
    return this.client.findElement(Calendar.Selector.viewEventViewCalendar);
  },


  /**
   * @return {Marionette.Element} Event end date in read only event view.
   */
  get viewEventViewEndDate() {
    return this.client.findElement(Calendar.Selector.viewEventViewEndDate);
  },


  /**
   * @return {Marionette.Element} Event end time in read only event view.
   */
  get viewEventViewEndTime() {
    return this.client.findElement(Calendar.Selector.viewEventViewEndTime);
  },


  /**
   * @return {Marionette.Element} Event location in read only event view.
   */
  get viewEventViewLocation() {
    return this.client.findElement(Calendar.Selector.viewEventViewLocation);
  },


  /**
   * @return {Marionette.Element} Event start date in read only event view.
   */
  get viewEventViewStartDate() {
    return this.client.findElement(Calendar.Selector.viewEventViewStartDate);
  },


  /**
   * @return {Marionette.Element} Event start time in read only event view.
   */
  get viewEventViewStartTime() {
    return this.client.findElement(Calendar.Selector.viewEventViewStartTime);
  },


  /**
   * @return {Marionette.Element} Event title in read only event view.
   */
  get viewEventViewTitle() {
    return this.client.findElement(Calendar.Selector.viewEventViewTitle);
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
    var addEventButton =
        this.client.helper.waitForElement(this.addEventButton);
    addEventButton.click();

    // Wait for the add event view to render.
    this.client.helper.waitForElement(this.modifyEventView);

    // TODO(gareth): Update these sendKeys calls to use strings instead
    //     of arrays of strings once there's support for that.
    // Fill in the form.
    this.editEventTitle.sendKeys([title]);
    this.editEventLocation.sendKeys([location]);

    var form = this.editEventForm;
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
    this.editEventSaveButton.click();

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
   */
  launch: function() {
    this.client.apps.launch(Calendar.ORIGIN);
    this.client.apps.switchToApp(Calendar.ORIGIN);
    // Wait for the document body to know we're really 'launched'.
    this.client.helper.waitForElement('body');
  }
};
