(function(window) {
  var ActivityWindowFactory = {
    // Last created activtiy window object.
    _lastActivity: null,

    _activeActivity: null,

    _activities: [],

    init: function acwf_init() {
      window.addEventListener('mozChromeEvent', this);
      window.addEventListener('launchapp', this);
      window.addEventListener('activitycreated', this);
      window.addEventListener('activityterminated', this);
      window.addEventListener('activitywillopen', this);
      window.addEventListener('activitywillclose', this);
      window.addEventListener('hidewindow', this);
      window.addEventListener('showwindow', this);
      window.addEventListener('appwillshow', this);
      window.addEventListener('home', this);
      window.addEventListener('holdhome', this);
      window.addEventListener('mozChromeEvent', this);
      window.addEventListener('globalorientationchange', this);
    },

    handleEvent: function acwf_handleEvent(evt) {
      switch (evt.type) {
        case 'mozChromeEvent':
          // Fallback of 'mozbrowseractivitydone' event.
          if (evt.detail.type == 'activity-done') {
            if (this._lastActivity) {
              this._lastActivity.kill();
            }
          }
          break;

        case 'home':
        case 'holdhome':
          this._activities.forEach(function iterator(activity) {
            activity.close();
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
            if (this._lastActivity) {
              if (this._lastActivity.isActive()) {
                // If we already has a callee, remove it.
                var callee = this._lastActivity.activityCallee;
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
                this._lastActivity = new ActivityWindow(evt.detail,
                  this._lastActivity);
                break;
              }
            }
            var app = WindowManager.getCurrentActiveAppWindow();
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
          this._activeActivity = evt.detail;
          break;

        case 'activitywillclose':
          if (this._activeActivity &&
              this._activeActivity.instanceID == evt.detail.instanceID) {
            this._activeActivity = null;
          }
          break;
      }
    }
  };

  ActivityWindowFactory.init();
  window.ActivityWindowFactory = ActivityWindowFactory;
}(this));
