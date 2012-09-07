/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ListMenu = {
  get element() {
    delete this.element;
    return this.element = document.getElementById('listmenu');
  },

  get container() {
    delete this.container;
    return this.container = document.querySelector('#listmenu menu');
  },

  get visible() {
    return this.element.classList.contains('visible');
  },

  // Listen to click event only
  init: function lm_init() {
    window.addEventListener('click', this, true);
  },

  show: function lm_show(handler) {
    this.container.classList.remove('slidedown');
    this.element.classList.add('visible');
    this.onreturn = handler;
  },

  hide: function lm_hide() {
    var self = this;
    this.container.addEventListener('transitionend',
      function onTransitionEnd() {
        self.element.classList.remove('visible');
        self.container.removeEventListener('transitionend', onTransitionEnd);
      });
    this.container.classList.add('slidedown');
  },

  handleEvent: function lm_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        if (!this.visible)
          return;

        var cancel = evt.target.dataset.action;
        if (cancel && cancel == 'cancel') {
          this.hide();
          return;
        }

        var action = evt.target.dataset.value;
        if (!action) {
          this.hide();
          return;
        }
        this.hide();
        if (this.onreturn)
          this.onreturn(action);
        break;
    }
  }
};

ListMenu.init();
