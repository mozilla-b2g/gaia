Calendar.ns('Views').ViewEvent = (function() {
  'use strict';

  function ViewEvent(options) {
    Calendar.Views.EventBase.apply(this, arguments);
  }

  ViewEvent.prototype = {
    __proto__: Calendar.Views.EventBase.prototype,

    DEFAULT_VIEW: '/month/',

    selectors: {
      element: '#event-view',
      cancelButton: '#event-view .cancel',
      primaryButton: '#event-view .edit'
    },

    _initEvents: function() {
      Calendar.Views.EventBase.prototype._initEvents.apply(this, arguments);
    },

    /**
     * Dismiss modification and go back to previous screen.
     */
    cancel: function() {
      this.app.go(this.returnTop());
    },

    primary: function(event) {
      if (event) {
        event.preventDefault();
      }

      // Disable the button on primary event to avoid race conditions
      this.primaryButton.setAttribute('aria-disabled', 'true');

      this.app.go('/event/edit/' + this.busytime._id + '/');
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
        // Set calendar color.
        this.element
          .querySelector('section[data-type="list"]')
          .className = 'calendar-id-' + model.calendarId;

        var calendarId = this.originalCalendar.remote.id;
        var isLocalCalendar = calendarId === Calendar.Provider.Local.calendarId;
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

      var duationTimeContent =
        Calendar.Templates.DurationTime.durationTime.render(dateSrc);
      this.setContent('duration-time', duationTimeContent, 'innerHTML');

      var alarmContent = '';
      var alarms = this.event.alarms;
      if (alarms) {
        this.getEl('alarms')
          .classList
          .toggle('multiple', alarms.length > 1);

        alarmContent =
          Calendar.Templates.Alarm.reminder.render({
            alarms: alarms,
            isAllDay: this.event.isAllDay,
          });
      }

      this.setContent('alarms', alarmContent, 'innerHTML');

      this.setContent('description', model.description);
    },

    oninactive: function() {
      Calendar.Views.EventBase.prototype.oninactive.apply(this, arguments);
      this._markReadonly(false);
    }

  };

  return ViewEvent;

}());
