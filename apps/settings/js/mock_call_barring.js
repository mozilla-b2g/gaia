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
    var error = {
      'name': 'ERRORCILLO',
      'message': 'Better call Saul'
    };

    return {
      // set onsuccess(successCallback) {
      //   var self = this;
      //   setTimeout(function() {
      //     self.result = response;
      //     successCallback.call(self);
      //   }, 100);
      // }
      set onerror(errorCallback) {
        var self = this;
        setTimeout(function() {
          self.error = error;
          errorCallback.call(self);
        }, 100);
      }
    };
  },
  setCallBarringOption: function (setOptions) {
    var response = {
      'program': setOptions.program,
      'enabled': setOptions.enabled,
      'password': setOptions.password || '',
      'serviceClass': setOptions.serviceClass
    };
    var error = {
      'name': 'ERRORCILLO',
      'message': 'Better call Saul'
    };

    return {
      // set onsuccess(successCallback) {
      //   var self = this;
      //   setTimeout(function() {
      //     self.result = response;
      //     successCallback.call(self);
      //   }, 100);
      // }
      set onerror(errorCallback) {
        var self = this;
        setTimeout(function() {
          self.error = error;
          errorCallback.call(self);
        }, 100);
      }
    };
  }
};
