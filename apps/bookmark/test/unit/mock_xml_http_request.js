'use strict';

/* exported MockXMLHttpRequest */
var MockXMLHttpRequest = function() {
  this.response = 'foo';
};

MockXMLHttpRequest.prototype.send = function() {
  this.status = '200';
  this.onload();
};

MockXMLHttpRequest.prototype.setRequestHeader = function() {

};

MockXMLHttpRequest.prototype.open = function() {

};
