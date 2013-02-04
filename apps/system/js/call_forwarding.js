/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {

  // Must be in sync with nsIDOMMozMobileCFInfo interface.
  var _cfReason = {
    CALL_FORWARD_REASON_UNCONDITIONAL: 0,
    CALL_FORWARD_REASON_MOBILE_BUSY: 1,
    CALL_FORWARD_REASON_NO_REPLY: 2,
    CALL_FORWARD_REASON_NOT_REACHABLE: 3
  };
  var _cfAction = {
    CALL_FORWARD_ACTION_DISABLE: 0,
    CALL_FORWARD_ACTION_ENABLE: 1,
    CALL_FORWARD_ACTION_QUERY_STATUS: 2,
    CALL_FORWARD_ACTION_REGISTRATION: 3,
    CALL_FORWARD_ACTION_ERASURE: 4
  };

  var settings = window.navigator.mozSettings;
  if (!settings) {
    return;
  }
  var mobileconnection = window.navigator.mozMobileConnection;
  if (!mobileconnection) {
    return;
  }

  mobileconnection.addEventListener('cfstatechange', function(event) {
    if (event &&
        event.reason == _cfReason.CALL_FORWARD_REASON_UNCONDITIONAL) {
      var enabled = false;
      if (event.success &&
          (event.action == _cfAction.CALL_FORWARD_ACTION_REGISTRATION ||
           event.action == _cfAction.CALL_FORWARD_ACTION_ENABLE)) {
        enabled = true;
      }
      settings.createLock().set({'ril.cf.enabled': enabled});
    }
  });

})();
