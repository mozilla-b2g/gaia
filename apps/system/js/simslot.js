'use strict';

(function(window) {
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
    if (card)
      this.simCard = card;

    /**
     * TODO: Add event listeners on this.conn
     */
    /**
     * The event represents the instance is initialized.
     * @event SIMSlot#simslot-created
     */
    this.publish('created');
  };

  SIMSlot.events = ['cardstatechange', 'iccinfochange',
                    'stkcommand', 'stksessionend'];

  /**
   * Update the iccObj.
   *
   * This method is called by SIMSlotManager when the iccObj
   * needs to be updated.
   * @param  {Object} iccObj The iccObj belongs to this slot.
   */
  SIMSlot.prototype.update = function ss_update(iccObj) {
    this.simCard = iccObj;
    this.constructor.events.forEach(function iterater(evt) {
      iccObj.addEventListener(evt, this);
    }, this);
  };

  /**
   * The prefix of every event published by the SIMSlot instance.
   * @type {String}
   */
  SIMSlot.prototype.EVENT_PREFIX = 'simslot-';

  /**
   * Publish an event with this instance in the detail.
   * @param  {String} eventName The event name without prefix
   */
  SIMSlot.prototype.publish = function ss_publish(eventName) {
    window.dispatchEvent(new CustomEvent(this.EVENT_PREFIX + eventName), {
      detail: this
    });
  };

  SIMSlot.prototype.handleEvent = function ss_handleEvent(evt) {
    switch (evt.type) {
      default:
        this.publish(evt.type);
        break;
    }
  };

  /**
   * Indicate the slot has SIM card or not.
   * @return {Boolean} Without SIM card or not.
   */
  SIMSlot.prototype.isAbsent = function ss_isAbsent() {
    return (!!this.simCard || this.simCard.iccId === null);
  };
}(this));
