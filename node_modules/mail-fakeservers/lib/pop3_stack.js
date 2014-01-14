var controlRequest = require('./control_request'),
    debug = require('debug')('mail-fakeserver:pop3stack');

/**
 * Object which manages pop3 stack options.
 *
 * @constructor
 */
function POP3Stack(options) {
  debug('pop3 stack create', options);
  for (var key in options) {
    this[key] = options[key];
  }
}

/**
 * List of apis the pop3 stack supports.
 *
 * @type Array
 */
var APIS = [
  'addMessageToFolder',
  'getMessagesInFolder'
];

/**
 * Generic api request wrapper for control server.
 *
 * @private
 * @param {String} api request type.
 * @param {Object} request details.
 * @param {Function} callback with server response.
 */
function apiRequest(api, request, callback) {
  var json = {
    command: api
  };

  for (var key in request) {
    json[key] = request[key];
  }

  controlRequest(this.controlUrl, json, callback);
}

APIS.forEach(function(key) {
  POP3Stack.prototype[key] = function() {
    var args = Array.prototype.slice.call(arguments);
    return apiRequest.apply(this, [key].concat(args));
  };
});

module.exports = POP3Stack;
