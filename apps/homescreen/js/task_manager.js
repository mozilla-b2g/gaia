/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var TaskManager = {
  isActive: function tm_isActive() {
    return this.container.classList.contains('active');
  },

  show: function tm_show() {
    this.container.classList.add('active');
  },

  hide: function tm_hide() {
    this.container.classList.remove('active');
  },

  get container() {
    delete this.container;
    return this.container = document.getElementById('taskManager');
  },

  get items() {
    delete this.items;
    return this.items = this.container.getElementsByTagName('ul')[0];
  },

  enabled: true,
  init: function tm_init() {
    ['keydown', 'keyup', 'locked', 'unlocked'].forEach((function attachKey(type) {
      window.addEventListener(type, this);
    }).bind(this));

    // hiding the task manager when a call comes in
    var telephony = navigator.mozTelephony;
    if (telephony) {
      telephony.addEventListener('incoming', (function incoming(evt) {
        this.hide();
      }).bind(this));
    }
  },

  _timeout: 0,
  handleEvent: function tm_handleEvent(evt) {
    switch (evt.type) {
      case 'keydown':
        if (!this.enabled || evt.keyCode !== evt.DOM_VK_HOME || this._timeout)
          return;

        if (this.isActive()) {
          this.hide();
          return;
        }

        this._timeout = window.setTimeout(function checkKeyPress(self) {
          self.show();
        }, 1000, this);
        break;

      case 'keyup':
        if (evt.keyCode !== evt.DOM_VK_HOME)
          return;

        window.clearTimeout(this._timeout);
        this._timeout = 0;
        break;


      case 'locked':
        this.enabled = false;
        break;
      case 'unlocked':
        this.enabled = true;
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
      self.hide();
      WindowManager.launch(app.url);
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

    if (this.items.children.length === 0) 
      this.hide();
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

