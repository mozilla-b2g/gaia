/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

onLocalized(function() {
  var turnOnButton = document.getElementById('button-ok');
  var notNowButton = document.getElementById('button-canncel');
  turnOnButton.addEventListener('click', function(e) {
    var warningDisabled = true;
    window.opener.gDataConnect.setDataConnectionWarningState(warningDisabled);
    window.close();
  });
  notNowButton.addEventListener('click', function(e) {
    var warningDisabled = false;
    window.opener.gDataConnect.setDataConnectionWarningState(warningDisabled);
    window.opener.gDataConnect.setDataConnectionState(false);
    window.close();
  });
});


/**
 * Fire a callback when as soon as all l10n resources are ready and the UI has
 * been translated.
 * Note: this could be exposed as `navigator.mozL10n.onload'...
 */

function onLocalized(callback) {
  if (navigator.mozL10n.readyState == 'complete' ||
    navigator.mozL10n.readyState == 'interactive') {
    callback();
  } else {
    window.addEventListener('localized', callback);
  }
}
