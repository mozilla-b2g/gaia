Calendar.ns('Views').Month = (function() {

  var template = Calendar.Templates.Month;

  /**
   * Creates an instance of a month.
   */
  function Month(options) {
    Calendar.View.apply(this, arguments);

    this.controller = this.app.timeController;
    this.children = Object.create(null);

    this.centerOnCurrent = this.centerOnCurrent.bind(this);
    this._initEvents();
  }

  Month.prototype = {
    __proto__: Calendar.View.prototype,

    selectors: {
      element: '#month-view',
      container: '#month-displays',
      currentMonth: '#current-month-year'
    },

    /**
     * Hack this should be localized.
     */
    monthNames: [
      'January',
      'Feburary',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ],

    SELECTED: 'selected',
    ATTACH_AS_FIRST: true,

    busyPercision: (24 / 12),

    _clearSelectedDay: function() {
      var li = this.container.querySelector('li.selected');
      if (li) {
        li.classList.remove('selected');
      }
    },

    _initEvents: function() {
      var self = this,
          months = this.container;

      this.controller.on('purge', function(span) {
        var key;
        var child;

        for (key in self.children) {
          var child = self.children[key];

          if (child.timespan.isEqual(span)) {
            child.destroy();
            delete self.children[key];
          }
        }
      });

      this.controller.on('selectedDayChange', function(newVal, oldVal) {
        var el, id;
        self._clearSelectedDay();

        id = Calendar.Calc.getDayId(newVal);
        id = self.currentChild._dayId(id);
        el = document.getElementById(id);
        if (el) {
          el.classList.add('selected');
        }
      });

      this.controller.on('monthChange', function(value) {
        self.updateCurrentMonth();
        self.activateMonth(value);
        self._clearSelectedDay();
      });

      new GestureDetector(months).startDetecting();

      months.addEventListener('pan', function(data) {
        self._onpan.apply(self, arguments);
      });

      months.addEventListener('swipe', function(data) {
        self._onswipe.apply(self, arguments);
      });

      months.addEventListener('tap', function(data) {
        self._ontap.apply(self, arguments);
      }, false);
    },

    get container() {
      return this._findElement('container');
    },

    get currentMonth() {
      return this._findElement('currentMonth');
    },

    panThreshold: window.innerWidth / 2.5,
    monthOffset: window.innerWidth * -1,

    _onpan: function month_onPan(event) {
      this._moveChildren(event.detail.absolute.dx);
    },

    _moveChildren: function(offset) {
      var rule = 'translateX(' + (this.monthOffset + offset) + 'px)';

      this.previousChild.element.style.transform = rule;
      this.nextChild.element.style.transform = rule;
      this.currentChild.element.style.transform = rule;
    },

    _ontap: function(event) {
      var target = event.target,
          id,
          date,
          el;

      if (target.tagName.toLowerCase() == 'li') {
        el = target;
      } else {
        el = target.parentNode;
      }

      id = el.getAttribute('data-date');

      if (id) {
        date = Calendar.Calc.dateFromId(id);
        this.controller.selectedDay = date;
      }

    },

    _onswipe: function(event) {
      if (Math.abs(event.detail.dx) > this.panThreshold) {
        var direction = event.detail.direction;
        if (direction === 'right') {
          this.previous();
        } else {
          this.next();
        }
      }

      // swipe is fired after the user moves
      // their finger of pan so we need to center
      // on the current element again.
      this.centerOnCurrent();
    },

    /**
     * Returns month header html blob.
     *
     * @return {String} html blob with current month.
     */
    _renderCurrentMonth: function() {
      var month = this.controller.month.getMonth(),
          year = this.controller.month.getFullYear();

      return template.currentMonth.render({
        year: year,
        month: this.monthNames[month]
      });
    },

    /**
     * Updates month header with the current month.
     */
    updateCurrentMonth: function() {
      var html = this._renderCurrentMonth();
      this.currentMonth.innerHTML = html;
    },

    /**
     * Moves calendar to the next month.
     */
    next: function() {
      var now = this.controller.month;
      var date = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate()
      );

      this.controller.move(date);
    },

    /**
     * Moves calendar to the next month.
     */
    previous: function() {
      var now = this.controller.month;
      var date = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate()
      );

      this.controller.move(date);
    },

    /**
     * Appends given month to display area.
     *
     * @param {Date} date current month this should
     *                    usually be the starting date of
     *                    a given month.
     */
    activateMonth: function(date) {
      var display = this.container,
          previousDate = new Date(
            date.getFullYear(),
            date.getMonth() - 1,
            1
          ),
          nextDate = new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            1
          ),
          previousId = Calendar.Calc.getMonthId(previousDate),
          nextId = Calendar.Calc.getMonthId(nextDate),
          id = Calendar.Calc.getMonthId(date),
          el,
          currentEl;

      // Hide old months first
      if (this.currentChild)
        this.currentChild.deactivate();
      if (this.previousChild)
        this.previousChild.deactivate();
      if (this.nextChild)
        this.nextChild.deactivate();

      if (id in this.children) {
        this.currentChild = this.children[id];
        this.currentChild.activate();
      } else {

        this.currentChild = new Calendar.Views.MonthChild({
          app: this.app,
          month: date
        });

        this.currentChild.attach(display);
        this.currentChild.activate();

        this.children[id] = this.currentChild;
      }

      if (previousId in this.children) {
        this.previousChild = this.children[previousId];
        this.previousChild.activate();
      } else {

        this.previousChild = new Calendar.Views.MonthChild({
          app: this.app,
          month: previousDate
        });

        // second parameter (prepend) determines if we attach
        // the month at the beginning or the end.
        this.previousChild.attach(display, this.ATTACH_AS_FIRST);
        this.previousChild.activate();
        this.children[previousId] = this.previousChild;
      }

      if (nextId in this.children) {
         this.nextChild = this.children[nextId];
         this.nextChild.activate();
       } else {

         this.nextChild = new Calendar.Views.MonthChild({
           app: this.app,
           month: nextDate
         });

         this.nextChild.attach(display);
         this.nextChild.activate();

         this.children[nextId] = this.nextChild;
       }
    },

    centerOnCurrent: function() {
      this._moveChildren(0);
    },

    /**
     * Render current month
     */
    render: function() {
      var el = this.container,
          now = new Date();

      now = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

      this.controller.move(now);
      this.centerOnCurrent();
    }

  };

  Month.prototype.onfirstseen = Month.prototype.render;

  return Month;

}(this));
