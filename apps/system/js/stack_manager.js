'use strict';
/* global SheetsTransition, Service */

(function(exports) {
  var StackManager = {
    name: 'StackManager',

    start: function() {
      window.addEventListener('appcreated', this);
      window.addEventListener('launchapp', this);
      window.addEventListener('appopening', this);
      window.addEventListener('appopened', this);
      window.addEventListener('appterminated', this);
      window.addEventListener('homescreenopened', this);
      window.addEventListener('cardviewclosed', this);
      Service.registerState('snapshot', this);
    },

    getCurrent: function sm_getCurrent() {
      if (this.position < 0) {
        return undefined;
      }

      var app = this._currentFromStack();

      // XXX: This code will be removed when bug 967405 lands.
      // Until then we can get into edge cases where the app currently
      // displayed is not part of the stack and we don't want to break.
      if (!app) {
        app = Service.query('AppWindowManager.getActiveWindow');
      }

      return app;
    },

    _currentFromStack: function sm_currentInStack() {
      return this._stack[this.position].getActiveWindow();
    },
    outOfStack: function sm_outOfStack() {
      return (this._currentFromStack() !== this.getCurrent());
    },

    getPrev: function sm_getPrev() {
      if (this.outOfStack()) {
        return undefined;
      }

      var inGroupPrev = this._currentFromStack().getPrev();
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
      if (this.outOfStack()) {
        return undefined;
      }

      var inGroupNext = this._currentFromStack().getNext();
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

      this._queueBroadcast(newApp, oldApp);

      if (newApp.groupID !== oldApp.groupID) {
        this.position--;
      }
    },

    goNext: function sm_goNext() {
      var oldApp = this.getCurrent();
      var newApp = this.getNext();
      if (!oldApp || !newApp) {
        return;
      }

      this._queueBroadcast(newApp, oldApp);

      if (newApp.groupID !== oldApp.groupID) {
        this.position++;
      }
    },

    commit: function sm_commit() {
      // We're back to the same place, let's close up the gesture without
      // queueing.
      if (this._didntMove) {
        window.dispatchEvent(new CustomEvent('sheets-gesture-end'));
        var current = this.getCurrent();
        current && current.setNFCFocus(true);
      }
      if (!this._broadcastTimeout) {
        this._broadcast();
      }
    },

    commitClose: function sm_commitClose() {
      // TODO: make this transition pretty but at least we're
      // fixing the race condition
      clearTimeout(this._broadcastTimeout);
      this._broadcastTimeout = null;

      if (this._appIn) {
        this._appIn.broadcast('closed');
      }

      if (this._appOut) {
        this._appOut.transitionController.clearTransitionClasses();
      }

      this._cleanUp();
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

    get _didntMove() {
      return (!this._appIn && !this._appOut) ||
             (!!this._appIn && this._appIn === this._appOut);
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
          // Multiple apps use role=system to opt out of being part of
          // the the card view.
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
        case 'appopened':
          var app = e.detail; // jshint ignore: line
          var root = app.getRootWindow();

          var id = this._indexOfInstanceID(root.instanceID);
          if (id !== undefined && id !== this._current) {
            this._current = id;
          }
          break;
        case 'homescreenopened':
          // only handle home events if task manager is not visible
          if (window.taskManager && window.taskManager.isShown()) {
            return;
          }
          this._moveToTop(this.position);
          this.position = -1;
          this.commitClose();
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
      var result;
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
      var result;
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

          if (i <= this.position && this.position >= 0) {
            this.position--;
          }
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

    _broadcastTimeout: null,
    _appIn: null,
    _appOut: null,
    _queueBroadcast: function sm_queueBroadcast(appIn, appOut) {
      if (this._appIn) {
        this._appIn.cancelQueuedShow();
      }
      this._appIn = appIn;
      appIn.queueShow();

      if (!this._appOut) {
        this._appOut = appOut;
        appOut.queueHide();
      }

      if (this._broadcastTimeout === null) {
        Service.request('stopRecording');
      }

      clearTimeout(this._broadcastTimeout);
      this._broadcastTimeout = setTimeout(this._broadcast.bind(this), 800);
    },

    _broadcast: function sm_broadcast(close) {
      clearTimeout(this._broadcastTimeout);
      this._broadcastTimeout = null;

      if (SheetsTransition.transitioning) {
        return;
      }

      // We're back to the same place
      if (this._didntMove) {
        if (this._appIn) {
          this._appIn.transitionController.clearTransitionClasses();
        }
        this._cleanUp();
        return;
      }

      // We're done swiping around, let's close up the gesture. Note that
      // sheets-gesture-start is detected and sent in SheetsTransition!!!
      window.dispatchEvent(new CustomEvent('sheets-gesture-end'));

      if (this._appIn) {
        this._appIn.broadcast('swipein');
      }
      if (this._appOut) {
        this._appOut.broadcast('swipeout');
      }

      this._cleanUp();

      this._stackChanged();
    },


    _cleanUp: function sm_cleanUp() {
      this._appIn = null;
      this._appOut = null;
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
          var separator2 = (child.isActive()) ? ' @ ' : ' = ';
          console.log(prefix + separator2 + i + ' ---> ' + this._stack[i].name +
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
  exports.StackManager = StackManager;
}(window));

