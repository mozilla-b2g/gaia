'use strict';

var StackManager = {
  init: function sm_init() {
    window.addEventListener('appcreated', this);
    window.addEventListener('launchapp', this);
    window.addEventListener('appopening', this);
    window.addEventListener('appterminated', this);
    window.addEventListener('home', this);
    window.addEventListener('cardviewclosed', this);
  },

  getCurrent: function sm_getCurrent() {
    if (this.position < 0) {
      return undefined;
    }
    return this._stack[this.position].getActiveWindow();
  },
  getPrev: function sm_getPrev() {
    var inGroupPrev = this.getCurrent().getActiveWindow().getPrev();
    if (inGroupPrev) {
      return inGroupPrev;
    }
    var previousGroup = this._stack[this.position - 1];
    if (previousGroup) {
      return previousGroup.getLeafWindow();
    }

    return undefined;
  },
  getNext: function sm_getNext() {
    var inGroupNext = this.getCurrent().getActiveWindow().getNext();
    if (inGroupNext) {
      return inGroupNext;
    }
    var nextGroup = this._stack[this.position + 1];
    if (nextGroup) {
      return nextGroup.getRootWindow();
    }

    return undefined;
  },

  goPrev: function sm_goPrev() {
    var oldApp = this.getCurrent();
    var newApp = this.getPrev();
    if (!oldApp || !newApp) {
      return;
    }

    newApp.broadcast('swipein');
    oldApp.broadcast('swipeout');

    if (newApp.groupID !== oldApp.groupID) {
      this.position--;
    }
    this._stackChanged();
  },

  goNext: function sm_goNext() {
    var oldApp = this.getCurrent();
    var newApp = this.getNext();
    if (!oldApp || !newApp) {
      return;
    }

    newApp.broadcast('swipein');
    oldApp.broadcast('swipeout');

    if (newApp.groupID !== oldApp.groupID) {
      this.position++;
    }
    this._stackChanged();
  },

  snapshot: function sm_snapshot() {
    return this._stack.slice(0);
  },

  get length() {
    return this._stack.length;
  },

  get position() {
    return this._current;
  },
  set position(position) {
    var _position = parseInt(position);
    if (_position < -1 || _position >= this._stack.length) {
      console.warn('bad stack position. requested position = ',
                   _position, '; stack length = ', this._stack.length);
      return;
    }

    this._current = _position;
  },

  _stack: [],
  _current: -1,

  handleEvent: function sm_handleEvent(e) {
    switch (e.type) {
      case 'appcreated':
        var app = e.detail;
        // The system application should never show up in the stack.
        // XXX: This code will be removed when bug 967405 lands.
        if (app.manifest && app.manifest.role == 'system') {
          return;
        }

        // The FTU application should never show up in the stack.
        // XXX: This code will be removed when bug 967405 lands.
        if (app.name == 'FTU') {
          return;
        }

        // If the app is a child window of other window, do not insert it.
        if (app.previousWindow) {
          return;
        }

        if (app.stayBackground) {
          this._insertBelow(app);
        } else {
          this._moveToTop(this.position);
          this._insertOnTop(app);
        }
        break;
      case 'launchapp':
        var config = e.detail;
        if (!config.stayBackground) {
          this._moveToTop(this.position);

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
          this._current = idx;
        }
        break;
      case 'home':
        this._moveToTop(this.position);
        this.position = -1;
        break;
      case 'appterminated':
        var instanceID = e.detail.instanceID;
        this._remove(instanceID);
        break;
      case 'cardviewclosed':
        if (e.detail && e.detail.newStackPosition) {
          this.position = e.detail.newStackPosition;
        }
        break;
    }
    this._stackChanged();
  },

  _insertBelow: function sm_insertBelow(app) {
    this._stack.splice(0, 0, app);
    if (this._stack.length > 1) {
      this.position++;
    } else {
      this.position = 0;
    }
  },

  _insertOnTop: function sm_insertOnTop(app) {
    this.position = this._stack.push(app) - 1;
  },

  _moveToTop: function sm_moveToTop(index) {
    if (index === -1 || index >= this._stack.length) {
      return;
    }

    var sheet = this._stack.splice(index, 1)[0];
    this.position = this._stack.push(sheet) - 1;
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
    var self = this;
    this._stack.some(function(app, idx) {
      if (app.instanceID == instanceID) {
        result = idx;
        return true;
      } false;
    });

    return result;
  },

  _remove: function sm_remove(instanceID) {
    for (var i = (this._stack.length - 1); i >= 0; i--) {
      var sConfig = this._stack[i];

      if (sConfig.instanceID == instanceID) {
        this._stack.splice(i, 1);

        if (i <= this.position && this.position > 0) {
          this.position--;
        }
        this._dump();
        return;
      }
    }
  },

  _stackChanged: function sm_stackChanged() {
    var details = {
      position: this.position,
      sheets: this._stack
    };

    var evt = new CustomEvent('stackchanged', { detail: details });

    window.dispatchEvent(evt);
  },

  /* Debug */
  _dump: function sm_dump() {
    var prefix = 'StackManager';
    for (var i = 0; i < this._stack.length; i++) {
      var separator = (i == this.position) ? ' * ' : ' - ';
      console.log(prefix + separator + i + ' -> ' + this._stack[i].name +
        '/' + this._stack[i].instanceID);
      var child = this._stack[i].nextWindow;
      while (child) {
        var separator = (child.isActive()) ? ' @ ' : ' = ';
        console.log(prefix + separator + i + ' ---> ' + this._stack[i].name +
                  '/' + this._stack[i].instanceID);
        child = child.nextWindow;
      }
    }
  },
  __clearAll: function sm_clearAll() {
    this._stack = [];
    this.position = 0;
  }
};

StackManager.init();
