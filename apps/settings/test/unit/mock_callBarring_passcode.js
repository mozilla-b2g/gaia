/* exported MockInputPasscodeScreen, MockChangePasscodeScreen */

'use strict';

var MockInputPasscodeScreen = (function() {
  return {
    init: function _init(){},
    show: function show(){}
  };
})();

var MockChangePasscodeScreen = (function() {
  function _init() {
    return new Promise(function(resolve, reject) {
      resolve();
    });
  }

  return {
    launch: _init
  };
})();

