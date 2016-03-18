'use strict';

var win = document.defaultView;
var battery = {
  level: 0,
  charging: false,
  addEventListener: function() {}
};

win.wrappedJSObject.navigator.getBattery = function() {
  return Promise.resolve(battery);
};
