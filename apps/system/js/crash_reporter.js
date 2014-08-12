'use strict';

(function(exports) {
  var CrashReporter = function() {};

  var _ = navigator.mozL10n.get;
  var settings = navigator.mozSettings;
  var screen = document.getElementById('screen');

  // The name of the app that just crashed.
  var crashedAppName = '';

  // Whether or not to show a "Report" button in the banner.
  var showReportButton = false;

  // Only show the "Report" button if the user hasn't set a preference to
  // always/never report crashes.
  SettingsListener.observe('app.reportCrashes', 'ask',
      function handleCrashSetting(value) {
    showReportButton = (value != 'always' && value != 'never');
  });

  // This function should only ever be called once.
  function showDialog(crashID, isChrome) {
    var title = isChrome ? _('crash-dialog-os2') :
      _('crash-dialog-app', { name: crashedAppName });
    document.getElementById('crash-dialog-title').textContent = title;

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
      document.getElementById('crash-reports-close').
               addEventListener('click', function onDoneClick() {
        this.removeEventListener('click', onDoneClick);
        dialog.classList.remove('learn-more');
      });
      dialog.classList.add('learn-more');
    });

    screen.classList.add('crash-dialog');
  }

  // We can get rid of the dialog after it is shown once.
  function removeDialog() {
    screen.classList.remove('crash-dialog');
    var dialog = document.getElementById('crash-dialog');
    dialog.parentNode.removeChild(dialog);
  }

  function showBanner(crashID, isChrome) {
    var message = isChrome ? _('crash-banner-os2') :
      _('crash-banner-app', { name: crashedAppName });

    var button = null;
    if (showReportButton) {
      button = {
        label: _('crash-banner-report'),
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
    var dialogReq = settings.createLock().get('crashReporter.dialogShown');
    dialogReq.onsuccess = function dialogShownSuccess() {
      var dialogShown = dialogReq.result['crashReporter.dialogShown'];
      if (!dialogShown) {
        settings.createLock().set({'crashReporter.dialogShown': true});
        showDialog(crashID, isChrome);
      } else {
        showBanner(crashID, isChrome);
      }
    };
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

  window.addEventListener('appcrashed', handleAppCrash);
  window.addEventListener('activitycrashed', handleAppCrash);
  window.addEventListener('homescreencrashed', handleAppCrash);
  window.addEventListener('searchcrashed', handleAppCrash);

  function view() {
    return
      '<div id="crash-dialog">' +
        '<form role="dialog" class="generic-dialog" data-type="confirm">' +
          '<section id="crash-dialog-contents">' +
            '<h1 id="crash-dialog-title"></h1>' +
              '<p data-l10n-id="crash-dialog-message">Would you like to send Mozilla a report about the crash to help us fix the problem? (Reports are sent over Wi-Fi only)</p>' +
              '<p><a id="crash-info-link" data-l10n-id="crash-info-link">What's in a crash report?</a></p>' +
              '<p>' +
                '<input id="always-send" type="checkbox" checked="true"/>' +
                '<label for="always-send" data-l10n-id="crash-always-report">Always send Mozilla a report when a crash occurs.</label>' +
              '<p>' +
            '</section>' +
            '<menu data-items="2">' +
              '<button id="dont-send-report" disabled="true" data-l10n-id="crash-dont-send">Don't Send</button>' +
              '<button id="send-report" class="recommend" data-l10n-id="crash-end">Send Report</button>' +
            '</menu>' +
          '</form>' +
          '<section role="region" class="skin-dark">' +
            '<header>' +
              '<button id="crash-reports-close"><span class="icon icon-close">close</span></button>' +
              '<h1 data-l10n-id="crashReports">Crash Reports</h1>' +
            '</header>' +
            '<div>' +
              '<ul>' +
                '<li class="description" data-l10n-id="crash-reports-description-1">' +
                '<li class="description" data-l10n-id="crash-reports-description-2">This may include things like open pages and apps, text typed into forms and the content of open messages, recent browsing history, or geolocation used by an open app.</li>' +
                '<li class="description">' +
                  '<span data-l10n-id="crash-reports-description-3-start">We use crash reports to try to fix problems and improve our products. We handle your information as we describe in our </span><span data-l10n-id="crash-reports-description-3-privacy">privacy policy</span><span data-l10n-id="crash-reports-description-3-end">.</span>' +
                '</li>' +
              '</ul>' +
            '</div>' +
          '</section>' +
        '</div>';
  };
  exports.CrashReporter = CrashReporter;
}(window));

