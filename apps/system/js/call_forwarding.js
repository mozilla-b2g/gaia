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

  // XXX: check bug-926169
  // this is used to keep all tests passing while introducing multi-sim APIs
  var mobileConnection = window.navigator.mozMobileConnection ||
    window.navigator.mozMobileConnections &&
      window.navigator.mozMobileConnections[0];

  if (!mobileConnection) {
    return;
  }
  if (!IccHelper) {
    return;
  }

  // Initialize the icon based on the card state and whether
  // it is in airplane mode
  var _cfIconStateInitialized = false;
  function initCallForwardingIconState() {
    var cardState = IccHelper.cardState;
    if (_cfIconStateInitialized || cardState !== 'ready')
      return;

    if (!IccHelper.iccInfo)
      return;

    var iccid = IccHelper.iccInfo.iccid;
    if (!iccid)
      return;

    asyncStorage.getItem('ril.cf.enabled.' + iccid, function(value) {
      if (value === null) {
        value = false;
      }
      settings.createLock().set({'ril.cf.enabled': value});
      _cfIconStateInitialized = true;
    });
  }

  settings.createLock().set({'ril.cf.enabled': false});

  initCallForwardingIconState();
  IccHelper.addEventListener('cardstatechange', function() {
    initCallForwardingIconState();
  });
  IccHelper.addEventListener('iccinfochange', function() {
    initCallForwardingIconState();
  });

  mobileConnection.addEventListener('cfstatechange', function(event) {
    if (event &&
        event.reason == _cfReason.CALL_FORWARD_REASON_UNCONDITIONAL) {
      var enabled = false;
      if (event.success &&
          (event.action == _cfAction.CALL_FORWARD_ACTION_REGISTRATION ||
           event.action == _cfAction.CALL_FORWARD_ACTION_ENABLE)) {
        enabled = true;
      }
      settings.createLock().set({'ril.cf.enabled': enabled});
      asyncStorage.setItem('ril.cf.enabled.' + IccHelper.iccInfo.iccid,
        enabled);
    }
  });

  settings.addObserver('ril.cf.carrier.enabled', function(event) {
    var showIcon = event.settingValue;
    settings.createLock().set({'ril.cf.enabled': showIcon});
    asyncStorage.setItem('ril.cf.enabled.' + IccHelper.iccInfo.iccid,
    showIcon);
  });
})();
