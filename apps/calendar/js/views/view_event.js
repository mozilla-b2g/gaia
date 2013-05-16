Calendar.ns('Views').ViewEvent = (function() {

  var InputParser = Calendar.Utils.InputParser;

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
      if (boolean)
        this.primaryButton.disabled = true;
      else
        this.primaryButton.disabled = false;
    },

    /**
     * Sets content for an element
     * Hides the element if there's no content to set
     */
    setContent: function(element, content, method) {
      method = method || 'textContent';
      var element = this.getEl(element);
      element.querySelector('.content')[method] = content;

      if (!content) {
        element.style.display = 'none';
      } else {
        element.style.display = '';
      }
    },

    formatDate: function(date) {
      return Calendar.App.dateFormat.localeFormat(
        date,
        navigator.mozL10n.get('dateTimeFormat_%x')
      );
    },

    formatTime: function(time) {
      if (!time)
        return '';

      return Calendar.App.dateFormat.localeFormat(
        time,
        navigator.mozL10n.get('shortTimeFormat')
      );
    },

    /**
     * Updates the UI to use values from the current model.
     */
    _updateUI: function() {
      var model = this.event;

      this.setContent('title', model.title);

      this.setContent('location', model.location);

      if (this.originalCalendar) {
        this.setContent(
          'current-calendar',
          this.originalCalendar.remote.name
        );
      }

      var dateSrc = model;
      if (model.remote.isRecurring && this.busytime) {
        dateSrc = this.busytime;
      }

      var startDate = dateSrc.startDate;
      var endDate = dateSrc.endDate;
      var startTime = startDate;
      var endTime = endDate;

      // update the allday status of the view
      if (model.isAllDay) {

        endDate = this.formatEndDate(endDate);

        // Do not display times in the UI for all day events
        startTime = null;
        endTime = null;
      }

      this.setContent('start-date', this.formatDate(startDate));

      this.setContent('end-date', this.formatDate(endDate));

      this.setContent('start-time', this.formatTime(startTime));

      this.setContent('end-time', this.formatTime(endTime));

      // Handle alarm display
      var alarmContent = '';

      if (this.event.alarms && this.event.alarms.length) {

        var alarmDescription = Calendar.Templates.Alarm.description;

        for (var i = 0, alarm; alarm = this.event.alarms[i]; i++) {
          alarmContent += '<div>' +
            alarmDescription.render({
              trigger: alarm.trigger,
              layout: this.event.isAllDay ? 'allday' : 'standard'
            }) +
          '</div>';
        }
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
