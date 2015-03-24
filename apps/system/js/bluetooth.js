/* global SettingsListener, Service, BluetoothIcon, BluetoothTransferIcon,
          BluetoothHeadphoneIcon, LazyLoader */
/* exported Bluetooth1 */
'use strict';

(function(exports) {
var Bluetooth = {
  name: 'Bluetooth',

  _setProfileConnected: function bt_setProfileConnected(profile, connected) {
    var value = this['_' + profile + 'Connected'];
    if (value != connected) {
      this['_' + profile + 'Connected'] = connected;

      // Raise an event for the profile connection changes.
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('bluetoothprofileconnectionchange',
        /* canBubble */ true, /* cancelable */ false,
        {
          name: profile,
          connected: connected
        });
      window.dispatchEvent(evt);
      if (profile === 'opp' && this.transferIcon) {
        this.transferIcon.update();
      }
      if (profile === 'a2dp' && this.headphoneIcon) {
        this.headphoneIcon.update();
      }
    }
  },

  /**
   * check if bluetooth profile is connected.
   *
   * @private
   * @param {String} profile profile name
   * @return {Boolean} connected state
   */
  _isProfileConnected: function bt__isProfileConnected(profile) {
    var isConnected = this['_' + profile + 'Connected'];
    if (isConnected === undefined) {
      return false;
    } else {
      return isConnected;
    }
  },

  /* this property store a reference of the default adapter */
  defaultAdapter: null,

  /**
   * keep a global connected property.
   *
   * @public
   */
  connected: false,

  init: function bt_init() {
    if (!window.navigator.mozBluetooth || this._started) {
      return;
    }
    this._started = true;

    var bluetooth = window.navigator.mozBluetooth;
    var self = this;

    SettingsListener.observe('bluetooth.enabled', true, function(value) {
      if (!bluetooth) {
        // roll back the setting value to notify the UIs
        // that Bluetooth interface is not available
        if (value) {
          SettingsListener.getSettingsLock().set({
            'bluetooth.enabled': false
          });
        }
        return;
      }
      this._settingsEnabled = value;
      this.icon && this.icon.update();
    }.bind(this));

    // send default bluetooth state so quick settings
    // could be get updated
    var req = SettingsListener.getSettingsLock()
      .get('bluetooth.enabled');
    req.onsuccess = function get_onsuccess() {
      if (req.result['bluetooth.enabled']) {
        window.dispatchEvent(new CustomEvent('bluetooth-enabled'));
      } else {
        window.dispatchEvent(new CustomEvent('bluetooth-disabled'));
      }
    };

    // when bluetooth adapter is ready, a.k.a enabled,
    // try to get defaultAdapter at this moment
    bluetooth.addEventListener('adapteradded', function bt_onAdapterAdded() {
      self.initDefaultAdapter();
    });

    // when bluetooth is really enabled
    // emit event to notify QuickSettings
    bluetooth.addEventListener('enabled', function bt_onEnabled() {
      self.icon && self.icon.update();
      window.dispatchEvent(new CustomEvent('bluetooth-enabled'));
    });

    // when bluetooth is really disabled, emit event to notify QuickSettings
    // Since APIv1 does not have adapterremoved event,
    // the bluetooth adapter unavailable state is dispatched here instead.
    bluetooth.addEventListener('disabled', function bt_onDisabled() {
      self.icon && self.icon.update();
      window.dispatchEvent(new CustomEvent('bluetooth-disabled'));
      window.dispatchEvent(new CustomEvent('bluetooth-unavailable'));
    });

    // if bluetooth is enabled in booting time, try to get adapter now
    this.initDefaultAdapter();

    /* In file transfering case:
     * since System Message can't be listened in two js files within a app,
     * so we listen here but dispatch events to bluetooth_transfer.js
     * when getting bluetooth file transfer start/complete system messages
     */
    navigator.mozSetMessageHandler('bluetooth-opp-transfer-start',
      function bt_fileTransferUpdate(transferInfo) {
        self._setProfileConnected('opp', true);
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('bluetooth-opp-transfer-start',
          /* canBubble */ true, /* cancelable */ false,
          {transferInfo: transferInfo});
        window.dispatchEvent(evt);
      }
    );

    navigator.mozSetMessageHandler('bluetooth-opp-transfer-complete',
      function bt_fileTransferUpdate(transferInfo) {
        self._setProfileConnected('opp', false);
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent('bluetooth-opp-transfer-complete',
          /* canBubble */ true, /* cancelable */ false,
          {transferInfo: transferInfo});
        window.dispatchEvent(evt);
      }
    );

    window.addEventListener('request-enable-bluetooth', this);
    window.addEventListener('request-disable-bluetooth', this);

    Service.registerState('isEnabled', this);
    Service.registerState('isOPPProfileConnected', this);
    Service.registerState('isA2DPProfileConnected', this);
    Service.registerState('isSCOProfileConnected', this);

    LazyLoader.load(['js/bluetooth_icon.js',
                     'js/bluetooth_transfer_icon.js',
                     'js/bluetooth_headphone_icon.js']).then(function() {
      this.icon = new BluetoothIcon(this);
      this.icon.start();
      this.transferIcon = new BluetoothTransferIcon(this);
      this.transferIcon.start();
      this.headphoneIcon = new BluetoothHeadphoneIcon(this);
      this.headphoneIcon.start();
    }.bind(this)).catch(function(err) {
      console.error(err);
    });
  },

  handleEvent: function bt_handleEvent(evt) {
    switch (evt.type) {
      // enable bluetooth hardware and update settings value
      case 'request-enable-bluetooth':
        SettingsListener.getSettingsLock().set({
          'bluetooth.enabled': true
        });
        break;
      // disable bluetooth hardware and update settings value
      case 'request-disable-bluetooth':
        SettingsListener.getSettingsLock().set({
          'bluetooth.enabled': false
        });
        break;
    }
  },

  // Get adapter for BluetoothTransfer when everytime bluetooth is enabled
  initDefaultAdapter: function bt_initDefaultAdapter() {
    var bluetooth = window.navigator.mozBluetooth;
    var self = this;

    if (!bluetooth || !bluetooth.enabled ||
        !('getDefaultAdapter' in bluetooth)) {
      return;
    }

    var req = bluetooth.getDefaultAdapter();
    req.onsuccess = function bt_gotDefaultAdapter(evt) {
      self.defaultAdapter = req.result;
      self._adapterAvailableHandler(self.defaultAdapter);
      // Dispatch bluetooth adapter available state to system.
      window.dispatchEvent(new CustomEvent('bluetooth-available', {
        detail: { adapter: self.defaultAdapter }
      }));
    };
  },

  _adapterAvailableHandler: function bt__adapterAvailableHandler(adapter) {
    /* for v1, we only support two use cases for bluetooth connection:
     *   1. connecting with a headset
     *   2. transfering a file to/from another device
     * So we need to listen to corresponding events to know we are (aren't)
     * connected, then summarize to an event and dispatch to StatusBar
     */

    // In headset connected case:
    var self = this;
    adapter.onhfpstatuschanged = function bt_hfpStatusChanged(evt) {
      self._setProfileConnected('hfp', evt.status);
    };

    adapter.ona2dpstatuschanged = function bt_a2dpStatusChanged(evt) {
      self._setProfileConnected('a2dp', evt.status);
    };

    adapter.onscostatuschanged = function bt_scoStatusChanged(evt) {
      self._setProfileConnected('sco', evt.status);
    };
  },

  /**
   * maintain bluetooth enable/disable stat.
   *
   * @public
   */
  get isEnabled() {
    return this._settingsEnabled;
  },

  /**
   * Check if bluetooth OPP profile is connected.
   *
   * @public
   * @return {Boolean} connected state
   */
  get isOPPProfileConnected() {
    return this._isProfileConnected('opp');
  },

  /**
   * Check if bluetooth A2DP profile is connected.
   *
   * @public
   * @return {Boolean} connected state
   */
  get isA2DPProfileConnected() {
    return this._isProfileConnected('a2dp');
  },

  /**
   * Check if bluetooth SCO profile is connected.
   *
   * @public
   * @return {Boolean} connected state
   */
  get isSCOProfileConnected() {
    return this._isProfileConnected('sco');
  }
};

exports.Bluetooth1 = Bluetooth;
})(window);
