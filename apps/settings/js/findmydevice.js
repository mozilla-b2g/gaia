/* global SettingsListener */
/* global SettingsHelper */
/* global loadJSON */
/* global wakeUpFindMyDevice */
/* global IAC_API_WAKEUP_REASON_TRY_DISABLE */

'use strict';

var FindMyDevice = {
  // When the FxA login callback is called, we need to know if the
  // login process began with the user clicking our login button
  // since in that case we also want to enable Find My Device if it's
  // not already registered.
  _interactiveLogin: false,
  _loginButton: null,

  init: function fmd_init() {
    var self = this;
    self._loginButton = document.getElementById('findmydevice-login');

    loadJSON('/resources/findmydevice.json', function(data) {
      self._audienceURL = data.audience_url;

      navigator.mozId.watch({
        wantIssuer: 'firefox-accounts',
        audience: self._audienceURL,
        onlogin: self._onChangeLoginState.bind(self, true),
        onlogout: self._onChangeLoginState.bind(self, false),
        onready: function fmd_fxa_onready() {
          self._loginButton.removeAttribute('disabled');
          console.log('Find My Device: onready fired');
        },
        onerror: function fmd_fxa_onerror(err) {
          self._interactiveLogin = false;
          self._togglePanel(false);
          self._loginButton.removeAttribute('disabled');
          console.error('Find My Device: onerror fired: ' + err);
        }
      });
    });

    SettingsListener.observe('findmydevice.tracking', false,
      this._setTracked.bind(this));
    self._loginButton.addEventListener('click', self._onLoginClick.bind(self));

    SettingsListener.observe('findmydevice.enabled', false,
      this._setEnabled.bind(this));
    SettingsListener.observe('findmydevice.can-disable', true,
      this._setCanDisable.bind(this));

    var checkbox = document.querySelector('#findmydevice-enabled input');
    checkbox.addEventListener('click', this._onCheckboxChanged.bind(this));
  },

  _onLoginClick: function fmd_on_login_click(e) {
    e.stopPropagation();
    e.preventDefault();
    if (this._loginButton.disabled) {
      return;
    }
    var _ = navigator.mozL10n.get;
    if (!window.navigator.onLine) {
      return window.alert(_('findmydevice-enable-network'));
    }
    this._interactiveLogin = true;
    var self = this;
    navigator.mozId.request({
      oncancel: function fmd_fxa_oncancel() {
        self._interactiveLogin = false;
        console.log('Find My Device: oncancel fired');
      }
    });
  },

  _setEnabled: function fmd_set_enabled(value) {
    var checkbox = document.querySelector('#findmydevice-enabled input');
    checkbox.checked = value;

    var status = document.getElementById('findmydevice-tracking');
    status.hidden = !value;
  },

  _setTracked: function fmd_set_tracked(value) {
    var status = document.getElementById('findmydevice-tracking');
    navigator.mozL10n.localize(status,
      value ?  'findmydevice-active-tracking' : 'findmydevice-not-tracking');
  },

  _setCanDisable: function fmd_set_can_disable(value) {
    var checkbox = document.querySelector('#findmydevice-enabled input');
    checkbox.disabled = !value;
  },

  _togglePanel: function fmd_toggle_panel(loggedIn) {
    var signin = document.getElementById('findmydevice-signin');
    signin.hidden = loggedIn;

    var settings = document.getElementById('findmydevice-settings');
    settings.hidden = !loggedIn;
  },

  _onChangeLoginState: function fmd_on_change_login_state(loggedIn) {
    console.log('settings, logged in: ' + loggedIn);

    this._togglePanel(loggedIn);

    if (this._interactiveLogin) {
      SettingsHelper('findmydevice.registered').get(function(registered) {
        if (!registered) {
          SettingsHelper('findmydevice.enabled').set(true);
        }
      });
    }

    this._interactiveLogin = false;
  },

  _onCheckboxChanged: function fmd_on_checkbox_changed(event) {
    event.preventDefault();

    var checkbox = document.querySelector('#findmydevice-enabled input');
    checkbox.disabled = true;

    if (checkbox.checked === false) {
      wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_TRY_DISABLE);
    } else {
      SettingsHelper('findmydevice.enabled').set(true, function() {
        checkbox.disabled = false;
      });
    }
  },
};

navigator.mozL10n.once(FindMyDevice.init.bind(FindMyDevice));
