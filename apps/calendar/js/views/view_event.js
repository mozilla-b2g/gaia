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
    setContent: function(element, content) {
      var element = this.getEl(element);
      element.querySelector('.content').textContent = content;

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

      var calendar = this.store.calendarFor(model);
      if (calendar) {
        this.setContent('current-calendar', calendar.remote.name);
      }

      var dateSrc = model;
      if (model.remote.isRecurring && this.busytime) {
        dateSrc = this.busytime;
      }

      var startDate = dateSrc.startDate;
      var endDate = dateSrc.endDate;
      var startTime = InputParser.exportTime(startDate);
      var endTime = InputParser.exportTime(endDate);

      // update the allday status of the view
      if (model.isAllDay) {

        endDate = this.formatEndDate(endDate);

        // Do not display times in the UI for all day events
        startTime = null;
        endTime = null;
      }

      this.setContent('start-date',
        InputParser.exportDate(startDate));

      this.setContent('end-date',
        InputParser.exportDate(endDate));

      this.setContent('start-time', startTime);

      this.setContent('end-time', endTime);

      this.setContent('description', model.description);
    },

    oninactive: function() {
      Calendar.Views.EventBase.prototype.oninactive.apply(this, arguments);
      this._markReadonly(false);
    }

  };

  return ViewEvent;

}());
