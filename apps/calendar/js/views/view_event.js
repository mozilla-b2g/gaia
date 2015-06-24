define(function(require, exports, module) {
'use strict';

var DurationTime = require('templates/duration_time');
var EventBase = require('./event_base');
var alarmTemplate = require('templates/alarm');
var localCalendarId = require('common/constants').localCalendarId;
var router = require('router');

require('dom!event-view');

function ViewEvent(options) {
  EventBase.apply(this, arguments);
}
module.exports = ViewEvent;

ViewEvent.prototype = {
  __proto__: EventBase.prototype,

  DEFAULT_VIEW: '/month/',

  selectors: {
    element: '#event-view',
    header: '#show-event-header',
    primaryButton: '#event-view .edit'
  },

  _initEvents: function() {
    EventBase.prototype._initEvents.apply(this, arguments);
  },

  /**
   * Dismiss modification and go back to previous screen.
   */
  cancel: function() {
    router.go(this.returnTop());
  },

  primary: function(event) {
    if (event) {
      event.preventDefault();
    }

    // Disable the button on primary event to avoid race conditions
    this.primaryButton.setAttribute('aria-disabled', 'true');

    router.go('/event/edit/' + this.busytime._id + '/');
  },

  /**
   * Mark the event readOnly
   * Hides/shows the edit button
   *
   * @param {Boolean} boolean true/false.
   */
  _markReadonly: function(boolean) {
    this.primaryButton.disabled = boolean;
  },

  /**
   * Sets content for an element
   * Hides the element if there's no content to set
   */
  setContent: function(element, content, method) {
    method = method || 'textContent';
    element = this.getEl(element);
    element.querySelector('.content')[method] = content;

    if (!content) {
      element.style.display = 'none';
    } else {
      element.style.display = '';
    }
  },

  /**
   * Updates the UI to use values from the current model.
   */
  _updateUI: function() {
    var model = this.event;

    this.setContent('title', model.title);
    this.setContent('location', model.location);

    if (this.originalCalendar) {
      this.element.querySelector('.icon-calendar-dot').style.color =
        this.originalCalendar.remote.color;

      var calendarId = this.originalCalendar.remote.id;
      var isLocalCalendar = calendarId === localCalendarId;
      var calendarName = isLocalCalendar ?
        navigator.mozL10n.get('calendar-local') :
        this.originalCalendar.remote.name;

      this.setContent(
        'current-calendar',
        calendarName
      );

      if (isLocalCalendar) {
        this.getEl('current-calendar')
          .querySelector('.content')
          .setAttribute('data-l10n-id', 'calendar-local');
      }
    }

    var dateSrc = model;
    if (model.remote.isRecurring && this.busytime) {
      dateSrc = this.busytime;
    }

    var duationTimeContent = DurationTime.durationTime.render(dateSrc);
    this.setContent('duration-time', duationTimeContent, 'innerHTML');

    var alarmContent = '';
    var alarms = this.event.alarms;
    if (alarms) {
      this.getEl('alarms')
        .classList
        .toggle('multiple', alarms.length > 1);

      alarmContent = alarmTemplate.reminder.render({
        alarms: alarms,
        isAllDay: this.event.isAllDay,
      });
    }

    this.setContent('alarms', alarmContent, 'innerHTML');
    this.setContent('description', model.description);
  },

  oninactive: function() {
    EventBase.prototype.oninactive.apply(this, arguments);
    this._markReadonly(false);
  }
};

});
