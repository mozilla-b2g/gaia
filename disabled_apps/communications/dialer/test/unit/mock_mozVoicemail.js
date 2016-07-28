'use strict';

(function(exports) {
  var MockMozVoicemail = {
    _number: null,
    getNumber: function(serviceId) {
      return this._number;
    }
  };
  exports.MockMozVoicemail = MockMozVoicemail;
}(window));
