Calendar.ns('Views').Day = (function() {
  'use strict';

  var Parent = Calendar.Views.TimeParent;

  function Day() {
    Parent.apply(this, arguments);
  }

  Day.prototype = {
    __proto__: Parent.prototype,
    panThreshold: 50,
    childThreshold: 3,

    scale: 'day',

    childClass: Calendar.Views.DayChild,

    selectors: {
      element: '#day-view'
    },

    _initEvents: function() {
      Parent.prototype._initEvents.call(this);

      var delegateParent = this.delegateParent || this.frameContainer;
      this.delegate(
        delegateParent, 'click', '[data-id]', function(e, target) {
          Calendar.App.router.show('/event/show/' + target.dataset.id + '/');
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
          this.changeDate(e.data[0], { onlyToday: true });
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

      // Scroll to the destination from the top(scrollTop as 0)
      // when go to the day view from other view.
      this.changeDate(controller.position, { startScrollTop: 0 });

      if (!this.frames || !this.frames.length) {
        console.error('(Calendar: render error) no child frames');
        console.trace();
      }
    },

    changeDate: function(time, options) {
      var startScrollTop = options && options.startScrollTop;
      if (startScrollTop != null) {
        this.currentFrame.setScrollTop(startScrollTop);
      }

      Parent.prototype.changeDate.call(this, time);

      var scrollTop = this._getDestinationScrollTop(time, options);
      if (scrollTop != null) {
        this.currentFrame.animatedScroll(scrollTop);
      }
    },

    _getDestinationScrollTop: function(time, options) {
      var now = new Date();
      var dayEvents = this.currentFrame.element
        .querySelector('.day-events-wrapper');
      var maxScrollTop = dayEvents.scrollHeight - dayEvents.clientHeight;
      var scrollTop;
      var hour;

      if (Calendar.Calc.isSameDate(time, now)) {
        hour = Math.max(now.getHours() - 1, 0);
      } else if (!options || !options.onlyToday) {
        hour = 8;
      }

      if (hour != null) {
        scrollTop = dayEvents.querySelector('.hour-' + hour).offsetTop;
        scrollTop = Math.min(scrollTop, maxScrollTop);
      }

      return scrollTop;
    }
  };

  Day.prototype.onfirstseen = Day.prototype.render;

  return Day;

}());
