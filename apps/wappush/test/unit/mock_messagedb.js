/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* exported MockMessageDB */

'use strict';

var MockMessageDB = (function() {
  var timestamp = 0;
  var messages = [];

  function mdb_put(message, success, error) {
    // Overwrite the timestamp so that it is predictable
    message.timestamp = timestamp++;

    if (success && (typeof success === 'function')) {
      success('new');
    }
  }

  function mdb_retrieve(timestamp, success, error) {
    var i;

    for (i = 0; i < messages.length; i++) {
      if (messages[i].timestamp === timestamp) {
        if (success && (typeof success === 'function')) {
          success(messages[i]);
        }

        return;
      }
    }

    if (success && (typeof success === 'function')) {
      success(null);
    }
  }

  function mdb_clear(success, error) {
    timestamp = 0;
    messages = [];

    if (success && (typeof success === 'function')) {
      success();
    }
  }

  function mdb_mTeardown() {
    mdb_clear();
  }

  return {
    put: mdb_put,
    retrieve: mdb_retrieve,
    clear: mdb_clear,
    mTeardown: mdb_mTeardown
  };
})();
