/* global SIMSlot, SIMSlotManager */
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
     * The timeout to wait for the second SIM
     * @type {Number}
     */
    TIMEOUT_FOR_SIM2: 2000,

    /**
     * Timer used to wait for the second SIM
     * @type {Number} timeoutId
     */
    _timerForSIM2: null,

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

      var allSIMCardDetected = true;
      this._conns.forEach(function iterator(conn, index) {
        var slot = new SIMSlot(conn, index,
                               IccManager.getIccById(conn.iccId));
        this._instances.push(slot);
        if (slot.isAbsent()) {
          allSIMCardDetected = false;
        }
      }, this);

      if (allSIMCardDetected) {
        this.publishSIMSlotIsReady();
      } else if (this.isMultiSIM() && this.hasOnlyOneSIMCardDetected()) {
        // we are now in DSDS device with one simcard detected.
        this.waitForSecondSIM();
      }

      // 'iccdetected' shall always be listened to even when 
      // 'allSIMCardDetected' is set to true. In addition to detect UICC after
      // device boot up, we also rely on this event to update the new Icc 
      // Object created from IccManager to corresponding SIMSlot when user 
      // toggles airplane mode ON/OFF.
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
     * Make sure we really have one simcard information
     * @return {Boolean} we already have one simcard.
     */
    hasOnlyOneSIMCardDetected: function() {
      var sim0Absent = this.isSIMCardAbsent(0);
      var sim1Absent = this.isSIMCardAbsent(1);
      var hasOneSim =
        (sim0Absent && !sim1Absent) || (!sim0Absent && sim1Absent);
      return hasOneSim;
    },

    /**
     * Check there is no any sim card on device or not.
     * @return {Boolean} There is no sim card.
     */
    noSIMCardOnDevice: function ssm_noSIMCardOnDevice() {
      if (!IccManager || !IccManager.iccIds) {
        return true;
      }
      return (IccManager.iccIds.length === 0);
    },

    noSIMCardConnectedToNetwork: function ssm_noSIMCardConnectedToNetwork() {
      if (!IccManager || !IccManager.iccIds) {
        return true;
      }
      return this._instances.every(function iterator(instance) {
        return instance.conn.voice && instance.conn.voice.emergencyCallsOnly;
      });
    },

    /**
     * Get specific SIM slot instance.
     * @param {Number} index The slot number.
     * @return {Object} The SIMSlot instance.
     */
    get: function ssm_get(index) {
      if (index > this.length - 1) {
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
      if (index > this.length - 1) {
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

    /**
     * Get specified simslot by iccId
     * @return {Object} The SIMSlot instance.
     */
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

    /**
     * This method is used to make sure if we can't receive the 2nd
     * `iccdetected` event during the timeout, we would treat this
     * situation as DSDS device with only one simcard inserted.
     */
    waitForSecondSIM: function() {
      var self = this;
      this._timerForSIM2 = setTimeout(function() {
        clearTimeout(self._timerForSIM2);
        self.publishSIMSlotIsReady();
      }, this.TIMEOUT_FOR_SIM2);
    },

    /**
     * We have to make sure our simcards are ready and emit
     * this event out to notify sim_settings_helper & sim_lock
     * do related operations.
     */
    publishSIMSlotIsReady: function() {
      if (!this.ready) {
        this.ready = true;
        window.dispatchEvent(new CustomEvent('simslotready'));
      }
    },

    handleEvent: function ssm_handleEvent(evt) {
      switch (evt.type) {
        case 'iccdetected':
          var slot = this.getSlotByIccId(evt.iccId);

          if (slot) {
            slot.update(IccManager.getIccById(evt.iccId));

            // we are now in single sim device
            if (!this.isMultiSIM()) {
              this.publishSIMSlotIsReady();
            } else {
              // we are now in DSDS device
              // if we have one simcard already
              if (this.hasOnlyOneSIMCardDetected()) {
                this.waitForSecondSIM();
              } else {
                // we have two simcards already
                clearTimeout(this._timerForSIM2);
                this.publishSIMSlotIsReady();
              }
            }
          }
          break;
      }
    }
  };

  SIMSlotManager.init();
}(window));
