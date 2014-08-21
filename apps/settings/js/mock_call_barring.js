/* export MockCallBarring */
'use strict';

var MockCallBarring = {
  getCallBarringOption: function (getOptions) {
    var response = {
      'program': getOptions.program,
      'enabled': true,
      'password': getOptions.password || '',
      'serviceClass': getOptions.serviceClass
    };

    return {
      set onsuccess(successCallback) {
        var self = this;
        setTimeout(function() {
          self.result = response;
          successCallback.call(self);
        }, 100);
      }
      // set onerror(errorCallback) {
      //   errorCallback();
      // }
    };
  },
  setCallBarringOption: function (setOptions) {
    var response = {
      'program': setOptions.program,
      'enabled': setOptions.enabled,
      'password': setOptions.password || '',
      'serviceClass': setOptions.serviceClass
    };

    return {
      set onsuccess(successCallback) {
        var self = this;
        setTimeout(function() {
          self.result = response;
          successCallback.call(self);
        }, 100);
      }
      // set onerror(errorCallback) {
      //   errorCallback();
      // }
    };
  }
};
