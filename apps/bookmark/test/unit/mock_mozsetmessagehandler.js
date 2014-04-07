'use strict';

/* exported realMozSetMessageHandler, msgHandler */
var realMozSetMessageHandler = navigator.mozSetMessageHandler;
var msgHandler = {};

navigator.mozSetMessageHandler = function(type, handler) {
  msgHandler[type] = handler;
};
