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
    window.addEventListener('holdhome', this);
  },

  // Pass an array of list items and handler for clicking on the items
  // Modified to fit contextmenu use case, loop into the menu items
  request: function lm_request(listItems, title, successCb, errorCb) {
    this.container.innerHTML = '';
    this.currentLevel = 0;
    this.internalList = [];
    this.setTitle(title);
    this.buildMenu(listItems);
    this.internalList.forEach(function render_item(item) {
      this.container.appendChild(item);
    }, this);

    this.onreturn = successCb || function() {};
    this.oncancel = errorCb || function() {};

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
        // XXX: We disallow multi-level menu at this moment
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=824928
        // for UX design and dev implementation tracking
        return;
      } else if (item.type && item.type == 'menuitem') {
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
    if (this.visible)
      return;

    this.container.classList.remove('slidedown');
    this.element.classList.add('visible');
  },

  hide: function lm_hide(callback) {
    if (!this.visible)
      return;

    var self = this;
    var container = this.container;
    container.addEventListener('transitionend', function list_hide() {
      container.removeEventListener('transitionend', list_hide);
      self.element.classList.remove('visible');

      if (callback)
        setTimeout(callback);
    });

    setTimeout(function() {
      container.classList.add('slidedown');
    });
  },

  handleEvent: function lm_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        if (!evt.detail.screenEnabled) {
          this.hide();
          this.oncancel();
        }
        break;

      case 'click':
        if (!this.visible)
          return;

        var cancel = evt.target.dataset.action;
        if (cancel && cancel == 'cancel') {
          this.hide();
          this.oncancel();
          return;
        }

        var value = evt.target.dataset.value;
        if (!value) {
          return;
        }
        value = parseInt(value);
        this.hide(this.onreturn.bind(this, value));
        break;

      case 'home':
      case 'holdhome':
        if (!this.visible)
          return;

        this.hide();
        this.oncancel();
        break;
    }
  }
};

ListMenu.init();
