/* global BaseUI, LazyLoader, InputParser, ValueSelector, SpinDatePicker,
          ValuePicker, Template */

'use strict';

(function(exports) {

  var _id = 0;

  function toCamelCase(str) {
    return str.replace(/\-(.)/g, function replacer(str, p1) {
      return p1.toUpperCase();
    });
  }

  exports.ValueSelector = function(app) {
    this.app = app;
    this.containerElement = app.element;
    this.instanceID = _id++;
    this._currentPickerType = null;
    this._currentInputType = null;
    this._currentDatetimeValue = '';
    this._injected = false;
    this._datePicker = null;
    this._timePicker = null;

    app.element.addEventListener('_opening', this);
    app.element.addEventListener('_closing', this);
    app.element.addEventListener('_closed', this);
    app.element.addEventListener('_inputmethod-contextchange', this);
    app.element.addEventListener('_localized', this);
    window.addEventListener('timeformatchange', this);
  };

  ValueSelector.prototype = Object.create(BaseUI.prototype);

  ValueSelector.prototype.CLASS_NAME = 'ValueSelector';

  ValueSelector.prototype.ELEMENT_PREFIX = 'value-selector-';

  ValueSelector.prototype.EVENT_PREFIX = 'value-selector-';

  ValueSelector.prototype.customID = function vs_customID() {
    if (this.app) {
      return '[' + this.app.origin + ']';
    } else {
      return '';
    }
  };

  ValueSelector.prototype._im = navigator.mozInputMethod;

  ValueSelector.prototype.destroy = function() {
    window.removeEventListener('timeformatchange', this);
  };

  ValueSelector.prototype.handleEvent = function vs_handleEvent(evt) {
    this.app.debug('handling ' + evt.type);
    var target = evt.target;
    switch (evt.type) {
      case 'submit':
      case 'mousedown':
        evt.preventDefault();
        break;
      case 'click':
        if (target.dataset.type === 'cancel') {
          this.cancel();
        } else if (target.dataset.type === 'ok') {
          this.confirm();
        } else {
          this.handleSelect(target);
        }
        break;
      case '_opening':
      case '_closing':
      case '_closed':
        if (this._injected) {
          this.hide();
        }
        break;
      case '_localized':
        // invalidate the current date and time picker when language setting
        // changes
        if (this._datePicker) {
          this._datePicker.uninit();
          this._datePicker = null;
        }
        if (this._timePicker) {
          this._timePicker.uninit();
          this._timePicker = null;
        }
        break;
      case 'timeformatchange':
        // invalidate the current time picker when time format changes
        if (this._timePicker) {
          this._timePicker.uninit();
          this._timePicker = null;
        }
        break;
      case '_inputmethod-contextchange':
        var typesToHandle = ['select-one', 'select-multiple', 'date', 'time',
          'datetime', 'datetime-local', 'blur'];
        // handle the <select> element and inputs with type of date/time
        // in system app for now
        if (typesToHandle.indexOf(evt.detail.inputType) < 0) {
          return;
        }
        if (this._injected) {
          this.show(evt.detail);
        } else {
          this.render(function afterRender() {
            this.show(evt.detail);
          }.bind(this));
        }
        break;
    }
  };

  ValueSelector.prototype.render = function vs_render(callback) {
    this.publish('willrender');
    LazyLoader.load('shared/js/template.js', function onTemplateLoaded(){
      this.containerElement.insertAdjacentHTML('beforeend', this.view());
      this._fetchElements();
      this._registerEvents();
      this._injected = true;
      this.publish('rendered');
      callback();
    }.bind(this));
  };

  ValueSelector.prototype._fetchElements = function vs__fetchElements() {
    this.element = document.getElementById(this.CLASS_NAME + this.instanceID);
    this.elements = {};

    this.elementClasses = ['select-option-popup', 'container',
      'options-container', 'options-title', 'select-options-buttons',
      'time-picker-popup', 'time-picker', 'time-picker-container',
      'time-picker-buttons', 'spin-date-picker-popup', 'spin-date-picker',
      'spin-date-picker-buttons'];

    // Loop and add element with camel style name to Value Selector attribute.
    this.elementClasses.forEach(function createElementRef(name) {
      this.elements[toCamelCase(name)] =
        this.element.querySelector('.' + this.ELEMENT_PREFIX + name);
    }, this);
  };

  ValueSelector.prototype.view = function vs_view() {
    var id = this.CLASS_NAME + this.instanceID;
    return Tagged.escapeHTML `
      <div data-z-index-level="value-selector" class="value-selector" id="${id}" hidden>
        <form class="value-selector-select-option-popup" role="dialog" data-type="value-selector" hidden>
          <section class="value-selector-container">
            <h1 class="value-selector-options-title" data-l10n-id="choose-option"></h1>
            <ol class="value-selector-options-container" role="listbox"></ol>
          </section>
          <menu class="value-selector-select-options-buttons value-selector-buttons">
            <button class="value-option-confirm affirmative full" data-type="ok" data-l10n-id="ok"></button>
          </menu>
        </form>
        <div class="value-selector-time-picker-popup" role="dialog" data-type="time-selector" hidden>
          <h1 data-l10n-id="select-time">Select time</h1>
          <div class="value-selector-time-picker">
            <div class="value-selector-time-picker-container picker-container">
              <div class="picker-bar-background"></div>
              <div class="value-picker-hours-wrapper">
                <div class="value-picker-hours animation-on"></div>
              </div>
              <div class="value-picker-minutes-wrapper">
                <div class="value-picker-minutes animation-on"></div>
              </div>
              <div class="value-picker-hour24-wrapper">
                <div class="value-picker-hour24-state animation-on"></div>
              </div>
              <div class="value-indicator">
                <div aria-hidden="true" class="value-indicator-colon hours-minutes-separator">:</div>
              </div>
            </div>
          </div>
          <menu class="value-selector-time-picker-buttons value-selector-buttons" data-items="2">
            <button class="value-selector-cancel" data-type="cancel" data-l10n-id="cancel"></button>
            <button class="value-selector-confirm affirmative" data-type="ok" data-l10n-id="ok"></button>
          </menu>
        </div>
        <div role="dialog" data-type="date-selector" class="value-selector-spin-date-picker-popup" hidden>
          <h1 data-l10n-id="select-day">Select day</h1>
          <div class="value-selector-spin-date-picker">
            <div class="picker-container">
              <div class="picker-bar-background"></div>
              <div class="value-picker-date-wrapper">
                <div class="value-picker-date animation-on"></div>
                <div class="value-picker-date animation-on"></div>
                <div class="value-picker-date animation-on"></div>
                <div class="value-picker-date animation-on"></div>
              </div>
              <div class="value-picker-month-wrapper">
                <div class="value-picker-month animation-on"></div>
              </div>
              <div class="value-picker-year-wrapper">
                <div class="value-picker-year animation-on"></div>
              </div>
              <div class="value-indicator"></div>
            </div>
          </div>
          <menu class="value-selector-spin-date-picker-buttons value-selector-buttons" data-items="2">
            <button class="value-selector-cancel" data-type="cancel" data-l10n-id="cancel"></button>
            <button class="value-option-confirm affirmative" data-type="ok" data-l10n-id="ok"></button>
          </menu>
        </div>
      </div>`;
  };

  ValueSelector.prototype._registerEvents = function vs__registerEvents() {
    this.elements.container.addEventListener('click', this);
    // Prevent the form from submit.
    this.elements.selectOptionPopup.addEventListener('submit', this);
    this.element.addEventListener('mousedown', this);
    ['selectOptionsButtons', 'timePickerButtons',
      'spinDatePickerButtons'].forEach(function(elementId) {
        this.elements[elementId].addEventListener('click', this);
      }, this);
  };

  ValueSelector.prototype._format = function vs__format(date, format) {
    if (!date) {
      return '';
    }
    date = new Date(date);
    return date.toLocaleFormat(format);
  };

  ValueSelector.prototype.show = function vs_show(detail) {
    var currentInputType = detail.inputType;
    var currentValue = detail.value;

    this._currentDatetimeValue = currentValue;
    this._currentInputType = currentInputType;

    if (currentInputType === 'blur') {
      this.hide();
      return;
    }

    this.publish('shown');
    var min = detail.min;
    var max = detail.max;

    if (detail.choices) {
      detail.choices = JSON.parse(detail.choices);
    }

    this.app._setVisibleForScreenReader(false);
    if (this.element.hidden) {
      this.element.hidden = false;
    }

    switch (currentInputType) {
      case 'select-one':
      case 'select-multiple':
        this.app.debug('select triggered' + JSON.stringify(detail));
        this._currentPickerType = currentInputType;
        this.showOptions(detail);
        break;

      case 'date':
        this.showDatePicker(currentValue, min, max);
        break;

      case 'time':
        this.showTimePicker(currentValue);
        break;

      case 'datetime':
      case 'datetime-local':
        this.showDatePicker(this._format(currentValue, '%Y-%m-%d'), min,
          max);
        break;
    }
  };

  ValueSelector.prototype.showPanel = function vs_showPanel(type) {
    ['selectOptionPopup', 'timePickerPopup', 'spinDatePickerPopup'].forEach(
      function(elementId) {
        this.elements[elementId].hidden = (type !== elementId);
      }, this);
  },

  ValueSelector.prototype.hide = function vs_hide() {
    this.app._setVisibleForScreenReader(true);
    if (this.element.hidden) {
      return;
    }
    this.element.blur();
    this.element.hidden = true;
    if (this.app.getBottomMostWindow().isActive() && this.app.isActive()) {
      this.app.focus();
    }
    this.publish('hidden');
  };

  ValueSelector.prototype.handleSelect = function vs_handleSelect(target) {
    if (target.dataset === undefined ||
        (target.dataset.optionIndex === undefined &&
         target.dataset.optionValue === undefined)) {
      return;
    }

    var selectee;
    if (this._currentPickerType === 'select-one') {
      selectee = this.elements.container.querySelectorAll(
        '[aria-selected="true"]');
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

    selectee = this.elements.container.querySelectorAll(
      '[aria-selected="true"]');

    if (this._currentPickerType === 'select-one') {

      if (selectee.length > 0) {
        singleOptionIndex = selectee[0].dataset.optionIndex;
      }

      this._im.setSelectedOption(singleOptionIndex);

    } else if (this._currentPickerType === 'select-multiple') {
      // Multiple select case
      for (var i = 0; i < selectee.length; i++) { // jshint ignore:line

        var index = parseInt(selectee[i].dataset.optionIndex);
        optionIndices.push(index);
      }

      this._im.setSelectedOptions(optionIndices);
    }

  };

  ValueSelector.prototype.cancel = function vs_cancel() {
    this.app.debug('cancel invoked');
    this._im.removeFocus();
    this.hide();
  };

  ValueSelector.prototype.confirm = function vs_confirm() {
    var currentInputType = this._currentInputType;

    switch (currentInputType) {
      case 'time':
        var timeValue = this._timePicker.getTimeValue();
        this.app.debug('output value: ' + timeValue);
        this._im.setValue(timeValue);
        break;
      case 'date':
        // The format should be 2012-09-19
        var dateValue = this._format(this._datePicker.value, '%Y-%m-%d');
        this.app.debug('output value: ' + dateValue);
        this._im.setValue(dateValue);
        break;
      case 'datetime':
      case 'datetime-local':
        var currentDatetimeValue = this._currentDatetimeValue;
        if (this._currentPickerType === 'date') {
          this.hide();
          this.showTimePicker(this._format(currentDatetimeValue, '%H:%M'));
          return;
        } else if (this._currentPickerType === 'time') {
          var selectedDate = this._datePicker.value;
          var hour = this._timePicker.getHour();
          var minute = this._timePicker.minute.getSelectedDisplayedText();
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
          this.app.debug('output value: ' + datetimeValue);
          this._im.setValue(datetimeValue);
        }
        break;
    }

    this._im.removeFocus();
    this.hide();
  };

  ValueSelector.prototype.showOptions = function vs_showOptions(detail) {
    var options = null;
    if (detail.choices && detail.choices.choices) {
      options = detail.choices.choices;
    }

    if (options) {
      this.buildOptions(options);
    }

    this.showPanel('selectOptionPopup');
  };

  ValueSelector.prototype.buildOptions = function(options) {
    if (this.elements.optionsContainer) {
      this.elements.optionsContainer.innerHTML = '';
    } else {
      return;
    }

    var groupTemplate = new Template('value-selector-groupoption-template');

    // Add ARIA property to notify if this is a multi-select or not.
    this.elements.optionsContainer.setAttribute('aria-multiselectable',
      this._currentPickerType !== 'select-one');

    options.forEach(function(option) {
      if (option.group) {
        this.elements.optionsContainer.insertAdjacentHTML('beforeend',
          groupTemplate.interpolate({
            text: option.text
          }));
      } else {
        var index = option.optionIndex.toString(10);
        var checked = option.selected.toString();
        var gaiaOption = 'gaia-option-' + option.optionIndex;

        this.elements.optionsContainer.insertAdjacentHTML('beforeend',
          `<li role="option" data-option-index="${index}" aria-selected="${checked}" dir="auto">
            <label role="presentation" for="${gaiaOption}">
              <span>${option.text}</span>
            </label>
          </li>`
      }
    }, this);

    // Apply different style when the options are more than 1 page
    this.elements.container.classList.toggle('scrollable', options.length > 5);

    // Change the title for multiple select
    var titleL10nId = this._currentPickerType === 'select-one' ?
      'choose-option' : 'choose-options';

    if (this.elements.optionsTitle) {
      this.elements.optionsTitle.dataset.l10nId = titleL10nId;
      this.elements.optionsTitle.textContent = navigator.mozL10n.get(
        titleL10nId);
    }
  };

  ValueSelector.prototype.showTimePicker =
    function vs_showTimePicker(currentValue) {
      this._currentPickerType = 'time';
      this.showPanel('timePickerPopup');

      if (!this._timePicker) {
        this._timePicker = new TimePicker(this.elements.timePickerContainer);
      }

      var time;
      if (!currentValue) {
        var now = new Date();
        time = {
          hours: now.getHours(),
          minutes: now.getMinutes()
        };
      } else {
        time = InputParser.importTime(currentValue);
      }

      // Set the value of time picker according to the current value
      if (this._timePicker.is12hFormat) {
        var hour = (time.hours % 12);
        hour = (hour === 0) ? 12 : hour;
        // 24-hour state value selector: AM = 0, PM = 1
        var hour24State = (time.hours >= 12) ? 1 : 0;
        this._timePicker.hour.setSelectedIndexByDisplayedText(hour);
        this._timePicker.hour24State.setSelectedIndex(hour24State);
      } else {
        this._timePicker.hour.setSelectedIndex(time.hours);
      }

      this._timePicker.minute.setSelectedIndex(time.minutes);
    };

  ValueSelector.prototype._str2Date = function vs__str2Date(str) {
    if (!str) {
      return null;
    }

    var dcs = str.split('-');
    var date = new Date(dcs[0], parseInt(dcs[1]) - 1, dcs[2]);

    if (isNaN(date.getTime())) {
      date = null;
    }

    return date;
  };

  ValueSelector.prototype.showDatePicker =
    function vs_showDatePicker(currentValue, min, max) {
      this._currentPickerType = 'date';
      this.showPanel('spinDatePickerPopup');

      var minDate = null;
      var maxDate = null;

      minDate = this._str2Date(min);
      maxDate = this._str2Date(max);

      if (!this._datePicker) {
        this._datePicker = new SpinDatePicker(this.elements.spinDatePicker);
      }
      this._datePicker.setRange(minDate, maxDate);

      // Show current date as default value
      var date = new Date();
      if (currentValue) {
        date = InputParser.formatInputDate(currentValue, '');
      }
      this._datePicker.value = date;
    };

  function TimePicker(element) {
    this.element = element;
    this._fetchElements();
    var _ = navigator.mozL10n.get;
    var is12hFormat = navigator.mozHour12;
    var localeTimeFormat = is12hFormat ?
      _('shortTimeFormat12') : _('shortTimeFormat24');
    var startHour = is12hFormat ? 1 : 0;
    var endHour = is12hFormat ? (startHour + 12) : (startHour + 12 * 2);
    var unitClassName = 'picker-unit';

    this.is12hFormat = is12hFormat;
    this.hour = new ValuePicker(this.elements.valuePickerHours, {
      valueDisplayedText: this._setDisplayedText(startHour, endHour),
      className: unitClassName
    });
    this.minute = new ValuePicker(this.elements.valuePickerMinutes, {
      valueDisplayedText: this._setDisplayedText(0, 60, function(value) {
        return (value < 10) ? '0' + value : value;
      }),
      className: unitClassName
    });
    if (is12hFormat) {
      this.hour24State = new ValuePicker(this.elements.valuePickerHour24State, {
        valueDisplayedText: [
          _('time_am'),
          _('time_pm')
        ],
        className: unitClassName
      });
    }

    var separator = ':';
    var minutesPosition = localeTimeFormat.indexOf('%M');
    if (minutesPosition > 0) {
      separator = localeTimeFormat.substr(minutesPosition - 1, 1);
    }
    this.elements.hoursMinutesSeparator.textContent = separator;
    this.setTimePickerStyle();

    this._registerEvents();
  }

  TimePicker.prototype = {
    _fetchElements: function tp__fetchElements() {
      this.elements = {};
      this.elementClasses = ['value-picker-hours', 'value-picker-minutes',
        'value-picker-hour24-state', 'hours-minutes-separator'];

      // Loop and add element with camel style name to Time Picker attribute.
      this.elementClasses.forEach(function createElementRef(name) {
        this.elements[toCamelCase(name)] =
          this.element.querySelector('.' + name);
      }, this);
    },

    _registerEvents: function tp__registerEvents() {
      // Prevent focus being taken away by us for time picker.
      // The event listener on outer box will not be triggered cause there is a
      // evt.stopPropagation() in value_picker.js
      ['valuePickerHours', 'valuePickerMinutes',
        'valuePickerHour24State'].forEach(function(elementId) {
          this.elements[elementId].addEventListener('mousedown', this);
        }, this);
    },

    handleEvent: function tp_handleEvent(evt) {
      evt.preventDefault();
    },

    _unregisterEvents: function tp__unregisterEvents() {
      ['valuePickerHours', 'valuePickerMinutes',
        'valuePickerHour24State'].forEach(function(elementId) {
          this.elements[elementId].removeEventListener('mousedown', this);
        }, this);
    },

    _setDisplayedText: function tp__setDisplayedText(min, max, format) {
      var list = [];
      for (var i = min; i < max; ++i) {
        list.push(format ? format(i) : i);
      }
      return list;
    },

    uninit: function tp_uninit() {
      this._unregisterEvents();
      this.minute.uninit();
      this.hour.uninit();
      if (this.hour24State) {
        this.hour24State.uninit();
      }
    },

    setTimePickerStyle: function tp_setTimePickerStyle() {
      var style = 'format24h';
      if (this.is12hFormat) {
        var localeTimeFormat = navigator.mozL10n.get('shortTimeFormat12');
        // handle revert appearance
        var reversedPeriod =
          (localeTimeFormat.indexOf('%p') < localeTimeFormat.indexOf('%M'));
        style = (reversedPeriod) ? 'format12hrev' : 'format12h';

        if ('format12h' === style) {
          this.element.classList.remove('format12hhrev');
          this.element.classList.remove('format24h');
          if (!this.element.classList.contains(style)) {
            this.element.classList.add(style);
          }
        } else {
          this.element.classList.remove('format12h');
          this.element.classList.remove('format24h');
          if (!this.element.classList.contains(style)) {
            this.element.classList.add(style);
          }
        }
      }

      if('format24h' === style) {
        this.element.classList.remove('format12h');
        this.element.classList.remove('format12hrev');
        if (!this.element.classList.contains(style)) {
          this.element.classList.add(style);
        }
      }
    },

    getHour: function tp_getHours() {
      var hour = 0;
      if (this.is12hFormat) { // hour + 12 if is PM
        var hour24Offset = 12 * this.hour24State.getSelectedIndex();
        hour = this.hour.getSelectedDisplayedText();
        hour = (hour == 12) ? 0 : hour;
        hour = hour + hour24Offset;
      } else {
        hour = this.hour.getSelectedIndex();
      }
      return hour;
    },

    // return a string for the time value, format: "16:37"
    getTimeValue: function tp_getTimeValue() {
      var hour = this.getHour();
      var minute = this.minute.getSelectedDisplayedText();

      return (hour < 10 ? '0' : '') + hour + ':' + minute;
    }
  };
})(window);
