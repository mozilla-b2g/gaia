'use strict';

function MockHandledCall(call) {
  this.call = call;
  this.node = document.createElement('section'); // fake dom
}

MockHandledCall.prototype.handleEvent = function hc_handle(evt) {
};

MockHandledCall.prototype.startTimer = function hc_startTimer() {
};

MockHandledCall.prototype.updateCallNumber = function hc_updateCallNumber() {
};

MockHandledCall.prototype.replaceAdditionalContactInfo =
  function hc_replaceAdditionalContactInfo(additionalContactInfo) {
};

MockHandledCall.prototype.restoreAdditionalContactInfo =
  function hc_restoreAdditionalContactInfo(additionalContactInfo) {
};

MockHandledCall.prototype.formatPhoneNumber =
  function hc_formatPhoneNumber(ellipsisSide, maxFontSize) {
};

MockHandledCall.prototype.replacePhoneNumber =
  function hc_replacePhoneNumber(phoneNumber, ellipsisSide, maxFontSize) {
};

MockHandledCall.prototype.restorePhoneNumber =
  function hc_restorePhoneNumber() {
};

MockHandledCall.prototype.updateDirection = function hc_updateDirection() {
};

MockHandledCall.prototype.remove = function hc_remove() {
};

MockHandledCall.prototype.connected = function hc_connected() {
};

MockHandledCall.prototype.busy = function hc_busy() {
};

MockHandledCall.prototype.disconnected = function hc_disconnected() {
};

MockHandledCall.prototype.show = function hc_show() {
};

MockHandledCall.prototype.hide = function hc_hide() {
};
