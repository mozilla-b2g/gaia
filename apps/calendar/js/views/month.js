(function(window) {

  if (typeof(Calendar) === 'undefined') {
    window.Calendar = {};
  }

  if (typeof(Calendar.Views) === 'undefined') {
    Calendar.Views = {};
  }

  var format = Calendar.format;

  /**
   * Creates an instance of a month.
   */
  function Month(options) {
    var self = this,
        key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    this.selectedDay = null;
    this.renderedMonths = {};

    Calendar.Responder.call(this);

    this._initEvents();
  };

  var proto = Month.prototype = Object.create(
    Calendar.Responder.prototype
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

  proto.templates = {

    currentMonth: [
      '<span class="month">%s</span>',
      '<span class="year">%s</span>'
    ].join(' '),

    monthDaysHeader: [
      '<header id="month-days" role="row">',
        '<ol role="row">',
          '%s',
        '</ol>',
      '</header>'
    ].join(''),

    monthDaysHeaderDay: [
      '<li role="column">',
        '%s',
      '</li>'
    ].join(''),

    monthSection: [
      '<section id="%s" class="month">',
        '%s',
      '</section>'
    ].join(''),

    monthSectionRow: [
      '<ol role="row">',
        '%s',
      '</ol>'
    ].join(''),

    monthSectionDay: [
      '<li id="%s" data-date="%s" class="%s">',
        '<span class="day">%s</span>',
        '<div class="busy-indicator">%s</div>',
      '</li>'
    ].join(''),

    busyIndicator: '<span class="busy-%s">&nbsp;</span>'
  };

  /**
   * Hack this should be localized.
   */
  proto.dayNames = [
    'sun',
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat'
  ];

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

  proto.INACTIVE = ' inactive';

  proto.SELECTED = 'selected';

  proto.busyPercision = (24 / 12);

  proto._clearSelectedDay = function() {
    var li = this.monthsDisplayElement().querySelector('li.selected');
    if (li) {
      li.className = li.className.replace(' selected', '');
    }
  };

  proto._initEvents = function() {
    var self = this,
        months = this.monthsDisplayElement();

    this.controller.on('selectedDayChange', function(newVal, oldVal) {
      var el, id;
      self._clearSelectedDay();

      id = Calendar.Calc.getDayId(newVal);
      id = 'month-view-' + id;
      el = document.getElementById(id);


      if (el) {
        el.className += ' selected';
      }
    });

    this.controller.on('currentMonthChange', function(value) {
      self.updateCurrentMonth();
      self.activateMonth(value);
      self._clearSelectedDay();

    });

    new GestureDetector(months).startDetecting();

    months.addEventListener('swipe', function(data) {
      self._onSwipe.apply(self, arguments);
    });

    months.addEventListener('tap', function(data) {
      self._onTap.apply(self, arguments);
    }, false);

  };


  proto._onTap = function(event) {
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

  proto._onSwipe = function(event) {
    var direction = event.detail.direction;

    if (direction === 'right') {
      this.previous();
    } else {
      this.next();
    }

  };

  /**
   * Returns a list of busy units based
   * on an array of hours.
   *
   * @param {Array} hours list of hours.
   * @return {Array} list of busy units.
   */
  proto._getBusyUnits = function(hours) {
    var set = {},
        result = [],
        i = 0,
        unit;

    for (; i < hours.length; i++) {
      unit = Math.ceil(hours[i] / this.busyPercision) || 1;
      if (!(unit in set)) {
        result.push(unit);
        set[unit] = true;
      }
    }

    return result;
  };

  proto._renderBusyUnits = function(units) {
    var i = 0,
        units = this._getBusyUnits(units),
        busyUnits = [];

    for (i; i < units.length; i++) {
      busyUnits.push(format(this.templates.busyIndicator, units[i]));
    }

    return busyUnits.join('');
  };

  /**
   * Returns month header html blob.
   *
   * @return {String} html blob with current month.
   */
  proto._renderCurrentMonth = function() {
    var month = this.controller.currentMonth.getMonth(),
        year = this.controller.currentMonth.getFullYear();

    return format(
      this.templates.currentMonth,
      this.monthNames[month],
      year
    );
  };

  /**
   * Updates month header with the current month.
   */
  proto.updateCurrentMonth = function() {
    var html = this._renderCurrentMonth();
    this.currentMonthElement().innerHTML = html;
  };

  /**
   * Renders out a day with busy times.
   *
   * @param {Date} day representing a day.
   */
  proto._renderDay = function(day) {
    var busyHtml,
        hours,
        day = day,
        id = Calendar.Calc.getDayId(day),
        state,
        busytimes = this.controller.busytime;

    if (this.controller.currentMonth.getMonth() != Calendar.Calc.today.getMonth()) {
      state = Calendar.Calc.relativeState(day, this.controller.currentMonth);
    } else {
      state = Calendar.Calc.relativeState(day);
    }

    hours = busytimes.getHours(day);
    busyHtml = this._renderBusyUnits(hours);

    return format(
      this.templates.monthSectionDay,
      'month-view-' + id,
      id,
      state,
      day.getDate(),
      busyHtml
    );
  };

  /**
   * Renders a week based on a start date.
   *
   * @param {Object} object config options.
   */
  proto._renderWeek = function(start) {
    var days = Calendar.Calc.getWeeksDays(start),
        output = [],
        i = 0;


    for (i; i < days.length; i++) {
      output.push(this._renderDay(days[i]));
    }

    return format(this.templates.monthSectionRow, output.join(''));
  };

  /**
   * Renders out the calendar headers.
   *
   * @return {String} returns a list of headers.
   */
  proto._renderDayHeaders = function() {
    var headerList = [],
        i;

    for (i = 0; i < this.dayNames.length; i++) {
      headerList.push(
        format(
          this.templates.monthDaysHeaderDay,
          this.dayNames[i]
        )
      );
    }

    return format(
      this.templates.monthDaysHeader,
      headerList.join('')
    );

  };

  /**
   * Renders out an entire month.
   *
   * @param {Date} date date which month resides in.
   * @return {String} return value.
   */
  proto._renderMonth = function(date) {
    var id = Calendar.Calc.getDayId(date),
        weekList = [],
        i;

    for (i = 0; i < 5; i++) {
      var week = weekList.push(
        this._renderWeek(
          new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() + (i * 7)
          )
        )
      );
    }

    return format(
      this.templates.monthSection,
      id,
      weekList.join('\n')
    );
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
   * @param {Date} date current month this should \
   *                    usually be the starting date of
   *                    a given month.
   */
  proto.activateMonth = function(date) {
    var id = Calendar.Calc.getMonthId(date),
        el,
        currentEl,
        className;

    if (id in this.renderedMonths) {
      this.displayedMonthEl.className += this.INACTIVE;

      currentEl = this.renderedMonths[id];
      className = currentEl.className;
      currentEl.className = className.replace(this.INACTIVE, '');
      this.displayedMonthEl = currentEl;
    } else {
      if (this.displayedMonthEl) {
        this.displayedMonthEl.className += this.INACTIVE;
      }

      el = document.createElement('div');
      el.innerHTML = this._renderMonth(date);
      this.displayedMonthEl = currentEl = el.firstChild;
      this.monthsDisplayElement().appendChild(currentEl);

      this.renderedMonths[id] = currentEl;
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

  Calendar.Views.Month = Month;

}(this));
