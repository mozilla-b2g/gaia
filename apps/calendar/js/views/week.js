Calendar.ns('Views').Week = (function() {

  var Parent = Calendar.Views.Day;
  var template = Calendar.Templates.Week;

  function Week() {
    Parent.apply(this, arguments);
  }

  Week.prototype = {
    __proto__: Parent.prototype,

    panThreshold: 50,
    childThreshold: 3,

    visibleChildren: 5,
    paddingAfter: 4,
    paddingBefore: 1,
    maxChildren: 7,

    scale: 'day',

    selectors: {
      element: '#week-view',
      sidebar: '#week-view > .sidebar',
      container: '#week-view > .children'
    },

    get sidebar() {
      return this._findElement('sidebar');
    },

    get childContainer() {
      return this._findElement('container');
    },

    handleEvent: function(e) {
      Parent.prototype.handleEvent.apply(
        this, arguments
      );

      switch (e.type) {
        case 'selectedDayChange':
        case 'dayChange':
          this._activateTime(e.data[0]);
          this._moveFrames(0);
          break;
      }
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

    _appendSidebarHours: function() {
      var element = this.sidebar;
      var allday = template.sidebarHour.render({
        hour: Calendar.Calc.ALLDAY,
        displayHour: Calendar.Calc.ALLDAY
      });

      element.insertAdjacentHTML(
        'beforeend',
        allday
      );

      var i = 0;
      var hour;
      var displayHour;

      for (; i < 24; i++) {
        hour = String(i);
        displayHour = Calendar.Calc.formatHour(i);

        element.insertAdjacentHTML(
          'beforeend',
          template.sidebarHour.render({
            hour: hour,
            displayHour: displayHour
          })
        );
      }
    },

    render: function() {
      this._appendSidebarHours();
      this._activateTime(
        this.app.timeController.day
      );
    },

    onactive: function() {
      Parent.prototype.onactive.apply(this, arguments);
      var width = this.childContainer.offsetWidth;
      this.viewportSize = width;
      this.recalculateWidth();

      this._moveFrames(0);
    }
  };

  Week.prototype.onfirstseen = Week.prototype.render;

  return Week;

}());
