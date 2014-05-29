/* exported ActivityHandler */
(function(exports) {
  'use strict';

  var _targetPanel = null;
  var _targetPanelId = null;
  var _currentActivity = null;

  var ActivityHandler = {
    _handle: function ah_handler(activity) {
      var name = activity.source.name;
      _currentActivity = activity;

      if (name === 'configure' && activity.source.data.section) {
        _targetPanelId = activity.source.data.section;
        _targetPanel = document.getElementById(_targetPanelId);

        // Validate if the section exists
        if (!_targetPanel || _targetPanel.tagName !== 'SECTION') {
          var msg = 'Trying to open an non-existent section: ' + _targetPanelId;
          console.warn(msg);
          activity.postError(msg);
          return;
        }

        // Apply the filter
        if (_targetPanelId === 'root') {
          var filterBy = activity.source.data.filterBy;
          if (filterBy) {
            document.body.dataset.filterBy = filterBy;
          }
        } else {
          // Mark the desired panel as a dialog
          _targetPanel.dataset.dialog = true;
        }
      } else {
        // If there isn't a section specified,
        // simply show ourselve without making ourselves a dialog.
        _targetPanelId = 'root';
      }

      // Post result when pressing home button
      document.addEventListener('visibilitychange', function change() {
        if (document.hidden) {
          document.removeEventListener('visibilitychange', change);
          // An activity can be closed either by pressing the 'X' button
          // or by a visibility change (i.e. home button or app switch).
          // Send a result to finish this activity
          _currentActivity.postResult(null);
        }
      });
    },

    get currentActivity() {
      return _currentActivity;
    },

    get targetPanelId() {
      return _targetPanelId;
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
        this._handle(activity);
        callback();
      }.bind(this));
    },

    postResult: function ah_postResult(result) {
      _currentActivity.postResult(result);
    }
  };

  exports.ActivityHandler = ActivityHandler;
})(this);
