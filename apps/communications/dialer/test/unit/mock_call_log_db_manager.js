'use strict';

/* exported MockCallLogDBManager */

var MockCallLogDBManager = {
  _calls: [],
  _getGroupListCursor: 0,
  // This is to emulate DB cursor for 'getGroupList'
  value: null,
  _getGroupListCallback: null,
  add: function add(recentCall, callback) {
    this._calls.push(recentCall);
    var group = {};
    group.number = recentCall.number;
    if (callback) {
      callback(group);
    }
  },
  getGroupAtPosition: function getGroupAtPosition(
    position, sortedBy, prev, type, callback) {
    var found = false;
    this._calls.forEach(function(call) {
      if (call.type === type) {
        found = true;
        var group = {};
        group.number = call.number;
        callback(group);
        return false;
      }
    });
    if (!found && callback) {
      callback();
    }
  },
  getGroupList: function getGroupList(callback) {
    this._getGroupListCursor = 0;
    this._getGroupListCallback = callback;
    this.continue();
  },
  deleteAll: function deleteAll(callback) {
    this._calls = [];
    callback();
  },
  updateGroupContactInfo: function(contact, matchingTel, callback) {
    var callsMatched = 0;
    this._calls.forEach(function(call) {
      if (call.contact.matchingTel.value == matchingTel.value) {
        call.contact = contact;
        callsMatched++;
      }
    });
    callback(callsMatched);
  },
  removeGroupContactInfo: function(contactId, group, callback) {
    var callsMatched = 0;
    for (var i=0; i < this._calls.length; i++) {
      if (this._calls[i].contact.id == contactId) {
        delete this._calls[i];
        callsMatched++;
      }
    }
    callback(callsMatched);
  },
  continue: function mcldm_continue() {
    if (this._calls.length > this._getGroupListCursor) {
      this.value = this._calls[this._getGroupListCursor];
      this._getGroupListCursor++;
    } else {
      this.value = null;
    }
    if (this._getGroupListCallback != null) {
      this._getGroupListCallback(this);
    }
  }
};
