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
    window.addEventListener('screenchange', this, true);
    window.addEventListener('home', this);
  },

  // Pass an array of list items and handler for clicking on the items
  // Modified to fit contextmenu use case, loop into the menu items
  request: function lm_request(list_items, handler, title) {
    this.container.innerHTML = '';
    this.currentLevel = 0;
    this.internalList = [];
    this.setTitle(title);
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
    var containerDiv = document.createElement('ul');
    var _ = navigator.mozL10n.get;

    if (this.currentLevel === 0) {
      containerDiv.classList.add('list-menu-root');
      containerDiv.id = 'list-menu-root';
    } else {
      containerDiv.id = 'list-menu-' + this.internalList.length;
    }
    this.internalList.push(containerDiv);

    items.forEach(function traveseItems(item) {
      var item_div = document.createElement('li');
      var button = document.createElement('a');
      button.setAttribute('role', 'button');
      if (item.type && item.type == 'menu') {
        this.currentLevel += 1;
        this.currentParent = containerDiv.id;
        this.buildMenu(item.items);
        this.currentLevel -= 1;
        item_div.classList.add('submenu');

        button.href = '#' + this.currentChild;
        button.textContent = item.label;
      } else if (item.type == 'menuitem') {
        button.dataset.value = item.id;
        button.textContent = item.label;
      } else {
        button.dataset.value = item.value;
        button.textContent = item.label;
      }

      item_div.appendChild(button);
      if (item.icon) {
        button.style.backgroundImage = 'url(' + item.icon + ')';
        button.classList.add('icon');
      }
      containerDiv.appendChild(item_div);
    }, this);

    if (this.currentLevel > 0) {
      var back = document.createElement('li');
      var button = document.createElement('a');
      button.setAttribute('role', 'button');
      button.textContent = _('back');
      button.href = '#' + this.currentParent;
      back.classList.add('back');
      back.appendChild(button);
      containerDiv.appendChild(back);
    } else {
      var cancel = document.createElement('li');
      var button = document.createElement('button');
      button.textContent = _('cancel');
      button.dataset.action = 'cancel';
      cancel.appendChild(button);
      containerDiv.appendChild(cancel);
    }

    containerDiv.dataset.level = this.currentLevel;
    this.currentChild = containerDiv.id;
  },

  setTitle: function lm_setTitle(title) {
    if (!title)
      return;

    var titleElement = document.createElement('h3');
    titleElement.textContent = title;
    this.container.appendChild(titleElement);
  },

  show: function lm_show() {
    this.container.classList.remove('slidedown');
    this.element.classList.add('visible');
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
      case 'screenchange':
        if (!evt.detail.screenEnabled)
          this.hide();
        break;

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
