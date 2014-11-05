/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('load', function() {

  // XXX: check bug-926169
  // this is used to keep all tests passing while introducing multi-sim APIs
  var mobileConnection = navigator.mozMobileConnection ||
    window.navigator.mozMobileConnections &&
      window.navigator.mozMobileConnections[0];

  if (!mobileConnection)
    return;

  mobileConnection.addEventListener('otastatuschange', function(status) {
    // To UI
    document.getElementById('status').value = status;

    // To logcat
    dump('###################### OTA Status Changed ######################\n');
    dump('Status: ' + status + '\n');
    dump('################################################################\n');
  });
});
