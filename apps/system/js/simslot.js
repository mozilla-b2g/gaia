'use strict';

(function(window) {
  var _start = Date.now();
  var DEBUG = false;

  var lockTypes = {
    'pinRequired': true,
    'pukRequired': true,
    'networkLocked': true,
    'corporateLocked': true,
    'serviceProviderLocked': true
  };
  /**
   * SIMSlot is the API wrapper for each mobileConnection,
   * and since one mobileConnection matches one SIM slot,
   * we call it SIMSlot.
   *
   * @param {Object} conn  mobileConnection
   * @param {index} index The slot number of this SIM slot.
   * @param {Object} [card] iccObject
   *
   * @property {Object} simCard Represent the current active iccObj,
   *                         i.e., SIM card.
   * @property {Number} index The slot number of this SIM slot.
   */
  window.SIMSlot = function SIMSlot(conn, index, card) {
    this.index = index;
    this.conn = conn;
    if (card) {
      this.update(card);
    }

    /**
     * TODO: Add event listeners on this.conn
     */
    /**
     * The event represents the instance is initialized.
     * @event SIMSlot#simslot-created
     */
    this.publish('created');
  };

  SIMSlot.EVENTS = ['cardstatechange', 'iccinfochange',
                    'stkcommand', 'stksessionend'];

  SIMSlot.METHODS = ['sendStkResponse', 'sendStkMenuSelection',
                   'sendStkTimerExpiration', 'sendStkEventDownload'];
  SIMSlot.DOM_REQUEST_METHODS = ['getCardLock', 'unlockCardLock', 'setCardLock',
                       'getCardLockRetryCount', 'readContacts',
                       'updateContact', 'iccOpenChannel', 'iccExchangeAPDU',
                       'iccCloseChannel'];

  /**
   * Update the iccObj.
   *
   * This method is called by SIMSlotManager when the iccObj
   * needs to be updated.
   * @param  {Object} iccObj The iccObj belongs to this slot.
   */
  SIMSlot.prototype.update = function ss_update(iccObj) {
    this.simCard = iccObj;
    this.constructor.EVENTS.forEach(function iterater(evt) {
      iccObj.addEventListener(evt, this);
    }, this);

    this.constructor.DOM_REQUEST_METHODS.forEach(function iterator(domRequest) {
      this[domRequest] = function() {
        return iccObj[domRequest].apply(iccObj, arguments);
      };
    }, this);

    this.constructor.METHODS.forEach(function iterator(method) {
      this[method] = function() {
        return iccObj[method].apply(iccObj, arguments);
      };
    }, this);

    this.publish('updated');
  };

  /**
   * The prefix of every event published by the SIMSlot instance.
   * @type {String}
   */
  SIMSlot.prototype.EVENT_PREFIX = 'simslot-';
  SIMSlot.prototype.CLASS_NAME = 'SIMSLOT';

  /**
   * Publish an event with this instance in the detail.
   * @param  {String} eventName The event name without prefix
   */
  SIMSlot.prototype.publish = function ss_publish(eventName) {
    this.debug(' publish: ' + eventName);
    window.dispatchEvent(new CustomEvent(this.EVENT_PREFIX + eventName, {
      detail: this
    }));
  };

  SIMSlot.prototype.handleEvent = function ss_handleEvent(evt) {
    switch (evt.type) {
      default:
        this.publish(evt.type);
        if (this.simCard) {
          this.debug(this.simCard.cardState);
        }
        break;
    }
  };

  SIMSlot.prototype.debug = function() {
    if (DEBUG) {
      console.log('[' + this.CLASS_NAME + ']' +
        '[' + (this.index) + ']' +
        '[' + (new Date().getTime() / 1000 - _start).toFixed(3) + ']' +
        Array.slice(arguments).concat());
    }
  };

  /**
   * Indicate the slot has SIM card or not.
   * @return {Boolean} Without SIM card or not.
   */
  SIMSlot.prototype.isAbsent = function ss_isAbsent() {
    return (!this.simCard || this.simCard &&
      this.simCard.iccInfo && this.simCard.iccInfo.iccid === null);
  };

  /**
   * Indicate SIM card in the slot is locked or not.
   * @return {Boolean} SIM card locked or not.
   */
  SIMSlot.prototype.isLocked = function ss_isLocked() {
    return !!lockTypes[this.simCard.cardState];
  };
}(this));
