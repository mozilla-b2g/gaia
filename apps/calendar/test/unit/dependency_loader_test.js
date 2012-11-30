requireApp('calendar/test/unit/helper.js', function() {
  requireSupport('mock_view.js');

  requireLib('router.js');
  requireLib('app.js');
});

suite('dependencies', function() {

  // don't need a real db for this;
  var subject;
  var defaultJsBase;

  suiteSetup(function() {
    Calendar.ns('Views').Mock = Calendar.Test.MockView;
    Calendar.Templates = Calendar.Templates || {};
    defaultJsBase = Calendar.App.jsBase;
    Calendar.App.jsBase = '/test/unit/support/';
  });

  suiteTeardown(function() {
    delete Calendar.ns('Views').Mock;
    delete Calendar.ns('Views').LazyMockView;
    Calendar.App.jsBase = defaultJsBase;
  });

  setup(function() {
    subject = testSupport.calendar.app();
    subject.dependencies.Views.LazyMockView = [
      {type: 'Templates', name: 'MockTemplate'}
    ];
  });

  test('#loadChildrenSuccess', function(done) {

    // Ensure that the required template is not loaded
    assert.equal(Calendar.Templates.MockTemplate, undefined);

    subject.view('LazyMockView', function(view) {

      assert.instanceOf(view, Calendar.Views.LazyMockView);
      assert.equal(view.app, subject);

      assert.ok(Calendar.Templates.MockTemplate);
      done();
    });
  });

  test('#loadChildrenFailure', function(done) {

    delete Calendar.ns('Views').LazyMockView;

    var loaded = false;

    // Make an invalid dependency requirement
    subject.dependencies.Views.LazyMockView.push(
      {type: 'Templates', name: 'DoesntExist'}
    );

    subject.view('LazyMockView', function(first) {
      loaded = true;
    });

    // Ensure the callback never fires
    setTimeout(function() {
      assert.equal(loaded, false);
      done();
    }, 50);
  });
});
