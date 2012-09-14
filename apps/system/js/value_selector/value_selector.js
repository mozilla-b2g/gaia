/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ValueSelector = {

  _containers: {},
  _popups: {},
  _buttons: {},

  debug: function(msg) {
    var debugFlag = false;
    if (debugFlag) {
      console.log('[ValueSelector] ', msg);
    }
  },

  init: function vs_init() {

    var self = this;

    window.navigator.mozKeyboard.onfocuschange = function onfocuschange(evt) {
      var typeToHandle = ['select-one', 'select-multiple', 'date',
        'time', 'datetime', 'datetime-local'];

      var type = evt.detail.type;
      // handle the <select> element and inputs with type of date/time
      // in system app for now
      if (typeToHandle.indexOf(type) == -1)
        return;

      switch (evt.detail.type) {
        case 'select-one':
        case 'select-multiple':
          self.debug('select triggered' + JSON.stringify(evt.detail));
          self._currentPickerType = evt.detail.type;
          self.showOptions(evt.detail);
          break;

        case 'date':
          self.showDatePicker();
          break;

        case 'time':
          self.showTimePicker();
          break;

        case 'datetime':
        case 'datetime-local':
          // TODO
          break;
      }
    };


    this._element = document.getElementById('value-selector');
    this._containers['select'] =
      document.getElementById('value-selector-container');
    this._containers['select'].addEventListener('click', this);
    ActiveEffectHelper.enableActive(this._containers['select']);

    this._popups['select'] =
      document.getElementById('select-option-popup');
    this._popups['time'] =
      document.getElementById('time-picker-popup');

    this._buttons['select'] = document.getElementById('select-options-buttons');
    this._buttons['select'].addEventListener('click', this);

    this._buttons['time'] = document.getElementById('time-picker-buttons');
    this._buttons['time'].addEventListener('click', this);

    this._containers['time'] = document.getElementById('picker-bar');

    ActiveEffectHelper.enableActive(this._buttons['select']);
    ActiveEffectHelper.enableActive(this._buttons['time']);

    window.addEventListener('appopen', this);
    window.addEventListener('appwillclose', this);
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
      var selectee = this._containers['select'].querySelectorAll('[aria-checked="true"]');
      for (var i = 0; i < selectee.length; i++) {
        selectee[i].removeAttribute('aria-checked');
      }

      target.setAttribute('aria-checked', 'true');
    } else if ( target.getAttribute('aria-checked') === 'true' ) {
      target.removeAttribute('aria-checked');
    } else {
      target.setAttribute('aria-checked', 'true');
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
    this.hide();
  },

  confirm: function vs_confirm() {

    var singleOptionIndex;
    var optionIndices = [];

    var selectee = this._containers['select'].querySelectorAll('.selected');

    if (this._currentPickerType === 'select-one' || this._currentPickerType === 'select-multiple') {
      var selectee = this._containers['select'].querySelectorAll('[aria-checked="true"]');
    }

    if (this._currentPickerType === 'select-one') {

      if (selectee.length > 0)
        singleOptionIndex = selectee[0].dataset.optionIndex;

      window.navigator.mozKeyboard.setSelectedOption(singleOptionIndex);

    } else if (this._currentPickerType === 'date' ||
               this._currentPickerType === 'time') {

      var timeValue = TimePicker.getTimeValue();
      this.debug('output value: ' + timeValue);

      window.navigator.mozKeyboard.setValue(timeValue);
    } else {
      // Multiple select case
      for (var i = 0; i < selectee.length; i++) {

        var index = parseInt(selectee[i].dataset.optionIndex);
        optionIndices.push(index);
      }

      window.navigator.mozKeyboard.setSelectedOptions(optionIndices);
    }

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

      var checked = options[i].selected ? ' aria-checked="true"' : '';

      optionHTML += '<li data-option-index="' + options[i].optionIndex + '"' +
                     checked + '>' +
                     '<label> <span>' +
                     escapeHTML(options[i].text) +
                     '</span></label>' +
                    '</li>';
    }

    var optionsContainer = document.querySelector(
                             '#value-selector-container ol');
    if (!optionsContainer)
      return;

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

  showTimePicker: function vs_showTimePicker() {
    this._currentPickerType = 'time';
    this.show();
    this.showPanel('time');

    if (!this._timePickerInitialized) {
      TimePicker.initTimePicker();
      this._timePickerInitialized = true;
    }
  },

  showDatePicker: function vs_showDatePicker() {
    this._currentPickerType = 'date';
    this.buildDatePicker();
    this.show();
  },

  buildDatePicker: function vs_buildDatePicker() {
    var optionHTML = '<ol>';

    //TODO: for test only
    var options = [
       '2012/08/01',
       '2012/08/02'
    ];

    for (var i = 0, n = options.length; i < n; i++) {

      var checked = options[i].selected ? ' class="selected"' : '';

      optionHTML += '<li data-option-value="' + options[i] + '"' +
                     checked + '>' +
                     options[i] +
                     '<span class="checkmark">&#10004;</span>' +
                    '</li>';
    }

    optionHTML += '</ol>';

    this._container.innerHTML = optionHTML;
  }
};

var TimePicker = {
  timePicker: {
    hour: null,
    minute: null,
    hour24State: null
  },

  get hourSelector() {
    delete this.hourSelector;
    return this.hourSelector =
      document.getElementById('value-picker-hours');
  },

  get minuteSelector() {
    delete this.minuteSelector;
    return this.minuteSelector =
      document.getElementById('value-picker-minutes');
  },

  get hour24StateSelector() {
    delete this.hour24StateSelector;
    return this.hour24StateSelector =
      document.getElementById('value-picker-hour24-state');
  },

  initTimePicker: function aev_initTimePicker() {
    var unitClassName = 'picker-unit';
    var hourDisplayedText = [];
    for (var i = 1; i < 13; i++) {
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

    var hour24StateUnitStyle = {
      valueDisplayedText: ['AM', 'PM'],
      className: unitClassName
    };
    this.timePicker.hour24State =
      new ValuePicker(this.hour24StateSelector, hour24StateUnitStyle);
  },

  // return a string for the time value, format: "16:37"
  getTimeValue: function aev_getTimeValue() {
    var hour24Offset = 12 * this.timePicker.hour24State.getSelectedIndex();
    var hour = this.timePicker.hour.getSelectedDisplayedText();
    hour = (hour == 12) ? 0 : hour;
    hour = hour + hour24Offset;
    var minute = this.timePicker.minute.getSelectedDisplayedText();

    return hour + ':' + minute;
  }
};

var ActiveEffectHelper = (function() {

  function _setActive(element, isActive) {
    if (isActive) {
      element.classList.add('active');
    } else {
      element.classList.remove('active');
    }
  }

  function _onMouseDown(evt) {
    var target = evt.target;

    _setActive(target, true);
    target.addEventListener('mouseleave', _onMouseLeave);
  }

  function _onMouseUp(evt) {
    var target = evt.target;

    _setActive(target, false);
    target.removeEventListener('mouseleave', _onMouseLeave);
  }

  function _onMouseLeave(evt) {
    var target = evt.target;
    _setActive(target, false);
    target.removeEventListener('mouseleave', _onMouseLeave);
  }

  var _events = {
    'mousedown': _onMouseDown,
    'mouseup': _onMouseUp
  };

  function _enableActive(element) {
    // Attach event listeners
    for (var event in _events) {
      var callback = _events[event] || null;
      if (callback)
        element.addEventListener(event, callback);
    }
  }

  return {
    enableActive: _enableActive
  };

})();

ValueSelector.init();
