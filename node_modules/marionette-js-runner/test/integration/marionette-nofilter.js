var executes = false;
marionette('marionette', function() {
  executes = true;
});

test('actually runs marionette', function() {
  assert.ok(executes);
});

