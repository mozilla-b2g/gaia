'use strict';

(function(exports) {

  /**
   * A global activity handler which dispatches mozSetMessageHandler events.
   */
  function ActivityHandler() {}

  ActivityHandler.prototype = {
    /**
     * Starts listening for activities.
     */
    start: function() {
      window.navigator.mozSetMessageHandler('activity',
        this.handleActivity.bind(this));
    },

    /**
     * Handles activity requests.
     */
    handleActivity: function(activity) {
      var name = activity.source.name;
      window.dispatchEvent(new CustomEvent('activity-' + name, {
        detail: activity
      }));
    }
  };

  exports.ActivityHandler = ActivityHandler;

}(window));
