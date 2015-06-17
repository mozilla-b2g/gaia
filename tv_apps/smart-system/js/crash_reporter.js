/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global SettingsCache, SystemBanner, focusManager */

'use strict';

// This file calls getElementById without waiting for an onload event, so it
// must have a defer attribute or be included at the end of the <body>.

window.CrashReporter = (function() {
  var settings = navigator.mozSettings;
  var screen = document.getElementById('screen');

  // The name of the app that just crashed.
  var crashedAppName = '';

  // Whether or not to show a "Report" button in the banner.
  var showReportButton = false;

  // Only show the "Report" button if the user hasn't set a preference to
  // always/never report crashes.
  SettingsCache.observe('app.reportCrashes', 'ask',
      function handleCrashSetting(value) {
    showReportButton = (value != 'always' && value != 'never');
  });

  // This function should only ever be called once.
  function showDialog(crashID, isChrome) {
    var title = isChrome ? {
      id: 'crash-dialog2-os',
      args: null
    } : {
      id: 'crash-dialog-app',
      args: { name: crashedAppName }
    };
    var crashDialogTitle = document.getElementById('crash-dialog-title');
    navigator.mozL10n.setAttributes(crashDialogTitle, title.id, title.args);

    // "Don't Send Report" button in dialog
    var noButton = document.getElementById('dont-send-report');
    noButton.addEventListener('click', function onNoButtonClick() {
      settings.createLock().set({'app.reportCrashes': 'never'});
      removeDialog();
    });

    // "Send Report" button in dialog
    var yesButton = document.getElementById('send-report');
    yesButton.addEventListener('click', function onYesButtonClick() {
      submitCrash(crashID);
      if (checkbox.checked) {
        settings.createLock().set({'app.reportCrashes': 'always'});
      }
      removeDialog();
    });

    var checkbox = document.getElementById('always-send');
    checkbox.addEventListener('click', function onCheckboxClick() {
      // Disable the "Don't Send Report" button if the "Always send..."
      // checkbox is checked
      noButton.disabled = this.checked;
    });

    // "What's in a crash report?" link
    var crashInfoLink = document.getElementById('crash-info-link');
    crashInfoLink.addEventListener('click', function onLearnMoreClick() {
      var dialog = document.getElementById('crash-dialog');
      document.getElementById('crash-reports-header')
              .addEventListener('action', function onAction() {
        this.removeEventListener('click', onAction);
        dialog.classList.remove('learn-more');
        focusManager.focus();
      });
      dialog.classList.add('learn-more');
      focusManager.focus();
    });

    screen.classList.add('crash-dialog');
  }

  // We can get rid of the dialog after it is shown once.
  function removeDialog() {
    screen.classList.remove('crash-dialog');
    var dialog = document.getElementById('crash-dialog');
    dialog.parentNode.removeChild(dialog);
    focusManager.removeUI(window.CrashReporter);
    focusManager.focus();
  }

  function showBanner(crashID, isChrome) {
    var message = isChrome ? {
      id: 'crash-banner-os2',
      args: null
    } : {
      id: 'crash-banner-app',
      args: { name: crashedAppName }
    };

    var button = null;
    if (showReportButton) {
      button = {
        labelL10nId: 'crash-banner-report',
        callback: function reportCrash() {
          submitCrash(crashID);
        },
        dismiss: function dismissCrash() {
          deleteCrash(crashID);
        }
      };
    }

    var systemBanner = new SystemBanner();
    systemBanner.show(message, button);
  }

  function deleteCrash(crashID) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, {
      type: 'delete-crash',
      crashID: crashID
    });
    window.dispatchEvent(event);
  }

  function submitCrash(crashID) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, {
      type: 'submit-crash',
      crashID: crashID
    });
    window.dispatchEvent(event);
  }

  // - Show a dialog only the first time there's a crash to report.
  // - On subsequent crashes, show a banner letting the user know there was a
  //   crash.
  // - If the user hasn't set a pref, add a "Report" button to the banner.
  function handleCrash(crashID, isChrome) {
    // Check to see if we should show a dialog.
    SettingsCache.get('crashReporter.dialogShown',
      function dialogShownSuccess(value) {
        var dialogShown = value;
        if (!dialogShown) {
          settings.createLock().set({'crashReporter.dialogShown': true});
          showDialog(crashID, isChrome);
        } else {
          showBanner(crashID, isChrome);
        }
        focusManager.focus();
      });
  }

  // We depend on window_manager.js calling this function before
  // we get a 'handle-crash' event from shell.js
  function setAppName(name) {
    crashedAppName = name;
  }

  // We will be notified of system crashes from shell.js
  window.addEventListener('mozChromeEvent', function handleChromeEvent(e) {
    if (e.detail.type == 'handle-crash') {
      handleCrash(e.detail.crashID, e.detail.chrome);
    }
  });

  function handleAppCrash(e) {
    var app = e.detail;
    // Only show crash reporter when the crashed app is active.
    if (app.isActive()) {
      setAppName(app.name);
    }
  }

  /**
   * Determine whether there is crash-dialog or system banner focusable.
   */
  function isFocusable() {
    return document.getElementById('crash-dialog') &&
           screen.classList.contains('crash-dialog');
  }

  /**
   * Return parent container of crash report
   */
  function getElement() {
    var dialog = document.getElementById('crash-dialog');
    if (isFocusable()) {
      return dialog;
    }
  }

  /**
   * Focus send-report button if dialog is visible. If crash-reports-header is
   * also visible, focus the actionButton in crash-reports-header
   */
  function focus() {
    var dialog = document.getElementById('crash-dialog');
    var dialogButton = document.getElementById('send-report');
    if (isFocusable() && dialogButton) {
      document.activeElement.blur();
      if (dialog.classList.contains('learn-more')) {
        document.getElementById('crash-reports-header').els.actionButton
          .focus();
      } else {
        dialogButton.focus();
      }
    }
  }

  window.addEventListener('appcrashed', handleAppCrash);
  window.addEventListener('activitycrashed', handleAppCrash);
  window.addEventListener('homescreencrashed', handleAppCrash);
  window.addEventListener('searchcrashed', handleAppCrash);

  return {
    setAppName: setAppName,
    isFocusable: isFocusable,
    getElement: getElement,
    focus: focus
  };
})();
focusManager.addUI(window.CrashReporter);

