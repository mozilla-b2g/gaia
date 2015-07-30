'use strict';

var MockDigitalClock = function() {
  this.init = sinon.stub();
  this.start = sinon.stub();
  this.stop = sinon.stub();
  this.generateGreeting = sinon.stub();
};

MockDigitalClock.prototype = {};
