'use strict';

var realMozSetMessageHandler = navigator.mozSetMessageHandler, msgHandler;

navigator.mozSetMessageHandler = function(type, handler) {
  msgHandler = handler;
};
