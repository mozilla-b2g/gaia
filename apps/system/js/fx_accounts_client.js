/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/**
 * Check fxa_manager.js for a further explanation about Firefox Accounts and
 * its architecture in Firefox OS.
 */

/* exported FxAccountsClient */

'use strict';

var FxAccountsClient = function FxAccountsClient() {

  var listening;

  var promises = {};

  var sendMessage = function sendMessage(message) {
    return new Promise((resolve, reject) => {
      if (!listening) {
        window.addEventListener('mozFxAccountsChromeEvent', onChromeEvent);
        listening = true;
      }

      var id = getUUID();
      promises[id] = { resolve, reject };

      var details = {
        id: id,
        data: message
      };

      var event = document.createEvent('CustomEvent');
      event.initCustomEvent('mozFxAccountsContentEvent', true, true, details);
      window.dispatchEvent(event);
    });
  };

  var onChromeEvent = function onChromeEvent(event) {
    var message = event.detail;

    if (!message.id) {
      console.warn('Got mozFxAccountsChromeEvent with no id');
      return;
    }

    var promise = promises[message.id];
    if (promise && typeof message.data !== 'undefined') {
      promise.resolve(message.data);
      delete promises[message.id];
    } else if (promise && message.error) {
      promise.reject(message.error);
      delete promises[message.id];
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

  var getAccount = function getAccount() {
    return sendMessage({
      method: 'getAccount'
    });
  };

  var getAssertion = function getAssertion(options) {
    return sendMessage({
      method: 'getAssertion',
      silent: options ? options.silent : null,
      audience: options ? options.audience : null
    });
  };

  var getKeys = function getKeys() {
    return sendMessage({
      method: 'getKeys'
    });
  };

  var logout = function logout() {
    return sendMessage({
      method: 'logout'
    });
  };

  var queryAccount = function queryAccount(email) {
    return sendMessage({
      method: 'queryAccount',
      email: email
    });
  };

  var resendVerificationEmail = function resendVerificationEmail(email) {
    return sendMessage({
      method: 'resendVerificationEmail',
      email: email
    });
  };

  var signIn = function signIn(email, password) {
    return sendMessage({
      method: 'signIn',
      email: email,
      password: password
    });
  };

  var signUp = function signUp(email, password) {
    return sendMessage({
      method: 'signUp',
      email: email,
      password: password
    });
  };

  var verificationStatus = function verificationStatus(email) {
    return sendMessage({
      method: 'verificationStatus',
      email: email
    });
  };

  return {
    'getAccount': getAccount,
    'getAssertion': getAssertion,
    'getKeys': getKeys,
    'logout': logout,
    'queryAccount': queryAccount,
    'resendVerificationEmail': resendVerificationEmail,
    'signIn': signIn,
    'signUp': signUp,
    'verificationStatus': verificationStatus
  };

}();
