/* global debug, Promise */
/* exported IACManager  */
'use strict';

var IACManager = (function() {
  var TIMEOUT = 60 * 1000; // 1 minute
  var configuration;

  function init(cfg) {
    configuration = cfg;
  }

  function broadcastStartOfSMSQuery(type) {
    return IACManager._sendBroadcastMessage(_generateMsg(type, 'enable'));
  }

  function broadcastEndOfSMSQuery(type) {
    return IACManager._sendBroadcastMessage(_generateMsg(type, 'disable'));
  }

  function _sendBroadcastMessage(msg) {
    return new Promise(function(resolve, reject) {
      navigator.mozApps.getSelf().onsuccess = function(evt) {
        var app = evt.target.result;
        app.connect('costcontrolSmsQuery').then(function onConnAccepted(ports) {
          debug('Connection with sms app established...');
          ports.forEach(function(port) {
            var waitingForAnswerTimeout;

            port.onmessage = function() {
              clearTimeout(waitingForAnswerTimeout);
              resolve();
            };
            // if no one has replied the message in one minute, the proposal
            // will be rejected
            waitingForAnswerTimeout = window.setTimeout(function() {
              var errorMsg = 'Rejection by Timeout. No received answer to ' +
                           msg.action + ' ' + msg.type + ' request.';
              reject(errorMsg);
            }, TIMEOUT);

            port.postMessage(msg);
          });
        }, function onConnRejected(reason) {
          console.log('Rejected connection attempt due to', reason);
          reject(reason);
        });
      };
    });
  }

  function _getSmsNumberList(service) {
    var silentSmsList = [];
    if (configuration && configuration[service]) {
      silentSmsList = configuration[service].senders;
      if (silentSmsList.indexOf(configuration[service].destination) === -1) {
        silentSmsList.push(configuration[service].destination);
      }
    }
    return silentSmsList;
  }

  function _reset() {
    configuration = null;
  }

  function _generateMsg(service, action) {
    var outgoingNumber = configuration[service] &&
                         configuration[service].destination;
    var incomingNumbers = configuration[service] &&
                          configuration[service].senders;
    return {
      action: action,
      type: service,
      smsNumbers: _getSmsNumberList(service),
      outgoingNumber: outgoingNumber,
      incomingNumbers: incomingNumbers
    };
  }

  return {
    init: init,
    broadcastStartOfSMSQuery: broadcastStartOfSMSQuery,
    broadcastEndOfSMSQuery: broadcastEndOfSMSQuery,
    _getSmsNumberList: _getSmsNumberList,
    _generateMsg: _generateMsg,
    _sendBroadcastMessage: _sendBroadcastMessage,
    _reset: _reset
  };
}());
