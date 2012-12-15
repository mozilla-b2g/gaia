requireApp('calendar/test/unit/helper.js', function() {
  requireSupport('mock_view.js');

  requireLib('router.js');
  requireLib('app.js');
});

suite('loader', function() {

  // don't need a real db for this;
  var subject;
  var defaultJsBase;

  suiteSetup(function() {
    Calendar.ns('Views').Mock = Calendar.Test.MockView;
    Calendar.Templates = Calendar.Templates || {};
  });

  suiteTeardown(function() {
    delete Calendar.ns('Views').Mock;
    delete Calendar.ns('Views').LazyMockView;
    delete Calendar.ns('Templates').MockTemplate;
  });

  setup(function() {
    subject = testSupport.calendar.app();
    subject.loader.map = {
      StoreLoad: {},
      Style: {},
      Templates: {},
      Views: {
        LazyMockView: [
          {type: 'Templates', name: 'MockTemplate'}
        ]
      }
    };
    defaultJsBase = subject.loader.jsBase;
    subject.loader.jsBase = '/test/unit/support/';

    // Stub out localized and db checks
    subject.loader.onLocalized = subject.loader.onRenderReady = function(cb) { cb(); };
  });

  teardown(function() {
    subject.loader.jsBase = defaultJsBase;
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
    subject.loader.map.Views.LazyMockView.push(
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


  test('#testQueue', function(done) {

    assert.equal(subject.loader.map['Templates.MockTemplate'], undefined);

    var count = 0;
    var callback = function() {
      count++;
    };
    var templateNode = {type: 'Templates', name: 'MockTemplate'};
    var fakeNode = {type: 'Views', name: 'DontCall'};

    assert.isTrue(subject.loader.checkQueue(templateNode));

    subject.loader.queue(templateNode, callback);
    subject.loader.queue(templateNode, callback);
    subject.loader.queue(fakeNode, callback);
    assert.length(subject.loader._loaded['Templates.MockTemplate'].queue, 2);

    // Now that we have a queue, it should think that we don't need to include the script
    assert.isFalse(subject.loader.checkQueue(templateNode));

    subject.loader.runQueue(templateNode);
    assert.equal(count, 2);

    done();
  });

  suite('#includers', function() {

    var styleHandler;
    var storeLoadHandler;

    setup(function(done) {

      var styleHandler = subject.loader.includeStyle;
      var storeLoadHandler = subject.loader.includeStoreLoad;

      // Our LazyMockView already has a template, give it a store and a style
      subject.loader.map.Views.LazyMockView.push(
        {type: 'StoreLoad', name: 'TempStore'},
        {type: 'Style', name: 'TempStyle'}
      );

      done()
    });

    teardown(function() {
      subject.loader.includeStyle = styleHandler;
      subject.loader.includeStoreLoad = storeLoadHandler;
    });

    test('callbacks', function(done) {
      var counter = 0;

      function includer(config, cb) {
        counter++;
        return this.runQueue(config);
      }

      subject.loader.includeStyle = includer;
      subject.loader.includeStoreLoad = includer;

      subject.view('LazyMockView', function(view) {
        assert.equal(counter, 2); // Called for the style and storeload
        done();
      });
    });

  });
});
