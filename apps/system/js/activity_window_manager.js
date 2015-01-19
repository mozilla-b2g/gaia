/* global Service */
'use strict';
(function(exports) {
  /**
   * ActivityWindowManager manages the activity window instances.
   *
   * Currently it's only responsible to kill an existing
   * activity window if the next creating instance has the same
   * manifestURL + pageURL.
   *
   * @class ActivityWindowManager
   */
  function ActivityWindowManager() {
  }
  ActivityWindowManager.prototype = {
    /**
     * The list of all current running activity window instances.
     * @access private
     * @type {Array}
     * @memberof ActivityWindowManager.prototype
     */
    _activities: [],

    /**
     * Register all event handlers.
     * @memberof ActivityWindowManager.prototype
     */
    start: function acwf_start() {
      if (this._started) {
        return;
      }
      this._started = true;

      this.activityPool = new Map();
      window.addEventListener('activityopened', this);
      window.addEventListener('popupopened', this);
      window.addEventListener('appopened', this);
      window.addEventListener('activityrequesting', this);
      window.addEventListener('activitycreated', this);
      window.addEventListener('activityterminated', this);
    },

    /**
     * Unregister all event handlers.
     * @memberof ActivityWindowManager.prototype
     */
    stop: function acwf_stop() {
      if (!this._started) {
        return;
      }
      this._started = false;

      this.activityPool = null;
      window.removeEventListener('activityopened', this);
      window.removeEventListener('popupopened', this);
      window.removeEventListener('appopened', this);
      window.removeEventListener('activityrequesting', this);
      window.removeEventListener('activitycreated', this);
      window.removeEventListener('activityterminated', this);
    },

    /**
     * Put all window ID which is involved in an activity here.
     * XXX: This is a workaround of bug 931339.
     * @type {Map}
     */
    activityPool: null,

    /**
     * Activity Config
     * @typedef {Object} ActivityConfig
     * @property {String} manifestURL The manifestURL of the activity
     * @property {String} url The URL of the activity handling page
     * @property {Boolean} isActivity
     * @property {Boolean} inline The disposition of the activty is inline
     *                            or not
     */

    handleEvent: function acwf_handleEvent(evt) {
      switch (evt.type) {
        // XXX: Workaround of bug 931339.
        // We are maintaining only one chain of activities here
        // in this.activityPool.
        // If the next coming activity request does not belong
        // to the previous pool,
        // kill all the background inline activities.
        case 'popupopened':
        case 'activityopened':
        case 'appopened':
          var app = evt.detail;
          var parent = app.callerWindow ||
                        app.bottomWindow ||
                        app.previousWindow;
          if (parent && this.activityPool.has(parent.instanceID)) {
            // We don't really care about the instance context,
            // so we set the value to a boolean.
            this.activityPool.set(app.instanceID, true);
          }
          break;
        case 'popupterminated':
        case 'appterminated':
          this.activityPool.delete(app.instanceID);
          break;
        case 'activityrequesting':
          // The request may come from the top most window
          // or the system app, but we don't care here.
          var caller = Service.query('getTopMostWindow');
          if (!this.activityPool.size) {
            this.activityPool.set(caller.instanceID, true);
          } else {
            if (!this.activityPool.has(caller.instanceID)) {
              // A new request from a new chain,
              // kill all the background.
              this._activities.forEach(function iterator(activity, index) {
                if (!activity.getBottomMostWindow().isActive() ||
                    !activity.isActive()) {
                  activity.kill();
                }
              }, this);
              this.activityPool.clear();
              this.activityPool.set(caller.instanceID, true);
            }
          }
          break;

        case 'activityterminated':
          this._activities.some(function iterator(activity, index) {
            if (activity.instanceID === evt.detail.instanceID) {
              this._activities.splice(index, 1);
              return true;
            }
          }, this);
          this.activityPool.delete(evt.detail.instanceID);
          break;

        case 'activitycreated':
          this._activities.push(evt.detail);
          break;
      }
    }
  };

  exports.ActivityWindowManager = ActivityWindowManager;
}(window));
