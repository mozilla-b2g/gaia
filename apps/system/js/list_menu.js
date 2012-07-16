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
    window.addEventListener('screenchange', this, true);
    window.addEventListener('home', this);
  },

  // Pass an array of list items and handler for clicking on the items
  // Modified to fit contextmenu use case, loop into the menu items
  request: function lm_request(list_items, handler) {
    this.container.innerHTML = '';
    this.currentLevel = 0;
    this.internalList = [];
    this.buildMenu(list_items);
    this.internalList.forEach(function render_item(item) {
      this.container.appendChild(item);
    }, this);

    if (handler) {
      this.onreturn = handler;
    } else {
      this.onreturn = null;
    }

    this.show();
  },

  buildMenu: function lm_buildMenu(items) {
    var containerDiv = document.createElement('div');

    containerDiv.classList.add('list-menu-container');
    if (this.currentLevel === 0) {
      containerDiv.classList.add('list-menu-root');
      containerDiv.id = 'list-menu-root';
    } else {
      containerDiv.id = 'list-menu-' + this.internalList.length;
    }
    this.internalList.push(containerDiv);

    if (this.currentLevel > 0) {
      var back_div = document.createElement('div');
      var link = document.createElement('a');
      link.textContent = 'back';
      link.href = '#' + this.currentParent;
      back_div.classList.add('back');
      back_div.appendChild(link);
      containerDiv.appendChild(back_div);
    }
    items.forEach(function traveseItems(item) {
      var item_div = document.createElement('div');
      if (item.type && item.type == 'menu') {
        this.currentLevel += 1;
        this.currentParent = containerDiv.id;
        this.buildMenu(item.items);
        this.currentLevel -= 1;
        item_div.classList.add('submenu');

        var link = document.createElement('a');
        link.href = '#' + this.currentChild;
        link.textContent = item.label;
        item_div.appendChild(link);
      } else if (item.type == 'menuitem') {
        item_div.dataset.value = item.id;
        item_div.textContent = item.label;
      } else {
        item_div.dataset.value = item.value;
        item_div.textContent = item.label;
      }

      if (item.icon) {
        item_div.style.backgroundImage = 'url(' + item.icon + ')';
      }
      containerDiv.appendChild(item_div);
    }, this);

    containerDiv.dataset.level = this.currentLevel;
    this.currentChild = containerDiv.id;
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
        if (!this.visible)
          return;

        var action = evt.target.dataset.value;
        if (!action) {
          return;
        }
        this.hide();
        if (this.onreturn)
          this.onreturn(action);
        break;

      case 'home':
        if (this.visible) {
          this.hide();
          if (this.onreturn)
            this.onreturn(null);
          evt.stopImmediatePropagation();
        }
        break;
    }
  }
};

ListMenu.init();
