/* exported MockSystem */
'use strict';
var MockSystem = {
  mPublishEvents: {},
  publish: function(eventName, detail) {
    var evt = new CustomEvent(eventName, { detail: detail });
    window.dispatchEvent(evt);
  }
};
