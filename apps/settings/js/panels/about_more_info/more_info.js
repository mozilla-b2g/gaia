/**
 * Show misc informations
 *
 * @module abou_more_info/MoreInfo
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');

  /** MMI control code used for retrieving a phone's IMEI code. */
  var GET_IMEI_COMMAND = '*#06#';

  /**
   * @alias module:abou_more_info/MoreInfo
   * @class MoreInfo
   * @returns {MoreInfo}
   */
  var MoreInfo = function() {
    this._elements = {};
  };

  MoreInfo.prototype = {
    /**
     * initialization.
     *
     * @access public
     * @memberOf MoreInfo.prototype
     * @param {HTMLElement} elements
     */
    init: function mi_init(elements) {
      this._elements = elements;

      this._loadImei();
      this._loadIccId();
      this._loadGaiaCommit();
      this._loadMacAddress();
      this._loadBluetoothAddress();
    },

    /**
     * observe and show MacAddress.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     */
    _loadMacAddress: function mi__loadMacAddress() {
      SettingsListener.observe('deviceinfo.mac', '', function(macAddress) {
        this._elements.deviceInfoMac.textContent = macAddress;
      }.bind(this));
    },

    /**
     * convert date to UTC format.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     */
    _dateToUTC: function mi__dateToUTC(d) {
      var arr = [];
      [
        d.getUTCFullYear(), (d.getUTCMonth() + 1), d.getUTCDate(),
        d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()
      ].forEach(function(n) {
        arr.push((n >= 10) ? n : '0' + n);
      });
      return arr.splice(0, 3).join('-') + ' ' + arr.join(':');
    },

    /**
     * show Gaia commit number.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     */
    _loadGaiaCommit: function mi__loadGaiaCommit() {
      var GAIA_COMMIT = 'resources/gaia_commit.txt';

      if (this._elements.dispHash.textContent) {
        return; // `gaia-commit.txt' has already been loaded
      }

      var req = new XMLHttpRequest();
      req.onreadystatechange = (function(e) {
        if (req.readyState === 4) {
          if (req.status === 0 || req.status === 200) {
            var data = req.responseText.split('\n');

            /**
             * XXX it would be great to pop a link to the github page
             * showing the commit, but there doesn't seem to be any way to
             * tell the browser to do it.
             */

            var d = new Date(parseInt(data[1] + '000', 10));
            this._elements.dispDate.textContent = this._dateToUTC(d);
            this._elements.dispHash.textContent = data[0].substr(0, 8);
          } else {
            console.error('Failed to fetch gaia commit: ', req.statusText);
          }
        }
      }).bind(this);

      req.open('GET', GAIA_COMMIT, true); // async
      req.responseType = 'text';
      req.send();
    },

    /**
     * Retrieves the IMEI code corresponding with the specified SIM card slot.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     * @param {Integer} simSlotIndex The slot whose IMEI code
     *   we want to retrieve.
     * @return {Promise} A promise that resolves to the IMEI code or rejects
     *          if an error occurred.
     */
    _getImeiCode: function mi__getImeiCode(simSlotIndex) {
      return new Promise(function(resolve, reject) {
        var connection = navigator.mozMobileConnections[simSlotIndex];
        var request = connection.sendMMI(GET_IMEI_COMMAND);
        request.onsuccess = function about_onGetImeiCodeSuccess() {
          if (!this.result || (this.result.serviceCode !== 'scImei') ||
              (this.result.statusMessage === null)) {
            reject(new Error('Could not retrieve the IMEI code for SIM' +
              simSlotIndex));
            return;
          }

          resolve(this.result.statusMessage);
        };
        request.onerror = function about_onGetImeiCodeError() {
          reject(this.error);
        };
      });
    },

    /**
     * Populate the IMEI information entry with the provided list of IMEI codes.
     * If the code is not given or if it's empty then the entry will be marked
     * as unavailable.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     * @param {Array} imeis An array of IMEI codes.
     */
    _createImeiField: function mi__createImeiField(imeis) {
      while (this._elements.deviceInfoImeis.hasChildNodes()) {
        this._elements.deviceInfoImeis.removeChild(
          this._elements.deviceInfoImeis.lastChild);
      }

      if (!imeis || imeis.length === 0) {
        var span = document.createElement('span');

        span.setAttribute('data-l10n-id', 'unavailable');
        this._elements.deviceInfoImeis.appendChild(span);
      } else {
        imeis.forEach(function(imei, index) {
          var span = document.createElement('span');

          span.textContent = (imeis.length > 1) ?
            'IMEI ' + (index + 1) + ': ' + imei : imei;
          span.dataset.slot = index;
          this._elements.deviceInfoImeis.appendChild(span);
        }.bind(this));
      }
    },

    /**
     * Loads all the phone's IMEI code in the corresponding entry.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     * @return {Promise} A promise that is resolved when the container has been
     *          fully populated.
     */
    _loadImei: function mi__loadImei() {
      var conns = navigator.mozMobileConnections;

      if (!navigator.mozTelephony || !conns) {
        this._elements.deviceInfoImeis.parentNode.hidden = true;
        return Promise.resolve();
      }

      // Retrieve all IMEI codes.
      var promises = [];

      for (var i = 0; i < conns.length; i++) {
        promises.push(this._getImeiCode(i));
      }

      var self = this;
      return Promise.all(promises).then(function(imeis) {
        self._createImeiField(imeis);
      }, function() {
        self._createImeiField(null);
      });
    },

    /**
     * show icc id.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     */
    _loadIccId: function mi__loadIccId() {
      var conns = navigator.mozMobileConnections;

      if (!navigator.mozTelephony || !conns) {
        this._elements.deviceInfoIccIds.parentNode.hidden = true;
        return;
      }

      var multiSim = conns.length > 1;

      // update iccids
      while (this._elements.deviceInfoIccIds.hasChildNodes()) {
        this._elements.deviceInfoIccIds.removeChild(
          this._elements.deviceInfoIccIds.lastChild);
      }
      Array.prototype.forEach.call(conns, function(conn, index) {
        var span = document.createElement('span');
        if (conn.iccId) {
          span.textContent = multiSim ?
            'SIM ' + (index + 1) + ': ' + conn.iccId : conn.iccId;
        } else {
          if (multiSim) {
            navigator.mozL10n.setAttributes(span,
              'deviceInfo-ICCID-unavailable-sim', { index: index + 1 });
          } else {
            span.setAttribute('data-l10n-id', 'unavailable');
          }
        }
        this._elements.deviceInfoIccIds.appendChild(span);
      }.bind(this));
    },

    /**
     * refreshing the address field only.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     * @param  {String} address Bluetooth address
     */
    _refreshBluetoothAddress: function mi__refreshBluetoothAddress(address) {
      // update UI fields
      for (var i = 0, l = this._elements.fields.length; i < l; i++) {
        this._elements.fields[i].textContent = address;
      }
    },

    _loadBluetoothAddress: function about_loadBluetoothAddress() {
      require(['modules/bluetooth/version_detector'],
        function(BluetoothAPIVersionDetector) {
          var bluetoothModulePath;
          if (BluetoothAPIVersionDetector.version === 1) {
            bluetoothModulePath = 'modules/bluetooth/bluetooth_v1';
          } else if (BluetoothAPIVersionDetector.version === 2) {
            bluetoothModulePath = 'modules/bluetooth/bluetooth';
          }

          require([bluetoothModulePath], function(Bluetooth) {
            Bluetooth.observe('address',
              this._refreshBluetoothAddress.bind(this));
          }.bind(this));
      });
    }
  };

  return function ctor_moreInfo() {
    return new MoreInfo();
  };
});
