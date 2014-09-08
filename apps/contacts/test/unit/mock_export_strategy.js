'use strict';
/* exported MockExportStrategy */

var MockExportStrategy = function() {
  return {
    'setContactsToExport': function(c) { this.contacts = c; },
    'shouldShowProgress': function() { return true; },
    'determinativeValue': true,
    'hasDeterminativeProgress': function() { return this.determinativeValue; },
    'getExportTitle': function() { return 'export'; },
    'doExport': function(callback) {
      callback(this.error, this.contacts, this.isRecoverable);
    },
    'setProgressStep': function(e) {},
    'setError': function(error, isRecoverable) {
      this.error = error;
      this.isRecoverable = isRecoverable || false;
    },
    get name() { return 'MOCK'; }
  };
}();
