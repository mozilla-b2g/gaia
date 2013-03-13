suiteGroup('provider/abstract', function() {

  var subject;
  var app;

  setup(function() {
    app = testSupport.calendar.app();
    subject = new Calendar.Provider.Abstract({ app: app });
  });

  test('initializer', function() {
    assert.equal(subject.app, app);
    assert.ok(subject);
  });

});
