/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('load', function() {
  var mobileConnection = window.navigator.mozMobileConnections &&
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
