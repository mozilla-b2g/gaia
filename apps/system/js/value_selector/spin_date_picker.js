/**
 * SpinDatePicker is a html/js "widget" which enables users
 * pick a specific date. It display the date in the way based
 * on the language setting.
 *
 * The SpinDatePicker itself contains no UI for the controls.
 *
 * Example usage:
 *
 *    // All necessary UI elements are contained in the root element.
 *    var picker = new SpinDatePicker(root);
 *    picker.value = new Date();
 *    // after users pick a date
 *    var newDate = picker.value;
 */
var SpinDatePicker = (function SpinDatePicker() {
  'use strict';

  var GLOBAL_MIN_YEAR = 1900;
  var GLOBAL_MAX_YEAR = 2099;

  var DateRange = (function DateRange(min, max) {
    var _minYear = min.getFullYear();
    var _maxYear = max.getFullYear();
    var _minMonth = min.getMonth();
    var _maxMonth = max.getMonth();
    var _minDate = min.getDate();
    var _maxDate = max.getDate();

    return {
      get min() {
        return min;
      },
      get max() {
        return max;
      },
      get minYear() {
        return _minYear;
      },
      get maxYear() {
        return _maxYear;
      },
      get minMonth() {
        return _minMonth;
      },
      get maxMonth() {
        return _maxMonth;
      },
      get minDate() {
        return _minDate;
      },
      get maxDate() {
        return _maxDate;
      }
    };
  });

  var _dateRange = new DateRange(new Date(GLOBAL_MIN_YEAR, 0, 1),
    new Date(GLOBAL_MAX_YEAR, 11, 31));

  function getYearText() {
    var yearText = [];
    var dateTimeFormat = navigator.mozL10n.DateTimeFormat();

    for (var i = GLOBAL_MIN_YEAR; i <= GLOBAL_MAX_YEAR; i++) {
      var date = new Date(i, 0, 1);
      yearText.push(dateTimeFormat.localeFormat(date, '%Y'));
    }

    return yearText;
  }

  function getMonthText() {
    var monthText = [];
    var date = new Date(1970, 0, 1);
    var dateTimeFormat = navigator.mozL10n.DateTimeFormat();

    for (var i = 0; i < 12; i++) {
      date.setMonth(i);
      monthText.push(dateTimeFormat.localeFormat(date, '%B'));
    }

    return monthText;
  }

  function getDateText() {
    var dateText = [];
    var date = new Date(1970, 0, 1);
    var dateTimeFormat = navigator.mozL10n.DateTimeFormat();

    for (var i = 1; i <= 31; i++) {
      date.setDate(i);
      dateText.push(dateTimeFormat.localeFormat(date, '%d'));
    }

    return dateText;
  }

  function getDaysInMonth(year, month) {
    var date = new Date(year, month + 1, 0);
    return date.getDate();
  }

  /**
   * Get the order of date components.
   *
   * @param {String} date format.
   */
  function getDateComponentOrder() {
    var format = navigator.mozL10n.get('dateTimeFormat_%x');
    var order = '';
    var tokens = format.match(/(%E.|%O.|%.)/g);

    if (tokens) {
      tokens.forEach(function(token) {
        switch (token) {
          case '%Y':
          case '%y':
          case '%Oy':
          case 'Ey':
          case 'EY':
            order += 'Y';
            break;
          case '%B':
          case '%b':
          case '%m':
          case '%Om':
            order += 'M';
            break;
          case '%d':
          case '%e':
          case '%Od':
          case '%Oe':
            order += 'D';
            break;
        }
      });
    }

    if (order.length != 3)
      order = 'DMY';

    return order;
  }

  /**
   * Initialize a date picker widget.
   *
   * @param {HTMLELement} element target of widget creation.
   */
  function SpinDatePicker(element, minDate, maxDate) {
    this.element = element;

    this.yearPicker = null;
    this.monthPicker = null;
    this.datePicker = null;

    //XXX: When the document is localized again
    //     we must also re-render the month because
    //     the week days may have changed?
    //     This will only happen when we change timezones
    //     unless we add this information to the locales.

    var pickerContainer =
      element.querySelector('.picker-container');
    var yearPickerContainer =
      element.querySelector('.value-picker-year');
    var monthPickerContainer =
      element.querySelector('.value-picker-month');
    var datePickerContainer =
      element.querySelector('.value-picker-date');

    var updateCurrentValue = (function spd_updateCurrentValue() {
      var selectedYear = this.yearPicker.getSelectedIndex() + GLOBAL_MIN_YEAR;
      var selectedMonth = this.monthPicker.getSelectedIndex();
      var days = getDaysInMonth(selectedYear, selectedMonth);
      var selectedDate = this.datePicker.getSelectedIndex() + 1;

      this._value = new Date(selectedYear, selectedMonth, selectedDate);
    }).bind(this);

    var updatePickersRange =
    (function spd_updatePickersRange() {
      var selectedYear = this.yearPicker.getSelectedIndex() + GLOBAL_MIN_YEAR;
      var selectedMonth = this.monthPicker.getSelectedIndex();

      var minMonth = 0;
      var maxMonth = 11;
      var minDate = 1;
      var maxDate = 31;

      if (selectedYear === _dateRange.minYear) {
        minMonth = _dateRange.minMonth;
        if (selectedMonth === _dateRange.minMonth)
          minDate = _dateRange.minDate;
      }
      if (selectedYear === _dateRange.maxYear) {
        maxMonth = _dateRange.maxMonth;
        if (selectedMonth === _dateRange.maxMonth)
          maxDate = _dateRange.maxDate;
      }

      var days = getDaysInMonth(this.yearPicker.getSelectedIndex() +
                 GLOBAL_MIN_YEAR, this.monthPicker.getSelectedIndex());
      minDate = Math.min(minDate, days);
      maxDate = Math.min(maxDate, days);

      this.monthPicker.setRange(minMonth, maxMonth);
      this.datePicker.setRange(minDate - 1, maxDate - 1);
    }).bind(this);

    var onvaluechangeInternal =
    (function spd_onvaluechangeInternal(newDateValue) {
      this.yearPicker.setSelectedIndex(
        newDateValue.getFullYear() - GLOBAL_MIN_YEAR);
      this.monthPicker.setSelectedIndex(newDateValue.getMonth());
      this.datePicker.setSelectedIndex(newDateValue.getDate() - 1);
      updatePickersRange.apply(this);
      updateCurrentValue.apply(this);
    }).bind(this);

    var onSelectedYearChanged =
    function spd_onSelectedYearChanged(selectedYear) {
      updatePickersRange.apply(this);
      updateCurrentValue.apply(this);
    };

    var onSelectedMonthChanged =
    function spd_onSelectedMonthChanged(selectedMonth) {
      updatePickersRange.apply(this);
      updateCurrentValue.apply(this);
    };

    var onSelectedDateChanged =
    function spd_onSelectedDateChanged(selectedDate) {
      updateCurrentValue.apply(this);
    };

    var unitClassName = 'picker-unit';

    // year value picker
    var yearUnitStyle = {
      valueDisplayedText: getYearText(),
      className: unitClassName
    };
    if (this.yearPicker)
      this.yearPicker.uninit();
    this.yearPicker = new ValuePicker(yearPickerContainer, yearUnitStyle);
    this.yearPicker.onselectedindexchange = onSelectedYearChanged.bind(this);

    // month value picker
    var monthUnitStyle = {
      valueDisplayedText: getMonthText(),
      className: unitClassName
    };
    if (this.monthPicker)
      this.monthPicker.uninit();
    this.monthPicker =
      new ValuePicker(monthPickerContainer, monthUnitStyle);
    this.monthPicker.onselectedindexchange = onSelectedMonthChanged.bind(this);

    // date value picker
    var dateUnitStyle = {
      valueDisplayedText: getDateText(),
      className: unitClassName
    };
    if (this.datePicker)
      this.datePicker.uninit();
    this.datePicker = new ValuePicker(datePickerContainer, dateUnitStyle);
    this.datePicker.onselectedindexchange =
      onSelectedDateChanged.bind(this);

    // set component order
    var dateComponentOrder = getDateComponentOrder();
    var pickerClassList = pickerContainer.classList;
    pickerClassList.remove('YMD');
    pickerClassList.remove('DMY');
    pickerClassList.remove('MDY');
    pickerClassList.add(dateComponentOrder);

    // Prevent focus being taken away by us for time picker.
    // The event listener on outer box will not be triggered cause
    // there is a evt.stopPropagation() in value_picker.js
    this.pickerElements = [monthPickerContainer, yearPickerContainer,
      datePickerContainer];

    this.pickerElements.forEach((function pickerElements_forEach(picker) {
      picker.addEventListener('mousedown', this);
    }).bind(this));

    this.onvaluechangeInternal = onvaluechangeInternal.bind(this);
  }

  SpinDatePicker.prototype = {

    /**
     * Internal value not exposed so we can fire events
     * when the getter/setter's are used.
     *
     * @type Date
     */
    _value: null,

    /**
     * Gets current value
     *
     * @return {Null|Date} date or null.
     */
    get value() {
      return this._value;
    },

    /**
     * Sets the current value of the date picker.
     * When value differs from the currently set the
     * `onvaluechange` event will be fired with the new/old value.
     */
    set value(value) {
      var old = this._value;
      if (old !== value) {
        this._value = value;
        this.onvaluechangeInternal(value);
      }
    },

    /**
     * Getter is used for date normalization.
     */
    get year() {
      return this._value.getFullYear();
    },

    /**
     * Getter is used for date normalization.
     */
    get month() {
      return this._value.getMonth();
    },

    get date() {
      return this._value.getDate();
    },

    handleEvent: function vs_handleEvent(evt) {
      switch (evt.type) {
        case 'mousedown':
          // Prevent focus being taken away by us.
          evt.preventDefault();
          break;
      }
    },

    setRange: function vs_setRange(minDate, maxDate) {
      if (!minDate)
        minDate = new Date(GLOBAL_MIN_YEAR, 0, 1);
      if (!maxDate)
        maxDate = new Date(GLOBAL_MAX_YEAR, 11, 31);

      _dateRange = new DateRange(minDate, maxDate);

      // set date picker
      this.yearPicker.setRange(minDate.getFullYear() - GLOBAL_MIN_YEAR,
                               maxDate.getFullYear() - GLOBAL_MIN_YEAR);
    },

    uninit: function() {
      if (this.yearPicker)
        this.yearPicker.uninit();
      if (this.monthPicker)
        this.monthPicker.uninit();
      if (this.datePicker)
        this.datePicker.uninit();

      this.pickerElements.forEach((function pickerElements_forEach(picker) {
        picker.removeEventListener('mousedown', this);
      }).bind(this));
    },

    /**
     * Called when the selected date changes.
     */
    onvaluechangeInternal: function(date) {}
  };

  return SpinDatePicker;
}());
