/* global define */
define(function() {
  'use strict';

  var MockXMLHttpRequest = function() {
    this.data = {};
    this.timeout = null;
  };
  MockXMLHttpRequest.prototype = {
    triggerReadyStateChange: function(status) {
      this.status = status;
      this.onreadystatechange();
    },
    triggerOnLoad: function(status) {
      this.status = status;
      this.onload();
    },
    open: function(requestType, requestUrl) {
      this.data.requestType = requestType;
      this.data.requestUrl = requestUrl;
    },

    setRequestHeader: function(type, value) {
      this.data.header = {
        type: type,
        value: value
      };
    },

    send: function(value) {
      this.data.value = value;
    }
  };
  return MockXMLHttpRequest;
});
