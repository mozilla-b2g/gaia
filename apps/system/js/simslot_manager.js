/* global SIMSlot, System, SIMSlotManager */
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
    _instances: [],

    /**
     * This property is used to make sure sim_lock won't get inited
     * before we receive iccdetected when bootup.
     * @type {Boolean}
     */
    ready: false,

    init: function ssm_init() {
      if (!IccManager) {
        return;
      }

      this._conns = Array.prototype.slice.call(navigator.mozMobileConnections);
      this.length = this._conns.length;

      if (this._conns.length === 0) {
        return;
      }

      this._conns.forEach(function iterator(conn, index) {
        this._instances.push(new SIMSlot(conn, index,
                             IccManager.getIccById(conn.iccId)));
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
      if (!IccManager || !IccManager.iccIds) {
        return true;
      }
      return (IccManager.iccIds.length === 0);
    },

    /**
     * Get specific SIM slot instance.
     * @param {Number} index The slot number.
     * @return {Object} The SIMSlot instance.
     */
    get: function ssm_get(index) {
      if (index >= this.length - 1) {
        return null;
      }

      return this._instances[index];
    },

    /**
     * Get specific mobileConnection object.
     * @param {Number} index The slot number.
     * @return {Object} The mobile connection object.
     */
    getMobileConnection: function ssm_getMobileConnection(index) {
      if (index >= this.length - 1) {
        return null;
      }

      return this._instances[index].conn;
    },

    /**
     * Get all sim slot instances
     * @return {Array} The array of sim slot instances.
     */
    getSlots: function ssm_getSlots() {
      return this._instances;
    },

    getSlotByIccId: function ssm_getSlotByIccId(iccId) {
      var found = null;
      this._instances.some(function iterator(slot, index) {
        if (slot.conn.iccId && slot.conn.iccId === iccId) {
          found = slot;
          return true;
        } else {
          return false;
        }
      }, this);
      return found;
    },

    handleEvent: function ssm_handleEvent(evt) {
      switch (evt.type) {
        case 'iccdetected':
          var slot = this.getSlotByIccId(evt.iccId);

          if (slot) {
            slot.update(IccManager.getIccById(evt.iccId));

            // this is used to handle the case if `iccdetected`
            // got emitted slower than `will-unlock`
            if (!this.ready) {
              this.ready = true;
              System.publish('simslotready');
            }
          }
          break;
      }
    }
  };

  SIMSlotManager.init();
}(this));
