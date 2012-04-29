'use strict';

if (!window['Gaia'])
  var Gaia = {'UI': {}};

if (!window[Gaia['UI']])
  Gaia['UI'] = {};

(function() {
  Gaia.UI.DateSlider = function(id, pixelmillis) {
    this.id = id;
    this.pixelmillis = pixelmillis;
  };

  Gaia.UI.DateSlider.prototype = {
    id: undefined,
    input: undefined,

    cacheFirst: undefined, // First cache loaded date
    cacheLast: undefined, // Last cache loaded date

    pixelmillis: 0, /* Number of milliseconds that
                       one pixel of this element represents */
    mousePosX: 0, // Position of mouse on slide start
    border: 2, /* Total width in pixels of the sum of right
                  and left borders of element */

    sliding: false, // Wether sliding on widget is triggered or not
    left: 0, // Widget offset form left in pixels, does not update during slide
    realtimeLeft: 0, /* Widget offset form left in pixels,
                        it is updated during slide */

    /** Get exact date this widget is pointing to.
    */
    get date() {
      return new Date(this.cacheFirst.getTime() +
        (this.pixelmillis * (this.distanceToCenter() - this.realtimeLeft)));
    },

    handleEvent: function(evt) {
      switch (evt.type) {
      case 'mousedown':
        this.mousePosX = evt.clientX;
        evt.preventDefault();
        evt.stopPropagation();
        this.sliding = true;

        break;

      case 'mouseup':
        if (this.sliding) {
          this.sliding = false;
          this.left = this.left + evt.clientX - this.mousePosX;
        }
        break;

      case 'mousemove':
        if (this.sliding) {
          this.realtimeLeft = this.left + evt.clientX - this.mousePosX;
          this.input.style.left = this.realtimeLeft + 'px';

          // Trigger dateslide event for calendar update
          var slideEvent = document.createEvent('MouseEvents');
          slideEvent.initEvent('dateslide', true, true);
          this.input.dispatchEvent(slideEvent);

        }
        break;
      }
    },

    load: function() {

    // Load structure
      var mainDiv = document.createElement('div');
      this.input = document.createElement('ul');

      mainDiv.id = this.id;
      mainDiv.appendChild(this.input);

      // Attach events
      this.input.addEventListener('mousedown', this);
      this.input.addEventListener('mousemove', this);
      window.addEventListener('mouseup', this);

      return mainDiv;
    },

    /** Moves the widget to passed date.
    */
    move: function(date) {
      // If moved while sliding take current movement into account
      var leftMove = this.sliding ? this.left - this.realtimeLeft : 0;

      var millis = this.cacheFirst.getTime() - date.getTime();
      this.left = (millis / this.pixelmillis) +
        this.distanceToCenter() + leftMove;
      this.realtimeLeft = this.left - leftMove;
      this.input.style.left = this.left + 'px';
    },

    /** Gets selected element for this widget.
    */
    selected: function() {
      var leftStr = this.input.style.left;
      var left = parseFloat(leftStr.substring(0, leftStr.length - 2)) -
        this.distanceToCenter();

      for (var i = 0; i < this.input.children.length; i++)
      {
        var widthStr = this.input.children[i].style.width;
        // Width plus border
        left += parseFloat(widthStr.substring(0, widthStr.length - 2)) +
          this.border;

        if (left >= 0) {
          var elem = this.input.children[i];
          break;
        }
      }

      if (elem == undefined) {
        elem = this.input.children[this.input.children.length - 1];
      }

      return elem;
    },

    /** Gets distance to screen center.
    * It takes container div's computed style and divides by two.
    */
    distanceToCenter: function() {
      return window.innerWidth / 2;
    },

    /** Deselects all elems of this widget.
    */
    deselectAll: function() {
      for (var i = 0; i < this.input.children.length; i++)
      {
        this.input.children[i].classList.remove('sel');
      }
    },

    /** Puts an element at the begining of the widget.
    */
    addFirst: function(data) {
      var li = document.createElement('li');

      // Set width without borders
      li.style.width = ((data.millis / this.pixelmillis) - this.border) + 'px';
      li.textContent = data.name;
      li.dataset.id = data.id;
      this.input.insertBefore(li, this.input.firstChild);
    },

    /** Puts an element at the end of the widget.
    */
    addLast: function(data) {
      var li = document.createElement('li');

      // Set width without borders
      li.style.width = ((data.millis / this.pixelmillis) - this.border) + 'px';
      li.textContent = data.name;
      li.dataset.id = data.id;
      this.input.appendChild(li);
    },

    /** Removes an element from the end of the widget.
    */
    removeFirst: function() {
      this.input.removeChild(this.input.firstChild);
    },

    /** Removes an element from the end of the widget.
    */
    removeLast: function() {
      this.input.removeChild(this.input.lastChild);
    }
  };

  Gaia.UI.Datepicker = function(href, hrefCal) {
    var element = document.querySelector(href);

    if (element.tagName == 'INPUT') {
      this.element = document.querySelector(hrefCal);

      var self = this;

      element.addEventListener('focus', function(event) {

        var dateMillis = Date.parse(event.target.value);

        var date = dateMillis ? new Date(dateMillis) : new Date();

        self.load(date);
        self.init();
        self.element.parentNode.classList.remove('hidden');
      });

      //element.addEventListener('blur', function (event) {
      //  self.element.parentNode.classList.add('hidden');
      //});

    } else {
      this.element = element;
    }

    this.element.classList.add('cal-widget');
  };

  Gaia.UI.Datepicker.prototype = {
    date: new Date(),

    oneDay: 1000 * 60 * 60 * 24,
    months: ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'],

    element: undefined, // Main widget element

    dayWidget: new Gaia.UI.DateSlider('cal-day',
      1000 * 60 * 30), // Day widget
    monthWidget: new Gaia.UI.DateSlider('cal-month',
      1000 * 60 * 60 * 7), // Month widget
    yearWidget: new Gaia.UI.DateSlider('cal-year',
      1000 * 60 * 60 * 24 * 3), // Year widget

    handleEvent: function(evt) {
      if (evt.type == 'dateslide') {
        if (evt.target == this.dayWidget.input) {
          // If day was moved move month and year
          var selDate = this.dayWidget.date;
          this.monthWidget.move(selDate);
          this.yearWidget.move(selDate);

        } else if (evt.target == this.monthWidget.input) {
          // If month was moved move day and year
          var selDate = this.monthWidget.date;
          this.dayWidget.move(selDate);
          this.yearWidget.move(selDate);

        } else if (evt.target == this.yearWidget.input) {
          // If year was moved move day and month
          var selDate = this.yearWidget.date;
          this.dayWidget.move(selDate);
          this.monthWidget.move(selDate);
        }

        this.checkRecursiveDayUpdate();
        this.checkRecursiveMonthUpdate();
        this.checkYearUpdate();

        this.calculateSelected();
      }
    },

    load: function(date) {
      // Clear previous structure
      this.clear();

      this.date = date;

      window.addEventListener('dateslide', this);

      // Create main structure
      //    Day
      var dayDiv = this.dayWidget.load();
      this.element.appendChild(dayDiv);

      //    Month
      var monthDiv = this.monthWidget.load();
      this.element.appendChild(monthDiv);

      //    Year
      var yearDiv = this.yearWidget.load();
      this.element.appendChild(yearDiv);

      // Create days for two months before and two months after
      this.dayWidget.cacheFirst = new Date(date.getFullYear(),
        date.getMonth() - 2, date.getDate());
      this.dayWidget.cacheLast = new Date(date.getFullYear(),
        date.getMonth() + 2, date.getDate());

      var dayIndex = new Date(this.dayWidget.cacheFirst.getTime());
      while (dayIndex < this.dayWidget.cacheLast) {

        this.dayWidget.addLast(this.dayData(dayIndex));

        dayIndex.setDate(dayIndex.getDate() + 1);
      }

      // Create months for a year before and a year after
      this.monthWidget.cacheFirst = new Date(date.getFullYear() -
        1, date.getMonth(), 1);
      this.monthWidget.cacheLast = new Date(date.getFullYear() +
        1, date.getMonth(), 1);

      var monthIndex = new Date(this.monthWidget.cacheFirst.getTime());
      while (monthIndex < this.monthWidget.cacheLast) {

        this.monthWidget.addLast(this.monthData(monthIndex));

        monthIndex.setMonth(monthIndex.getMonth() + 1);
      }

      // Create years for 10 years before and 10 years after
      this.yearWidget.cacheFirst = new Date(date.getFullYear() - 10, 0, 1);
      this.yearWidget.cacheLast = new Date(date.getFullYear() + 10, 0, 1);

      var yearIndex = new Date(this.yearWidget.cacheFirst.getTime());
      while (yearIndex < this.yearWidget.cacheLast) {

        this.yearWidget.addLast(this.yearData(yearIndex));

        yearIndex.setYear(yearIndex.getFullYear() + 1);
      }
    },

    init: function() {

      // Set initial position
      this.dayWidget.move(this.date); // Set Day
      this.monthWidget.move(this.date); // Set month
      this.yearWidget.move(this.date); // Set year

      this.calculateSelected();
    },

    clear: function() {
      while (this.element.firstChild) {
        this.element.removeChild(this.element.firstChild);
      }
    },

    /** Gets and shows selected day.
    */
    calculateSelected: function() {

      var dayElem = this.dayWidget.selected();
      var monthElem = this.monthWidget.selected();
      var yearElem = this.yearWidget.selected();

      this.dayWidget.deselectAll();
      this.monthWidget.deselectAll();
      this.yearWidget.deselectAll();

      dayElem.classList.add('sel');
      monthElem.classList.add('sel');
      yearElem.classList.add('sel');

      // Update selected date
      this.date.setDate(dayElem.dataset.id);
      this.date.setMonth(monthElem.dataset.id);
      this.date.setYear(yearElem.dataset.id);

      return [dayElem, monthElem, yearElem];
    },

    /** Gets a day object to fill one element of the day widget.
    */
    dayData: function(date) {
      return {'id': date.getDate(), 'name': date.getDate(),
        'millis': this.oneDay};
    },

    /** Gets a month object to fill one element of the month widget.
    */
    monthData: function(date) {
      return {'id': date.getMonth(), 'name': this.months[date.getMonth()],
        'millis': this.oneDay * this.daysInMonth(date)};
    },

    /** Gets a year object to fill one element of the year widget.
    */
    yearData: function(date) {
      return {'id': date.getFullYear(), 'name': date.getFullYear(),
        'millis': this.oneDay * this.daysInYear(date)};
    },

    /** Checks if the day widget needs a cache update based on current date.
    * @return {boolean} if the widget was updated.
    */
    checkDayUpdate: function() {
      var updated = false;
      var selDate = this.dayWidget.date;
      var limitDate = new Date(this.dayWidget.cacheFirst);
      limitDate.setMonth(limitDate.getMonth() + 1);
      if (selDate < limitDate) {
        this.cacheLeft(this.dayWidget, 1);
        updated = true;
      }

      var limitDate = new Date(this.dayWidget.cacheLast);
      limitDate.setMonth(limitDate.getMonth() - 1);
      if (selDate > limitDate) {
        this.cacheRight(this.dayWidget, 1);
        updated = true;
      }

      return updated;
    },

    /** Checks if the day widget needs a cache update based on
    *   current date recursively until it reaches today.
    */
    checkRecursiveDayUpdate: function() {
      while (this.checkDayUpdate()) {}
    },

    /** Checks if the month widget needs a cache update based on current date.
    */
    checkMonthUpdate: function() {
      var selDate = this.monthWidget.date;
      var limitDate = new Date(this.monthWidget.cacheFirst);
      limitDate.setMonth(limitDate.getMonth() + 6);
      if (selDate < limitDate) {
        this.cacheLeft(this.monthWidget, 6);
      }

      var limitDate = new Date(this.monthWidget.cacheLast);
      limitDate.setMonth(limitDate.getMonth() - 6);
      if (selDate > limitDate) {
        this.cacheRight(this.monthWidget, 6);
      }
    },

    /** Checks if the month widget needs a cache update based on
    *   current date recursively until it reaches today.
    */
    checkRecursiveMonthUpdate: function() {
      while (this.checkMonthUpdate()) {}
    },

    /** Checks if the year widget needs a cache update based on current date.
    */
    checkYearUpdate: function() {
      var selDate = this.yearWidget.date;
      var limitDate = new Date(this.yearWidget.cacheFirst);
      limitDate.setFullYear(limitDate.getFullYear() + 5);
      if (selDate < limitDate) {
        this.cacheLeft(this.yearWidget, 60); // Five years
      }

      var limitDate = new Date(this.yearWidget.cacheLast);
      limitDate.setFullYear(limitDate.getFullYear() - 5);
      if (selDate > limitDate) {
        this.cacheRight(this.yearWidget, 60); // Five years
      }
    },

    /** Adds a number of months to the left of the widget cache.
    */
    cacheLeft: function(widget, months) {

      switch (widget.id) {
        case 'cal-day':
          // Date index, the day before the first cache date
          var dateIndex = new Date(widget.cacheFirst.getFullYear(),
            widget.cacheFirst.getMonth(), widget.cacheFirst.getDate() - 1);
          break;
        case 'cal-month':
          // Date index, the month before the first cache date
          var dateIndex = new Date(widget.cacheFirst.getFullYear(),
            widget.cacheFirst.getMonth() - 1, widget.cacheFirst.getDate());
          break;

        case 'cal-year':
          // Date index, the year before the first cache date
          var dateIndex = new Date(widget.cacheFirst.getFullYear() - 1,
            widget.cacheFirst.getMonth(), widget.cacheFirst.getDate());
          break;
      }

      var currentDate = widget.date;

      // Update caches
      widget.cacheFirst.setMonth(widget.cacheFirst.getMonth() - months);
      widget.cacheLast.setMonth(widget.cacheLast.getMonth() - months);

      // Add months to the left of the widget
      while (dateIndex >= widget.cacheFirst) {
        switch (widget.id) {
          case 'cal-day':
            widget.addFirst(this.dayData(dateIndex));
            dateIndex.setDate(dateIndex.getDate() - 1);
            break;
          case 'cal-month':
            widget.addFirst(this.monthData(dateIndex));
            dateIndex.setMonth(dateIndex.getMonth() - 1);
            break;
          case 'cal-year':
            widget.addFirst(this.yearData(dateIndex));
            dateIndex.setFullYear(dateIndex.getFullYear() - 1);
            break;
        }

        widget.removeLast();
      }

      // Move to current date
      widget.move(currentDate);
    },

    /** Adds a number of months to the right of the widget cache.
    */
    cacheRight: function(widget, months) {

      var currentDate = widget.date;

      // Date index, the last cache date
      var dateIndex = new Date(widget.cacheLast);

      // Update caches
      widget.cacheFirst.setMonth(widget.cacheFirst.getMonth() + months);
      widget.cacheLast.setMonth(widget.cacheLast.getMonth() + months);

      // Add months to the right of the widget
      while (dateIndex < widget.cacheLast) {

        switch (widget.id) {
          case 'cal-day':
            widget.addLast(this.dayData(dateIndex));
            dateIndex.setDate(dateIndex.getDate() + 1);
            break;
          case 'cal-month':
            widget.addLast(this.monthData(dateIndex));
            dateIndex.setMonth(dateIndex.getMonth() + 1);
            break;
          case 'cal-year':
            widget.addLast(this.yearData(dateIndex));
            dateIndex.setFullYear(dateIndex.getFullYear() + 1);
            break;
        }

        widget.removeFirst();
      }

      // Move to current date
      widget.move(currentDate);
    },

    toShortTime: function(date) {
      return this.pad(date.getHours(), 2) + ':' +
        this.pad(date.getMinutes(), 2);
    },

    toShortDate: function(date) {
      return date.getFullYear() + '-' + this.pad((date.getMonth() + 1), 2) +
        '-' + this.pad(date.getDate(), 2);
    },

    toShortDateTime: function(date) {
      return this.toShortTime(date) + '   ' + this.toShortDate(date);
    },

    daysInMonth: function(date) {
      return 32 - new Date(date.getFullYear(), date.getMonth(), 32).getDate();
    },

    daysInYear: function(date) {
      return 367 - new Date(date.getFullYear(), date.getMonth(), 367).getDate();
    },

    pad: function(number, length) {
      var str = '' + number;
      while (str.length < length) {
          str = '0' + str;
      }

      return str;
    },

    checkDate: function(date) {
      return date && !isNaN(date.getTime());
    }
  };

})();
