/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ValueSelector = {

  _element: null,

  debug: function(msg) {
    var debugFlag = true;
    if (debugFlag) {
      console.log('[ValueSelector] ', msg);
    }
  },

  init: function vs_init() {
    this._element = document.getElementById('value-selector');
    this._container = document.getElementById('value-selector-container');

    this._cancelButton = document.getElementById('value-selector-cancel');
    this._cancelButton.addEventListener('click', this);

    this._selectButton = document.getElementById('value-selector-select');
    this._selectButton.addEventListener('click', this);

    window.addEventListener('select', this);
  },

  handleEvent: function vs_handleEvent(evt) {
    switch (evt.type) {
      case 'select':
        this.debug('select triggered');
        this.show(evt.detail);
        break;
      case 'click':
        if (evt.currentTarget === this._cancelButton) {
          this.cancel();
        }
        break;
      default:
        this.debug('no event handler defined for' + evt.type);
        break;
    }
  },

  show: function vs_show(detail) {

    //TODO: need to handle choices.multiple
    var options = null;
    if (detail.choices && detail.choices.choices) {
      options = detail.choices.choices;
    }

    if (options)
      this.buildOptions(options);

    this._element.hidden = false;
    //this.screen.classList.add('modal-dialog');
    //this._element.classList.add('visible');
  },

  hide: function vs_hide() {
    this._element.hidden = true;
    //this._element.classList.add('hidden');
    //this._element.classList.remove('visible');
    //this.screen.classList.remove('modal-dialog');
  },

  cancel: function vs_cancel() {
    this.debug('cancel invoked');
    this.hide();
  },

  select: function vs_select() {

  },

  buildOptions: function(options) {

    this.debug(JSON.stringify(options));

    var optionHTML = '<ul>';

    for (var i = 0, n = options.length; i < n; i++) {
      optionHTML += '<li>' +
                    options[i].text +
                    '</li>';
    }

    optionHTML += '</ul>';

    this.debug(optionHTML);
    this._container.innerHTML = optionHTML;
  }
};

ValueSelector.init();
