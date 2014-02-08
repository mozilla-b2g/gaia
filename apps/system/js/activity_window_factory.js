(function(window) {
  var DEBUG = false;

  var ActivityWindowFactory = {
    // Last created activtiy window object.
    _lastActivity: null,

    _activeActivity: null,

    _activities: [],

    debug: function awm_debug() {
      if (DEBUG) {
        console.log('[ActivityWindowFactory]' +
          '[' + Date.now() / 1000 + ']' +
          Array.slice(arguments).concat());
      }
    },

    init: function acwf_init() {
      window.addEventListener('mozChromeEvent', this);
      window.addEventListener('launchapp', this);
      window.addEventListener('activitycreated', this);
      window.addEventListener('activityterminated', this);
      window.addEventListener('activitywillopen', this);
      window.addEventListener('activitywillclose', this);
      window.addEventListener('hidewindow', this);
      window.addEventListener('showwindow', this);
      window.addEventListener('appopen', this);
      window.addEventListener('home', this);
      window.addEventListener('holdhome', this);
      window.addEventListener('mozChromeEvent', this);
      window.addEventListener('globalorientationchange', this);
    },

    getActiveWindow: function acwf_getActiveWindow() {
      return this._activeActivity;
    },

    handleEvent: function acwf_handleEvent(evt) {
      this.debug('handling ' + evt.type);
      switch (evt.type) {
        // XXX: Move into appWindow.
        case 'appopen':
          var app = evt.detail;
          if (app.activityCallee &&
              app.activityCallee instanceof ActivityWindow) {
            app.activityCallee.open();
          }
          break;
        case 'mozChromeEvent':
          // Fallback of 'mozbrowseractivitydone' event.
          if (evt.detail.type == 'activity-done') {
            if (this._lastActivity) {
              this._lastActivity.kill(evt);
            }
          }
          break;

        case 'home':
        case 'holdhome':
          this._activities.forEach(function iterator(activity) {
            // XXX: Change to close()
            activity.kill();
          }, this);
          break;

        case 'hidewindow':
          if (this._activeActivity) {
            this._activeActivity.setVisible(false);
            evt.stopImmediatePropagation();
          }
          break;

        case 'showwindow':
          if (this._activeActivity) {
            this._activeActivity.setVisible(true);
            evt.stopImmediatePropagation();
          }
          break;

        case 'launchapp':
          if (evt.detail.isActivity && evt.detail.inline) {
            if (this._activeActivity) {
              this.debug('caller is an activity: ', this._activeActivity.name);
              // If we already has a callee, remove it.
              var callee = this._activeActivity.activityCallee;
              if (callee) {
                // XXX: We don't know the activity is the same request
                // or not here. The data passed may be different.
                // So we just kill all.
                // If we enable swipe navigation
                // then we could just use that to open the existed
                // activity.
                if (callee instanceof ActivityWindow) {
                  callee.kill();
                }
              }
              // XXX: See Bug 931339
              // Only the first matched manifestURL + pageURL is sent with
              // system message, so we need to kill the previous opened one
              // if the second one "equals" the previous.
              this._activities.forEach(function iterator(activity) {
                if (activity.manifestURL == evt.detail.manifestURL &&
                    activity.url == evt.detail.url &&
                    !activity.isActive()) {
                  // XXX: Only kill the background running activity.
                  activity.kill();
                  return false;
                }
              });
              // If the lastActivity is the same as launch request, we don't
              // need to create another activity.
              if (this._activeActivity.manifestURL === evt.detail.manifestURL &&
                  this._activeActivity.url === evt.detail.url) {
                return;
              }
              this._lastActivity = new ActivityWindow(evt.detail,
                                                      this._activeActivity);
              break;
            }
            var app = WindowManager.getCurrentActiveAppWindow();
            this.debug('caller is an app: ' + (app && app.name));
            var callee = app.activityCallee;
            if (callee) {
              // XXX: We don't know the activity is the same request
              // or not here. The data passed may be different.
              // So we just kill all.
              // If we enable swipe navigation
              // then we could just use that to open the existed
              // activity.
              if (callee instanceof ActivityWindow) {
                callee.kill();
              }
            }
            // XXX: See Bug 931339
            // Only the first matched manifestURL + pageURL is sent with
            // system message, so we need to kill the previous opened one
            // if the second one "equals" the previous.
            this._activities.forEach(function iterator(activity) {
              if (activity.manifestURL == evt.detail.manifestURL &&
                  activity.url == evt.detail.url &&
                  !activity.isActive()) {
                // XXX: Only kill the background running activity.
                activity.kill();
                return false;
              }
            });
            this._lastActivity = new ActivityWindow(evt.detail,
              app);
          }
          break;

        case 'activityterminated':
          this._activities.forEach(function iterator(activity, index) {
            if (activity.instanceID === evt.detail.instanceID) {
              if (activity.instanceID === this._lastActivity.instanceID) {
                this._lastActivity = null;
              }
              if (this._activeActivity &&
                  activity.instanceID === this._activeActivity.instanceID) {
                this._activeActivity = null;
              }
              this._activities.splice(index, 1);
              return false;
            }
          }, this);
          break;

        case 'activitycreated':
          this._activities.push(evt.detail);
          this._lastActivity = evt.detail;
          break;

        case 'activitywillopen':
          var activity = evt.detail;
          this.debug('activity: ' + activity.name +
            ' is opening, its caller is ' + activity.activityCaller.name);
          this._activeActivity = activity;
          break;

        /**
         * We should implement API to find out real active frame
         * but now we only try to guess.
         */
        case 'activitywillclose':
          var activity = evt.detail;
          this.debug('activity: ' + activity.name +
            ' is closing, its caller is ' + activity.activityCaller.name);
          if (activity.activityCaller &&
              activity.activityCaller instanceof ActivityWindow) {
            this._activeActivity = activity.activityCaller;
          } else if (this._activeActivity &&
              this._activeActivity.instanceID == evt.detail.instanceID) {
            this._activeActivity = null;
          }
          break;
      }
    },
    _dump: function() {
      if (DEBUG) {
        this.debug('dump all activity windows');
        var a = document.querySelectorAll('.activityWindow > iframe');
        for (var i = 0; i < a.length; i++) {
          this.debug(a[i].src);
        }
      }
    }
  };

  ActivityWindowFactory.init();
  window.ActivityWindowFactory = ActivityWindowFactory;
}(this));
