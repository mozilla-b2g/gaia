'use strict';

var fb = window.fb || {};
var Sync = fb.sync || {};
fb.sync = Sync;

(function() {
  var Alarm = Sync.alarm = {};

  var ALARM_ID_KEY = fb.utils.ALARM_ID_KEY;
  var isSyncOngoing = false;
  var _ = navigator.mozL10n.get;

  // This is the amount of hours to wait to retry a sync operation
  var DEFAULT_RETRY_PERIOD = 1;
  // Retry period after timeout (15 minutes)
  var RETRY_PERIOD_TIMEOUT = 0.25;
  // Delay in closing the window
  var CLOSE_DELAY = 5000;
  var FB_TRAY_ICON = '/contacts/style/images/f_logo.png';
  var FB_SYNC_ERROR_PARAM = 'isSyncError';

  Alarm.init = function() {
    fb.init(function fb_alarm_init() {
      if (navigator.mozHasPendingMessage('alarm')) {
        fb.sync.debug('Alarm System Message Received!!!!!');
        navigator.mozSetMessageHandler('alarm', handleAlarm);
      }
      // Workaround for Gecko Bug. mozHasPendingMessage does not work
      // https://bugzilla.mozilla.org/show_bug.cgi?id=802876
      else if (parent.location === window.location) {
        fb.sync.debug('Fb Sync woke up. Alarm ok. mozHasPendingMsg failed');
        // Unfortunately this does not also work
        // navigator.mozSetMessageHandler('alarm', handleAlarm);
        window.setTimeout(function() {
          handleAlarm({
            data: {
              sync: true
            }
          });
        },0);
      }
      else {
        setNextAlarm(true, fb.syncPeriod);
      }
    }); // fb.init
  }; // Alarm.init

  function syncSuccess() {
    fb.sync.debug('Sync finished ok at ', new Date());
    isSyncOngoing = false;

    setNextAlarm(false, fb.syncPeriod, function() {
      closeApp();
    });
  } // syncSuccess function

  function syncError(error) {
    isSyncOngoing = false;
    var theError = error;

    if (!theError || theError.name === 'undefined') {
      theError = {
        name: 'defaultError'
      };
    }

    switch (theError.name) {
      case 'invalidToken':
        fb.sync.debug('Invalid token!!!. Notifying the user');
        // A new alarm is not set. It will be set once the user
        // logs in Facebook one more time
        showNotification({
          title: _('facebook'),
          body: _('notificationLogin'),
          iconURL: FB_TRAY_ICON + '?' + FB_SYNC_ERROR_PARAM + '=1',
          callback: handleInvalidToken
        });
      break;

      case 'timeout':
        fb.sync.debug('Timeout in sync. Next sync scheduled in 15 minutes');
        scheduleAt(RETRY_PERIOD_TIMEOUT, closeApp);
      break;

      case 'defaultError':
        window.console.error('Error reported in synchronization: ',
                             JSON.stringify(theError));
        showNotification({
          title: _('facebook'),
          body: _('syncError'),
          iconURL: FB_TRAY_ICON + '?' + FB_SYNC_ERROR_PARAM + '=1',
          callback: function() {
            scheduleAt(fb.syncPeriod, closeApp);
          }
        });
      break;
    }
  } // syncError function


  function handleAlarm(message) {
    // First is checked if this is a sync alarm
    if (message.data && message.data.sync === true &&
                  isSyncOngoing === false && navigator.onLine === true) {
      isSyncOngoing = true;
      fb.sync.debug('Starting sync at: ', new Date());

      ackAlarm(function alarm_process() {
        fb.sync.start({
          success: syncSuccess,
          error: syncError
        });
      });
    }
    else if (isSyncOngoing === true) {
      fb.sync.debug('There is an ongoing synchronization. Trying it later');
      scheduleAt(DEFAULT_RETRY_PERIOD, closeApp);
    }
    else if (navigator.onLine === false) {
      fb.sync.debug('Navigator is not online. Setting an alarm for next hour');
      scheduleAt(DEFAULT_RETRY_PERIOD, closeApp);
    }
    else {
      fb.sync.debug('Alarm message but apparently was not a sync message');
      closeApp();
    }
  }

  function alarmSetErrorCb(notifyParent, e) {
    if (notifyParent) {
      window.setTimeout(function() {
        parent.fb.sync.onAlarmError(e.target.error);
      },0);
    }
    else {
          window.console.error('<<FBSync>> Error while setting next alarm: ',
                               e.target.error.name);
    }
  }

  function scheduleAt(hours, callback) {
    var nextUpdate = Date.now() + hours * 60 * 60 * 1000;
    var scheduledDate = new Date(nextUpdate);

    fb.sync.debug('Forcing scheduling an alarm at: ', scheduledDate);

    var req = addAlarm(scheduledDate);

    req.onsuccess = function() {
      fb.sync.debug('--> Next Sync forced to happen at: ', scheduledDate);

      if (typeof callback === 'function') {
        callback();
      }
    };

    req.onerror = function(e) {
      alarmSetErrorCb(false, e);
    };
  }

  function ackAlarm(callback) {
    // The next alarmid is removed
    // Continuation is enabled even if we cannot remove the id
    window.asyncStorage.removeItem(ALARM_ID_KEY, callback, callback);
  }

  // Adds an alarm at the specified datetime ensuring any existing alarm
  // it is removed and ensuring the id is stored on the asyncStorage
  function addAlarm(at) {
    var outReq = new fb.utils.Request();

    window.setTimeout(function do_add_alarm() {
      window.asyncStorage.getItem(ALARM_ID_KEY, function set_alarm(id) {
        if (id) {
          navigator.mozAlarms.remove(Number(id));
        }

        var req = navigator.mozAlarms.add(at, 'honorTimezone', {
          sync: true
        });
        // Setting the new alarm
        req.onsuccess = function() {
          window.asyncStorage.setItem(ALARM_ID_KEY, String(req.result),
          function success_store() {
            outReq.done(req.result);
          },
          function error_store(e) {
            var errorParam = {
              target: {
                error: e || {
                  name: 'AsyncStorageError'
                }
              }
            };
            outReq.failed(errorParam);
          });
        };

        req.onerror = function(e) {
          outReq.failed(e);
        };
      });
    }, 0);

    return outReq;
  }

  function setNextAlarm(notifyParent, hours, callback) {
    fb.utils.getLastUpdate(function(timestamp) {
      var nextUpdate = timestamp + hours * 60 * 60 * 1000;
      var scheduledDate = new Date(nextUpdate);

      fb.sync.debug('Going to set a new alarm at: ', scheduledDate);

      var req = addAlarm(scheduledDate);
      req.onsuccess = function() {
        if (notifyParent === true) {
          window.setTimeout(function() {
            parent.fb.sync.onAlarmScheduled(scheduledDate);
          },0);
        }

        fb.sync.debug('--> Next Sync will happen at: ', scheduledDate);

        if (typeof callback === 'function') {
          callback();
        }
      };
      req.onerror = function(e) {
        alarmSetErrorCb(notifyParent, e);
      };

    }); // Get last update
  } // doSetNextAlarm

  function showNotification(params) {
    navigator.mozApps.getSelf().onsuccess = function(evt) {
      var app = evt.target.result;
      var iconURL = app.installOrigin + params.iconURL;
      NotificationHelper.send(params.title, params.body, iconURL);

      if (typeof params.callback === 'function') {
        params.callback();
      }
    };
  }

  function closeApp() {
    // Wait some seconds to avoid any kind of race condition or console error
    window.setTimeout(window.close, CLOSE_DELAY);
  }

  function handleInvalidToken() {
    // TODO: Reset token and other stuff in order to better inform the user
    closeApp();
  }

  // Everything starts
  Alarm.init();

})();
