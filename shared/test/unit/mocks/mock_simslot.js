/* exported MockSIMSlot */
'use strict';

var MockSIMSlot = function(conn, index) {
  this._smsc = '0123456789';
  this.conn = conn;
  this.index = index;
  this.absent = false;
  this.locked = false;
  this.simCard = {
    cardState: null
  };
  this.update = function() {};
  this.isAbsent = function() { return this.absent; };
  this.isLocked = function() { return this.locked; };
  this.getSmsc = function() { return this._smsc; };

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
