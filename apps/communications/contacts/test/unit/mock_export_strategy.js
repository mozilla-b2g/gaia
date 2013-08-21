'use strict';

var MockExportStrategy = function() {
  return {
    'setContactsToExport': function(c) {},
    'shouldShowProgress': function() { return true; },
    'determinativeValue': true,
    'hasDeterminativeProgress': function() { return this.determinativeValue },
    'getExportTitle': function() { return 'export'; },
    'doExport': function() {},
    'setProgressStep': function(e) {}
  };
}();
