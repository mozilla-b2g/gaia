'use strict';

var StackManager = {
  init: function sm_init() {
    window.addEventListener('appcreated', this);
    window.addEventListener('launchapp', this);
    window.addEventListener('appopening', this);
    window.addEventListener('appterminated', this);
    window.addEventListener('home', this);
  },

  getCurrent: function sm_getCurrent() {
    return this._stack[this._current].getActiveWindow();
  },
  getPrev: function sm_getPrev() {
    var prev = this.getCurrent().getActiveWindow().getPrev() ||
              (this._stack[this._current - 1] ?
              this._stack[this._current - 1].getLeafWindow() : undefined);
    return prev;
  },
  getNext: function sm_getNext() {
    var next = this.getCurrent().getActiveWindow().getNext() ||
            (this._stack[this._current + 1] ?
            this._stack[this._current + 1].getRootWindow() : undefined);
    return next;
  },

  goPrev: function sm_goPrev() {
    var oldApp = this.getCurrent();
    var newApp = this.getPrev();
    if (!newApp || !oldApp) {
      return;
    }

    newApp.broadcast('swipein');
    oldApp.broadcast('swipeout');
    if (newApp.sheetID !== oldApp.sheetID) {
      this._current--;
    }
  },

  goNext: function sm_goNext() {
    var oldApp = this.getCurrent();
    var newApp = this.getNext();
    if (!newApp || !oldApp) {
      return;
    }

    newApp.broadcast('swipein');
    oldApp.broadcast('swipeout');
    if (newApp.sheetID !== oldApp.sheetID) {
      this._current++;
    }
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
        if (app.parentWindow) {
          return;
        }
        if (app.stayBackground) {
          this._insertBelow(app);
        } else {
          this._moveToTop(this._current);
          this._insertOnTop(app);
        }
        break;
      case 'launchapp':
        var config = e.detail;
        if (!config.stayBackground) {
          this._moveToTop(this._current);

          var idx = this._indexOfURL(config.url);
          if (idx !== undefined) {
            this._moveToTop(idx);
          }
        }
        break;
      case 'appopening':
        var app = e.detail;
        var root = app.getRootWindow();

        var idx = this._indexOfInstanceID(root.instanceID);
        if (idx !== undefined && idx !== this._current) {
          this._moveToTop(idx);
        }
        break;
      case 'home':
        this._moveToTop(this._current);
        break;
      case 'appterminated':
        var instanceID = e.detail.instanceID;
        this._remove(instanceID);
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
    if (index >= this._stack.length) {
      return;
    }

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

  _indexOfInstanceID: function sm_indexOfIntanceID(instanceID) {
    var result = undefined;
    this._stack.some(function(app, idx) {
      if (app.instanceID == instanceID) {
        result = idx;
        return true;
      }
      return false;
    });

    return result;
  },

  _remove: function sm_remove(instanceID) {
    for (var i = (this._stack.length - 1); i >= 0; i--) {
      var sConfig = this._stack[i];

      if (sConfig.instanceID == instanceID) {
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
      console.log(prefix + separator + i + ' -> ' + this._stack[i].name +
        '/' + this._stack[i].instanceID);
      var child = this._stack[i].childWindow;
      while (child) {
        var separator = (child.isActive()) ? ' @ ' : ' = ';
        console.log(prefix + separator + i + ' ---> ' + this._stack[i].name +
                  '/' + this._stack[i].instanceID);
        child = child.childWindow;
      }
    }
  },
  __clearAll: function sm_clearAll() {
    this._stack = [];
    this._current = 0;
  }
};

StackManager.init();
