/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ActionMenu = {
  get visible() {
    return this.container.classList.contains('visible');
  },

  init: function am_init() {
    // Create the structure
    this.container = document.createElement('form');
    this.container.dataset.type = 'action';
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('data-z-index-level', 'action-menu');

    // An action menu has a mandatory header
    this.header = document.createElement('header');
    this.container.appendChild(this.header);

    // Following our paradigm we need a cancel
    this.cancel = document.createElement('button');
    this.cancel.dataset.action = 'cancel';
    this.cancel.dataset.l10nId = 'cancel';

    // We have a menu with all the options
    this.menu = document.createElement('menu');

    this.container.appendChild(this.menu);

    // We append to System app (actually to '#screen')
    document.getElementById('screen').appendChild(this.container);

    this.container.addEventListener('submit', this);
    this.menu.addEventListener('click', this);

    window.addEventListener('screenchange', this, true);
    window.addEventListener('home', this);
    window.addEventListener('holdhome', this);

    // Firing when the keyboard and the IME switcher shows/hides.
    window.addEventListener('keyboardimeswitchershow', this);
    window.addEventListener('keyboardimeswitcherhide', this);
  },

  // Pass an array of list items and handler for clicking on the items
  open: function am_open(listItems, title, successCb, errorCb) {
    this.onselected = this.onreturn = null;
    this.setTitle(title);
    this.buildMenu(listItems);
    this.onselected = successCb || function() {};
    this.oncancel = errorCb || function() {};
    this.show();
  },

  buildMenu: function am_buildMenu(items) {
    this.menu.innerHTML = '';
    items.forEach(function traveseItems(item) {
      var action = document.createElement('button');
      action.dataset.value = item.value;
      action.textContent = item.label;

      if (item.icon) {
        action.classList.add(item.iconClass || 'icon');
        action.style.backgroundImage = 'url(' + item.icon + ')';
      }
      this.menu.appendChild(action);
    }, this);
    var _ = navigator.mozL10n.get;
    this.cancel.textContent = _('cancel');
    this.menu.appendChild(this.cancel);
  },

  setTitle: function am_setTitle(title) {
    if (!title)
      return;

    this.header.textContent = title;
  },

  show: function am_show() {
    if (this.visible)
      return;

    this.container.classList.add('visible');
  },

  hide: function am_hide(callback) {
    this.container.classList.remove('visible');
    if (callback && typeof callback === 'function') {
      setTimeout(callback);
    }
  },

  _pdIMESwitcherShow: function am_pdIMESwitcherShow(evt) {
     evt.preventDefault();
  },

  handleEvent: function am_handleEvent(evt) {
    var target = evt.target;
    var type = evt.type;
    switch (type) {
      case 'submit':
        evt.preventDefault();
        break;
      case 'screenchange':
        if (!this.visible)
          return;

        if (!evt.detail.screenEnabled) {
          this.hide();
          this.oncancel();
        }
        break;

      case 'click':
        evt.preventDefault();
        var action = target.dataset.action;
        if (action && action === 'cancel') {
           this.hide();
           this.oncancel();
           return;
        }

        var value = target.dataset.value;
        if (!value) {
          return;
        }
        value = parseInt(value);
        this.hide(this.onselected.bind(this, value));
        break;

      case 'home':
      case 'holdhome':
        if (!this.visible)
          return;

        this.hide();
        this.oncancel();
        break;

      // When IME switcher shows, prevent the keyboard's focus getting changed.
      case 'keyboardimeswitchershow':
        this.menu.addEventListener('mousedown', this._pdIMESwitcherShow);
        break;

      case 'keyboardimeswitcherhide':
        this.menu.removeEventListener('mousedown', this._pdIMESwitcherShow);
        break;
    }
  }
};

ActionMenu.init();
