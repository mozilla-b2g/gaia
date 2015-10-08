/* global DsdsSettings */

define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var CallBarring = require('panels/call_barring/call_barring');
  var InputPasscodeScreen = require('panels/call_barring/passcode_dialog');
  var Toaster = require('shared/toaster');

  return function ctor_call_barring() {
    var _callBarring = CallBarring;
    var _passcodeScreen = InputPasscodeScreen();

    var _mobileConnection;
    var _cbSettings = {};

    var _refresh;
    var _updating;

    /**
     * To avoid modifying the setting for the wrong SIM card, it's better to
     * update the current mobile connection before using it.
     * see: https://bugzilla.mozilla.org/show_bug.cgi?id=910552#c81
     */
    function _updateMobileConnection() {
      _mobileConnection = window.navigator.mozMobileConnections[
        DsdsSettings.getIccCardIndexForCallSettings()
      ];
    }

    /**
     *  Manage when to update the data
     */
    function refresh_on_load(e) {
      // Refresh when:
      //  - we load the panel from #call
      //  - we re-load the panel after hide (screen off or change app)
      // But NOT when:
      //  - we come back from changing the password
      if (e.detail.current === '#call-cbSettings' &&
          e.detail.previous === '#call-barring-passcode-change') {
            _refresh = false;
      }
    }

    /**
     * Updates a Call Barring item with a new status.
     * @parameter item DOM 'li' element to update
     * @parameter newStatus Object with data for the update. Of the form:
     * {
     *   disabled:[true|false], // optional, new disabled state
     *   checked: [true|false], // optional, new checked state for the input
     *   message: [string]      // optional, new message for the description
     * }
     */
    function _updateCallBarringItem(item, newStatus) {
      var descText = item.querySelector('details');
      var input = item.querySelector('gaia-switch');

      // disable the item
      if (typeof newStatus.disabled === 'boolean') {
        newStatus.disabled ?
          item.setAttribute('aria-disabled', true) :
          item.removeAttribute('aria-disabled');

        if (input) {
          input.disabled = newStatus.disabled;
        }
      }

      // update the input value
      if (input && typeof newStatus.checked === 'boolean') {
        input.checked = newStatus.checked;
      }

      // update the description
      function inputValue() {
        return input && input.checked ? 'enabled' : 'disabled';
      }
      if (descText) {
        var text = _updating ? 'callSettingsQuery' : inputValue();
        navigator.mozL10n.setAttributes(descText, text);
      }
    }

    /**
     * Shows the passcode input screen for the user to introduce the PIN
     * needed to activate/deactivate a service
     */
    function _callBarringClick(evt) {
      var input = evt.target;

      // do not change the UI, let it be managed by the data model
      evt.preventDefault();
      // Show passcode screen
      _passcodeScreen.show().then(function confirmed(passcode) {
        // passcode screen confirmed
        var inputID = input.parentNode.parentNode.id;

        var setting = inputID.substring(6);
        _updateMobileConnection();
        _callBarring.set(_mobileConnection, setting, passcode).catch(
          function error(err) {
          // err = { name, message }
          var toast = {
            messageL10nId: 'callBarring-update-item-error',
            messageL10nArgs: {'error': err.name || 'unknown'},
            latency: 2000,
            useTransition: true
          };
          Toaster.showToast(toast);
        });
      }).catch(function canceled() {
        // passcode screen canceled, nothing to do yet
      });
    }

    return SettingsPanel({
      onInit: function cb_onInit(panel) {
        _cbSettings = {
          baoc: document.getElementById('li-cb-baoc'),
          boic: document.getElementById('li-cb-boic'),
          boicExhc: document.getElementById('li-cb-boicExhc'),
          baic: document.getElementById('li-cb-baic'),
          baicR: document.getElementById('li-cb-baicR')
        };

        for (var i in _cbSettings) {
          _cbSettings[i].querySelector('gaia-switch').
            addEventListener('click', _callBarringClick);
        }

        _updateMobileConnection();
        _passcodeScreen.init();
      },

      onBeforeShow: function cb_onBeforeShow() {
        _refresh = true;
        _updating = false;

        for (var element in _cbSettings) {
          _callBarring[element] = false;
          _updateCallBarringItem(_cbSettings[element], {'checked': false});
        }

        window.addEventListener('panelready', refresh_on_load);

        // Changes on settings value
        _callBarring.observe('baoc', function(newValue) {
          _updateCallBarringItem(_cbSettings.baoc, {'checked': newValue});
        });
        _callBarring.observe('boic', function(newValue) {
          _updateCallBarringItem(_cbSettings.boic, {'checked': newValue});
        });
        _callBarring.observe('boicExhc', function(newValue) {
          _updateCallBarringItem(_cbSettings.boicExhc, {'checked': newValue});
        });
        _callBarring.observe('baic', function(newValue) {
          _updateCallBarringItem(_cbSettings.baic, {'checked': newValue});
        });
        _callBarring.observe('baicR', function(newValue) {
          _updateCallBarringItem(_cbSettings.baicR, {'checked': newValue});
        });

        // Changes on settings availability
        _callBarring.observe('baoc_enabled', function changed(newValue) {
          _updateCallBarringItem(_cbSettings.baoc, {'disabled': !newValue});
        });
        _callBarring.observe('boic_enabled', function changed(newValue) {
          _updateCallBarringItem(_cbSettings.boic, {'disabled': !newValue});
        });
        _callBarring.observe('boicExhc_enabled', function changed(newValue) {
          _updateCallBarringItem(_cbSettings.boicExhc, {'disabled': !newValue});
        });
        _callBarring.observe('baic_enabled', function changed(newValue) {
          _updateCallBarringItem(_cbSettings.baic, {'disabled': !newValue});
        });
        _callBarring.observe('baicR_enabled', function changed(newValue) {
          _updateCallBarringItem(_cbSettings.baicR, {'disabled': !newValue});
        });

        _callBarring.observe('updating', function changed(newValue) {
          _updating = newValue;
        });
      },

      onShow: function cb_onShow() {
        if (_refresh) {
          _updateMobileConnection();
          _callBarring.getAll(_mobileConnection);
        }
      },

      onBeforeHide: function cb_onHide() {
        window.removeEventListener('panelready', refresh_on_load);

        _callBarring.unobserve('baoc');
        _callBarring.unobserve('boic');
        _callBarring.unobserve('boicExhc');
        _callBarring.unobserve('baic');
        _callBarring.unobserve('baicR');

        _callBarring.unobserve('baoc_enabled');
        _callBarring.unobserve('boic_enabled');
        _callBarring.unobserve('boicExhc_enabled');
        _callBarring.unobserve('baic_enabled');
        _callBarring.unobserve('baicR_enabled');

        _callBarring.unobserve('updating');
      }
    });
  };
});
