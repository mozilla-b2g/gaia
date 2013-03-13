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

  var FIRST_YEAR = 1900;
  var LAST_YEAR = 2099;

  function getYearText() {
    var yearText = [];
    var dateTimeFormat = navigator.mozL10n.DateTimeFormat();

    for (var i = FIRST_YEAR; i <= LAST_YEAR; i++) {
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

  function getDateText(days) {
    var dateText = [];
    var date = new Date(1970, 0, 1);
    var dateTimeFormat = navigator.mozL10n.DateTimeFormat();

    for (var i = 1; i <= days; i++) {
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
  function getDateComponentOrder(format) {
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
  function SpinDatePicker(element) {
    this.element = element;

    this.yearPicker = null;
    this.monthPicker = null;
    this.datePickers = {
      '28': null,
      '29': null,
      '30': null,
      '31': null
    };

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
    var tmpDatePickerContainers =
      element.querySelectorAll('.value-picker-date');
    var datePickerContainers = {
      '28': tmpDatePickerContainers[0],
      '29': tmpDatePickerContainers[1],
      '30': tmpDatePickerContainers[2],
      '31': tmpDatePickerContainers[3]
    };

    var updateCurrentValue = function spd_updateCurrentValue() {
      var selectedYear = this.yearPicker.getSelectedIndex() + FIRST_YEAR;
      var selectedMonth = this.monthPicker.getSelectedIndex();
      var days = getDaysInMonth(selectedYear, selectedMonth);
      var datePicker = this.datePickers[days];
      var selectedDate = datePicker.getSelectedIndex() + 1;

      this._value = new Date(selectedYear, selectedMonth, selectedDate);
    };

    var updateDatePickerVisibility =
    function spd_updateDatePickerVisibility() {
      var days = getDaysInMonth(this.yearPicker.getSelectedIndex() +
                 FIRST_YEAR, this.monthPicker.getSelectedIndex());
      for (var i = 28; i <= 31; i++) {
        datePickerContainers[i].hidden = true;
        this.datePickers[i].setSelectedIndex(this._currentSelectedDateIndex);
      }
      datePickerContainers[days].hidden = false;
    };

    var onvaluechangeInternal =
    function spd_onvaluechangeInternal(newDateValue) {
      this.yearPicker.setSelectedIndex(newDateValue.getFullYear() - FIRST_YEAR);
      this.monthPicker.setSelectedIndex(newDateValue.getMonth());
      for (var i = 28; i <= 31; i++) {
        this.datePickers[i].setSelectedIndex(newDateValue.getDate() - 1);
      }
      updateDatePickerVisibility.apply(this);
      updateCurrentValue.apply(this);
    };

    var onSelectedYearChanged =
    function spd_onSelectedYearChanged(selectedYear) {
      updateDatePickerVisibility.apply(this);
      updateCurrentValue.apply(this);
    };

    var onSelectedMonthChanged =
    function spd_onSelectedMonthChanged(selectedMonth) {
      updateDatePickerVisibility.apply(this);
      updateCurrentValue.apply(this);
    };

    var onSelectedDateChanged =
    function spd_onSelectedDateChanged(selectedDate) {
      this._currentSelectedDateIndex = selectedDate;
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
    for (var i = 28; i <= 31; i++) {
      var datePickerContainer = datePickerContainers[i];
      var dateUnitStyle = {
        valueDisplayedText: getDateText(i),
        className: unitClassName
      };
      var datePicker = this.datePickers[i];

      if (datePicker)
        datePicker.uninit();
      datePickerContainer.hidden = false;
      this.datePickers[i] = new ValuePicker(datePickerContainer, dateUnitStyle);
      this.datePickers[i].onselectedindexchange =
        onSelectedDateChanged.bind(this);
    }

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
    this.pickerElements = [monthPickerContainer, yearPickerContainer];
    for (var i = 28; i <= 31; i++) {
      this.pickerElements.push(datePickerContainers[i]);
    }

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

    uninit: function() {
      if (this.yearPicker)
        this.yearPicker.uninit();
      if (this.monthPicker)
        this.monthPicker.uninit();
      if (this.datePickers) {
        for (var i = 28; i <= 31; i++) {
          var datePicker = this.datePickers[i];
          datePicker.uninit();
        }
      }

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
