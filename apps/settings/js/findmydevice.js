/* global SettingsListener */
/* global loadJSON */

'use strict';

var FindMyDevice = {
  // When the FxA login callback is called, we need to know if the
  // login process began with the user clicking our login button
  // since in that case we also want to enable Find My Device
  _interactiveLogin: false,

  init: function fmd_init() {
    var self = this;

    loadJSON('/resources/findmydevice.json', function(data) {
      var api = data.api_url;

      navigator.mozId.watch({
        wantIssuer: 'firefox-accounts',
        audience: api,
        onlogin: self._onChangeLoginState.bind(self, true),
        onlogout: self._onChangeLoginState.bind(self, false),
        onready: function fmd_fxa_onready() {
          var loginButton = document.getElementById('findmydevice-login');
          loginButton.addEventListener('click', function() {
            self._interactiveLogin = true;
            navigator.mozId.request();
          });
        }
      });
    });

    SettingsListener.observe('findmydevice.enabled', false,
      this._setEnabled.bind(this));

    var checkbox = document.querySelector('#findmydevice-enabled input');
    checkbox.addEventListener('change', this._onCheckboxChanged.bind(this));
  },

  _setEnabled: function fmd_set_enabled(value) {
    var _ = navigator.mozL10n.get;

    var desc = document.getElementById('findmydevice-desc');
    desc.textContent = value ? _('enabled') : _('disabled');

    var checkbox = document.querySelector('#findmydevice-enabled input');
    checkbox.checked = value;
    checkbox.disabled = false;
  },

  _onChangeLoginState: function fmd_on_change_login_state(loggedIn) {
    console.log('settings, logged in: ' + loggedIn);

    var signin = document.getElementById('findmydevice-signin');
    signin.hidden = loggedIn;

    var settings = document.getElementById('findmydevice-settings');
    settings.hidden = !loggedIn;

    SettingsListener.getSettingsLock().set({
      'findmydevice.enabled': loggedIn && this._interactiveLogin
    });

    this._interactiveLogin = false;
  },

  _onCheckboxChanged: function fmd_on_checkbox_changed() {
      var checkbox = document.querySelector('#findmydevice-enabled input');

      SettingsListener.getSettingsLock().set({
        'findmydevice.enabled': checkbox.checked
      }).onerror = function() {
        checkbox.disabled = false;
      };

      checkbox.disabled = true;
  }
};

navigator.mozL10n.ready(FindMyDevice.init.bind(FindMyDevice));
