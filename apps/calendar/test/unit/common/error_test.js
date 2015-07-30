define(function(require) {
'use strict';

var CalendarError = require('common/error');

suite('errors', function() {
  function verify(symbol) {
    test(symbol, function() {
      var detail = {};
      assert.ok(CalendarError[symbol], 'CalendarError.' + symbol);
      var err = new CalendarError[symbol](detail);
      assert.equal(detail, err.detail, 'uses detail');
      assert.ok(err.l10nID, 'has l10nID');
      assert.ok(err.name, 'has name');
    });
  }

  ([
    'Authentication',
    'InvalidServer',
    'ServerFailure'
  ]).forEach(verify);
});

});
