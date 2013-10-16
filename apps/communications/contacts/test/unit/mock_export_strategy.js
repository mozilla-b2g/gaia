'use strict';

var MockExportStrategy = function() {
  return {
    'setContactsToExport': function(c) {},
    'shouldShowProgress': function() { return true; },
    'determinativeValue': true,
    'hasDeterminativeProgress': function() { return this.determinativeValue },
    'getExportTitle': function() { return 'export'; },
    'doExport': function(callback) {
      if (this.error && callback) {
        callback(this.error);
      }
    },
    'setProgressStep': function(e) {},
    'setError': function(error) {
      this.error = error;
    },
    get name() { return 'MOCK'; }
  };
}();
