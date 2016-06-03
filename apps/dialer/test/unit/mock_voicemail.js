'use strict';

/* exported MockVoicemail */

var MockVoicemail = {
  mResolvePromise: function(value) {
    if (this.onFulfill) {
      this.onFulfill(value);
    }
  },
  check: function(number, cardIndex) {
    var self = this;
    return {
      then: function(onFulfill, onReject) {
        self.onFulfill = onFulfill;
        self.onReject = onReject;
      }
    };
  }
};
