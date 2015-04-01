 'use strict';

var MockMessageHandler = function() {

};

MockMessageHandler.prototype = {
  init: function() {},
  stopActivity: function() {},
  resumeActivity: function() { return false; }
};
