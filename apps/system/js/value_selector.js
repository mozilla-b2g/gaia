/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ValueSelector = {
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
    this._container = document.getElementById('value-selector-container');
    this._container.addEventListener('click', this);

    this._cancelButton = document.getElementById('value-selector-cancel');
    this._cancelButton.addEventListener('click', this);

    this._confirmButton = document.getElementById('value-selector-confirm');
    this._confirmButton.addEventListener('click', this);

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
          case this._cancelButton:
            this.cancel();
            break;

          case this._confirmButton:
            this.confirm();
            break;

          case this._container:
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
      var selectee = this._container.querySelectorAll('.selected');
      for (var i = 0; i < selectee.length; i++) {
        selectee[i].classList.remove('selected');
      }

      target.classList.add('selected');
    } else {
      target.classList.toggle('selected');
    }
  },

  show: function vs_show(detail) {
    this._element.hidden = false;
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

    var selectee = this._container.querySelectorAll('.selected');

    if (this._currentPickerType === 'select-one') {

      if (selectee.length > 0)
        singleOptionIndex = selectee[0].dataset.optionIndex;

      window.navigator.mozKeyboard.setSelectedOption(singleOptionIndex);

    } else if (this._currentPickerType === 'date' ||
               this._currentPickerType === 'time') {
      var optionValue;

      if (selectee.length > 0)
        optionValue = selectee[0].dataset.optionValue;

      window.navigator.mozKeyboard.setValue(optionValue);
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
  },

  buildOptions: function(options) {

    var optionHTML = '<ol>';

    for (var i = 0, n = options.length; i < n; i++) {

      var checked = options[i].selected ? ' class="selected"' : '';

      optionHTML += '<li data-option-index="' + options[i].optionIndex + '"' +
                     checked + '>' +
                     options[i].text +
                     '<span class="checkmark">&#10004;</span>' +
                    '</li>';
    }

    optionHTML += '</ol>';

    this._container.innerHTML = optionHTML;
  },

  showTimePicker: function vs_showTimePicker() {
    this._currentPickerType = 'time';
    this.buildTimePicker();
    this.show();
  },

  buildTimePicker: function vs_buildTimePicker() {
    //TODO: for test only
    var options = [
       '12:00',
       '13:00'
    ];

    var optionHTML = '<ol>';
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

ValueSelector.init();
