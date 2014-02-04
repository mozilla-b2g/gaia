'use strict';

/**
 * @fileoverview Contains some useful helper functions for driving gaia's
 *     calendar application through the marionette js client.
 */
var Marionette = require('marionette-client');


/**
 * @constructor
 * @param {Marionette.Client} client Marionette client to use.
 */
function Calendar(client) {
  this.client = client.scope({ searchTimeout: 20000 });
  this.actions = new Marionette.Actions(client);
}
module.exports = Calendar;

Calendar.ORIGIN = 'app://calendar.gaiamobile.org';

/**
 * @type {Object}
 */
Calendar.Selector = Object.freeze({
  todayTabItem: '#today',
  addEventButton: 'a[href="/event/add/"]',
  weekButton: '#view-selector .week a',
  dayButton: '#view-selector .day a',
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
  editEventDescription: '#modify-event-view textarea[name="description"]',
  eventListSection: '#event-list',
  weekViewEvent: '#week-view .event',
  modifyEventView: '#modify-event-view',
  monthView: '#month-view',
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
  viewEventViewLocation: '#event-view .location',
  viewEventViewLocationContent: '#event-view .location > .content',
  viewEventViewStartDate: '#event-view .start-date > .content',
  viewEventViewStartTime: '#event-view .start-date > .start-time > .content',
  viewEventViewTitle: '#event-view .title',
  viewEventViewTitleContent: '#event-view .title .content',
  viewEventViewDescription: '#event-view .description',
  viewEventViewDescriptionContent: '#event-view .description .content',
  weekdayHeaders: '#month-days'
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
   * Find some elements given their name.
   *
   * @param {string} name of some calendar elements.
   * @return {Array.<Marionette.Element>} the element.
   */
  findElements: function(name) {
    return this.client.findElements(Calendar.Selector[name]);
  },

  /**
   * @param {string} name of some calendar element.
   * @return {Marionette.Element} the element.
   */
  waitForElement: function(name) {
    return this.client.helper.waitForElement(Calendar.Selector[name]);
  },

  /**
   * @param {Marionette.Element|string} parent element or name of element.
   * @param {string} child name of child element.
   */
  waitForChild: function(parent, child) {
    if (typeof parent === 'string') {
      parent = Calendar.Selector[parent];
    }
    child = Calendar.Selector[child];
    return this.client.helper.waitForChild(parent, child);
  },

  waitForMonthView: function() {
    this.client.waitFor(this.isMonthViewActive.bind(this));
  },

  waitForWeekView: function() {
    this.client.waitFor(this.isWeekViewActive.bind(this));
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
    var form = this.waitForElement('editEventForm');
    this.client.forms.fill(form, {
      startDate: opts.startDate,
      startTime: opts.startDate,
      endDate: opts.endDate,
      endTime: opts.endDate
    });

    // Save event.
    this.waitForElement('editEventSaveButton').click();

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
    if (!this.isViewEventViewActive()) {
      throw new Error('ViewEvent view inactive');
    }

    // TODO(gareth): Sort out the dates and times here.
    return {
      calendar: this.waitForElement('viewEventViewCalendar').text(),
      title: this.waitForElement('viewEventViewTitleContent').text(),
      location: this.waitForElement('viewEventViewLocationContent').text(),
      description: this.waitForElement('viewEventViewDescriptionContent').text()
    };
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
    id = id || '';
    // we do not use the URL since that might happen before the [data-path] is
    // updated and styles/views are toggled based on [data-path]
    var path = this.client.findElement('body').getAttribute('data-path');
    return path.indexOf(id) !== -1;
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
    var bodySize = this.client.executeScript(function() {
      return {
        height: document.body.clientHeight,
        width: document.body.clientWidth
      };
    });

    // (x1, y1) is swipe start.
    // (x2, y2) is swipe end.
    var x1 = bodySize.width * 0.2,
        y1 = bodySize.height * 0.2,
        x2 = 0,
        y2 = bodySize.height * 0.2;

    var panel = element || this.client.helper.waitForElement('body');
    this.actions
      .flick(panel, x1, y1, x2, y2)
      .perform();
  },

  /**
   * checks if content is bigger than container. if something is wrong it
   * throws errors. use `assert.doesNotThrow()` on your tests, it will give
   * better error messages than a simple truthy test.
   * @param {Marionette.Element|String} element the container element.
   * @param {String} [message] default value prepended to error message.
   */
  checkOverflow: function(element, msg) {
    element = this.waitForElement(element);
    msg = msg? msg + ': ' : '';

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
  }

};
