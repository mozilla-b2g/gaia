/* global LazyLoader */
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
      return LazyLoader.load(['js/import.js']).then(() => {
        this.import = new Import();
        return Promise.resolve(this.import.start());
      });
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
