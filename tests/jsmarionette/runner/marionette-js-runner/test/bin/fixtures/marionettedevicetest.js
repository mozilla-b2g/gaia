marionette('device test', function() {
  var client = marionette.client();

  test('test on phone', { devices: ['phone'] }, function() {
    1 + 1;
  });

  test('test on tv', { devices: ['tv'] }, function() {
    1 + 1;
  });

  test('test on both', { devices: ['phone', 'tv'] }, function() {
    1 + 1;
  });
});
