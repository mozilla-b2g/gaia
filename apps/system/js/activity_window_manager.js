'use strict';
(function(exports) {
  /**
   * ActivityWindowManager manages the activity window instances.
   *
   * Currently it's only responsible to kill an existing
   * activity window if the next creating instance has the same
   * manifestURL + pageURL.
   *
   * @todo Implement ActivityWindowManager
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

      window.addEventListener('activitycreating', this);
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

      window.removeEventListener('activitycreating', this);
      window.removeEventListener('activitycreated', this);
      window.removeEventListener('activityterminated', this);
    },

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
        case 'activitycreating':
          // XXX: See Bug 931339
          // Only the first matched manifestURL + pageURL is sent with
          // system message, so we need to kill the previous opened one
          // if the second one "equals" the previous.
          var configuration = evt.detail;
          this._activities.some(function iterator(activity) {
            if (activity.manifestURL == configuration.manifestURL &&
                activity.url == configuration.url &&
                !activity.isActive()) {
              activity.kill();
              return true;
            }
          });
          break;

        case 'activityterminated':
          this._activities.forEach(function iterator(activity, index) {
            console.log(activity.instanceID, evt.detail.instanceID);
            if (activity.instanceID === evt.detail.instanceID) {
              this._activities.splice(index, 1);
              return false;
            }
          }, this);
          break;

        case 'activitycreated':
          this._activities.push(evt.detail);
          break;
      }
    }
  };

  exports.ActivityWindowManager = ActivityWindowManager;
}(window));
