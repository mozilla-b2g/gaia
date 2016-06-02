/*exported MockFinishScreen*/
'use strict';

var MockFinishScreen = {
  init: function(cb) {
    if (typeof cb === 'function') {
      cb();
    }
  }
};
