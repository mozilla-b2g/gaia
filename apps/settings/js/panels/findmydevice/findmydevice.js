/* global IAC_API_WAKEUP_REASON_TRY_DISABLE */

'use strict';

define(function(require) {
  var SettingsUtils = require('modules/settings_utils');
  var SettingsListener = require('shared/settings_listener');
  var SettingsHelper = require('shared/settings_helper');
  var wakeUpFindMyDevice = require('shared/findmydevice_iac_api');
  var LazyLoader = require('shared/lazy_loader');

  var FindMyDevice = function() {
    // When the FxA login callback is called, we need to know if the
    // login process began with the user clicking our login button
    // since in that case we also want to enable Find My Device if it's
    // not already registered.
    this._interactiveLogin = false;

    this._enabledHelper = SettingsHelper('findmydevice.enabled');
    this._loggedInHelper = SettingsHelper('findmydevice.logged-in');
    this._registeredHelper = SettingsHelper('findmydevice.registered');

    this._boundSetTracked = this._boundSetTracked ||
      this._setTracked.bind(this);
    this._boundSetEnabled = this._boundSetEnabled ||
      this._setEnabled.bind(this);
    this._boundSetCanDisable = this._boundSetCanDisable ||
      this._setCanDisable.bind(this);
    this._boundLoginClick = this._boundLoginClick ||
      this._onLoginClick.bind(this);
    this._boundCheckboxChanged = this._boundCheckboxChanged ||
      this._onCheckboxChanged.bind(this);
  };

  FindMyDevice.prototype = {
    onInit: function fmd_init(elements) {
      this._elements = elements;

      // The app name may overflow the header width in some locales; try to
      // shrink it. Bug 1087441
      SettingsUtils.runHeaderFontFit(this._elements.header);

      LazyLoader.getJSON('/resources/findmydevice.json').then((data) => {
        SettingsListener.observe('findmydevice.logged-in', false,
          this._togglePanel.bind(this));

        navigator.mozId.watch({
          wantIssuer: 'firefox-accounts',
          audience: data.api_url,
          onlogin: this._onChangeLoginState.bind(this, true),
          onlogout: this._onChangeLoginState.bind(this, false),
          onready: () => {
            this._elements.loginButton.removeAttribute('disabled');
            console.log('Find My Device: onready fired');
          },
          onerror: (err) => {
            console.error('Find My Device: onerror fired: ' + err);
            this._interactiveLogin = false;
            this._elements.loginButton.removeAttribute('disabled');
            var errorName = JSON.parse(err).name;
            if (errorName !== 'OFFLINE') {
              if (errorName === 'UNVERIFIED_ACCOUNT') {
                this._elements.unverifiedError.hidden = false;
                this._elements.login.hidden = true;
              }
              this._loggedInHelper.set(false);
            }
          }
        });
      });
    },
    onBeforeShow: function fmd_onBeforeShow() {
      SettingsListener.observe('findmydevice.tracking', false,
        this._boundSetTracked);
      SettingsListener.observe('findmydevice.enabled', false,
        this._boundSetEnabled);
      SettingsListener.observe('findmydevice.can-disable', true,
        this._boundSetCanDisable);

      this._elements.loginButton.addEventListener('click',
        this._boundLoginClick);
      this._elements.checkbox.addEventListener('change',
        this._boundCheckboxChanged);
    },
    onBeforeHide: function fmd_onBeforeHide() {
      SettingsListener.unobserve('findmydevice.tracking',
        this._boundSetTracked);
      SettingsListener.unobserve('findmydevice.enabled',
        this._boundSetEnabled);
      SettingsListener.unobserve('findmydevice.can-disable',
        this._boundSetCanDisable);

      this._elements.loginButton.removeEventListener('click',
        this._boundLoginClick);
      this._elements.checkbox.removeEventListener('change',
        this._boundCheckboxChanged);
    },

    _onLoginClick: function fmd_on_login_click(e) {
      e.stopPropagation();
      e.preventDefault();
      if (this._elements.loginButton.disabled) {
        return;
      }
      if (!window.navigator.onLine) {
        navigator.mozL10n.formatValue('findmydevice-enable-network').then(
          (msg) => window.alert(msg));
        return;
      }
      this._interactiveLogin = true;
      navigator.mozId.request({
        oncancel: () => {
          this._interactiveLogin = false;
          console.log('Find My Device: oncancel fired');
        }
      });
    },

    _setEnabled: function fmd_set_enabled(value) {
      this._elements.checkbox.checked = value;
      this._elements.status.hidden = !value;
    },

    _setTracked: function fmd_set_tracked(value) {
      this._elements.status.setAttribute('data-l10n-id',
        value ? 'findmydevice-active-tracking' : 'findmydevice-not-tracking');
    },

    _setCanDisable: function fmd_set_can_disable(value) {
      this._elements.checkbox.disabled = !value;
    },

    _togglePanel: function fmd_toggle_panel(loggedIn) {
      this._elements.signin.hidden = loggedIn;
      this._elements.settings.hidden = !loggedIn;
    },

    _onChangeLoginState: function fmd_on_change_login_state(loggedIn) {
      console.log('settings, logged in: ' + loggedIn);

      if (this._interactiveLogin) {
        this._registeredHelper.get(registered => {
          if (!registered) {
            this._enabledHelper.set(true);
          }
        });
      }

      this._interactiveLogin = false;

      // Bug 1164713: Force logged in status in case of stale setting value
      this._loggedInHelper.set(loggedIn);

      this._elements.unverifiedError.hidden = true;
      this._elements.login.hidden = false;
    },

    _onCheckboxChanged: function fmd_on_checkbox_changed(event) {
      event.preventDefault();

      if (!window.navigator.onLine) {
        // XXX(ggp) do this later so that the visual change in the
        // checkbox is properly prevented.
        // formatValue is asynchronous so we don't need an artificial
        // setTimeout here.
        navigator.mozL10n.formatValue('findmydevice-enable-network').then(
          msg => window.alert(msg));
        return;
      }

      this._elements.checkbox.disabled = true;

      if (this._elements.checkbox.checked === false) {
        wakeUpFindMyDevice(IAC_API_WAKEUP_REASON_TRY_DISABLE);
      } else {
        this._enabledHelper.set(true, () => {
          this._elements.checkbox.disabled = false;
        });
      }
    }
  };

  return function ctor_findmydevice() {
    return new FindMyDevice();
  };
});
