/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ValueSelector = {

  _containers: {},
  _popups: {},
  _buttons: {},
  _datePicker: null,
  _currentPickerType: null,
  _currentInputType: null,
  _currentDatetimeValue: '',

  debug: function(msg) {
    var debugFlag = false;
    if (debugFlag) {
      console.log('[ValueSelector] ', msg);
    }
  },

  init: function vs_init() {
    var self = this;

    window.addEventListener('mozChromeEvent', function(evt) {
      switch (evt.detail.type) {
        case 'inputmethod-contextchange':
          self.inputFocusChange(evt.detail);
          break;
      }
    });

    this._element = document.getElementById('value-selector');
    this._element.addEventListener('mousedown', this);
    this._containers['select'] =
      document.getElementById('value-selector-container');
    this._containers['select'].addEventListener('click', this);

    this._popups['select'] =
      document.getElementById('select-option-popup');
    this._popups['select'].addEventListener('submit', this);
    this._popups['time'] =
      document.getElementById('time-picker-popup');
    this._popups['date'] =
      document.getElementById('spin-date-picker-popup');

    this._buttons['select'] = document.getElementById('select-options-buttons');
    this._buttons['select'].addEventListener('click', this);

    this._buttons['time'] = document.getElementById('time-picker-buttons');
    this._buttons['time'].addEventListener('click', this);

    this._buttons['date'] = document.getElementById('spin-date-picker-buttons');
    this._buttons['date'].addEventListener('click', this);

    this._context = document.getElementById('time-picker');

    this._containers['time'] = this._context.querySelector('.picker-container');
    this._containers['date'] = document.getElementById('spin-date-picker');

    // Prevent focus being taken away by us for time picker.
    // The event listener on outer box will not be triggered cause
    // there is a evt.stopPropagation() in value_picker.js

    var pickerElements = ['.value-picker-hours', '.value-picker-minutes',
                         '.value-picker-hour24-state'];

    pickerElements.forEach(function(className) {
      var el = this._context.querySelector(className);
      el.addEventListener('mousedown', this);
    }, this);

    window.addEventListener('appopen', this);
    window.addEventListener('appwillclose', this);

    // invalidate the current spin date picker when language setting changes
    navigator.mozSettings.addObserver('language.current',
      (function language_change(e) {
        if (this._datePicker) {
          this._datePicker.uninit();
          this._datePicker = null;
      }}).bind(this));
  },

  inputFocusChange: function vs_focusChange(detail) {
    var self = this;

    var typeToHandle = ['select-one', 'select-multiple', 'date',
      'time', 'datetime', 'datetime-local', 'blur'];

    var currentInputType = detail.inputType;
    // handle the <select> element and inputs with type of date/time
    // in system app for now
    if (typeToHandle.indexOf(currentInputType) == -1)
      return;

    if (detail.choices)
      detail.choices = JSON.parse(detail.choices);

    var currentValue = detail.value;
    self._currentDatetimeValue = currentValue;
    self._currentInputType = currentInputType;

    switch (currentInputType) {
      case 'select-one':
      case 'select-multiple':
        self.debug('select triggered' + JSON.stringify(detail));
        self._currentPickerType = currentInputType;
        self.showOptions(detail);
        break;

      case 'date':
        var min = detail.min;
        var max = detail.max;
        self.showDatePicker(currentValue, min, max);
        break;

      case 'time':
        self.showTimePicker(currentValue);
        break;

      case 'datetime':
      case 'datetime-local':
        var min = detail.min;
        var max = detail.max;
        if (currentValue !== '') {
          var date = new Date(currentValue);
          var localDate = date.toLocaleFormat('%Y-%m-%d');
          self.showDatePicker(localDate, min, max);
        } else {
          self.showDatePicker('', min, max);
        }
        break;

      case 'blur':
        self.hide();
        break;
    }
  },

  handleEvent: function vs_handleEvent(evt) {
    switch (evt.type) {
      case 'appopen':
      case 'appwillclose':
        this.hide();
        break;

      case 'click':
        var currentTarget = evt.currentTarget;
        switch (currentTarget) {
          case this._buttons['select']:
          case this._buttons['time']:
          case this._buttons['date']:
            var target = evt.target;
            if (target.dataset.type == 'cancel') {
              this.cancel();
            } else if (target.dataset.type == 'ok') {
              this.confirm();
            }
            break;

          case this._containers['select']:
            this.handleSelect(evt.target);
            break;
        }
        break;

      case 'submit':
        // Prevent the form from submit.
      case 'mousedown':
        // Prevent focus being taken away by us.
        evt.preventDefault();
        break;

      default:
        this.debug('no event handler defined for' + evt.type);
        break;
    }
  },

  handleSelect: function vs_handleSelect(target) {

    if (target.dataset === undefined ||
        (target.dataset.optionIndex === undefined &&
         target.dataset.optionValue === undefined))
      return;

    if (this._currentPickerType === 'select-one') {
      var selectee = this._containers['select'].
          querySelectorAll('[aria-selected="true"]');
      for (var i = 0; i < selectee.length; i++) {
        selectee[i].removeAttribute('aria-selected');
      }

      target.setAttribute('aria-selected', 'true');
    } else if (target.getAttribute('aria-selected') === 'true') {
      target.removeAttribute('aria-selected');
    } else {
      target.setAttribute('aria-selected', 'true');
    }

    // setValue here to trigger change event
    var singleOptionIndex;
    var optionIndices = [];

    var selectee = this._containers['select'].
          querySelectorAll('[aria-selected="true"]');

    if (this._currentPickerType === 'select-one') {

      if (selectee.length > 0)
        singleOptionIndex = selectee[0].dataset.optionIndex;

      window.navigator.mozKeyboard.setSelectedOption(singleOptionIndex);

    } else if (this._currentPickerType === 'select-multiple') {
      // Multiple select case
      for (var i = 0; i < selectee.length; i++) {

        var index = parseInt(selectee[i].dataset.optionIndex);
        optionIndices.push(index);
      }

      window.navigator.mozKeyboard.setSelectedOptions(optionIndices);
    }

  },

  show: function vs_show(detail) {
    this._element.hidden = false;
  },

  showPanel: function vs_showPanel(type) {
    for (var p in this._containers) {
      if (p === type) {
        this._popups[p].hidden = false;
      } else {
        this._popups[p].hidden = true;
      }
    }
  },

  hide: function vs_hide() {
    this._element.hidden = true;
  },

  cancel: function vs_cancel() {
    this.debug('cancel invoked');
    window.navigator.mozKeyboard.removeFocus();
    this.hide();
  },

  confirm: function vs_confirm() {
    var currentInputType = this._currentInputType;

    switch (currentInputType) {
      case 'time':
        var timeValue = TimePicker.getTimeValue();
        this.debug('output value: ' + timeValue);
        window.navigator.mozKeyboard.setValue(timeValue);
        break;

      case 'date':
        var dateValue = this._datePicker.value;
        // The format should be 2012-09-19
        dateValue = dateValue.toLocaleFormat('%Y-%m-%d');
        this.debug('output value: ' + dateValue);
        window.navigator.mozKeyboard.setValue(dateValue);
        break;

      case 'datetime':
      case 'datetime-local':
        var currentDatetimeValue = this._currentDatetimeValue;
        if (this._currentPickerType === 'date') {
          this.hide();

          if (currentDatetimeValue !== '') {
            var date = new Date(this._currentDatetimeValue);
            var localTime = date.toLocaleFormat('%H:%M');
            this.showTimePicker(localTime);
          } else {
            this.showTimePicker();
          }
          return;
        } else if (this._currentPickerType === 'time') {
          var selectedDate = this._datePicker.value;
          var hour = TimePicker.getHour();
          var minute = TimePicker.timePicker.minute.getSelectedDisplayedText();
          var second = '';
          var millisecond = '';
          var date = null;
          // The second and millisecond values can't be selected by picker.
          // So set these values as same as
          // the current value of datetime/datetime-local input field
          // when currentDatetimeValue is not equal to ''(space),
          // or set the values as same as current time.
          if (currentDatetimeValue !== '') {
            date = new Date(this._currentDatetimeValue);
          } else {
            date = new Date();
          }
          second = date.getSeconds();
          millisecond = date.getMilliseconds();

          selectedDate.setHours(hour);
          selectedDate.setMinutes(minute);
          selectedDate.setSeconds(second);
          selectedDate.setMilliseconds(millisecond);

          var datetimeValue = '';
          if (currentInputType === 'datetime') {
            // The datetime format should be 1983-09-08T14:54:39.123Z
            datetimeValue = selectedDate.toISOString();
          } else { // if (currentInputType === 'datetime-local')
            // The datetime-local format should be 1983-09-08T14:54:39.123
            datetimeValue = selectedDate.toLocaleFormat('%Y-%m-%dT%H:%M:%S.') +
                            selectedDate.getMilliseconds();
          }
          this.debug('output value: ' + datetimeValue);
          window.navigator.mozKeyboard.setValue(datetimeValue);
        }
        break;
    }

    window.navigator.mozKeyboard.removeFocus();
    this.hide();
  },

  showOptions: function vs_showOptions(detail) {

    var options = null;
    if (detail.choices && detail.choices.choices)
      options = detail.choices.choices;

    if (options)
      this.buildOptions(options);

    this.show();
    this.showPanel('select');
  },

  buildOptions: function(options) {

    var optionHTML = '';

    function escapeHTML(str) {
      var span = document.createElement('span');
      span.textContent = str;
      return span.innerHTML;
    }

    for (var i = 0, n = options.length; i < n; i++) {

      var checked = options[i].selected ? ' aria-selected="true"' : '';

      // This for attribute is created only to avoid applying
      // a general rule in building block
      var forAttribute = ' for="gaia-option-' + options[i].optionIndex + '"';

      optionHTML += '<li role="option" data-option-index="' +
                     options[i].optionIndex + '"' + checked + '>' +
                     '<label role="presentation"' + forAttribute + '> <span>' +
                     escapeHTML(options[i].text) +
                     '</span></label>' +
                    '</li>';
    }

    var optionsContainer = document.querySelector(
                             '#value-selector-container ol');
    if (!optionsContainer)
      return;

    // Add ARIA property to notify if this is a multi-select or not.
    optionsContainer.setAttribute('aria-multiselectable',
      this._currentPickerType !== 'select-one');

    optionsContainer.innerHTML = optionHTML;


    // Apply different style when the options are more than 1 page
    if (options.length > 5) {
      this._containers['select'].classList.add('scrollable');
    } else {
      this._containers['select'].classList.remove('scrollable');
    }

    // Change the title for multiple select
    var titleL10nId = 'choose-options';
    if (this._currentPickerType === 'select-one')
      titleL10nId = 'choose-option';

    var optionsTitle = document.querySelector(
                       '#value-selector-container h1');

    if (optionsTitle) {
      optionsTitle.dataset.l10nId = titleL10nId;
      optionsTitle.textContent = navigator.mozL10n.get(titleL10nId);
    }
  },

  showTimePicker: function vs_showTimePicker(currentValue) {
    this._currentPickerType = 'time';
    this.show();
    this.showPanel('time');

    if (!this._timePickerInitialized) {
      TimePicker.initTimePicker();
      this._timePickerInitialized = true;
    }

    var time;
    if (!currentValue) {
      var now = new Date();
      time = {
        hours: now.getHours(),
        minutes: now.getMinutes()
      };
    } else {
      var inputParser = ValueSelector.InputParser;
      if (!inputParser)
        console.error('Cannot get input parser for value selector');

      time = inputParser.importTime(currentValue);
    }

    var timePicker = TimePicker.timePicker;
    // Set the value of time picker according to the current value
    if (timePicker.is12hFormat) {
      var hour = (time.hours % 12);
      hour = (hour == 0) ? 12 : hour;
      // 24-hour state value selector: AM = 0, PM = 1
      var hour24State = (time.hours >= 12) ? 1 : 0;
      timePicker.hour.setSelectedIndexByDisplayedText(hour);
      timePicker.hour24State.setSelectedIndex(hour24State);
    } else {
      timePicker.hour.setSelectedIndex(time.hours);
    }

    timePicker.minute.setSelectedIndex(time.minutes);
  },

  showDatePicker: function vs_showDatePicker(currentValue, min, max) {
    this._currentPickerType = 'date';
    this.show();
    this.showPanel('date');

    var minDate = null;
    var maxDate = null;

    var str2Date = function vs_str2Date(str) {
      if (!str)
        return null;

      var dcs = str.split('-');
      var date = new Date(dcs[0], parseInt(dcs[1]) - 1, dcs[2]);

      if (isNaN(date.getTime()))
        date = null;

      return date;
    };

    minDate = str2Date(min);
    maxDate = str2Date(max);

    if (!this._datePicker) {
      this._datePicker = new SpinDatePicker(this._containers['date']);
    }
    this._datePicker.setRange(minDate, maxDate);

    // Show current date as default value
    var date = new Date();
    if (currentValue) {
      var inputParser = ValueSelector.InputParser;
      if (!inputParser)
        console.error('Cannot get input parser for value selector');

      date = inputParser.formatInputDate(currentValue, '');
    }
    this._datePicker.value = date;
  }

};

var TimePicker = {
  timePicker: {
    hour: null,
    minute: null,
    hour24State: null,
    is12hFormat: false
  },

  get hourSelector() {
    delete this.hourSelector;
    return this.hourSelector =
      ValueSelector._context.querySelector('.value-picker-hours');
  },

  get minuteSelector() {
    delete this.minuteSelector;
    return this.minuteSelector =
      ValueSelector._context.querySelector('.value-picker-minutes');
  },

  get hour24StateSelector() {
    delete this.hour24StateSelector;
    return this.hour24StateSelector =
      ValueSelector._context.querySelector('.value-picker-hour24-state');
  },

  initTimePicker: function tp_initTimePicker() {
    var localeTimeFormat = navigator.mozL10n.get('dateTimeFormat_%X');
    var is12hFormat = (localeTimeFormat.indexOf('%p') >= 0);
    this.timePicker.is12hFormat = is12hFormat;
    this.setTimePickerStyle();
    var startHour = is12hFormat ? 1 : 0;
    var endHour = is12hFormat ? (startHour + 12) : (startHour + 12 * 2);
    var unitClassName = 'picker-unit';
    var hourDisplayedText = [];
    for (var i = startHour; i < endHour; i++) {
      var value = i;
      hourDisplayedText.push(value);
    }
    var hourUnitStyle = {
      valueDisplayedText: hourDisplayedText,
      className: unitClassName
    };
    this.timePicker.hour = new ValuePicker(this.hourSelector, hourUnitStyle);

    var minuteDisplayedText = [];
    for (var i = 0; i < 60; i++) {
      var value = (i < 10) ? '0' + i : i;
      minuteDisplayedText.push(value);
    }
    var minuteUnitStyle = {
      valueDisplayedText: minuteDisplayedText,
      className: unitClassName
    };
    this.timePicker.minute =
      new ValuePicker(this.minuteSelector, minuteUnitStyle);

    if (is12hFormat) {
      var hour24StateUnitStyle = {
        valueDisplayedText: ['AM', 'PM'],
        className: unitClassName
      };
      this.timePicker.hour24State =
        new ValuePicker(this.hour24StateSelector, hour24StateUnitStyle);
    }
  },

  setTimePickerStyle: function tp_setTimePickerStyle() {
    var style = (this.timePicker.is12hFormat) ? 'format12h' : 'format24h';
    var container = ValueSelector._context.querySelector('.picker-container');
    container.classList.add(style);
  },

  getHour: function tp_getHours() {
    var hour = 0;
    if (this.timePicker.is12hFormat) {
      var hour24Offset = 12 * this.timePicker.hour24State.getSelectedIndex();
      hour = this.timePicker.hour.getSelectedDisplayedText();
      hour = (hour == 12) ? 0 : hour;
      hour = hour + hour24Offset;
    } else {
      hour = this.timePicker.hour.getSelectedIndex();
    }
    return hour;
  },

  // return a string for the time value, format: "16:37"
  getTimeValue: function tp_getTimeValue() {
    var hour = this.getHour();
    var minute = this.timePicker.minute.getSelectedDisplayedText();

    return (hour < 10 ? '0' : '') + hour + ':' + minute;
  }
};

ValueSelector.init();
