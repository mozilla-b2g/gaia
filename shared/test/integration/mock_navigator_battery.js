console.time("mock_navigator_battery.js");
'use strict';

var win = document.defaultView;
var battery = {
  level: 0,
  charging: false,
  addEventListener: function() {}
};

win.wrappedJSObject.navigator.__defineGetter__('battery', function() {
  return battery;
});
console.timeEnd("mock_navigator_battery.js");
