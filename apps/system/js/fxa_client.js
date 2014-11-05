/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/**
 * Check fxa_manager.js for a further explanation about Firefox Accounts and
 * its architecture in Firefox OS.
 */

/* exported FxAccountsClient */

'use strict';

var FxAccountsClient = function FxAccountsClient() {

  var eventCount = 0;

  var callbacks = {};

  var sendMessage = function sendMessage(message, successCb, errorCb) {
    if (!eventCount) {
      window.addEventListener('mozFxAccountsChromeEvent', onChromeEvent);
    }

    var id = getUUID();
    callbacks[id] = {
      successCb: successCb,
      errorCb: errorCb
    };

    var details = {
      id: id,
      data: message
    };

    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozFxAccountsContentEvent', true, true, details);
    window.dispatchEvent(event);

    eventCount++;
  };

  var onChromeEvent = function onChromeEvent(event) {
    var message = event.detail;

    if (!message.id) {
      console.warn('Got mozFxAccountsChromeEvent with no id');
      return;
    }

    var callback = callbacks[message.id];
    if (callback && typeof message.data !== 'undefined' && callback.successCb) {
      callback.successCb(message.data);
      delete callbacks[message.id];
    } else if (callback && message.error && callback.errorCb) {
      callback.errorCb(message.error);
      delete callbacks[message.id];
    }

    eventCount--;
    if (!eventCount) {
      window.removeEventListener('mozFxAccountsChromeEvent', onChromeEvent);
    }
  };

  var getUUID = function getUUID() {
    var s4 = function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
                 .toString(16)
                 .substring(1);
    };

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  };


  // === API ===

  var getAccounts = function getAccounts(successCb, errorCb) {
    sendMessage({
      method: 'getAccounts'
    }, successCb, errorCb);
  };

  var logout = function logout(successCb, errorCb) {
    sendMessage({
      method: 'logout'
    }, successCb, errorCb);
  };

  var queryAccount = function queryAccount(email, successCb, errorCb) {
    sendMessage({
      method: 'queryAccount',
      email: email
    }, successCb, errorCb);
  };

  var resendVerificationEmail = function resendVerificationEmail(email,
                                                       successCb, errorCb) {
    sendMessage({
      method: 'resendVerificationEmail',
      email: email
    }, successCb, errorCb);
  };

  var signIn = function signIn(email, password, successCb, errorCb) {
    sendMessage({
      method: 'signIn',
      email: email,
      password: password
    }, successCb, errorCb);
  };

  var signUp = function signUp(email, password, successCb, errorCb) {
    sendMessage({
      method: 'signUp',
      email: email,
      password: password
    }, successCb, errorCb);
  };

  var verificationStatus = function verificationStatus(email, successCb,
                                                       errorCb) {
    sendMessage({
      method: 'verificationStatus',
      email: email
    }, successCb, errorCb);
  };

  return {
    'getAccounts': getAccounts,
    'logout': logout,
    'queryAccount': queryAccount,
    'resendVerificationEmail': resendVerificationEmail,
    'signIn': signIn,
    'signUp': signUp,
    'verificationStatus': verificationStatus
  };

}();
