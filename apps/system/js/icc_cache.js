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

  var icc = window.navigator.mozMobileConnection.icc;
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
        }
      }
    });
})();
