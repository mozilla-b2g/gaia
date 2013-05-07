suite('errors', function() {

  function verify(symbol) {
    test(symbol, function() {
      var detail = {};
      assert.ok(Calendar.Error[symbol], 'Calendar.Error.' + symbol);
      var err = new Calendar.Error[symbol](detail);
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
