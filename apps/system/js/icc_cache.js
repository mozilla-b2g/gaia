/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {
  /**
   * Constants
   */
  var DEBUG = false;

  /**
   * Debug method
   */
  function debug(msg, optObject) {
    if (DEBUG) {
      var output = '[DEBUG] STKCACHE: ' + msg;
      if (optObject) {
        output += JSON.stringify(optObject);
      }
      console.log(output);
    }
  }

  if (!window.navigator.mozMobileConnection) {
    return;
  }

  // See bug 859712
  // To have the backward compatibility for bug 859220.
  // If we could not get iccManager from navigator,
  // try to get it from mozMobileConnection.
  // 'window.navigator.mozMobileConnection.icc' can be dropped
  // after bug 859220 is landed.
  var icc = window.navigator.mozIccManager ||
            window.navigator.mozMobileConnection.icc;

  // Remove previous menu
  var resetApplications = window.navigator.mozSettings.createLock().set({
    'icc.applications': '{}'
  });
  resetApplications.onsuccess = function icc_resetApplications() {
    debug('STK Cache Reseted');
    // Register to receive STK commands
    window.navigator.mozSetMessageHandler('icc-stkcommand',
      function handleSTKCommand(command) {
        debug('STK Proactive Command:', command);
        if (command.typeOfCommand == icc.STK_CMD_SET_UP_MENU) {
          debug('STK_CMD_SET_UP_MENU:', command.options);
          var reqApplications = window.navigator.mozSettings.createLock().set({
            'icc.applications': JSON.stringify(command.options)
          });
          reqApplications.onsuccess = function icc_getApplications() {
            debug('Cached');
            icc.sendStkResponse(command, {
              resultCode: icc.STK_RESULT_OK
            });
          };
        } else {
          // Unsolicited command? -> Open settings
          debug('CMD: ', command);
          var application = document.location.protocol + '//' +
            document.location.host.replace('system', 'settings');
          debug('application: ', application);
          var reqIccData = window.navigator.mozSettings.createLock().set({
            'icc.data': JSON.stringify(command)
          });
          reqIccData.onsuccess = function icc_getIccData() {
            if (WindowManager.getRunningApps()[application]) {
              debug('Settings is running. Ignoring');
              return;   // If settings is opened, we don't manage it
            }

            function launchSettings() {
              debug('Locating settings . . .');
              navigator.mozApps.mgmt.getAll().onsuccess =
              function gotApps(evt) {
                var apps = evt.target.result;
                apps.forEach(function appIterator(app) {
                  if (app.origin != application)
                    return;
                  debug('Launching ', app.origin);
                  app.launch();
                }, this);
              };
            }
            if (FtuLauncher.isFtuRunning()) {
              // Delay the stk command until FTU is done
              window.addEventListener('ftudone', function ftudone() {
                debug('ftu is done!');
                launchSettings();
              });
            } else {
              launchSettings();
            }
          };
        }
      });
  };
})();
