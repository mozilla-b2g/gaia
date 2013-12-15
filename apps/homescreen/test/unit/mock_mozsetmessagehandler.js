'use strict';

var realMozSetMessageHandler = navigator.mozSetMessageHandler;
var msgHandler = {};

navigator.mozSetMessageHandler = function(type, handler) {
  msgHandler[type] = handler;
};
