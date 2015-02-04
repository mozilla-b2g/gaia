/**
 * Bluetooth2 is compatible with Bluetooth APIv2 and used to enable/
 * diable bluetooth hardware, get bluetooth Adapter, and check target
 * bluetooth profile is connected.
 */
/* global SettingsListener, Service */
/* exported Bluetooth2 */
(function(exports) {
'use strict';

// var Bluetooth = function() {};

// Bluetooth.prototype = {
var Bluetooth = {
  name: 'Bluetooth',
  /**
   * keep a global connected property.
   *
   * @public
   */
  connected: false,

  /**
   * Debug message
   *
   * @type {Boolean} turn on/off the console log
   */
  _debug: true,

  /**
   * store a reference of the default adapter.
   *
   * @private
   */
  _adapter: null,

  /**
   * store a reference of the Bluetooth API.
   *
   * @private
   */
  _bluetooth: null,

  /**
   * store a reference of the Bluetooth API.
   *
   * @private
   */
  _isEnabled: false,

  /**
   * Build-in Bluetooth profiles
   *
   * @public
   */
  get Profiles() {
    return {
      HFP: 'hfp',   // Hands-Free Profile
      OPP: 'opp',   // Object Push Profile
      A2DP: 'a2dp', // A2DP status
      SCO: 'sco'    // Synchronous Connection-Oriented
    };
  },

  /**
   * Set profile connect stat.
   *
   * @public
   * @param {String} profile   profile id
   * @param {Boolean} connected connect status
   */
  _setProfileConnected: function bt_setProfileConnected(profile, connected) {
    var value = this['_' + profile + 'Connected'];
    if (value !== connected) {
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
    }
  },

  getCurrentProfiles: function bt_getCurrentProfiles() {
    var profiles = this.Profiles;
    var connectedProfiles = [];
    for (var name in profiles) {
      var profile = profiles[name];
      if (this.isProfileConnected(profile)) {
        connectedProfiles.push(profile);
      }
    }
    return connectedProfiles;
  },

  /**
   * check if bluetooth profile is connected.
   *
   * @public
   * @param {String} profile profile name
   * @return {Boolean} connected state
   */
  isProfileConnected: function bt_isProfileConnected(profile) {
    var isConnected = this['_' + profile + 'Connected'];
    if (isConnected === undefined) {
      return false;
    } else {
      return isConnected;
    }
  },

  /**
   * initialize bluetooth module
   *
   * @public
   */
  start: function bt_start() {
    if (!window.navigator.mozSettings || !window.navigator.mozBluetooth) {
      return;
    }

    this._bluetooth = window.navigator.mozBluetooth;
    SettingsListener.observe('bluetooth.enabled', true, function(value) {
      if (!this._bluetooth) {
        // roll back the setting value to notify the UIs
        // that Bluetooth interface is not available
        if (value) {
          SettingsListener.getSettingsLock().set({
            'bluetooth.enabled': false
          });
        }
        return;
      }
    }.bind(this));

    // when bluetooth adapter is ready, a.k.a enabled,
    // emit event to notify QuickSettings and try to get
    // defaultAdapter at this moment
    this._bluetooth.addEventListener('adapteradded',
      this._adapterAddedHandler.bind(this)
    );

    // when bluetooth is really disabled, emit event to notify QuickSettings
    this._bluetooth.addEventListener('adapterremoved',
      this._adapterRemovedhandler.bind(this)
    );

    // if bluetooth is enabled in booting time, try to get adapter now
    this._initDefaultAdapter();

    /* In file transfering case:
     * since System Message can't be listened in two js files within a app,
     * so we listen here but dispatch events to bluetooth_transfer.js
     * while getting bluetooth file transfer start/complete system messages
     */
    navigator.mozSetMessageHandler('bluetooth-opp-transfer-start',
      this._relayMessageEvent.bind(this, 'bluetooth-opp-transfer-start')
    );

    navigator.mozSetMessageHandler('bluetooth-opp-transfer-complete',
      this._relayMessageEvent.bind(this, 'bluetooth-opp-transfer-complete')
    );

    // decouple bluetooth enable/disable function from other system part
    window.addEventListener('request-enable-bluetooth', this);
    window.addEventListener('request-disable-bluetooth', this);

    Service.registerState('isEnabled', this);
  },

  /**
   * handle bluetooth system events
   *
   * @public
   * @param  {Object} evt event object
   */
  handleEvent: function bt_handleEvent(evt) {
    switch (evt.type) {
      // enable bluetooth hardware and update settings value
      case 'request-enable-bluetooth':
        this.getAdapter().then((adapter) => {
          adapter.enable().then(() => { //resolve
            SettingsListener.getSettingsLock().set({
              'bluetooth.enabled': true
            });
          }, () => { //reject
            this.debug('can not get bluetooth adapter');
          });
        });
        break;
      // disable bluetooth hardware and update settings value
      case 'request-disable-bluetooth':
        this.getAdapter().then((adapter) => {
          adapter.disable().then(() => { //resolve
            SettingsListener.getSettingsLock().set({
              'bluetooth.enabled': false
            });
          }, () => { //reject
            this.debug('can not get bluetooth adapter');
          });
        });
        break;
    }
  },

  /**
   * Get adapter when bluetooth adapter is added.
   *
   * @private
   */
  _adapterAddedHandler: function bt__adapterAddedHandler() {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('bluetooth-adapter-added',
      /* canBubble */ true, /* cancelable */ false, null);
    window.dispatchEvent(evt);
    this.initDefaultAdapter();
  },

  /**
   * Send event when bluetooth adapter is removed.
   *
   * @private
   */
  _adapterRemovedhandler: function bt__adapterRemovedhandler() {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('bluetooth-disabled',
      /* canBubble */ true, /* cancelable */ false, null);
    window.dispatchEvent(evt);
  },

  /**
   * dispatch events to bluetooth_transfer.js
   * while getting bluetooth file transfer start/complete system messages
   *
   * @private
   */
  _relayMessageEvent: function bt__relayMessageEvent(msg, transferInfo) {
    this._setProfileConnected(this.Profiles.OPP, true);
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(msg,
      /* canBubble */ true, /* cancelable */ false,
      {transferInfo: transferInfo});
    window.dispatchEvent(evt);
  },

  /**
   * Get adapter for BluetoothTransfer when everytime bluetooth is enabled.
   *
   * @private
   */
  _initDefaultAdapter: function bt_initDefaultAdapter() {
    this.getAdapter().then((adapter) => {
      this._updateProfileStat(adapter);
    });
  },

  /**
   * Maintain connect stat of supported profiles.
   *
   * @private
   * @param  {Object} adapter bluetooth adapter
   */
  _updateProfileStat: function bt_updateProfileStat(adapter) {
    /* for v1, we only support two use cases for bluetooth connection:
     *   1. connecting with a headset
     *   2. transfering a file to/from another device
     * So we need to listen to corresponding events to know we are (aren't)
     * connected, then summarize to an event and dispatch to StatusBar
     */
    // In headset connected case:
    adapter.addEventListener('hfpstatuschanged', (evt) => {
        this._setProfileConnected(this.Profiles.HFP, evt.status);
    });

    adapter.addEventListener('a2dpstatuschanged', (evt) => {
      this._setProfileConnected(this.Profiles.A2DP, evt.status);
    });

    adapter.addEventListener('scostatuschanged', (evt) => {
      this._setProfileConnected(this.Profiles.SCO, evt.status);
    });
  },

  /**
   * update bluetooth enable state
   *
   * @private
   * @param  {Object} evt event object
   */
  _adapterAttrChangeHandler: function bt__adapterAttrChangeHandler(evt) {
    for (var i in evt.attrs) {
      switch (evt.attrs[i]) {
        case 'stat':
          this._isEnabled = this._bluetooth.defaultAdapter.state;
          break;
        default:
          break;
      }
    }
  },

  /**
   * update bluetooth adapter
   *
   * @private
   * @param  {Object} evt event object
   */
  _bluetoothAttrChangeHandler: function bt__bluetoothAttrChangeHandler(resolve, evt) {
    for (var i in evt.attrs) {
      switch (evt.attrs[i]) {
        case 'defaultAdapter':
          this._adapter = this._bluetooth.defaultAdapter;
          this.debug('defaultAdapter changed.');
          this._adapter.addEventListener('attributechanged',
            this._adapterAttrChangeHandler.bind(this));
          resolve(this._adapter);
        default:
          break;
      }
    }
  },

  /**
   * called by external for re-use adapter.
   *
   * @public
   */
  getAdapter: function bt_getAdapter() {
    return new Promise(function(resolve, reject) {
      // need time to get bluetooth adapter at first run
      this._bluetooth.addEventListener('attributechanged',
        this._bluetoothAttrChangeHandler.bind(this, resolve));

      // handle default Bluetooth ON cases
      if (this._bluetooth.defaultAdapter) {
        this._adapter = this._bluetooth.defaultAdapter;
        if (this._bluetooth.defaultAdapter.stat) {
          this._isEnabled = this._bluetooth.defaultAdapter.state;
        }
        resolve(this._adapter);
      }
    }.bind(this));
  },

  /**
   * maintain bluetooth enable/disable stat.
   *
   * @public
   */
  get isEnabled() {
    return this._isEnabled;
  },

  /**
   * console log
   *
   * @param  {[type]} msg debug message
   */
  debug: function bt_debug(msg) {
    if (!this._debug) {
      return;
    }

    console.log('[System Bluetooth Transfer]: ' + msg);
  }
};

  exports.Bluetooth2 = Bluetooth;
})(window);
