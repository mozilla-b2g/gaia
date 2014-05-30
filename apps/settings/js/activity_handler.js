/* exported ActivityHandler */
(function(exports) {
  'use strict';

  var ActivityHandler = {
    _targetPanelId: null,
    _currentActivity: null,

    _handlers: {
      'configure': function ah_configureHandler(activitySource) {
        var targetPanelId = activitySource.data.section || 'root';
        var targetPanel = document.getElementById(targetPanelId);

        // Validate if the section exists
        if (!targetPanel || targetPanel.tagName !== 'SECTION') {
          var msg =
            'Trying to open an non-existent section: ' + targetPanelId;
          console.warn(msg);

          // fallback to root panel
          targetPanelId = 'root';
          targetPanel = document.getElementById(targetPanelId);
        }

        if (targetPanelId === 'root') {
          // Apply the filter
          document.body.dataset.filterBy =
            activitySource.data.filterBy || 'all';
        } else {
          // Mark the desired panel as a dialog
          targetPanel.dataset.dialog = true;
        }

        return targetPanelId;
      }
    },

    _handle: function ah_handler(activitySource) {
      var handler = this._handlers[activitySource.name];
      if (handler) {
        return handler(activitySource);
      }
    },

    _registerListener: function ah_registerListener() {
      // Post result when pressing home button
      document.addEventListener('visibilitychange', function change() {
        if (document.hidden) {
          document.removeEventListener('visibilitychange', change);
          // An activity can be closed either by pressing the 'X' button
          // or by a visibility change (i.e. home button or app switch).
          // Send a result to finish this activity
          this._currentActivity.postResult(null);
        }
      }.bind(this));
    },

    get currentActivity() {
      return this._currentActivity;
    },

    get targetPanelId() {
      return this._targetPanelId;
    },

    ready: function ah_ready(callback) {
      if (typeof callback !== 'function') {
        return;
      }
      if (!navigator.mozHasPendingMessage('activity')) {
        callback();
        return;
      }

      navigator.mozSetMessageHandler('activity', function(activity) {
        this._currentActivity = activity;
        this._targetPanelId = this._handle(this._currentActivity.source);
        this._registerListener();

        callback();
      }.bind(this));
    },

    postResult: function ah_postResult(result) {
      this._currentActivity.postResult(result);
    }
  };

  exports.ActivityHandler = ActivityHandler;
})(this);
