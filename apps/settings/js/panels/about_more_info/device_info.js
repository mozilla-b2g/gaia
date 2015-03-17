/**
 * Show misc informations
 *
 * @module abou_more_info/DeviceInfo
 */
define(function(require) {
  'use strict';

  /** MMI control code used for retrieving a devices's IMEI code. */
  const GET_IMEI_COMMAND = '*#06#';

  /**
   * @alias module:abou_more_info/DeviceInfo
   * @class DeviceInfo
   * @returns {DeviceInfo}
   */
  var DeviceInfo = function() {
    this._elements = {};
  };

  DeviceInfo.prototype = {
    /**
     * initialization.
     *
     * @access public
     * @memberOf DeviceInfo.prototype
     * @param {HTMLElement} elements
     */
    init: function mi_init(elements) {
      this._elements = elements;

      this._loadImei();
      this._loadIccId();
    },

    /**
     * Retrieves the IMEI code corresponding with the specified SIM card slot.
     *
     * @access private
     * @memberOf DeviceInfo.prototype
     * @param {Integer} simSlotIndex The slot whose IMEI code
     *   we want to retrieve.
     * @return {Promise} A promise that resolves to the IMEI code or rejects
     *          if an error occurred.
     */
    _getImeiCode: function mi__getImeiCode(simSlotIndex) {
      var dialPromise = navigator.mozTelephony.dial(GET_IMEI_COMMAND,
        simSlotIndex);

      return dialPromise.then(function about_dialImeiPromise(call) {
        return call.result.then(function(result) {
          if (result && result.success &&
            (result.serviceCode === 'scImei')) {
            return result.statusMessage;
          } else {
            var errorMsg = 'Could not retrieve the IMEI code for SIM ' +
              simSlotIndex;
            console.log(errorMsg);
            return Promise.reject(
              new Error(errorMsg)
            );
          }
        });
      });
    },

    /**
     * Populate the IMEI information entry with the provided list of IMEI codes.
     * If the code is not given or if it's empty then the entry will be marked
     * as unavailable.
     *
     * @access private
     * @memberOf DeviceInfo.prototype
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

          if (imeis.length > 1) {
            navigator.mozL10n.setAttributes(span,
              'deviceInfo-IMEI-with-index', {
                index: index + 1,
                imei: imei
            });
          } else {
            span.textContent = imei;
          }

          span.dataset.slot = index;
          this._elements.deviceInfoImeis.appendChild(span);
        }.bind(this));
      }
    },

    /**
     * Loads all the device's IMEI code in the corresponding entry.
     *
     * @access private
     * @memberOf DeviceInfo.prototype
     * @return {Promise} A promise that is resolved when the container has been
     *          fully populated.
     */
    _loadImei: function mi__loadImei() {
      var conns = navigator.mozMobileConnections;

      if (!navigator.mozTelephony || !conns) {
        this._elements.listImeis.hidden = true;
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
     * @memberOf DeviceInfo.prototype
     */
    _loadIccId: function mi__loadIccId() {
      var conns = navigator.mozMobileConnections;

      if (!navigator.mozTelephony || !conns) {
        this._elements.listIccIds.hidden = true;
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
          if (multiSim) {
            navigator.mozL10n.setAttributes(span,
              'deviceInfo-ICCID-with-index', {
                index: index + 1,
                iccid: conn.iccId
            });
          } else {
            span.textContent = conn.iccId;
          }
        } else {
          if (multiSim) {
            navigator.mozL10n.setAttributes(span,
              'deviceInfo-ICCID-unavailable-sim', {
                index: index + 1
            });
          } else {
            span.setAttribute('data-l10n-id', 'unavailable');
          }
        }
        this._elements.deviceInfoIccIds.appendChild(span);
      }.bind(this));
    }
  };

  return function ctor_deviceInfo() {
    return new DeviceInfo();
  };
});
