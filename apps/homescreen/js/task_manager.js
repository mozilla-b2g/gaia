/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var TaskManager = {
  _active: false,
  get isActive() {
    return this._active;
  },

  setActive: function tm_setActive(value) {
    if (this._active && value)
      return;
    this._active = value;

    this.container.classList.toggle('active');
  },

  get container() {
    delete this.container;
    return this.container = document.getElementById('taskManager');
  },

  get items() {
    delete this.items;
    return this.items = this.container.getElementsByTagName('ul')[0];
  },

  init: function tm_init() {
    ['keydown', 'keyup'].forEach((function attachKey(type) {
      window.addEventListener(type, this);
    }).bind(this));
  },

  _timeout: 0,
  handleEvent: function tm_handleEvent(evt) {
    switch (evt.type) {
      case 'keydown':
        if (evt.keyCode !== evt.DOM_VK_A || this._timeout)
          return;

        if (this.isActive) {
          this.setActive(false);
          return;
        }

        this._timeout = window.setTimeout(function checkKeyPress(self) {
          self.setActive(true);
        }, 1000, this);
        break;

      case 'keyup':
        if (evt.keyCode !== evt.DOM_VK_A)
          return;

        window.clearTimeout(this._timeout);
        this._timeout = 0;
        break;
    }
  },

  add: function tm_add(app, id) {
    var item = document.createElement('li');
    item.id = 'task_' + id;

    var style = 'background: -moz-element(#window_' + id + ') no-repeat';
    item.setAttribute('style', style);

    var close = document.createElement('a');
    item.appendChild(close);

    var title = document.createElement('h1');
    title.innerHTML = app.name;
    item.appendChild(title);

    this.items.appendChild(item);

    var self = this;
    item.addEventListener('click', function taskClickHandler(evt) {
      window.setTimeout(function launchApp() {
        WindowManager.launch(app.url);
      }, 400);
      self.setActive(false);
    });

    close.addEventListener('click', function(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      self.remove(app, id);
      return false;
    }, true);

    return item;
  },

  remove: function tm_remove(app, id) {
    var item = document.getElementById('task_' + id);
    this.items.removeChild(item);
    WindowManager.kill(app.url);
  },

  sendToFront: function tm_sendToFront(id) {
    var items = this.items;
    var firstItem = items.firstChild;

    var item = document.getElementById('task_' + id);
    if (item === firstItem)
      return;

    items.removeChild(item);
    items.insertBefore(item, firstItem);
  }
};

window.addEventListener('load', function(evt) {
  TaskManager.init();
});

