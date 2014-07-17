define(function(require) {
  'use strict';

  var Parent = require('views/time_parent');
  var DayChild = require('views/day_child');
  var router = require('app').router;

  function Day() {
    Parent.apply(this, arguments);
  }

  Day.prototype = {
    __proto__: Parent.prototype,
    panThreshold: 50,
    childThreshold: 3,

    scale: 'day',

    childClass: DayChild,

    selectors: {
      element: '#day-view'
    },

    _initEvents: function() {
      Parent.prototype._initEvents.call(this);

      var delegateParent = this.delegateParent || this.frameContainer;
      this.delegate(
        delegateParent, 'click', '[data-id]', function(e, target) {
          router.show('/event/show/' + target.dataset.id + '/');
        }
      );
    },

    handleEvent: function(e) {
      Parent.prototype.handleEvent.apply(
        this, arguments
      );

      switch (e.type) {
        case 'dayChange':
          this.app.timeController.selectedDay = this.app.timeController.day;
          /* falls through */
        case 'selectedDayChange':
          this.changeDate(e.data[0]);
          break;
      }
    },

    _nextTime: function(time) {
      return new Date(
        time.getFullYear(),
        time.getMonth(),
        time.getDate() + 1
      );
    },

    _previousTime: function(time) {
      return new Date(
        time.getFullYear(),
        time.getMonth(),
        time.getDate() - 1
      );
    },

    render: function() {
      this.changeDate(
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

      // ensure we change the date, if this is already
      // the selected date the cost here is very small.
      this.changeDate(controller.position);

      if (!this.frames || !this.frames.length) {
        console.error('(Calendar: render error) no child frames');
        console.trace();
      }
    }
  };

  Day.prototype.onfirstseen = Day.prototype.render;

  return Day;

});
