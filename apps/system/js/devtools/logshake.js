/* global MozActivity, dump, ModalDialog */
(function(exports) {
  'use strict';
  /**
   * This developer system module captures a snapshot of the current device
   * logs as displayed by logcat using DeviceStorage to persist the file for
   * future access. It communicates with gecko code running in
   * b2g/chrome/content/shell.js using a SystemAppProxy custom event based API.
   * It requires the preference 'devtools.logshake' to be enabled
   *
   * @class LogShake
   */
  function LogShake() {
  }

  function debug(str) {
    dump('LogShake: ' + str + '\n');
  }

  LogShake.prototype = {
    /**
     * Start existing, observing for capture-logs events caused by Gecko
     * LogShake
     */
    start: function() {
      this.startCaptureLogsListener();
    },

    startCaptureLogsListener: function() {
      debug('starting captureLogs listener');
      window.addEventListener('capture-logs-start', this);
      window.addEventListener('capture-logs-success', this);
      window.addEventListener('capture-logs-error', this);
    },

    stopCaptureLogsListener: function() {
      debug('stopping captureLogs listener');
      window.removeEventListener('capture-logs-start', this);
      window.removeEventListener('capture-logs-success', this);
      window.removeEventListener('capture-logs-error', this);
    },

    /**
     * Handle a capture-logs-start, capture-logs-success or capture-logs-error
     * event, dispatching to the appropriate handler
     */
    handleEvent: function(event) {
      debug('handling event ' + event.type);
      switch(event.type) {
        case 'capture-logs-start':
          this.handleCaptureLogsStart(event);
          break;
        case 'capture-logs-success':
          this.handleCaptureLogsSuccess(event);
          break;
        case 'capture-logs-error':
          this.handleCaptureLogsError(event);
          break;
      }
    },

    handleCaptureLogsStart: function(event) {
      debug('handling capture-logs-start');
      this._notify('logsSaving', '');
    },

    /**
     * Handle an event of type capture-logs-success. event.detail.locations is
     * an array of absolute paths to the saved log files, and
     * event.detail.logFolder is the folder name where the logs are located.
     */
    handleCaptureLogsSuccess: function(event) {
      debug('handling capture-logs-success');
      navigator.vibrate(100);
      this._notify('logsSaved', event.detail.logPrefix, function() {
        var logFilenames = event.detail.logFilenames;
        var logFiles = [];

        var storage = navigator.getDeviceStorage('sdcard');

        var requestsRemaining = logFilenames.length;
        var self = this;

        function onSuccess() {
          /* jshint validthis: true */
          logFiles.push(this.result);
          requestsRemaining -= 1;
          if (requestsRemaining === 0) {
            var logNames = logFiles.map(function(file) {
              // For some reason file.name contains the full path despite
              // File's documentation explicitly stating that the opposite.
              var pathComponents = file.name.split('/');
              return pathComponents[pathComponents.length - 1];
            });
            /* jshint nonew: false */
            new MozActivity({
              name: 'new',
              data: {
                type: 'mail',
                blobs: logFiles,
                filenames: logNames
              }
            });
          }
        }

        function onError() {
          /* jshint validthis: true */
          self.handleCaptureLogsError({detail: {error: this.error}});
        }

        for (var logFilename of logFilenames) {
          var req = storage.get(logFilename);
          req.onsuccess = onSuccess;
          req.onerror = onError;
        }
      });
    },

    ERRNO_TO_MSG: {
       0: 'logsGenericError',
      30: 'logsSDCardMaybeShared' // errno: filesystem ro-mounted
    },

    handleCaptureLogsError: function(event) {
      debug('handling capture logs error');
      var error = '';
      if (event) {
        error = event.detail.error;
      }

      var moreInfos;
      if (typeof error === 'object') {
        // Small heuristic for some frequent unix error cases
        if ('operation' in error && 'unixErrno' in error) {
          var errno = error.unixErrno;
          debug('errno: ' + errno);

          // Gracefully fallback to a generic error messages if we don't know
          // this errno code.
          if (!this.ERRNO_TO_MSG[errno]) {
            errno = 0;
          }

          error = navigator.mozL10n.get('logsOperationFailed',
                                        { operation: error.operation });
          moreInfos = (function() {
            ModalDialog.alert('logsSaveError',
                              this.ERRNO_TO_MSG[errno], { title: 'ok' });
          }).bind(this);
        }
      }

      this._notify('logsSaveError', error, moreInfos);
    },

    _notify: function(titleId, body, onclick) {
      var title = navigator.mozL10n.get(titleId) || titleId;
      var notification =
        new window.Notification(title, {body: body, tag: 'logshake'});
      if (onclick) {
        notification.onclick = onclick;
      }
    },

    /**
     * Stop the component, removing all listeners if necessary
     */
    stop: function() {
      this.stopCaptureLogsListener();
    }
  };

  exports.LogShake = LogShake;

  // XXX: See issue described in screenshot.js
  exports.logshake = new LogShake();
  exports.logshake.start();
})(window);
