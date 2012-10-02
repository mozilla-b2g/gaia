Calendar.ns('Views').Week = (function() {

  var Parent = Calendar.Views.TimeParent;

  function Week() {
    Parent.apply(this, arguments);
  }

  Week.prototype = {
    __proto__: Parent.prototype,
    panThreshold: 50,
    childThreshold: 3,

    scale: 'week',

    selectors: {
      element: '#week-view'
    },

    _initEvents: function() {
      Parent.prototype._initEvents.call(this);
    },

    handleEvent: function(e) {
      Parent.prototype.handleEvent.apply(
        this, arguments
      );

      switch (e.type) {
        case 'selectedDayChange':
        case 'dayChange':
          this._activateTime(e.data[0]);
          break;
      }
    },

    _getId: function(date) {
      return date.valueOf();
    },

    _nextTime: function(time) {
      return new Date(
        time.getFullYear(),
        time.getMonth(),
        time.getDate() + 7
      );
    },

    _previousTime: function(time) {
      return new Date(
        time.getFullYear(),
        time.getMonth(),
        time.getDate() - 7
      );
    },

    /**
     * Creates child week view.
     *
     * @param {Date} time date.
     */
    _createChild: function(time) {
      return new Calendar.Views.WeekChild({
        date: time,
        app: this.app
      });
    },

    render: function() {
      this._activateTime(
        this.app.timeController.day
      );
    },

    oninactive: function() {
      Parent.prototype.oninactive.apply(this, arguments);

      /**
       * We disable events here because this view
       * does not need to be updated while hidden
       * notice this will not effect the day children
       * at all...
       */
      var controller = this.app.timeController;
      controller.removeEventListener('dayChange', this);
      controller.removeEventListener('selectedDayChange', this);
    },

    onactive: function() {
      Parent.prototype.onactive.apply(this, arguments);
      /**
       * We only want to listen to views when
       * this view is actually active...
       */
      var controller = this.app.timeController;
      controller.on('dayChange', this);
      controller.on('selectedDayChange', this);
      controller.moveToMostRecentDay();
    }
  };

  Week.prototype.onfirstseen = Week.prototype.render;

  return Week;

}());
