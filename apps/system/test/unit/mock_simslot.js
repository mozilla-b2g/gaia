var MockSIMSlot = function(conn, index) {
  this.conn = conn;
  this.index = index;
  this.simCard = {
    cardState: null
  };
  this.update = function() {};
  this.isAbsent = function() {};
  this.isLocked = function() { return false };
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
      this[name] = function() {};
    }, this);
};
