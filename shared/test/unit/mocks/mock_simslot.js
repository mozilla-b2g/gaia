/* exported MockSIMSlot */
'use strict';

/**
 * Default 'icc' object will be created if 'card' is 'undefined'.
 * Card is absent if 'card' is null.
 */
var MockSIMSlot = function(conn, index, card) {
  this._smsc = '0123456789';
  this.conn = conn;
  this.index = index;
  this.absent = card === null;
  this.locked = false;
  this.simCard = card !== undefined ? card : {
    cardState: 'ready',
    iccInfo: {
      iccid: '11111111111111111111',
      iccType: 'sim',
      mcc: '000',
      mnc: '000',
      spn: null,
      isDisplayNetworkNameRequired: false,
      isDisplaySpnRequired: false,
      msisdn: null
    }
  };
  this.update = function() {};
  this.isAbsent = function() { return this.absent; };
  this.isLocked = function() { return this.locked; };
  this.getSmsc = function() { return this._smsc; };
  this.getCardState = function() { return this.simCard.cardState; };
  this.isUnknownState = function() {
    var empty = (this.simCard.cardState === '');
    var unknown = (this.simCard.cardState === 'unknown');
    return !this.simCard.cardState || unknown || empty;
  };

  // Inject method
  ['sendStkResponse', 'sendStkMenuSelection',
    'sendStkTimerExpiration', 'sendStkEventDownload'].forEach(function(name) {
      this[name] = function() {};
    }, this);

  // Inject dom request
  ['getCardLock', 'unlockCardLock', 'setCardLock',
    'getCardLockRetryCount', 'readContacts',
    'updateContact', 'iccOpenChannel', 'iccExchangeAPDU',
    'iccCloseChannel'].forEach(function(name) {
      this[name] = function() {
        return {};
      };
    }, this);
};
