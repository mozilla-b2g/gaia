/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// This file calls getElementById without waiting for an onload event, so it
// must have a defer attribute or be included at the end of the <body>.

var CrashReporter = (function() {
  var _ = navigator.mozL10n.get;
  var settings = navigator.mozSettings;
  var screen = document.getElementById('screen');

  // This function should only ever be called once.
  function showDialog(aCrashID) {
    //XXX Use an app-specific title when an app crashed (bug 801810)
    document.getElementById('crash-dialog-title').textContent =
      _('crash-dialog-title');

    // "Don't Send Report" button in dialog
    var noButton = document.getElementById('dont-send-report');
    noButton.addEventListener('click', function onNoButtonClick() {
      settings.createLock().set({'app.reportCrashes': 'never'});
      removeDialog();
    }, false);

    // "Send Report" button in dialog
    var yesButton = document.getElementById('send-report');
    yesButton.addEventListener('click', function onYesButtonClick() {
      submitCrash(aCrashID);
      if (checkbox.checked) {
        settings.createLock().set({'app.reportCrashes': 'always'});
      }
      removeDialog();
    }, false);

    var checkbox = document.getElementById('always-send');
    checkbox.addEventListener('click', function onCheckboxClick() {
      // Disable the "Don't Send Report" button if the "Always send..."
      // checkbox is checked
      noButton.disabled = this.checked;
    }, false);

    // "What's in a crash report?" link
    var crashInfoLink = document.getElementById('crash-info-link');
    crashInfoLink.addEventListener('click', function onLearnMoreClick() {
      //XXX Show a "Crash Reports" information page (bug 801938)
    }, false);

    screen.classList.add('crash-dialog');
  }

  // We can get rid of the dialog after it is shown once.
  function removeDialog() {
    screen.classList.remove('crash-dialog');
    var dialog = document.getElementById('crash-dialog');
    dialog.parentNode.removeChild(dialog);
  }

  function submitCrash(aCrashID) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, {
      type: 'submit-crash',
      crashID: aCrashID
    });
    window.dispatchEvent(event);
  };

  window.addEventListener('mozChromeEvent', function(e) {
    switch (e.detail.type) {
      case 'crash-dialog':
        showDialog(e.detail.crashID);
        break;

      case 'crash-banner':
        //XXX Show an informational banner (bug 801925)
        break;
    }
  });

})();
