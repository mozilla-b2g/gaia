/**
 * Tests for the shared lazy loader code
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
 */
require('/shared/js/lazy_loader.js');

mocha.setup({globals: ['jsCount', 'totalResult']});

suite('lazy loader', function() {

  function countSytles() {
    return document.querySelectorAll('link').length;
  }

  suiteSetup(function() {
    window.jsCount = 0;
  });

  suiteTeardown(function() {
    delete window.jsCount;
  });

  test('everything looks ok', function() {
    assert.equal(window.jsCount, 0);
    assert.typeOf(LazyLoader, 'object');
    assert.typeOf(LazyLoader.load, 'function');
  });

  test('append single js script', function(done) {
    LazyLoader.load('support/inc.js', function() {
      assert.equal(window.jsCount, 1);
      done();
    });
  });

  test('append the same js script', function(done) {
    LazyLoader.load('support/inc.js', function() {
      assert.equal(window.jsCount, 1);
      done();
    });
  });

  test('append css script', function(done) {
    var numStyles = countSytles();
    LazyLoader.load('support/styles.css', function() {
      assert.equal(countSytles(), (numStyles + 1));
      done();
    });
  });

  test('append the same css script', function(done) {
    var numStyles = countSytles();
    LazyLoader.load('support/styles.css', function() {
      assert.equal(countSytles(), numStyles);
      done();
    });
  });

  test('Loaded callback is invoked correctly if node already exists on the DOM',
       function(done) {
    var responses = 0;
    LazyLoader.load(['support/long_load.js'], function() {
      assert.equal(window.totalResult, 10000);
      responses++;
      if (responses === 2) {
        done();
      }
    });

    LazyLoader.load(['support/long_load.js'], function() {
      assert.equal(window.totalResult, 10000);

      responses++;
      if (responses === 2) {
        done();
      }
    });
  });

  test('appending multiple nodes works', function(done) {
    var numStyles = countSytles();

    // Manually reset LazyLoader._loaded
    LazyLoader._loaded = {};

    // Remove nodes from DOM
    var style = document.querySelector('link[href="support/styles.css"]');
    style.parentNode.removeChild(style);
    var script = document.querySelector('script[src="support/inc.js"]');
    script.parentNode.removeChild(script);

    LazyLoader.load(['support/styles.css', 'support/inc.js'], function() {
      assert.equal(window.jsCount, 2);
      assert.equal(countSytles(), numStyles);
      done();
    });
  });
});
