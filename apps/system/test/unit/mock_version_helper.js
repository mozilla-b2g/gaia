'use strict';
(function (exports) {
  var MockVersionHelper = function(isUp) {
    let resolveFunc = null;
    let rejectFunc = null;
    return {
      getVersionInfo: function() {
        return {
          then: function (resolve, reject) {
            resolveFunc = resolve;
            rejectFunc = reject;
          }
        };
      },
      resolve: function (arg) {
                 if (resolveFunc) {
                   resolveFunc(arg);
                 }
               },
      reject: function (arg) {
                if (rejectFunc) {
                  rejectFunc(arg);
                }
              }
    };
  };
  exports.MockVersionHelper = MockVersionHelper;
})(window);