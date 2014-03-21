'use strict';
/* exported MockFbReaderUtilsObj */

var MockFbReaderUtilsObj = function() {
  this.getContactByNumber = function(number, cb, errorCb) {
    if (this.inError) {
      errorCb({
        name: 'Data in error'
      });
      return;
    }

    if (number !== this.targetFbNumber) {
      cb(null);
      return;
    }

    cb({ name: [this.fbContactName], isFbContact: true });
  };
};
