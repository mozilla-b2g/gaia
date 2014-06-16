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
    var loginButton = document.getElementById('findmydevice-login');

    loadJSON('/resources/findmydevice.json', function(data) {
      var api = data.api_url;

      // Note: either onready or onerror will always fire immediately.
      navigator.mozId.watch({
        wantIssuer: 'firefox-accounts',
        audience: api,
        onlogin: self._onChangeLoginState.bind(self, true),
        onlogout: self._onChangeLoginState.bind(self, false),
        onready: function fmd_fxa_onready() {
          loginButton.addEventListener('click', self._onLoginClick.bind(self));
        },
        onerror: function fmd_fxa_onerror(err) {
          loginButton.addEventListener('click', self._onLoginClick.bind(self));
          console.error(err);
        }
      });
    });

    SettingsListener.observe('findmydevice.enabled', false,
      this._setEnabled.bind(this));

    var checkbox = document.querySelector('#findmydevice-enabled input');
    checkbox.addEventListener('change', this._onCheckboxChanged.bind(this));
  },

  _onLoginClick: function fmd_on_login_click(e) {
    e.stopPropagation();
    e.preventDefault();
    var _ = navigator.mozL10n.get;
    if (!window.navigator.onLine) {
      return window.alert(_('findmydevice-enable-network'));
    }
    this._interactiveLogin = true;
    navigator.mozId.request();
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

    if (this._interactiveLogin) {
      SettingsListener.getSettingsLock().set({
        'findmydevice.enabled': loggedIn
      });
    }

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

navigator.mozL10n.once(FindMyDevice.init.bind(FindMyDevice));
