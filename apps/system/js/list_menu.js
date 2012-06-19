/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ListMenu = {
  get element() {
    delete this.element;
    return this.element = document.getElementById('listmenu');
  },

  get visible() {
    return this.element.classList.contains('visible');
  },

  init: function lm_init() {
    window.addEventListener('screenchange', this);
    window.addEventListener('click', this, true);
    window.addEventListener('keydown', this, true);
    window.addEventListener('keyup', this, true);
  },

  create: function lm_create(list_items, handler) {
    list_items.forEach(function render_item(element, index, array){
      var item = document.createElement('div');
      item.dataset.i10nId = element.i10nId;
      item.dataset.value = element.value;
      this.element.appendChild(item);

      if (handler) {
        this.onreturn = handler;
      } else {
        this.onreturn = function lm_onreturn(){};
      }
    });
  },

  show: function lm_show() {
    this.element.classList.add('visible');
  },

  hide: function lm_hide() {
    this.element.classList.remove('visible');
  },

  onreturn: function lm_onReturn() {
  },

  handleEvent: function lm_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange': 
        if (!evt.detail.screenEnabled)
          this.hide();
        break;

      case 'click':
        var action = evt.target.dataset.value;
        this.hide();
        this.onreturn(action);
        break;

      case 'keyup':
        if (this.visible) {
          if (evt.keyCode == evt.DOM_VK_ESCAPE ||
              evt.keyCode == evt.DOM_VK_HOME) {

              this.hide();
              evt.stopPropagation();
          }

          if (evt.keyCode == evt.DOM_VK_SLEEP &&
              this._longpressTriggered) {
            evt.stopPropagation();
            this._longpressTriggered = false;
          }

          return;
        }

        if (!this._listMenuTimeout || evt.keyCode != evt.DOM_VK_SLEEP)
          return;

        window.clearTimeout(this._listMenuTimeout);
        this._listMenuTimeout = null;

        break;
    }
  }
};
