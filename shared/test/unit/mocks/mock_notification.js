'use strict';

function MockNotification(title, options) {
  this.id = options.id || 0;
  this.title = title;
  this.icon = options.icon || undefined;
  this.body = options.body || undefined;
  this.tag = options.tag || undefined;
  this.mEvents = {};
}

MockNotification.prototype.close = function() {
  // nothing to do
};

MockNotification.prototype.addEventListener =
  function mockNotification_addEventListener(evt, callback) {
  this.mEvents[evt] = callback;
};

MockNotification.get = function mockNotification_get(options) {
  return {
    then: function() {}
  };
};
