'use strict';

/* globals addMixin, DebugMixin, ObserverSubjectMixin, SettingsView, DEFAULTS */
/* exported SettingsController */

(function(exports) {

  var SettingsController = function(id, viewId, pinCtrl) {
    this._id = id;
    this._pinCtrl = pinCtrl;

    addMixin(this, DebugMixin);
    addMixin(this, ObserverSubjectMixin);

    this._init(viewId);
  };

  SettingsController.prototype = {
    _id: null,
    _view: null,

    _settingsData: {
      'pin': DEFAULTS.PIN,
      'fastPay': DEFAULTS.FASTPAY,
      'crsAid': DEFAULTS.CRS_AID,
      'uiccAid': DEFAULTS.UICC_AID,
      'pinP2': DEFAULTS.PIN_P2,
      'defaultPin': DEFAULTS.PIN_VALUE
    },

    get pinEnabled() {
      return this._settingsData.pin;
    },

    get fastpayEnabled() {
      return this._settingsData.fastPay;
    },

    get crsAid() {
      return this._settingsData.crsAid;
    },

    get uiccAid() {
      return this._settingsData.uiccAid;
    },

    get pinP2() {
      return this._settingsData.pinP2;
    },

    get defaultPin() {
      return this._settingsData.defaultPin;
    },

    show: function() {
      this._view.visible = true;
    },

    hide: function() {
      this._view.visible = false;
    },

    _init: function(viewId) {
      Object.keys(this._settingsData).forEach(s => {
        this._settingsData[s] = this._readSetting(s, this._settingsData[s]);
      });

      this._view = new SettingsView(viewId, Object.create(this._settingsData));
      this._view.addListener(this);
      this._view.setSubViewContent('settings-pin', this._pinCtrl.view);
    },

    _readSetting: function(settingName, defValue) {
      var settingVal = localStorage.getItem(settingName);
      if(settingVal === 'true' || settingVal === 'false') {
        settingVal = (settingVal === 'true');
      }

      if(settingVal === null && defValue !== undefined) {
        localStorage.setItem(settingName, defValue);
        settingVal = defValue;
      }

      return settingVal;
    },

    onEvent: function(id, event) {
      this.debug('Event from: ' + id + ', ' + JSON.stringify(event));
      switch(event.action) {
        case 'editing-finished': this._handleInput(event.data); break;
        case 'pin-toggle': this._handlePinToggle(event.data.checked); break;
        case 'pin-change': this._handlePinChange(); break;
        case 'pin-cancel': this._handlePinCancel(); break;
      }
    },

    addPinComponent: function(pinCtrl) {
      this._pinCtrl = pinCtrl;
      this._view.setSubViewContent('settings-pin', this._pinCtrl.view);
    },

    _handlePinToggle: function(enable) {
      this._view.showSubview('settings-pin');
      if(enable) {
        this._handlePinEnable();
      } else {
        this._handlePinDisable();
      }
    },

    _handlePinEnable: function() {
      this._pinCtrl.enablePin()
      .then((enabled) => {
        this._view.pinEnabled = enabled;
        if(enabled) {
          this._view.hideSubview('settings-pin');
          this._pin = true;
          localStorage.setItem('pin', this._pin);
          this._view.showStatus('Wallet PIN enabled successfully');
        } else {
          this.debug('PIN enable failure');
          this._view.showStatus('Failed to enable Wallet PIN');
        }
      })
      .catch(e => {
        if(e !== 'pin-cancelled') {
          this._view.hideSubview('settings-pin');
          this._notify({ error: e, msg: 'PIN enable error' });
        }
      });
    },

    _handlePinDisable: function() {
      this._pinCtrl.disablePin()
      .then((disabled) => {
        this._view.hideSubview('settings-pin');
        this._view.pinEnabled = !disabled;
        if(disabled) {
          this._pin = false;
          localStorage.setItem('pin', this._pin);
          this._view.showStatus('Wallet PIN disabled successfully');
        } else {
          this.debug('PIN disable failure');
          this._view.showStatus('Failed to disable Wallet PIN');
        }
      })
      .catch(e => {
        if(e !== 'pin-cancelled') {
          this._view.hideSubview('settings-pin');
          this._notify({ error: e, msg: 'PIN disable error' });
        }
      });
    },

    _handlePinChange: function() {
      this._view.showSubview('settings-pin');
      this._pinCtrl.changePin()
      .then((success) => {
        this._view.hideSubview('settings-pin');
        if(success) {
          this._view.showStatus('Wallet PIN changed successfully');
        } else {
          this.debug('Change failed');
          this._view.showStatus('Failed to change Wallet PIN');
        }
      })
      .catch(e => {
        if(e !== 'pin-cancelled') {
          this._view.hideSubview('settings-pin');
          this._notify({ error: e, msg: 'PIN chnage error' });
        }
      });
    },

    _handlePinCancel() {
      this._pinCtrl.cancelPinAction();
    },

    _handleInput: function(data) {
      var changes = {};
      Object.keys(data).forEach(s => {
        if(this._settingsData[s] !== data[s]) {
          this._settingsData[s] = data[s];
          changes[s] = data[s];
          localStorage.setItem(s, data[s]);
        }
      });

      if(Object.keys(changes).length) {
        this._notify({ action: 'settings-updated', changes: changes });
      }
    },
  };

  exports.SettingsController = SettingsController;
}((typeof exports === 'undefined') ? window : exports));
