/*exported MockNavigatormozMobileMessage */

'use strict';

var MockNavigatormozMobileMessage = {
  SMSC: '+4400000000',
  getSmscAddress: function() {
    return {
      result: this.SMSC || '0',
      set onsuccess(callback) {
        callback.call(this);
      },
      set onerror(e) {}
    };
  }
};

