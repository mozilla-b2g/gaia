Calendar.ns('Views').Week = (function() {

  var Parent = Calendar.Views.Day;
  var template = Calendar.Templates.Week;

  /**
   * Create a 'frame' of a parent view.
   * This was designed for week view but majority
   * of logic could apply elsewhere if needed.
   *
   * @param {String} id frame id.
   * @param {Array[Object]} children array of child views.
   */
  function Frame(id, children, stickyList) {
    this.id = id;
    this.children = children;
    this.stickyList = stickyList;
    // frame element - mostly here for positioning
    this.element = document.createElement('section');

    this.element.innerHTML = template.frame.render();

    var firstSpan = children[0].timespan;
    var lastSpan = children[children.length - 1].timespan;

    // join the duration of timespans
    this.timespan = new Calendar.Timespan(
      firstSpan.start,
      lastSpan.end
    );

    // append all children (in order to the frame's element)
    var len = children.length;
    var i = 0;

    var weekChildren = this.element.querySelector('.scroll .children');
    for (; i < len; i++) {
      // create always should return an element.
      weekChildren.appendChild(children[i].create());
    }

    this.element.querySelector('.sticky .children').appendChild(stickyList);
    this._appendSidebarHours();
  }

  Frame.prototype = {

    /**
     * Calls a method on all children.
     */
    _childMethod: function(method) {
      if (!this.children) {
        console.trace();
        console.error('trying to access dead object');
      }

      var i = 0;
      var len = this.children.length;

      for (; i < len; i++) {
        this.children[i][method]();
      }
    },

    /**
     * Activates all children and adds ACTIVE class to frame.
     */
    activate: function() {
      this._childMethod('activate');
      this.element.classList.add(
        Calendar.View.ACTIVE
      );
    },

    /**
     * Deactivates all children and removes ACTIVE class from frame.
     */
    deactivate: function() {
      this._childMethod('deactivate');
      this.element.classList.remove(
        Calendar.View.ACTIVE
      );
    },

    /**
     * Destroys all children, frame element and references.
     */
    destroy: function() {
      this._childMethod('destroy');

      var el = this.element;

      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }

      this.timespan = null;
      this.children = null;
      this.element = null;
    },

    getScrollTop: function() {
      var scroll = this.element.querySelector('.scroll');
      var scrollTop = scroll.scrollTop;
      return scrollTop;
    },

    setScrollTop: function(scrollTop) {
      var scroll = this.element.querySelector('.scroll');
      scroll.scrollTop = scrollTop;
    },

    _appendSidebarHours: function() {
      var element = this.element.querySelector('.sidebar');

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
    }
  };

  function Week() {
    Parent.apply(this, arguments);
  }

  Week.prototype = {
    __proto__: Parent.prototype,

    childClass: Calendar.Views.WeekChild,

    // Needed for proper TimeHeader data
    scale: 'week',

    selectors: {
      element: '#week-view'
    },

    get sidebar() {
      return this._findElement('sidebar');
    },

    get frameContainer() {
      return this._findElement('element');
    },

    get delegateParent() {
      return this._findElement('element');
    },

    /**
     * For a given date finds the week details.
     *
     * Example:
     *
     *    // week starts on Sunday in this example
     *    var parent;
     *
     *    // attempt to find the required days.
     *    parent.dateDetails(new Date(2012, 0, 1));
     *    // { start: (2012, 0, 1), end: (2012, 0, 4)  length: 4 }
     *
     *    // any time that falls within the range returns same start
     *    parent.dateDetails(new Date(2012, 0, 4));
     *    // { start: (2012, 0, 1), end: (2012, 0, 4), length: 4 }
     *
     *    parent.dateDetails(new Date(2012, 0, 5));
     *    // { start: (2012, 0, 5), end: (2012, 0, 7), length: 3 }
     *
     *
     * @param {Date} date time to find week details for..
     * @return {Object} see above.
     */
    weekDetails: function(date) {
      var day = Calendar.Calc.dayOfWeek(date);

      var start = Calendar.Calc.getWeekStartDate(date);
      var end = new Date(start.valueOf());

      end.setDate(
        // -1 otherwise we end up with an extra day 1 + 7 === 8
        (start.getDate() - 1) + Calendar.Calc.daysInWeek()
      );

      // day is zero based so 3 rather then 4
      if (day > 3) {
        start.setDate(start.getDate() + 4);
        // display end of week.
        return {
          length: 3,
          start: start,
          end: end
        };
      } else {
        end.setDate(end.getDate() - 3);
        // display start of week.
        return {
          length: 4,
          start: start,
          end: end
        };
      }
    },

    /**
     * See TimeParent for more details.
     * The week view is special as it normalizes
     * all dates to a week start/end point as defined
     * in the weekDetails method.
     *
     * @param {Date} date change display to center on this date.
     */
    changeDate: function(date) {
      // XXX: good hook to update header here too maybe?
      var details = this.weekDetails(date);
      Parent.prototype.changeDate.call(this, details.start);
    },

    render: function() {
      this.changeDate(
        this.app.timeController.day
      );
    },


    _nextTime: function(date) {
      var details = this.weekDetails(date);
      var result = details.start;
      result.setDate(result.getDate() + details.length);
      return result;
    },

    _previousTime: function(date) {
      var details = this.weekDetails(date);
      var result = details.start;
      var offset = details.length;

      // flip the length and remove it to find
      // previous week set.
      offset = (offset === 4) ? 3 : 4;

      result.setDate(result.getDate() - offset);
      return result;
    },

    /**
     * Builds the frame for the given time.
     */
    _createFrame: function(time) {
      var details = this.weekDetails(time);
      var start = details.start;
      var id = start.valueOf();
      var len = details.length;
      var children = [];
      var stickyList = document.createElement('ul');

      var i = 0;
      for (; i < len; i++) {
        var date = new Date(start.valueOf());
        date.setDate(date.getDate() + i);

        var stickyFrame = document.createElement('li');
        stickyList.appendChild(stickyFrame);

        children.push(new Calendar.Views.WeekChild({
          date: date,
          app: this.app,
          stickyFrame: stickyFrame
        }));
      }

      var frame = new Frame(id, children, stickyList);
      var list = frame.element.classList;

      list.add('days-' + len);
      list.add('weekday');

      frame.stickyList.classList.add('days-' + len);

      return frame;
    }

  };

  Week.Frame = Frame;

  Week.prototype.onfirstseen = Week.prototype.render;

  return Week;

}());
