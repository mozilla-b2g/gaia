(function(window) {

  if (typeof(Calendar) === 'undefined') {
    window.Calendar = {};
  }

  if (typeof(Calendar.Views) === 'undefined') {
    Calendar.Views = {};
  }

  var template = Calendar.Templates.Month;

  /**
   * Creates an instance of a month.
   */
  function Month(options) {
    var self = this,
        key;

    Calendar.View.call(this);

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    this.selectedDay = null;
    this.children = {};
    this.element = document.querySelector('#month-view');

    this._initEvents();
  };

  var proto = Month.prototype = Object.create(
    Calendar.View.prototype
  );

  /**
   * Selector for element that will contain
   * many months.
   *
   * @type {String}
   */
  proto.monthSelector = '#month-displays';

  /**
   * Selector for element that will display the current month.
   *
   * @type {String}
   */
  proto.currentMonthSelector = '#current-month-year';

  /**
   * Hack this should be localized.
   */
  proto.monthNames = [
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
  ];

  proto.SELECTED = 'selected';

  proto.busyPercision = (24 / 12);

  proto._clearSelectedDay = function() {
    var li = this.monthsDisplayElement().querySelector('li.selected');
    if (li) {
      li.classList.remove('selected');
    }
  };

  proto._initEvents = function() {
    var self = this,
        months = this.monthsDisplayElement();

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

    this.controller.on('currentMonthChange', function(value) {
      self.updateCurrentMonth();
      self.activateMonth(value);
      self._clearSelectedDay();
    });

    new GestureDetector(months).startDetecting();

    months.addEventListener('swipe', function(data) {
      self._onswipe.apply(self, arguments);
    });

    months.addEventListener('tap', function(data) {
      self._ontap.apply(self, arguments);
    }, false);
  };

  proto._ontap = function(event) {
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
      this.controller.setSelectedDay(date, el);
    }

  };

  proto._onswipe = function(event) {
    var direction = event.detail.direction;
    if (direction === 'right') {
      this.previous();
    } else {
      this.next();
    }
  };

  /**
   * Returns month header html blob.
   *
   * @return {String} html blob with current month.
   */
  proto._renderCurrentMonth = function() {
    var month = this.controller.currentMonth.getMonth(),
        year = this.controller.currentMonth.getFullYear();

    return template.currentMonth.render({
      year: year,
      month: this.monthNames[month]
    });
  };

  /**
   * Updates month header with the current month.
   */
  proto.updateCurrentMonth = function() {
    var html = this._renderCurrentMonth();
    this.currentMonthElement().innerHTML = html;
  };

  function getEl(selectorName, elName) {
    var selector;
    if (!this[elName]) {
      selector = this[selectorName];
      this[elName] = document.body.querySelector(selector);
    }
    return this[elName];
  }

  /**
   * Finds and returns element.
   *
  * @return {HTMLElement} container for month view.
   */
  proto.monthsDisplayElement = function() {
    return getEl.call(this, 'monthSelector', '_monthDisplayEl');
  };

  /**
   * Finds and returns element.
   *
  * @return {HTMLElement} container for month view.
   */
  proto.currentMonthElement = function() {
    return getEl.call(this, 'currentMonthSelector', '_headerEl');
  };

  /**
   * Moves calendar to the next month.
   */
  proto.next = function() {
    var now = this.controller.currentMonth;
    var date = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );

    this.controller.setCurrentMonth(date);
  };

  /**
   * Moves calendar to the next month.
   */
  proto.previous = function() {
    var now = this.controller.currentMonth;
    var date = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );

    this.controller.setCurrentMonth(date);
  };

  /**
   * Appends given month to display area.
   *
   * @param {Date} date current month this should
   *                    usually be the starting date of
   *                    a given month.
   */
  proto.activateMonth = function(date) {
    var id = Calendar.Calc.getMonthId(date),
        el,
        currentEl;

    if (id in this.children) {
      this.currentChild.deactivate();
      this.currentChild = this.children[id];
      this.currentChild.activate();
    } else {
      var display = this.monthsDisplayElement();

      if (this.currentChild) {
        this.currentChild.deactivate();
      }

      this.currentChild = new Calendar.Views.MonthChild({
        month: date,
        controller: this.controller
      });

      this.currentChild.attach(display);
      this.currentChild.activate();

      this.children[id] = this.currentChild;
    }
  };

  /**
   * Render current month
   */
  proto.render = function() {
    var el = this.monthsDisplayElement(),
        now = new Date();

    now.setDate(1);

    this.controller.setCurrentMonth(now);
  }

  proto.onfirstseen = proto.render;

  Calendar.Views.Month = Month;

}(this));
