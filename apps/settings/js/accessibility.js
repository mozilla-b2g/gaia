/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals Settings */

'use strict';

// handle Accessibility settings
navigator.mozL10n.once(function accessibilitySettings() {
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
      document.querySelector('#screenreader-confirm-dialog h1').
        setAttribute('data-l10n-id',
                     'screenReader-confirm-title-' + startOrStop);
      document.querySelector('#screenreader-confirm-dialog p').
        setAttribute('data-l10n-id',
                    'screenReader-confirm-description-' + startOrStop);
      button.setAttribute('data-l10n-id',
                          'screenReader-confirm-button-' + startOrStop);
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
