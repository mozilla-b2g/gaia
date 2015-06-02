/*
 * DevicePickerPanel is responsible for:
 *   - Render paired/found devices list in this panel.
 *   - Emit 'devicePicked' event with device address while a user click on a
 *     paired device.
 *   - Pair with the picked device while a user click on a found device.
 *     Emit 'devicePicked' event with device address until the picked device
 *     is pared.
 *   - Emit 'cancelSelection' event while a user click close button on the
 *     header for leaving.
 *
 * @module DevicePickerPanel
 */
define(function(require) {
  'use strict';

  var BtContext = require('modules/bluetooth/bluetooth_context');
  var BtTemplateFactory = require('views/bt_template_factory');
  var ListView = require('modules/mvvm/list_view');

  var _debug = false;
  var Debug = function() {};
  if (_debug) {
    Debug = function btdpp_debug(msg) {
      console.log('--> [DevicePickerPanel]: ' + msg);
    };
  }

  var DevicePickerPanel = {
    /**
     * A instance to maintain paired devices list view.
     *
     * @access private
     * @memberOf DevicePickerPanel
     * @type {Object}
     */
    _pairedDevicesListView: null,

    /**
     * A instance to maintain found devices list view.
     *
     * @access private
     * @memberOf DevicePickerPanel
     * @type {Object}
     */
    _foundDevicesListView: null,

    /**
     * Construct elements.
     *
     * @access private
     * @memberOf DevicePickerPanel
     * @type {Object}
     */
    _elements: {
      view: {
        viewDevicePicker: document.querySelector('.devices-list-view')
      },
      header: {
        headerActionClose: document.querySelector('.devices-list-header')
      },
      paired: {
        pairedDevicesHeader: document.querySelector('.bluetooth-paired-title'),
        pairedDevicesList: document.querySelector('.bluetooth-paired-devices')
      },
      found: {
        foundDevicesHeader: document.querySelector('.bluetooth-found-title'),
        foundDevicesList: document.querySelector('.bluetooth-devices')
      },
      search: {
        searchingItem: document.querySelector('.bluetooth-searching'),
        searchItem: document.querySelector('.bluetooth-search'),
        searchButton: document.querySelector('.search-device')
      }
    },

    /**
     * The object maintains listeners' callback per property name.
     * Each listener would be called as following definition.
     * 'devicePicked' - be called when device is picked and paired successfully.
     * 'cancelSelection': - be called when user click on close button on header.
     *
     * @memberOf DevicePickerPanel
     * @type {Object}
     */
    _listeners: {
      'devicePicked': [],
      'cancelSelection': []
    },

    /**
     * Default adapter of Bluetooth.
     *
     * @access private
     * @memberOf DevicePickerPanel
     * @type {BluetoothAdapter}
     */
    _defaultAdapter: null,

    /**
     * The function init the paired/found devices list and search button.
     *
     * @access private
     * @memberOf DevicePickerPanel
     */
    _init: function btdpp__init() {
      // Bind click event for header.
      this._elements.header.headerActionClose.addEventListener('action',
        this._onHeaderActionCloseClick.bind(this));

      // Bind click event for search button.
      this._elements.search.searchButton.addEventListener('click',
        this._onSearchButtonClick.bind(this));

      // Bind click event for paired device item.
      var pairedDeviceTemplate =
        BtTemplateFactory('paired', this._onPairedDeviceItemClick.bind(this));

      // Create paired devices list view.
      this._pairedDevicesListView =
        ListView(this._elements.paired.pairedDevicesList,
                 BtContext.getPairedDevices(),
                 pairedDeviceTemplate);

      // Bind click event for found device item.
      var foundDeviceTemplate =
        BtTemplateFactory('remote', this._onFoundDeviceItemClick.bind(this));

      // Create found devices list view.
      this._foundDevicesListView =
        ListView(this._elements.found.foundDevicesList,
                 BtContext.getRemoteDevices(),
                 foundDeviceTemplate);

      // Init items state.
      this._initItemsState();

      // search devices automatically while the panel is inited.
      BtContext.startDiscovery().then(() => {
        Debug('_init(): startDiscovery successfully');
      }, (reason) => {
        Debug('_init(): startDiscovery failed, ' +
              'reason = ' + reason);
      });
    },

    /**
     * The function init these elements which are displayed in this panel.
     *
     * @access private
     * @memberOf DevicePickerPanel
     */
    _initItemsState: function btdpp__initItemsState() {
      // paired devices header
      BtContext.observe('hasPairedDevice',
        this._updatePairedDevicesHeader.bind(this));
      this._updatePairedDevicesHeader(BtContext.hasPairedDevice);

      // paired devices list
      BtContext.observe('state', this._updatePairedDevicesList.bind(this));
      this._updatePairedDevicesList(BtContext.state);

      // found devices list
      BtContext.observe('state', this._updateFoundDevicesList.bind(this));
      this._updateFoundDevicesList(BtContext.state);

      this._pairedDevicesListView.enabled = true;
      this._foundDevicesListView.enabled = true;

      // search
      BtContext.observe('state', this._updateSearchItem.bind(this));
      this._updateSearchItem(BtContext.state);

      BtContext.observe('discovering', this._updateSearchingItem.bind(this));
      this._updateSearchingItem(BtContext.discovering);
    },

    /**
     * Start discovery devices while the search button is clicked.
     *
     * @access private
     * @memberOf DevicePickerPanel
     */
    _onHeaderActionCloseClick: function btdpp__onHeaderActionCloseClick() {
      Debug('_onHeaderActionCloseClick():');
      // Emit 'cancelSelection' event to outer modules.
      var event = {
        type: 'cancelSelection'
      };
      this._emitEvent(event);
    },

    /**
     * Start discovery devices while the search button is clicked.
     *
     * @access private
     * @memberOf DevicePickerPanel
     */
    _onSearchButtonClick: function btdpp__onSearchButtonClick() {
      Debug('_onSearchButtonClick():');
      BtContext.startDiscovery().then(() => {
        Debug('_onSearchButtonClick(): startDiscovery successfully');
      }, (reason) => {
        Debug('_onSearchButtonClick(): startDiscovery failed, ' +
              'reason = ' + reason);
      });
    },

    /**
     * While the paired device is clicked, emit event to outer modules with 
     * the device item.
     *
     * @access private
     * @memberOf DevicePickerPanel
     */
    _onPairedDeviceItemClick:
    function btdpp__onPairedDeviceItemClick(deviceItem) {
      Debug('_onPairedDeviceItemClick(): deviceItem.address = ' +
            deviceItem.address);
      Debug('_onPairedDeviceItemClick(): deviceItem.paired = ' +
            deviceItem.paired);
      // Emit 'devicePicked' event to outer modules with the device item.
      var event = {
        type: 'devicePicked',
        detail: {
          address: deviceItem.address
        }
      };
      this._emitEvent(event);
    },

    /**
     * Pair with the clicked device. While the device is paired successfully,
     * emit event to outer modules with the device item.
     *
     * @access private
     * @memberOf DevicePickerPanel
     */
    _onFoundDeviceItemClick:
    function btdpp__onFoundDeviceItemClick(deviceItem) {
      Debug('_onFoundDeviceItemClick(): deviceItem.address = ' +
            deviceItem.address);
      // Update device pairing status first.
      deviceItem.paired = 'pairing';
      // Pair with the remote device.
      BtContext.pair(deviceItem.address).then(() => {
        Debug('_onFoundDeviceItemClick(): pair successfully');
        // Emit 'devicePicked' event to outer modules with the 
        // paired device item.
        var event = {
          type: 'devicePicked',
          detail: {
            address: deviceItem.address
          }
        };
        this._emitEvent(event);
      }, (reason) => {
        Debug('_onFoundDeviceItemClick(): pair failed, ' +
              'reason = ' + reason);
        // Reset the paired status back to false, 
        // since the 'pairing' status is given in Gaia side.
        deviceItem.paired = false;
        // Show alert message while pair device failed.
        this._alertPairFailedErrorMessage(reason);
      });
    },

    /**
     * Show an alert dialog since the device is failed in pairing process.
     *
     * @access private
     * @memberOf DevicePickerPanel
     */
    _alertPairFailedErrorMessage:
    function btdpp__alertPairFailedErrorMessage(errorReason) {
      var _ = navigator.mozL10n.get;
      var msg = _('error-pair-title'); // This is a default message.
      if (errorReason === 'Repeated Attempts') {
        msg = msg + '\n' + _('error-pair-toofast');
      } else if (errorReason === 'Authentication Failed') {
        msg = msg + '\n' + _('error-pair-pincode');
      }
      window.alert(msg);
    },

    /**
     * A function to show/hide paired devices header.
     *
     * @access private
     * @memberOf DevicePickerPanel
     */
    _updatePairedDevicesHeader:
    function btdpp__updatePairedDevicesHeader(hasPairedDevice) {
      Debug('_updatePairedDevicesHeader(): ' +
            'callback from observe "hasPairedDevice" = ' + hasPairedDevice);
      this._elements.paired.pairedDevicesHeader.hidden =
        !(hasPairedDevice && (BtContext.state === 'enabled'));
    },

    /**
     * A function to show/hide paired devices list.
     *
     * @access private
     * @memberOf DevicePickerPanel
     */
    _updatePairedDevicesList: function btdpp__updatePairedDevicesList(state) {
      Debug('_updatePairedDevicesList(): ' +
            'callback from observe "state" = ' + state);
      this._elements.paired.pairedDevicesHeader.hidden =
        !((state === 'enabled') && (BtContext.hasPairedDevice));
      this._elements.paired.pairedDevicesList.hidden = (state !== 'enabled');
    },

    /**
     * A function to show/hide found devices list.
     *
     * @access private
     * @memberOf DevicePickerPanel
     */
    _updateFoundDevicesList: function btdpp__updateFoundDevicesList(state) {
      Debug('_updateFoundDevicesList(): ' +
            'callback from observe "state" = ' + state);
      this._elements.found.foundDevicesHeader.hidden = (state !== 'enabled');
      this._elements.found.foundDevicesList.hidden = (state !== 'enabled');
    },

    /**
     * A function to show/hide search item.
     *
     * @access private
     * @memberOf DevicePickerPanel
     */
    _updateSearchItem: function btdpp__updateSearchItem(state) {
      Debug('_updateSearchItem(): ' +
            'callback from observe "state" = ' + state);
      this._elements.search.searchItem.hidden = (state !== 'enabled');
    },

    /**
     * A function to show/hide searching description item.
     *
     * @access private
     * @memberOf DevicePickerPanel
     */
    _updateSearchingItem: function btdpp__updateSearchingItem(discovering) {
      Debug('_updateSearchingItem(): ' +
            'callback from observe "discovering" = ' + discovering);
      this._elements.search.searchingItem.hidden = !discovering;
      this._elements.search.searchButton.disabled = discovering;
    },

    /**
     * A function to emit event to each registered listener by the input type.
     *
     * @memberOf DevicePickerPanel
     * @param {Object} options
     * @param {String} options.type - type of event name
     * @param {Object} options.detail - the object pass to the listener
     */
    _emitEvent: function btdpp__emitEvent(options) {
      this._listeners[options.type].forEach(function(listener) {
        listener(options);
      });
    },

    /**
     * The method will provide event listener for outer modules to regist.
     *
     * @access public
     * @memberOf DevicePickerPanel
     * @param {String} eventName
     * @param {Function} callback
     */
    addEventListener: function btdpp_addEventListener(eventName, callback) {
      if (callback && (this._listeners.hasOwnProperty(eventName))) {
        this._listeners[eventName].push(callback);
      }
    },

    /**
     * The method will provide event listener for outer modules to un-regist.
     *
     * @access public
     * @memberOf DevicePickerPanel
     * @param {String} eventName
     * @param {Function} callback
     */
    removeEventListener:
    function btdpp_removeEventListener(eventName, callback) {
      if (callback && (this._listeners.hasOwnProperty(eventName))) {
        var index = this._listeners[eventName].indexOf(callback);
        if (index >= 0) {
          this._listeners[eventName].splice(index, 1);
        }
      }
    },

    /**
     * The setter will show/hide the device picker view for outer modules.
     *
     * @access public
     * @memberOf DevicePickerPanel
     * @param {Boolean} enabled
     */
    set visible(enabled) {
      // display device picker view
      this._elements.view.viewDevicePicker.hidden = !enabled;
    }
  };

  DevicePickerPanel._init();
  return DevicePickerPanel;
});
