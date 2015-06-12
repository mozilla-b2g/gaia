/* global dump,
          ModalDialog,
          MozActivity,
          Notification,
          Service
*/

(function(exports) {
  'use strict';

  const DEBUG = false;

  /**
   * This developer system module captures a snapshot of the current device
   * logs as displayed by logcat using DeviceStorage to persist the file for
   * future access. It communicates with gecko code running in
   * b2g/chrome/content/shell.js using a SystemAppProxy custom event based API.
   * It requires the preference 'devtools.logshake.enabled' to be enabled
   *
   * @class LogShake
   */
  function LogShake() {
  }

  function debug(str) {
    if (DEBUG) {
      dump('LogShake: ' + str + '\n');
    }
  }

  LogShake.prototype = {
    /**
     * Start existing, observing for capture-logs events caused by Gecko
     * LogShake
     */
    start: function() {
      Service.request('handleSystemMessageNotification', 'logshake', this);
      window.addEventListener('volumeup+volumedown', this);
      this.startCaptureLogsListener();
    },

    /**
     * Stop the component, removing all listeners if necessary
     */
    stop: function() {
      Service.request('unhandleSystemMessageNotification', 'logshake', this);
      this.stopCaptureLogsListener();
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
        case 'volumeup+volumedown':
          this.requestSystemLogs();
          break;
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

    _shakeId: null,
    handleCaptureLogsStart: function(event) {
      debug('handling capture-logs-start');
      this._shakeId = Date.now();
      this._notify('logsSaving', '');
    },

    requestSystemLogs: function() {
      window.dispatchEvent(new CustomEvent('requestSystemLogs'));
    },

    /**
     * Handle an event of type capture-logs-success where event.detail.logPaths
     * is an array of absolute paths to the saved log files.
     */
    handleCaptureLogsSuccess: function(event) {
      debug('handling capture-logs-success');
      navigator.vibrate(100);
      this._notify('logsSavedHeader', 'logsSavedBody',
                   this.triggerShareLogs.bind(this, event.detail.logPaths),
                   event.detail);
      this._shakeId = null;
    },

    handleCaptureLogsError: function(event) {
      debug('handling capture logs error');
      var error    = event ? event.detail.error : '';
      var errorMsg = this.formatError(error);
      this._notify('logsSaveError', errorMsg,
                   this.showErrorMessage.bind(this, error),
                   event.detail);
      this._shakeId = null;
    },

    getDeviceStorage: function() {
      var storageName = 'sdcard';
      var storages = navigator.getDeviceStorages(storageName);
      for (var i = 0; i < storages.length; i++) {
        if (storages[i].storageName === storageName) {
          return storages[i];
        }
      }
      return navigator.getDeviceStorage('sdcard');
    },

    triggerShareLogs: function(logPaths, notif) {
      var logFiles = [];
      var storage = this.getDeviceStorage();
      var requestsRemaining = logPaths.length;
      var self = this;

      function onSuccess() {
        /* jshint validthis: true */
        logFiles.push(this.result);
        requestsRemaining -= 1;
        if (requestsRemaining === 0) {
          var logNames = logFiles.map(function(file) {
            // For some reason file.name contains the full path despite
            // File's documentation explicitly stating the opposite.
            var pathComponents = file.name.split('/');
            return pathComponents[pathComponents.length - 1];
          });

          var activity = new MozActivity({
            name: 'share',
            data: {
              type: 'application/vnd.moz-systemlog',
              blobs: logFiles,
              filenames: logNames
            }
          });

          activity.onsuccess = function() {
            if (!notif) {
              return;
            }

            if ('close' in notif) {
              notif.close();
            } else {
              self.closeSystemMessageNotification(notif);
            }
          };
        }
      }

      function onError() {
        /* jshint validthis: true */
        self.handleCaptureLogsError({detail: {error: this.error}});
      }

      for (var logPath of logPaths) {
        var req = storage.get(logPath);
        req.onsuccess = onSuccess;
        req.onerror = onError;
      }
    },

    ERRNO_TO_MSG: {
       0: 'logsGenericError',
      30: 'logsSDCardMaybeShared' // errno: filesystem ro-mounted
    },

    formatError: function(error) {
      if (typeof error === 'string') {
        return error;
      }

      if (typeof error === 'object') {
        if ('operation' in error) {
          return navigator.mozL10n.get('logsOperationFailed',
                                       { operation: error.operation });
        }
      }

      return '';
    },

    showErrorMessage: function(error, notif) {
      if (notif) {
        notif.close();
      }

      // Do nothing for error string
      if (typeof error === 'string') {
        return;
      }

      if (typeof error !== 'object') {
        console.warn('Unexpected error type: ' + typeof error);
        return;
      }

      // Small heuristic for some frequent unix error cases
      if ('unixErrno' in error) {
        var errno = error.unixErrno;
        debug('errno: ' + errno);

        // Gracefully fallback to a generic error messages if we don't know
        // this errno code.
        if (!this.ERRNO_TO_MSG[errno]) {
          errno = 0;
        }

        ModalDialog.alert('logsSaveError',
                          this.ERRNO_TO_MSG[errno], { title: 'ok' });
      }
    },

    _notify: function(titleId, body, onclick, dataPayload) {
      var title = navigator.mozL10n.get(titleId) || titleId;
      var payload = {
        body: navigator.mozL10n.get(body) || body,
        icon: '/style/notifications/images/bug.png',
        tag: 'logshake:' + this._shakeId,
        data: {
          systemMessageTarget: 'logshake',
          logshakePayload: dataPayload || undefined
        }
      };
      var notification = new Notification(title, payload);
      if (onclick) {
        notification.onclick = onclick.bind(this, notification);
      }
    },

    handleSystemMessageNotification: function(message) {
      debug('Received system message: ' + JSON.stringify(message));

      if (!('logshakePayload' in message.data)) {
        console.warn('Received logshake system message notification without ' +
                     'payload, silently discarding.');
        return;
      }

      debug('Message payload: ' + message.data.logshakePayload);
      var payload = message.data.logshakePayload;
      if ('error' in payload) {
        this.showErrorMessage(payload.error);
      } else if ('logPaths' in payload) {
        this.triggerShareLogs(payload.logPaths, message);
      } else {
        console.warn('Unidentified payload: ' + JSON.stringify(payload));
      }

    },

    closeSystemMessageNotification: function(msg) {
      Notification.get({ tag: msg.tag }).then(notifs => {
        notifs.forEach(notif => {
          if (notif.tag) {
            // Close notification with the matching tag
            if (notif.tag === msg.tag) {
              notif.close && notif.close();
            }
          }
        });
      });
    }
  };

  exports.LogShake = LogShake;

  // XXX: See issue described in screenshot.js
  exports.logshake = new LogShake();
  exports.logshake.start();
})(window);
