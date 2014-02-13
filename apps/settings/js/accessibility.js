/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals Settings */

'use strict';

// handle Accessibility settings
navigator.mozL10n.ready(function accessibilitySettings() {
  var l10n = navigator.mozL10n;
  var settings = Settings.mozSettings;
  var gScreenreaderCheckbox =
    document.querySelector('#screenreader-enable input');
  var confirmDlg = {
    show: function (start) {
      console.log('show', start);
      var container = document.getElementById('screenreader-confirm-dialog');
      var button =
        document.getElementById('screenreader-confirm-dialog-button');
      container.onclick = function() {
        container.hidden = true;
      };
      button.onclick = function() {
        settings.createLock().set({ 'accessibility.screenreader': start });
      };
      var startOrStop = start ? 'start' : 'stop';
      l10n.localize(document.querySelector('#screenreader-confirm-dialog h1'),
                    'screenReader-confirm-title-' + startOrStop);
      l10n.localize(document.querySelector('#screenreader-confirm-dialog p'),
                    'screenReader-confirm-description-' + startOrStop);
      l10n.localize(button, 'screenReader-confirm-button-' + startOrStop);
      container.hidden = false;
    }
  };

  gScreenreaderCheckbox.onclick = function toggleScreenreader(event) {
    var req = settings.createLock().get('accessibility.screenreader');
    req.onsuccess = function bt_getSettingsSuccess() {
      confirmDlg.show(!req.result['accessibility.screenreader']);
    };

    event.preventDefault();
  };

  var req = settings.createLock().get('accessibility.screenreader');
  req.onsuccess = function bt_getSettingsSuccess() {
    gScreenreaderCheckbox.checked = req.result['accessibility.screenreader'];
  };

  settings.addObserver('accessibility.screenreader', function(event) {
    console.log('accessibility.screenreader', event);
    gScreenreaderCheckbox.checked = event.settingValue;
  });

});
