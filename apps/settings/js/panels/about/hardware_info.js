/**
 * Handle HardwareInfo related functionality
 *
 * @module about/HardwareInfo
 */
define(function(require) {
  'use strict';

  /**
   * @alias module:about/HardwareInfo
   * @class HardwareInfo
   * @returns {HardwareInfo}
   */
  var HardwareInfo = function() {
    this._elements = null;
  };

  HardwareInfo.prototype = {
    /**
     * initialization.
     *
     * @access public
     * @memberOf HardwareInfo.prototype
     * @param {HTMLElement} elements
     */
    init: function hi_init(elements) {
      this._elements = elements;

      this._loadHardwareInfo();
    },

    /**
     * Load hardware related informations.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     */
    _loadHardwareInfo: function hi__loadHardwareInfo() {
      var _conns = navigator.mozMobileConnections;
      if (!_conns) {
        this._elements.deviceInfoPhoneNum.hidden = true;
        return;
      }

      var _isMultiSim = _conns.length > 1;
      // Only show the list item when there are valid iccinfos.
      var _hideListItem = true;

      // update msisdns
      while (this._elements.deviceInfoMsisdns.hasChildNodes()) {
        this._elements.deviceInfoMsisdns.removeChild(
          this._elements.deviceInfoMsisdns.lastChild);
      }

      Array.prototype.forEach.call(_conns, function(conn, index) {
        var iccId = conn.iccId;
        if (!iccId) {
          return;
        }

        var iccObj = navigator.mozIccManager.getIccById(iccId);
        if (!iccObj) {
          return;
        }

        var iccInfo = iccObj.iccInfo;
        if (!iccInfo) {
          return;
        }

        _hideListItem = false;
        var span = this._renderPhoneNumberElement(iccInfo, index, _isMultiSim);
        this._elements.deviceInfoMsisdns.appendChild(span);
      }.bind(this));

      this._elements.deviceInfoPhoneNum.hidden = _hideListItem;
    },

    /**
     * render phone number element based on SIM card info.
     *
     * If the icc card is gsm card, the phone number is in msisdn.
     * Otherwise, the phone number is in mdn.
     *
     * @access private
     * @memberOf HardwareInfo.prototype
     * @param {Object} iccInfo iccInfo data
     * @param {Number} index index number
     * @param {Boolean} isMultiSim has multiple SIM
     * @return {HTMLElement} span element with number info
     */
    _renderPhoneNumberElement: function hi__renderPhoneNumberElement(
      iccInfo, index, isMultiSim) {
        var span = document.createElement('span');
        var msisdn = iccInfo.msisdn || iccInfo.mdn;
        if (msisdn) {
          if (isMultiSim) {
            navigator.mozL10n.setAttributes(span,
              'deviceInfo-MSISDN-with-index', {
                index: index + 1,
                msisdn: msisdn
            });
          } else {
            span.textContent = msisdn;
          }
        } else {
          if (isMultiSim) {
            navigator.mozL10n.setAttributes(span,
              'unknown-phoneNumber-sim', { index: index + 1 });
          } else {
            span.setAttribute('data-l10n-id', 'unknown-phoneNumber');
          }
        }
        return span;
    }
  };

  return function ctor_hardwareInfo() {
    return new HardwareInfo();
  };
});
