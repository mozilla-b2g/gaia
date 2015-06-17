'use strict';

var MockDigitalClock = function() {
  this.init = sinon.stub();
  this.start = sinon.stub();
  this.stop = sinon.stub();
};

MockDigitalClock.prototype = {};
