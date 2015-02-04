var executes = false;
marionette('marionette', { host: 'I_NEVER_BE' }, function() {
  executes = true;
});

test('does not execute marionette block', function() {
  assert.ok(!executes);
});

