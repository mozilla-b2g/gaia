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
    this._element = document.getElementById('value-selector');
    this._container = document.getElementById('value-selector-container');

    this._container.addEventListener('click', this.handleSelect.bind(this));
    this._container.onmousedown = function() {
      return false;
    };

    this._cancelButton = document.getElementById('value-selector-cancel');
    this._cancelButton.addEventListener('click', this);

    this._confirmButton = document.getElementById('value-selector-confirm');
    this._confirmButton.addEventListener('click', this.confirm.bind(this));
    this._confirmButton.onmousedown = function() {
      return false;
    };

    window.addEventListener('select', this);
  },

  handleEvent: function vs_handleEvent(evt) {
    switch (evt.type) {
      case 'select':
        this.debug('select triggered' + JSON.stringify(evt.detail));
        this._singleSelect = !evt.detail.choices.multiple;
        this.show(evt.detail);
        break;

      case 'click':
        if (evt.currentTarget === this._cancelButton)
          this.cancel();
        break;

      default:
        this.debug('no event handler defined for' + evt.type);
        break;
    }
  },

  handleSelect: function vs_handleSelect(evt) {
    var target = evt.target;

    if (target.dataset === undefined ||
        target.dataset.optionindex === undefined)
      return;

    if (this._singleSelect) {
      var selectee = this._container.querySelectorAll('.selected');
      for (var i = 0; i < selectee.length; i++) {
        selectee[i].classList.remove('selected');
      }

      target.classList.add('selected');

    } else {
      if (target.classList.contains('selected')) {
        target.classList.remove('selected');
      } else {
        target.classList.add('selected');
      }
    }
  },

  show: function vs_show(detail) {

    var options = null;
    if (detail.choices && detail.choices.choices)
      options = detail.choices.choices;

    if (options)
      this.buildOptions(options);

    this._element.hidden = false;
  },

  hide: function vs_hide() {
    this._element.hidden = true;
  },

  cancel: function vs_cancel() {
    this.debug('cancel invoked');
    this.hide();
  },

  confirm: function vs_select() {

    var singleOptionIndex;
    var optionIndices = [];

    var selectee = this._container.querySelectorAll('.selected');

    if (this._singleSelect) {

      if (selectee.length > 0)
        singleOptionIndex = selectee[0].dataset.optionindex;

    } else {

      for (var i = 0; i < selectee.length; i++) {

        var i = parseInt(selectee[i].dataset.optionindex);
        optionIndices.push(i);
      }
    }

    if (this._singleSelect) {
      window.navigator.mozKeyboard.setSelectedOption(singleOptionIndex);
    } else {
      window.navigator.mozKeyboard.setSelectedOptions(optionIndices);
    }

    this.hide();
  },

  buildOptions: function(options) {

    var optionHTML = '<ol>';

    for (var i = 0, n = options.length; i < n; i++) {

      var checked = options[i].selected ? ' class="selected"' : '';

      optionHTML += '<li data-optionindex="' + options[i].optionIndex + '"' +
                     checked + '>' +
                     options[i].text +
                     '<span class="checkmark">&#10004;</span>' +
                    '</li>';
    }

    optionHTML += '</ol>';

    this._container.innerHTML = optionHTML;
  }
};

ValueSelector.init();
