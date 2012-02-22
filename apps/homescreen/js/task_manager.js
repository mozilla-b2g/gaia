/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

if (!window['Gaia'])
  var Gaia = {};

(function() {
  var timeout = 0;

  Gaia.TaskManager = {
    _active: false,
    get isActive() {
      return this._active;
    },

    setActive: function(value) {
      if (this._active && value)
        return;
      this._active = value;

      WindowManager.setActive(false);

      WindowManager.windows.forEach(function(win) {
        win.setActive(value);
      });

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

    enabled: true,

    init: function() {
      window.addEventListener('keydown', this);
      window.addEventListener('keyup', this);
      window.addEventListener('locked', this);
      window.addEventListener('unlocked', this);
    },

    handleEvent: function(evt) {
      switch (evt.type) {
        case 'keydown':
          if (!this.enabled || evt.keyCode !== evt.DOM_VK_HOME || timeout)
            return;

          if (this.isActive) {
            this.setActive(false);
            return;
          }

          timeout = window.setTimeout(function checkKeyPress(self) {
            self.setActive(true);
          }, 1000, this);
          break;

        case 'keyup':
          if (evt.keyCode !== evt.DOM_VK_HOME)
            return;

          window.clearTimeout(timeout);
          timeout = 0;
          break;

        case 'locked':
          this.enabled = false;
          break;
        case 'unlocked':
          this.enabled = true;
          break;
      }
    },

    add: function(app, id) {
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

    remove: function(app, id) {
      var item = document.getElementById('task_' + id);
      this.items.removeChild(item);
      WindowManager.kill(app.url);
    },

    sendToFront: function(id) {
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
    Gaia.TaskManager.init();
  });

})();
