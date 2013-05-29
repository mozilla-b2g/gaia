(function(exports) {
'use strict';

var MockSettings = {
  mmsSizeLimitation: 300 * 1024,
  getMmsSizeLimitation: function ms_getMmsSizeLimitation(callback) {
    callback(this.mmsSizeLimitation);
  },
  mSetup: function() {
    MockSettings.mmsSizeLimitation = 300 * 1024;
  }
};

exports.MockSettings = MockSettings;

}(this));
