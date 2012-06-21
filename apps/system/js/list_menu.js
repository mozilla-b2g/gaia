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
    return this.container = document.getElementById('listmenu-container');
  },

  get visible() {
    return this.element.classList.contains('visible');
  },

  // Listen to click event only
  init: function lm_init() {
    window.addEventListener('click', this, true);
  },

  // Pass an array of list items and handler for clicking on the items
  request: function lm_request(list_items, handler) {
    this.container.innerHTML = '';
    list_items.forEach(function render_item(item) {
      var item_div = document.createElement('div');
      item_div.dataset.value = item.value;
      item_div.textContent = item.label;
      if (item.icon) {
        item_div.style.backgroundImage = 'url(' + item.icon + ')';
      }
      this.container.appendChild(item_div);

      if (handler) {
        this.onreturn = handler;
      } else {
        this.onreturn = null;
      }
    }, this);

    this.show();
  },

  show: function lm_show() {
    this.element.classList.add('visible');
  },

  hide: function lm_hide() {
    this.element.classList.remove('visible');
  },

  handleEvent: function lm_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        if (!evt.detail.screenEnabled)
          this.hide();
        break;

      case 'click':
        var action = evt.target.dataset.value;
        if (!action) {
          return;
        }
        this.hide();
        if (this.onreturn) {
          this.onreturn(action);
        }
        break;
    }
  }
};

ListMenu.init();
