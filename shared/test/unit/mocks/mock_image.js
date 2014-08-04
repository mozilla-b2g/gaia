'use strict';

/* exported MockImage */

var MockImage = function() {
  this.complete = false;
  this.onload = null;
  this.onabort = null;
  this.onerror = null;

  MockImage.instances.push(this);
};

MockImage.instances = [];

MockImage.triggerEvent = function(name) {
  MockImage.instances.forEach(function(aInstance) {
    aInstance.triggerEvent(name);
  });
};

MockImage.prototype.triggerEvent = function(name) {
  var callback = this[name];

  if (name === 'onload') {
    this.complete = true;
  }

  callback && callback();
};
