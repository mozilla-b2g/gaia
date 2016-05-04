/*
 * TransferManager is responsible for:
 *   - Handling system message 'activity' while there is an activity request
 *     incoming. Then, it will post result/error to requesting app.
 *   - Watching Bluetooth enabled/disabled state, then show/hide turn Bluetooth
 *     on dialog.
 *   - Watching default adapter existed or not. And will post error if we cannot
 *     get default adapter.
 *   - Watching 'devicePicked', 'cancelSelection' events from DevicePickerPanel
 *     module. Then, do corrected activity service flow regarding user decision.
 *
 * @module BluetoothContext
 */
define(function(require) {
  'use strict';

  var AdapterManager = require('modules/bluetooth/bluetooth_adapter_manager');
  var BtContext = require('modules/bluetooth/bluetooth_context');
  var CannotTransferDialog = require('views/cannot_transfer_dialog');
  var DevicePickerPanel = require('views/device_picker_panel');
  var TurnBluetoothOnDialog = require('views/turn_bluetooth_on_dialog');

  var _debug = false;
  var debug = function() {};
  if (_debug) {
    debug = function bttm_debug(msg) {
      console.log('--> [TransferManager]: ' + msg);
    };
  }

  var TransferManager = {
    /**
     * An instance to access activity source.
     *
     * @access private
     * @memberOf TransferManager
     * @type {Object}
     */
    _activity: null,

    /**
     * The init function only watches the 'activity' event from system message.
     *
     * @access private
     * @memberOf TransferManager
     */
    init: function bttm_init() {
      // Watch 'activity' event from system message.
      this._watchActivityRequest();
    },

    /**
     * Watch 'activity' event with callback function from system message.
     *
     * @access private
     * @memberOf TransferManager
     */
    _watchActivityRequest: function bttm__watchActivityRequest() {
      navigator.mozSetMessageHandler('activity',
        this._activityHandler.bind(this));
    },

    /**
     * Handle 'activity' request. Then make decision to service the request or
     * reject it.
     *
     * @access private
     * @memberOf TransferManager
     * @param {Object} activityRequest
     */
    _activityHandler: function bttm__activityHandler(activityRequest) {
      debug('_activityHandler(): activityRequest = ' +
            JSON.stringify(activityRequest));
      if (activityRequest.source.data.blobs &&
          activityRequest.source.data.blobs.length > 0) {
        this._activity = activityRequest;
        // Source info is enough to servie file transfer.
        // Start to init and observe Bluetooth relative modules.
        this._observeDefaultAdapter();
        this._observeBluetoothEnabled();
        this._watchEventFromDevicePicker();
        DevicePickerPanel.visible = true;
      } else {
        debug('_activityHandler(): Cannot transfer without blobs data!');
        this._cannotTransfer();
      }
    },

    /**
     * Show alert dialog. End the activity service while a user confirm to close
     * the dialog.
     *
     * @access private
     * @memberOf TransferManager
     */
    _cannotTransfer: function bttm__cannotTransfer() {
      debug('_cannotTransfer(): show alert dialog!!');
      // show an alert with the overdue message
      if (!CannotTransferDialog.isVisible) {
        CannotTransferDialog.showConfirm().then(() => {
          // Post error with reason then end the activity service.
          this._endTransferWithReason('cancelled');
        });
      }
    },

    /**
     * Post result/error to end the activity service.
     *
     * @access private
     * @memberOf TransferManager
     */
    _endTransferWithReason: function bttm__endTransferWithReason(reason) {
      debug('_endTransferWithReason(): reason = ' + reason);
      if (reason === 'transferred') {
        this._activity.postResult(reason);
      } else if (reason === 'cancelled') {
        this._activity.postError(reason);
      }

      this._activity = null;
    },

    /**
     * Observe and get default adapter from bluetooth adapter manager.
     *
     * @access private
     * @memberOf TransferManager
     */
    _observeDefaultAdapter: function bttm__observeDefaultAdapter() {
      // Observe 'defaultAdapter' property for reaching default adapter.
      AdapterManager.observe('defaultAdapter',
        this._onDefaultAdapterChanged.bind(this));
      this._onDefaultAdapterChanged(AdapterManager.defaultAdapter);
    },

    /**
     * Observe and get 'enabled' property from bluetooth context.
     *
     * @access private
     * @memberOf TransferManager
     */
    _observeBluetoothEnabled: function bttm__observeBluetoothEnabled() {
      // Observe Bluetooth 'enabled' property from hardware side.
      BtContext.observe('enabled', this._onBluetoothEnabledChanged.bind(this));
      this._onBluetoothEnabledChanged(BtContext.enabled);
    },

    /**
     * 'defaultAdapter' change event handler from adapter manager for
     * updating it immediately.
     *
     * @access private
     * @memberOf TransferManager
     * @param {Object} BluetoothAdapter newAdapter
     * @param {Object} BluetoothAdapter oldAdapter
     */
    _onDefaultAdapterChanged:
    function bttm__onDefaultAdapterChanged(newAdapter, oldAdapter) {
      if (oldAdapter && (newAdapter === null)) {
        debug('_onDefaultAdapterChanged(): Can not get bluetooth adapter!');
        // Post error with reason then end the activity service.
        this._endTransferWithReason('cancelled');
      }
    },

    /**
     * 'enabled' change event handler from bluetooth context for
     * updating UI flow immediately.
     *
     * @access private
     * @memberOf TransferManager
     * @param {Boolean} enabled
     */
    _onBluetoothEnabledChanged:
    function bttm__onBluetoothEnabledChanged(enabled) {
      debug('_onBluetoothEnabledChanged(): enabled = ' + enabled);
      switch(enabled) {
        case undefined:
          break;
        case true:
          // Close the confirmation dialog
          TurnBluetoothOnDialog.close();
          break;
        default:
          TurnBluetoothOnDialog.showConfirm().then((result) => {
            if (result === 'confirm') {
              // Turn Bluetooth on.
              BtContext.setEnabled(true);
            } else if (result === 'cancel') {
              // Post error with reason then end the activity service.
              this._endTransferWithReason('cancelled');
            }
          });
          break;
      }
    },

    /**
     * Watch 'devicePicked', 'cancelSelection' event from device picker panel.
     *
     * @access private
     * @memberOf TransferManager
     */
    _watchEventFromDevicePicker: function bttm__watchEventFromDevicePicker() {
      debug('_watchEventFromDevicePicker():');
      // Watch 'devicePicked' event for reaching device picked from user.
      DevicePickerPanel.addEventListener('devicePicked',
        this._onDevicePicked.bind(this));

      // Watch 'cancelSelection' event for reaching cancel selection from user.
      DevicePickerPanel.addEventListener('cancelSelection',
        this._onCancelSelection.bind(this));
    },

    /**
     * While the device is picked from user, let's send file(s) to the device.
     *
     * @access private
     * @memberOf TransferManager
     * @param {Object} event
     * @param {String} event.type - type of event name
     * @param {Object} event.detail - device info in this object
     * @param {Object} event.detail.address - address of device
     * @returns {Promise}
     */
    _onDevicePicked: function bttm__onDevicePicked(event) {
      // Send file to the device via address
      debug('_onDevicePicked(): address of target device = ' +
            event.detail.address);
      var targetDeviceAddress = event.detail.address;
      var blobs = this._activity.source.data.blobs;

      // Produce sending files schedule.
      // Then, post message to system app for sending files in queue.
      var schedule = this._produceSendingFilesSchedule(blobs.length);
      this._postMessageToSystemApp(schedule);

      // Send each file via Bluetooth sendFile API
      return Promise.all(blobs.map((blob, index) => {
        /**
         * Check blob.name because sendFile() API needs a "file"
         * object and a filaname before sending it.
         * If there is no filename in the blob, Bluetooth API will give a
         * default name "Unknown.jpeg".
         * So Bluetooth app has to find out the name via device storage.
         */
        if (blob.name) {
          // The blob has name, send the blob directly.
          debug('blob is sending with name...');
          return BtContext.sendFile(targetDeviceAddress, blob);
        } else if (this._activity.source.data.filepaths) {
          // The blob does not have name,
          // browse the file via filepath from storage again.
          var filepath = this._activity.source.data.filepaths[index];
          var storage = navigator.getDeviceStorage('sdcard');
          return storage.get(filepath).then((file) => {
            debug('getFile succeed & file is sending... file = ' + file);
            return BtContext.sendFile(targetDeviceAddress, file);
          }, (error) => {
            debug('getFile failed so that blob is sending without filename ' +
                  error && error.name);
            return BtContext.sendFile(targetDeviceAddress, blob);
          });
        } else {
          // The blob does not have name and filepath,
          // pass the blob without name to send file directly.
          debug('no filepath to get from device storage ' +
                'so that blob is sending without filename');
          return BtContext.sendFile(targetDeviceAddress, blob);
        }
      })).then(() => {
        debug('all files are already sent out..');
        // Post result with reason then end the activity service.
        this._endTransferWithReason('transferred');
        return Promise.resolve();
      });
    },

    /**
     * While a user cancel selection, let's post result then end the activity
     * service.
     *
     * @access private
     * @memberOf TransferManager
     * @param {Object} event
     * @param {String} event.type - type of event name
     */
    _onCancelSelection: function bttm__onCancelSelection(event) {
      debug('_onCancelSelection(): cancel from user decision');
      // Post error with reason then end the activity service.
      this._endTransferWithReason('cancelled');
    },

    /**
     * A function is a role producer.
     * Bluetooth app produce one message for each sending file request.
     *
     * @access private
     * @memberOf TransferManager
     * @param {Number} numberOfTasks - number of tasks
     * @returns {Object}
     */
    _produceSendingFilesSchedule:
    function bttm__produceSendingFilesSchedule(numberOfTasks) {
      // Construct a object to contain info of sending files schedule.
      // And the info will be posted message to system app.
      // The result of send files will be displayed on notification.
      var sendingFilesSchedule = {
        numberOfFiles: numberOfTasks,
        numSuccessful: 0,
        numUnsuccessful: 0
      };
      return sendingFilesSchedule;
    },

    /**
     * A function to do inner app communcation.
     *
     * @access private
     * @memberOf TransferManager
     * @param {Object} message - the info of sending files schedule
     */
    _postMessageToSystemApp:
    function bttm__postMessageToSystemApp(message) {
      // Set up Inter-App Communications
      var getRequest = navigator.mozApps.getSelf();
      getRequest.onsuccess = (evt) => {
        var app = evt.target.result;
        // If IAC doesn't exist, just bail out.
        if (!app.connect) {
          debug('_postMessageToSystemApp(): Cannot post message since no ' +
                'connect function, message = ' + JSON.stringify(message));
          return;
        }
        // Post message object to system app.
        app.connect('bluetoothTransfercomms').then((ports) => {
          ports.forEach((port) => {
            port.postMessage(message);
            debug('_postMessageToSystemApp(): sending files schedule = ' +
                  JSON.stringify(message));
          });
        });
      };
    }
  };

  return TransferManager;
});
