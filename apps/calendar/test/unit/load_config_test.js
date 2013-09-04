suite('load_config', function() {

  suiteSetup(function(done) {
    Calendar.App.loadObject('LoadConfig', done);
  });

  suiteSetup(function() {
    var scripts = document.querySelectorAll(
      'script[src*="from_loader_test.js"]'
    );

    if (scripts.length) {
      Array.slice(scripts).forEach(function(item) {
        item.parentNode.removeChild(item);
      });
    }
  });

  var config;
  var subject;
  var app;

  suiteSetup(function() {
    app = testSupport.calendar.app();

    config = Object.create(
      Calendar.LoadConfig
    );

    var root = '/test/unit/fixtures/loader/';

    config.jsRoot = root + 'js/';
    config.styleRoot = root + 'style/';
    config.sharedJsRoot = root + 'shared/js/';
    config.sharedStyleRoot = root + 'shared/style/';

    config.group = {
      'FromLoaderTest': {
        js: ['from_loader_test']
      }
    };

    subject = NotAmd(config);

    // ensure file has not been loaded...
    delete Calendar.FromLoaderTest;
  });

  test('load js', function(done) {
    subject.onerror = function(err) {
      done(err);
    };

    subject.load('group', 'FromLoaderTest', function() {
      done(function() {
        assert.ok(Calendar.LoadConfig, 'has load config');

        var scripts = document.querySelectorAll(
          'script[src*="from_loader_test.js"]'
        );

        assert.length(scripts, 1, 'only loads once');
      });
    });
  });

  test('load style', function(done) {
    subject.onerror = function(err) {
      done(err);
    };

    subject.load('style', 'load_test', function() {
      var link = document.querySelectorAll(
        'link[href*="load_test.css"]'
      );

      done(function() {
        assert.length(link, 1);
      });
    });
  });

  test('load existing store', function(done) {
    subject.onerror = function(err) {
      done(err);
    };

    var calledLoad = 0;
    // create a dummy store
    Calendar.Store.MyCustomFoo = function() {
      return {
        load: function(cb) {
          calledLoad++;
          setTimeout(cb, 0);
        }
      };
    };

    subject.load('storeLoad', 'my_custom_foo', function() {
      done(function() {
        assert.equal(calledLoad, 1, 'loaded store');
      });
    });
  });
});
