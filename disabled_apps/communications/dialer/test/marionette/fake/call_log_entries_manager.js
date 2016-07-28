'use strict';

var _ = require('lodash');

var DEFAULT_ENTRY = {
  'date': Date.now(),
  'type': 'incoming',
  'number': '5551234567',
  'serviceId': 0,
  'emergency': false,
  'voicemail': false,
  'status': 'connected'
};

function CallLogEntries(dialer) {
  this.dialer = dialer;
  this.client = dialer.client;
}

CallLogEntries.prototype = {
  generateAndAdd: function(entriesParameters) {
    entriesParameters = Array.isArray(entriesParameters) ?
      entriesParameters : [entriesParameters];

    entriesParameters.forEach(function(entryParameters) {
      this._generateOneAndAdd(entryParameters);
    }, this);

    this.dialer.relaunch();
  },

  _generateOneAndAdd: function(parameters) {
    var entry = _.assign({}, DEFAULT_ENTRY, parameters);

    this.client.executeScript(function(entry) {
      window.wrappedJSObject.CallLogDBManager.add(entry);
    }, [entry]);
  }
};

module.exports = CallLogEntries;
