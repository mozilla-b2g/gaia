'use strict';
/**
 * Bluetooth2 is compatible with Bluetooth APIv2 and used to enable/
 * disable bluetooth hardware, get bluetooth adapter, and check target
 * bluetooth profile is connected.
 *
 * Bluetooth api v2 is the two level structure.
 * We use _bluetoothManagerHandler to handle BluetoothManager defaultAdapter
 * change event and _bluetoothAdapterHandler to handle status change event.
 *
 */
/* global SettingsListener, Service */
/* exported Bluetooth2 */
(function(exports) {

var Bluetooth = function() {};

Bluetooth.prototype = {
  name: 'Bluetooth',
  /**
   * Keep a global connected property.
   *
   * @public
   */
  connected: false,

  /**
   * Debug message.
   *
   * @type {Boolean} turn on/off the console log
   */
  onDebug: false,

  /**
   * Store a reference of the default adapter.
   *
   * @private
   */
  _adapter: null,

  /**
   * Hold instance of bluetooth attribute change handler.
   *
   * @private
   */
  _defaultAdapterChangeHandler: null,

  /**
   * Hold instance of bluetooth adapter state change handler.
   *
   * @private
   */
  _stateChangeHandler: null,

  /**
   * Hold instance of bluetooth attribute change handler in
   * getAdapter when the default adapter is not available.
   *
   * @private
   */
  _promiseAdapterChangeHandler: null,

  /**
   * Hold instance of the getAdapter promise
   * when the default adapter is not available.
   */
  _cacheGetAdapterPromise: null,

  /**
   * Store a reference of the Bluetooth API.
   *
   * @private
   */
  _bluetooth: null,

  /**
   * Store a reference of the Bluetooth API.
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
   * Set profile connect state.
   *
   * @public
   * @param {String} profile profile id
   * @param {Boolean} connected connect status
   */
  _setProfileConnected: function bt_setProfileConnected(profile, connected) {
    var value = this['_' + profile + 'Connected'];
    if (value !== connected) {
      this['_' + profile + 'Connected'] = connected;

      // Raise an event for the profile connection changes.
      window.dispatchEvent(new CustomEvent('bluetoothprofileconnectionchange',
      {
        name: profile,
        connected: connected
      }));
      // if (profile === 'opp' && this.transferIcon) {
      //   this.transferIcon.update();
      // }
      // if (profile === 'a2dp' && this.headphoneIcon) {
      //   this.headphoneIcon.update();
      // }
    }
  },

  /**
   * Check if bluetooth profile is connected.
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
   * Initialize bluetooth module.
   *
   * @public
   */
  start: function bt_start() {
    if (!window.navigator.mozSettings || !window.navigator.mozBluetooth) {
      return;
    }

    this._bluetooth = window.navigator.mozBluetooth;
    SettingsListener.observe('bluetooth.enabled', true, (value) => {
      if (!this._bluetooth) {
        // roll back the setting value to notify the UIs
        // that Bluetooth interface is not available
        if (value) {
          navigator.mozSettings.createLock()
            .set({'bluetooth.enabled': false});
        }
        return;
      }
    });

    this._defaultAdapterChangeHandler =
      this._bluetoothManagerHandler.bind(this, null);
    this._bluetooth.addEventListener('attributechanged',
      this._defaultAdapterChangeHandler);

    // clear defaultAdapter and listener once adapter is removed
    this._bluetooth.addEventListener('adapterremoved',
      this._removeEventListeners.bind(this));

    // if bluetooth is enabled in booting time, try to get adapter now
    this._debug('init bluetooth adapter');
    this._adapter = this._bluetooth.defaultAdapter;
    if (this._adapter) {
      this._debug('bluetooth state:' + this._adapter.state);
      this._isEnabled = (this._adapter.state === 'enabled');
      // send default bluetooth state so quick settings
      // could be get updated
      if (this._isEnabled) {
        window.dispatchEvent(new CustomEvent('bluetooth-enabled'));
      } else {
        window.dispatchEvent(new CustomEvent('bluetooth-disabled'));
      }

      this._stateChangeHandler =
        this._bluetoothAdapterHandler.bind(this);
      this._adapter.addEventListener('attributechanged',
        this._stateChangeHandler);
    }

    /*
     * In file transfering case:
     * since System Message can't be listened in two js files within a app,
     * so we listen here but dispatch events to bluetooth_transfer.js
     * while getting bluetooth file transfer start/complete system messages
     */
    navigator.mozSetMessageHandler('bluetooth-opp-transfer-start',
      (transferInfo) => {
        this._setProfileConnected(this.Profiles.OPP, true);
        window.dispatchEvent(new CustomEvent('bluetooth-opp-transfer-start',
          {transferInfo: transferInfo}));
      }
    );

    navigator.mozSetMessageHandler('bluetooth-opp-transfer-complete',
      (transferInfo) => {
        this._setProfileConnected(this.Profiles.OPP, false);
        window.dispatchEvent(new CustomEvent('bluetooth-opp-transfer-complete',
          {transferInfo: transferInfo}));
      }
    );

    // decouple bluetooth enable/disable function from other system part
    window.addEventListener('request-enable-bluetooth',
      this._enableHandler.bind(this));
    window.addEventListener('request-disable-bluetooth',
      this._disableHandler.bind(this));

    Service.registerState('isEnabled', this);
    // LazyLoader.load(['js/bluetooth_icon.js',
    //                  'js/bluetooth_transfer_icon.js',
    //                  'js/bluetooth_headphone_icon.js'], function() {
    //   this.icon = new BluetoothIcon(this);
    //   this.icon.start();
    //   this.transferIcon = new BluetoothTransferIcon(this);
    //   this.transferIcon.start();
    //   this.headphoneIcon = new BluetoothHeadphoneIcon(this);
    //   this.headphoneIcon.start();
    // }.bind(this)).catch(function(err) {
    //   console.error(err);
    // });
  },

  /**
   * Remove all EventListeners and adapters when default adapter
   * is changed.
   */
  _removeEventListeners() {
    this._bluetooth.removeEventListener('attributechanged',
      this._defaultAdapterChangeHandler);
    this._adapter.removeEventListener('attributechanged',
      this._stateChangeHandler);
    // remove getAdapter cached promise
    if (this._cacheGetAdapterPromise) {
      this._bluetooth.removeEventListener('attributechanged',
        this._promiseAdapterChangeHandler);
      this._cacheGetAdapterPromise = null;
    }
    this._adapter = null;
  },

  /**
   * update settings value and enable bluetooth hardware
   *
   * @private
   */
  _enableHandler: function bt__enableHandler() {
    this._debug('enabling bluetooth');
    this.getAdapter().then((adapter) => {
      adapter.enable().then(() => { //resolve
        this._debug('bluetooth enabled');
        this._updateProfileState(adapter);
      }, () => { //reject
        this._debug('can not get bluetooth adapter');
      });
    });
  },

  /**
   * update settings value and disable bluetooth hardware
   *
   * @private
   */
  _disableHandler: function bt__disableHandler() {
    this._debug('disabling bluetooth');
    this.getAdapter().then((adapter) => {
      adapter.disable().then(() => { //resolve
        this._debug('bluetooth disabled');
      }, () => { //reject
        this._debug('can not get bluetooth adapter');
      });
    });
  },

  /**
   * Maintain connect stat of supported profiles.
   *
   * @private
   * @param  {Object} adapter bluetooth adapter
   */
  _updateProfileState: function bt__updateProfileState(adapter) {
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
   * BT APIv2: Watch 'onattributechanged' event from
   * mozBluetooth.defaultAdapter for updating state information.
   *
   * @private
   * @param  {Object} evt event object
   */
  _bluetoothAdapterHandler:
    function bt__bluetoothAdapterHandler(evt) {
      for (var i in evt.attrs) {
        switch (evt.attrs[i]) {
          case 'state':
            if (this._adapter.state === 'enabled') {
              this._isEnabled = true;
              navigator.mozSettings.createLock()
                .set({'bluetooth.enabled': true});
              window.dispatchEvent(new CustomEvent('bluetooth-enabled'));
              // this.icon && this.icon.update();
            } else if (this._adapter.state === 'disabled') {
              this._isEnabled = false;
              navigator.mozSettings.createLock()
                .set({'bluetooth.enabled': false});
              window.dispatchEvent(new CustomEvent('bluetooth-disabled'));
              // this.icon && this.icon.update();
            }
            break;
          default:
            break;
        }
      }
  },

  /**
   * Watch 'onattributechanged' event from mozBluetooth for updating default
   * adapter information.
   *
   * 'onattributechanged' event description:
   * A handler to trigger when bluetooth manager's only property
   * defaultAdapter has changed.
   *
   * @private
   * @param  {Object} evt event object
   */
  _bluetoothManagerHandler:
    function bt__bluetoothManagerHandler(resolve, evt) {
      for (var i in evt.attrs) {
        switch (evt.attrs[i]) {
          case 'defaultAdapter':
            this._debug('defaultAdapter changed.');
            if (this._bluetooth.defaultAdapter) {
              // Default adapter attribute change.
              // Usually, it means that we reach new default adapter.
              this._adapter = this._bluetooth.defaultAdapter;
              this._isEnabled = (this._adapter.state === 'enabled');
              this._stateChangeHandler =
                this._bluetoothAdapterHandler.bind(this);
              this._adapter.addEventListener('attributechanged',
                this._stateChangeHandler);
              this._updateProfileState(this._adapter);
              if (typeof resolve === 'function') {
                resolve(this._adapter);
              }
            }
            break;
          default:
            break;
        }
      }
  },

  /**
   * Called by external for re-use adapter.
   * For defaultAdapter not ready case, we cached the Promise object
   * therefore all caller would get the same Promise object.
   *
   * @public
   */
  getAdapter: function bt_getAdapter() {
    if (this._adapter) {
      return new Promise((resolve) => {
        this._debug('return cached adapter');
        resolve(this._adapter);
      });
    } else {
      // return cached promise to caller if the promise is exist
      if (this._cacheGetAdapterPromise) {
        return this._cacheGetAdapterPromise;
      } else {
        this._debug('try to get adapter');
        // cache the promise which listen to defaultAdapter change
        this._cacheGetAdapterPromise = new Promise((resolve) => {
          this._promiseAdapterChangeHandler =
            this._bluetoothManagerHandler.bind(this, resolve);
          this._bluetooth.addEventListener('attributechanged',
            this._promiseAdapterChangeHandler);
        });
        return this._cacheGetAdapterPromise;
      }
    }
  },

  /**
   * Maintain bluetooth enable/disable stat.
   *
   * @public
   */
  get isEnabled() {
    return this._isEnabled;
  },

  /**
   * Console log.
   *
   * @param  {[type]} msg debug message
   */
  _debug: function bt__debug(msg) {
    if (!this.onDebug) {
      return;
    }

    console.log('[System Bluetooth]: ' + msg);
  }
};

  exports.Bluetooth2 = Bluetooth;
})(window);
