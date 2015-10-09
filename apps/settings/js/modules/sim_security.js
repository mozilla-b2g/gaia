/**
 * This is a simple model that can help us mimic the status change event
 * when enabling / disabling simcard.
 *
 * @module SimSecurity
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var EventEmitter = require('modules/base/event_emitter');

  var APIS = [
    'unlockCardLock',
    'setCardLock',
    'updateContact',
    'getCardLock',
    'getCardLockRetryCount'
  ];

  var EVENT_CHANGE_APIS = [
    'unlockCardLock',
    'setCardLock'
  ];

  var SimSecurity = Module.create(function() {
    this.super(EventEmitter).call(this, [
      'pin-enabled',
      'pin-disabled',
      'pin2-enabled',
      'pin2-disabled',
      'fdn-enabled',
      'fdn-disabled',
      'pin-changed',
      'pin2-changed'
    ]);
  }).extend(EventEmitter);

  SimSecurity.prototype._getIccByCardIndex = function(cardIndex) {
    if (cardIndex === undefined) {
      return null;
    }

    var iccObj;
    if (navigator.mozMobileConnections[cardIndex]) {
      var iccId = navigator.mozMobileConnections[cardIndex].iccId;
      if (iccId) {
        iccObj = navigator.mozIccManager.getIccById(iccId);
      }
    }

    return iccObj;
  };

  APIS.forEach(function(apiName) {
    SimSecurity.prototype[apiName] = function(cardIndex) {
      if (arguments.length < 2) {
        this.throw(
          'You are using SimSecurity API wrongly and you may forget' +
          'to put your cardIndex, please check again');
      }

      var passedArguments = [].slice.call(arguments, 1);
      var icc = this._getIccByCardIndex(cardIndex);

      if (!icc) {
        console.error('We can\'t find needed icc object');
        return Promise.reject();
      } else {
        var func = icc[apiName];
        var promise = func.apply(icc, passedArguments);
        return promise.then((result) => {
          if (EVENT_CHANGE_APIS.indexOf(apiName) > -1) {
            // we don't have to check passing arguments
            // because we are under Promise.then()
            var status = '';
            var lockType = passedArguments[0].lockType;
            var enabled = passedArguments[0].enabled;
            var newPin = passedArguments[0].newPin;

            // If we have newPin, it means that we are changing pin or pin2
            if (newPin) {
              status = 'changed';
            } else {
              status = enabled ? 'enabled' : 'disabled';
            }
            this._emitEvent(lockType + '-' + status, cardIndex);
          }
          return result;
        });
      }
    };
  });

  var simSecurity = new SimSecurity();
  return simSecurity;
});
