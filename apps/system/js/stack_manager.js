'use strict';

var StackManager = {
  init: function sm_init() {
    window.addEventListener('appcreated', this);
    window.addEventListener('launchapp', this);
    window.addEventListener('launchwrapper', this);
    window.addEventListener('appterminated', this);
    window.addEventListener('home', this);
  },

  getCurrent: function sm_getCurrent() {
    return this._stack[this._current];
  },
  getPrev: function sm_getPrev() {
    return this._stack[this._current - 1];
  },
  getNext: function sm_getNext() {
    return this._stack[this._current + 1];
  },

  goPrev: function sm_goPrev() {
    var newApp = this.getPrev();
    if (!newApp) {
      return;
    }

    WindowManager.setActiveApp(newApp);
    this._current--;
  },

  goNext: function sm_goNext() {
    var newApp = this.getNext();
    if (!newApp) {
      return;
    }

    WindowManager.setActiveApp(newApp);
    this._current++;
  },

  get length() {
    return this._stack.length;
  },

  _stack: [],
  _current: 0,

  handleEvent: function sm_handleEvent(e) {
    switch (e.type) {
      case 'appcreated':
        var app = e.detail;
        if (app.stayBackground) {
          this._insertBelow(app);
        } else {
          this._insertOnTop(app);
        }
        break;
      case 'launchapp':
      case 'launchwrapper':
        var config = e.detail;
        if (!config.stayBackground) {
          var idx = this._indexOfURL(config.url);
          if (idx !== undefined) {
            this._moveToTop(idx);
          }
        }
        break;
      case 'home':
        if (this._stack.length > 1) {
          this._moveToTop(this._current);
        }
        break;
      case 'appterminated':
        var manifestURL = e.detail.manifestURL;
        this._remove(manifestURL);
        break;
    }
  },

  _insertBelow: function sm_insertBelow(app) {
    this._stack.splice(0, 0, app);
    if (this._stack.length > 1) {
      this._current++;
    } else {
      this._current = 0;
    }
  },

  _insertOnTop: function sm_insertOnTop(app) {
    this._current = this._stack.push(app) - 1;
  },

  _moveToTop: function sm_moveToTop(index) {
    var sheet = this._stack.splice(index, 1)[0];
    this._current = this._stack.push(sheet) - 1;
  },

  _indexOfURL: function sm_indexOfURL(url) {
    var result = undefined;
    this._stack.some(function(app, idx) {
      if (app.url == url) {
        result = idx;
        return true;
      }
      return false;
    });

    return result;
  },

  _remove: function sm_remove(manifestURL) {
    for (var i = (this._stack.length - 1); i >= 0; i--) {
      var sConfig = this._stack[i];

      if (sConfig.manifestURL == manifestURL) {
        this._stack.splice(i, 1);
        if (i <= this._current) {
          this._current--;
        }
        return;
      }
    }
  },

  /* Debug */
  _dump: function sm_dump() {
    console.log('StackManager : dump');
    var prefix = 'StackManager';
    for (var i = 0; i < this._stack.length; i++) {
      var separator = (i == this._current) ? ' * ' : ' - ';
      console.log(prefix + separator + i + ' -> ' + this._stack[i].name);
    }
  },
  __clearAll: function sm_clearAll() {
    this._stack = [];
    this._current = 0;
  }
};

StackManager.init();
