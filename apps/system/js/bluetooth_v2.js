'use strict';
/**
 * Bluetooth2 is compatible with Bluetooth APIv2 and used to enable/
 * disable bluetooth hardware, get bluetooth adapter, and check target
 * bluetooth profile is connected.
 *
 * Bluetooth api v2 is the two level structure.
 * We use _btManagerHandler to handle BluetoothManager defaultAdapter
 * change event and _btAdapterHandler to handle status change event.
 */
/* global Service, LazyLoader, BluetoothIcon, BluetoothTransferIcon,
   BluetoothHeadphoneIcon */
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
   * @public
   * @type {Boolean} turn on/off the console log
   */
  onDebug: false,

  /**
   * Store a reference of the default adapter.
   * If the adapter is not availble, no bluetooth operation could be
   * executed.
   *
   * @private
   */
  _adapter: null,

  /**
   * Hold instance of bluetooth adapter state change handler.
   *
   * @private
   */
  _bindBtAdapterHandler: null,

  /**
   * Hold instance of HFP status changed handler.
   *
   * @private
   */
  _bindHfpStatusChangedHandler: null,

  /**
   * Hold instance of A2DP status changed handler.
   *
   * @private
   */
  _bindA2dpStatusChangedHandler: null,

  /**
   * Hold instance of SCO status changed handler.
   *
   * @private
   */
  _bindScoStatusChangedHandler: null,

  /**
   * Store a reference for mozBluetooth.
   *
   * @private
   */
  _bluetooth: null,

  /**
   * State of Bluetooth default adapter.
   *
   * @private
   */
  _isEnabled: false,

  /**
   * Build-in Bluetooth profiles.
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
   * @private
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
          detail: {
            name: profile,
            connected: connected
          }
        }));
      if (profile === 'opp' && this.transferIcon) {
        this.transferIcon.update();
      }
      if (profile === 'a2dp' && this.headphoneIcon) {
        this.headphoneIcon.update();
      }
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

    // hold the instances so we can remove it when needed
    this._bindBtAdapterHandler =
      this._btAdapterHandler.bind(this);

    this._bindHfpStatusChangedHandler = function(evt) {
      this._setProfileConnected(this.Profiles.HFP, evt.status);
    }.bind(this);
    this._bindA2dpStatusChangedHandler = function(evt) {
      this._setProfileConnected(this.Profiles.A2DP, evt.status);
    }.bind(this);
    this._bindScoStatusChangedHandler = function(evt) {
      this._setProfileConnected(this.Profiles.SCO, evt.status);
    }.bind(this);

    this._initDefaultAdapter();

    this._bluetooth.addEventListener('attributechanged',
      this._btManagerHandler.bind(this));

    // decouple enable/disable bluetooth function from other system part
    window.addEventListener('request-enable-bluetooth',
      this._requestEnableHandler.bind(this));
    window.addEventListener('request-disable-bluetooth',
      this._requestDisableHandler.bind(this));

    // relay bluetooth transfer system messages
    navigator.mozSetMessageHandler('bluetooth-opp-transfer-start',
      this._oppTransferStartHandler.bind(this));
    navigator.mozSetMessageHandler('bluetooth-opp-transfer-complete',
      this._oppTransferCompleteHandler.bind(this));

    // expose isEnabled function to Service.query
    Service.registerState('isEnabled', this);

    // handle statusbar icons
    LazyLoader.load(['js/bluetooth_icon.js',
                     'js/bluetooth_transfer_icon.js',
                     'js/bluetooth_headphone_icon.js']).then(() => {
      this.icon = new BluetoothIcon(this);
      this.icon.start();
      this.transferIcon = new BluetoothTransferIcon(this);
      this.transferIcon.start();
      this.headphoneIcon = new BluetoothHeadphoneIcon(this);
      this.headphoneIcon.start();
    }).catch(function(err) {
      console.error(err);
    });
  },

  /**
   * Generally bluetooth adapter is already available when start
   * this module and no related event will be received.
   * so we try to get the adapter then listen to mozBluetooth change
   * to prevent race condition
   *
   * @private
   */
  _initDefaultAdapter: function() {
    this.debug('init bluetooth adapter');
    this._adapter = this._bluetooth.defaultAdapter;
    if (this._adapter) {
      this.debug('adapter is available');
      // listen states when the adapter is available
      this._adapterAvailableHandler();
      // dispatch event when default adapter is available
      this._dispatchAdapterState(true);

      // dispatch default bluetooth enable state
      this._isEnabled = (this._adapter.state === 'enabled');
      this._dispatchEnableState();
    } else {
      // dispatch event when default adapter is not available
      this._dispatchAdapterState(false);
    }
  },

  /**
   * Once adapter is available, listen to bluetooth state and
   * the connect stat of supported profiles.
   *
   * we only support two use cases for bluetooth connection:
   *   1. connecting with a headset
   *   2. transfering a file to/from another device
   * So we need to listen to corresponding events to know we are (aren't)
   * connected, then summarize to an event and dispatch to StatusBar
   *
   * @private
   */
  _adapterAvailableHandler: function bt__adapterAvailableHandler() {
    // listen to adapter state
    this._adapter.addEventListener('attributechanged',
      this._bindBtAdapterHandler);

    // headset connected cases
    this._adapter.addEventListener('hfpstatuschanged',
      this._bindHfpStatusChangedHandler);
    this._adapter.addEventListener('a2dpstatuschanged',
      this._bindA2dpStatusChangedHandler);
    this._adapter.addEventListener('scostatuschanged',
      this._bindScoStatusChangedHandler);
  },

  /**
   * Remove all EventListeners when default adapter is changed.
   */
  _adapterUnavailableHandler: function bt__adapterUnavailableHandler() {
    this.debug('default adapter is removed');
    // unbind headset connected cases
    this._adapter.removeEventListener('hfpstatuschanged',
      this._bindHfpStatusChangedHandler);
    this._adapter.removeEventListener('a2dpstatuschanged',
      this._bindA2dpStatusChangedHandler);
    this._adapter.removeEventListener('scostatuschanged',
      this._bindScoStatusChangedHandler);

    // unbind adapter
    this._adapter.removeEventListener('attributechanged',
      this._bindBtAdapterHandler);
  },

  /**
   * Update settings value and enable bluetooth hardware.
   *
   * @private
   */
  _requestEnableHandler: function bt__requestEnableHandler() {
    this.debug('enabling bluetooth');
    if (this._adapter) {
      // the state will be dispatched in _btAdapterHandler
      this._adapter.enable().then(() => { //resolve
        this.debug('bluetooth enabled');
      }, () => { //reject
        this.debug('can not get bluetooth adapter');
      });
    } else { // return current state since we can't process the request
      this.debug('adapter is not available');
      this._dispatchEnableState();
    }
  },

  /**
   * Update settings value and disable bluetooth hardware.
   *
   * @private
   */
  _requestDisableHandler: function bt__requestDisableHandler() {
    this.debug('disabling bluetooth');
    if (this._adapter) {
      // the state will be dispatched in _btAdapterHandler
      this._adapter.disable().then(() => { //resolve
        this.debug('bluetooth disabled');
      }, () => { //reject
        this.debug('can not get bluetooth adapter');
      });
    } else { // return current state since we can't process the request
      this.debug('adapter is not available');
      this._dispatchEnableState();
    }
  },

  /*
   * In file transfering case:
   * since System Message can't be listened in two js files within a app,
   * so we listen here but dispatch events to bluetooth_transfer.js
   * while getting bluetooth file transfer start system messages
   *
   * @private
   */
  _oppTransferStartHandler: function(transferInfo) {
    this._setProfileConnected(this.Profiles.OPP, true);
    window.dispatchEvent(new CustomEvent('bluetooth-opp-transfer-start',
      {
        detail: { transferInfo: transferInfo }
      }));
  },

  /*
   * In file transfering case:
   * since System Message can't be listened in two js files within a app,
   * so we listen here but dispatch events to bluetooth_transfer.js
   * while getting bluetooth file transfer complete system messages
   *
   * @private
   */
  _oppTransferCompleteHandler: function(transferInfo) {
    this._setProfileConnected(this.Profiles.OPP, false);
    window.dispatchEvent(new CustomEvent('bluetooth-opp-transfer-complete',
      {
        detail: { transferInfo: transferInfo }
      }));
  },

  /**
   * BT APIv2: Watch 'onattributechanged' event from
   * mozBluetooth.defaultAdapter for updating state information.
   *
   * @private
   * @param  {Object} evt event object
   */
  _btAdapterHandler:
    function bt__btAdapterHandler(evt) {
      for (var i in evt.attrs) {
        switch (evt.attrs[i]) {
          case 'state':
            if (this._adapter.state === 'enabled') {
              this.debug('state true');
              this._isEnabled = true;
              navigator.mozSettings.createLock()
                .set({'bluetooth.enabled': true});
              window.dispatchEvent(new CustomEvent('bluetooth-enabled'));
              this.icon && this.icon.update();
            } else if (this._adapter.state === 'disabled') {
              this.debug('state false');
              this._isEnabled = false;
              navigator.mozSettings.createLock()
                .set({'bluetooth.enabled': false});
              window.dispatchEvent(new CustomEvent('bluetooth-disabled'));
              this.icon && this.icon.update();
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
   * Here are three adapter change cases:
   *
   * null -> adapter: set new adapter and dispatch adapter state.
   * adapter -> null: clear defaultAdapter and listener.
   * adapterA -> adapterB: clean defaultAdapter and listener,
   *   then set new adapter and dispatch adapter state.
   *
   * @private
   * @param  {Object} evt event object
   */
  _btManagerHandler:
    function bt__btManagerHandler(evt) {
      for (var i in evt.attrs) {
        switch (evt.attrs[i]) {
          // Default adapter attribute change.
          // Usually, it means that we reach new default adapter.
          case 'defaultAdapter':
            this.debug('defaultAdapter changed.');
            if (this._bluetooth.defaultAdapter) {
              if (this._adapter !== this._bluetooth.defaultAdapter) {
                if (this._adapter !== null) { // adapter A -> adapter B
                  this.debug('origin adapter is removed');
                  this._dispatchAdapterState(false);
                  this._adapterUnavailableHandler();
                  this._adapter = null;
                }
                // set new adapter and dispatch adapter state
                this.debug('new adapter is added');
                this._adapter = this._bluetooth.defaultAdapter;
                this._isEnabled = (this._adapter.state === 'enabled');
                // listen states when the adapter is available
                this._adapterAvailableHandler();
                this._dispatchAdapterState(true);
              }
            } else { // adapter -> null
              this.debug('default adapter is removed');
              this._dispatchAdapterState(false);
              this._adapterUnavailableHandler();
              this._adapter = null;
            }
            break;
          default:
            break;
        }
      }
  },

  /**
   * Dispatch bluetooth adapter available state to system.
   *
   * @private
   */
  _dispatchAdapterState: function bt__dispatchAdapterState(state) {
    if (state) {
      window.dispatchEvent(new CustomEvent('bluetooth-available',
        { detail: { adapter: this._adapter }}));
    } else {
      window.dispatchEvent(new CustomEvent('bluetooth-unavailable'));
    }
  },

  /**
   * Dispatch bluetooth enable/disable state to system.
   *
   * @private
   */
  _dispatchEnableState: function bt__dispatchEnableState() {
    if (this._isEnabled) {
      window.dispatchEvent(new CustomEvent('bluetooth-enabled'));
    } else {
      window.dispatchEvent(new CustomEvent('bluetooth-disabled'));
    }
  },

  /**
   * Maintain bluetooth enable/disable state.
   *
   * @public
   */
  get isEnabled() {
    return this._isEnabled;
  },

  /**
   * Console log.
   *
   * @private
   * @param  {[type]} msg debug message
   */
  debug: function bt_debug(msg) {
    if (!this.onDebug) {
      return;
    }

    console.log('[System Bluetooth]: ' + msg);
  }
};

exports.Bluetooth2 = Bluetooth;
})(window);
