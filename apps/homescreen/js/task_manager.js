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

  enabled: true,
  init: function tm_init() {
    this.container = document.getElementById('taskManager');
    this.items = this.container.getElementsByTagName('ul')[0];

    var events = ['locked', 'unlocked', 'appwillopen', 'appfocus',
                  'appwillclose'];
    events.forEach((function attachKey(type) {
      window.addEventListener(type, this);
    }).bind(this));

    window.addEventListener('keydown', this);
    window.addEventListener('keyup', this);

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
    var detail = evt.detail;
    switch (evt.type) {
      case 'keydown':
        if (!this.enabled || this._timeout)
          return;
        this._cancelled = false;

        if (evt.keyCode !== evt.DOM_VK_HOME || this.isActive())
          return;

        this._timeout = window.setTimeout(function checkKeyPress(self) {
          self._cancelled = true;
          self.show();
        }, 1000, this);
        break;

      case 'keyup':
        if (!this._timeout && !evt.defaultPrevented && this.isActive()) {
          this.hide();
          evt.preventDefault();
        }

        if (this._cancelled)
          evt.preventDefault();

        window.clearTimeout(this._timeout);
        this._timeout = 0;
        break;

      case 'locked':
        this.enabled = false;
        break;

      case 'unlocked':
        this.enabled = true;
        break;

      case 'appwillopen':
        this.add(detail, detail.id);
        break;

      case 'appfocus':
        this.sendToFront(detail.id);
        break;

      case 'appclose':
        if (!detail.hackKillMe)
          return;

        // waiting for the closing transition to end before removing
        // the iframe from dom
        var self = this;
        var target = evt.target;
        target.addEventListener('transitionend', function waitToKill() {
          target.removeEventListener('transitionend', waitToKill);
          self.remove(detail, detail.id);
        });
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

