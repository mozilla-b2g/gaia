'use strict';

var DEBUGGING = true;

function debug() {
  var message = [];
  for (var i = 0, len = arguments.length, obj; i < len; i++) {
    obj = arguments[i];
    message.push(typeof obj === 'object' ? JSON.stringify(obj) : obj);
  }
  if (window.dump) {
    window.dump(message.join(' '));
  } else if (console && console.log) {
    console.log(message.join(' '));
  }
}
