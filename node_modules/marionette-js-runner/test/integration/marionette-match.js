var executes = false;
marionette('marionette', { host: ['b2g-desktop', 'firefox'] }, function() {
  executes = true;

  test('metadata', function() {
    assert.equal(marionette.metadata.host, 'b2g-desktop');
  });
});

test('actually runs marionette', function() {
  assert.ok(executes);
});
