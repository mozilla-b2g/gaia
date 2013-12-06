'use strict';

(function(window) {
  var IccManager = navigator.mozIccManager;
  /**
   * SIMSlotManager creates/manages the current SIM slot on the device.
   * @type {Object}
   */
  window.SIMSlotManager = {
    /**
     * The number of SIM slots.
     * @type {Number}
     */
    length: 0,
    init: function ssm_init() {
      if (!IccManager)
        return;
      var conns = Array.prototype.slice.call(navigator.mozMobileConnections);
      this._conns = conns;
      this.length = conns.length;
      if (this._conns.length === 0)
        return;

      this._conns.forEach(function iterator(conn, index) {
        this._instances[index] = new SIMSlot(conn, index,
                                  IccManager.getIccById(conn.iccId));
      }, this);

      IccManager.addEventListener('iccdetected', this);
    },

    /**
     * We support multiSIM or not.
     * @return {Boolean} MultiSIM is available or not.
     */
    isMultiSIM: function() {
      return (this.length > 1);
    },

    /**
     * Check there is sim card on slot#index or not.
     * @param  {Number}  index The slot number.
     * @return {Boolean}       sim card is absent or not.
     */
    isSIMCardAbsent: function ssm_isSIMCardAbsent(index) {
      var slot = this.get(index);
      if (slot) {
        return slot.isAbsent();
      } else {
        return true;
      }
    },

    /**
     * Check there is no any sim card on device or not.
     * @return {Boolean} There is no sim card.
     */
    noSIMCardOnDevice: function ssm_noSIMCardOnDevice(index) {
      if (!IccManager || !IccManager.iccIds)
        return true;
      return (IccManager.iccIds.length === 0);
    },

    /**
     * Get specific SIM slot instance.
     * @param {Number} index The slot number.
     * @return {Object} The SIMSlot instance.
     */
    get: function ssm_get(index) {
      if (index >= this.length - 1)
        return null;

      return this._instances[index];
    },

    /**
     * Get specific mobileConnection object.
     * @param {Number} index The slot number.
     * @return {Object} The mobile connection object.
     */
    getMobileConnection: function ssm_getMobileConnection(index) {
      if (index >= this.length - 1)
        return null;

      return this._instances[index].conn;
    },

    /**
     * Get all sim slot instances
     * @return {Array} The array of sim slot instances.
     */
    getSlots: function ssm_getSlots() {
      return this._instances;
    },

    getByIccId: function ssm_getByIccId(iccId) {
      var found = null;
      this._instances.every(function iterator(slot) {
        if (slot.conn.iccId === iccId) {
          found = slot;
          return true;
        }
      }, this);
      return found;
    },

    handleEvent: function ssm_handleEvent(evt) {
      switch (evt.type) {
        case 'iccdetected':
          this.getByIccId(evt.iccId).update(IccManager.getIccById(conn.iccId));
          break;
      }
    }
  };

  SIMSlotManager.init();
}(this));
