/* exported ActivityHandler */
/**
 * ActivityHandler handles activity requests and parse the information from the
 * request including section name and filter.
 *
 * @module js/activity_handler
 */
(function(exports) {
  'use strict';

  var ActivityHandler = {
    /**
     * A promise indicating whether the module has received the activity
     * request.
     *
     * @access private
     * @memberOf ActivityHandler
     * @type {Promise}
     */
    _readyPromise: null,

    /**
     * The target panel id retrieved from the activity request.
     *
     * @access private
     * @memberOf ActivityHandler
     * @type {String}
     */
    _targetPanelId: null,

    /**
     * Possible target panel options retrieved from the activity request.
     *
     * @access private
     * @memberOf ActivityHandler
     * @type {Object}
     */
    _targetPanelOptions: null,

    /**
     * The activity object received from the message handler.
     *
     * @access private
     * @memberOf ActivityHandler
     * @type {Object}
     */
    _currentActivity: null,

    /**
     * An object that defines functions for handling different type of
     * activities. The handling function must return the target panel id for
     * handling the activity.
     *
     * @access private
     * @memberOf ActivityHandler
     * @type {Object}
     */
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
        } else if (targetPanelId === 'call') {
          var mozMobileConnections = navigator.mozMobileConnections;
          // If DSDS phone, we have to let users choose simcard
          if (mozMobileConnections && mozMobileConnections.length > 1) {
            targetPanelId = 'call-iccs';
          }
        } else {
          // Mark the desired panel as a dialog
          targetPanel.dataset.dialog = true;
        }

        return {
          targetPanelId: targetPanelId,
          options: activitySource.data.options
        };
      }
    },

    /**
     * It calls to corresponding handlers based on the activity name. It should
     * also set the target panel id and, optionally, target panel options.
     *
     * @access private
     * @memberOf ActivityHandler
     * @param {Object} activitySource
     *                 The source object in an activity.
     */
    _handleActivity: function ah_handler(activitySource) {
      var handle = this._handlers[activitySource.name];
      if (handle) {
        var {targetPanelId, options} = handle(activitySource);
        this._targetPanelId = targetPanelId;
        this._targetPanelOptions = options;
      }
    },

    /**
     * It registers a handler for visibility changes so that the activity can
     * be completed when users press on the home button.
     *
     * @access private
     * @memberOf ActivityHandler
     */
    _registerListener: function ah_registerListener() {
      // Post result when pressing home button
      document.addEventListener('visibilitychange', function change() {
        if (document.hidden) {
          document.removeEventListener('visibilitychange', change);
          // An activity can be closed either by pressing the 'X' button
          // or by a visibility change (i.e. home button or app switch).
          // Send a result to finish this activity
          if (this._currentActivity) {
            this._currentActivity.postResult(null);
          }
        }
      }.bind(this));
    },

    /**
     * It returns the id of the target panel that can handle the activity.
     *
     * @access public
     * @memberOf ActivityHandler
     * @returns {String}
     */
    get targetPanelId() {
      return this._targetPanelId;
    },

    /**
     * Returns possible target panel options needed to handle the activity.
     *
     * @access public
     * @memberOf ActivityHandler
     * @returns {Object}
     */
    get targetPanelOptions() {
      return this._targetPanelOptions;
    },

    /**
     * It waits for the system message of an activity and initializes all
     * properties by parsing the information in an activity.
     *
     * @access public
     * @memberOf ActivityHandler
     * @returns {Promise}
     */
    ready: function ah_ready() {
      if (!this._readyPromise) {
        var that = this;
        this._readyPromise = new Promise(function(resolve) {
          navigator.mozSetMessageHandler('activity', function(activity) {
            that._currentActivity = activity;
            that._handleActivity(that._currentActivity.source);
            that._registerListener();
            resolve();
          });
        });
      }
      return this._readyPromise;
    },

    /**
     * It sends the result back to the caller of the activity and finishes the
     * activity.
     *
     * @access public
     * @memberOf ActivityHandler
     * @param {Object} result
     *                 The result to be sent back to the caller.
     * @returns {Promise}
     */
    postResult: function ah_postResult(result) {
      return this.ready().then(function() {
        if (this._currentActivity) {
          this._currentActivity.postResult(result);
        }
      }.bind(this));
    }
  };

  exports.ActivityHandler = ActivityHandler;
})(window);
