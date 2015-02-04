'use strict';
/**
 * Bluetooth2 is compatible with Bluetooth APIv2 and used to enable/
 * diable bluetooth hardware, get bluetooth Adapter, and check target
 * bluetooth profile is connected.
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
  _debug: false,

  /**
   * Store a reference of the default adapter.
   *
   * @private
   */
  _adapter: null,

  _attributeHandler: null,

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

    this._attributeHandler = this._bluetoothAttrChangeHandler.bind(this);

    // watch attributechanged event
    this._bluetooth.addEventListener('attributechanged',
      this._attributeHandler);

    // clear defaultAdapter and listener once adapter is removed
    this._bluetooth.addEventListener('adapterremoved', () => {
      this._adapter = null;
      this._bluetooth.removeEventListener(this._attributeHandler);
    });

    // if bluetooth is enabled in booting time, try to get adapter now
    this.debug('init bluetooth adapter');
    this._adapter = this._bluetooth.defaultAdapter;
    this._adapter.addEventListener('attributechanged',
      this._bluetoothAdapterAttrChangeHandler.bind(this));

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
   * update settings value and enable bluetooth hardware
   * the call order should be exact like above or
   * the quicksettings will fall
   *
   * @private
   */
  _enableHandler: function bt__enableHandler() {
    this.debug('enable bluetooth');
    this.getAdapter().then((adapter) => {
      adapter.enable().then(() => { //resolve
        this._updateProfileStat(adapter);
        var reqEn = navigator.mozSettings.createLock().set({
          'bluetooth.enabled': true
        });
        reqEn.onsuccess = function() {
          window.dispatchEvent(new CustomEvent('bluetooth-enabled'));
        }.bind(this);
      }, () => { //reject
        this.debug('can not get bluetooth adapter');
      });
    });
  },

  /**
   * update settings value and disable bluetooth hardware
   * the call order should be exact like above or
   * the quicksettings will fall
   *
   * @private
   */
  _disableHandler: function bt__enableHandler() {
    this.debug('bluetooth settings disabled');
    this.getAdapter().then((adapter) => {
      adapter.disable().then(() => { //resolve
        var reqDis = navigator.mozSettings.createLock().set({
          'bluetooth.enabled': false
        });
        reqDis.onsuccess = function() {
          window.dispatchEvent(new CustomEvent('bluetooth-disabled'));
        }.bind(this);
      }, () => { //reject
        this.debug('can not get bluetooth adapter');
      });
    });
  },

  /**
   * Dispatch events to bluetooth_transfer.js
   * while getting bluetooth file transfer start/complete system messages
   *
   * @private
   * @param  {String} msg message
   * @param  {Object} transferInfo relayed info
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
   * BT APIv2: Watch 'onattributechanged' event from
   * mozBluetooth.defaultAdapter for updating state information.
   *
   * @private
   * @param  {Object} evt event object
   */
  _bluetoothAdapterAttrChangeHandler:
    function bt__bluetoothAdapterAttrChangeHandler(evt) {
      for (var i in evt.attrs) {
        switch (evt.attrs[i]) {
          case 'state':
            if (this._adapter.state === 'enabled') {
              this._isEnabled = true;
              // this.icon && this.icon.update();
            } else if (this._adapter.state === 'disabled') {
              this._isEnabled = false;
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
  _bluetoothAttrChangeHandler: function bt__bluetoothAttrChangeHandler(evt) {
    for (var i in evt.attrs) {
      switch (evt.attrs[i]) {
        case 'defaultAdapter':
          // Default adapter attribute change.
          // Usually, it means that we reach new default adapter.
          this._adapter = this._bluetooth.defaultAdapter;
          this._adapter.addEventListener('attributechanged',
            this._bluetoothAdapterAttrChangeHandler.bind(this));
          this._updateProfileStat(this._adapter);
          this.debug('defaultAdapter changed.');
          Promise.resolve(this._adapter);
          break;
        default:
          break;
      }
    }
  },

  /**
   * Called by external for re-use adapter.
   *
   * @public
   */
  getAdapter: function bt_getAdapter() {
    return new Promise(function(resolve, reject) {
      if (this._adapter) {
        this.debug('return cached adapter');
        resolve(this._adapter);
      } else {
        this.debug('try to get adapter');
        // need time to get bluetooth adapter at first run
        this._bluetooth.addEventListener('attributechanged',
          this._attributeHandler);
      }
    }.bind(this));
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
  debug: function bt_debug(msg) {
    if (!this._debug) {
      return;
    }

    console.log('[System Bluetooth]: ' + msg);
  }
};

  exports.Bluetooth2 = Bluetooth;
})(window);
