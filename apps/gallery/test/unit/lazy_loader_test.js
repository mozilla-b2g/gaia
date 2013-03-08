/**
 * Tests for the shared lazy loader code
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
 */
require('/shared/js/lazy_loader.js');

mocha.setup({globals: ['jsCount']});

suite('lazy loader', function() {

  function countStyles() {
    return document.querySelectorAll('link').length;
  }

  function addNodeToLazyLoad() {
    document.body.innerHTML = [
    "<div id='parent'>",
      '<!-- ',
        "<div id='lazyload-me'>",
          'content',
        '</div>',
      '-->',
    '</div>'
    ].join('');
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
    var numStyles = countStyles();
    LazyLoader.load('support/styles.css', function() {
      assert.equal(countStyles(), (numStyles + 1));
      done();
    });
  });

  test('lazyload HTML node', function(done) {
    addNodeToLazyLoad();
    var parent = document.getElementById('parent');
    LazyLoader.load(parent, function() {
      assert.equal(
        document.getElementById('lazyload-me').toString(),
        '[object HTMLDivElement]'
      );
      done();
    });
  });

  test('lazyload the same HTML node', function(done) {
    var parent = document.getElementById('parent');
    var child = document.getElementById('lazyload-me');

    child.innerHTML = 'New Content';
    LazyLoader.load(parent, function() {
      assert.equal(child.innerHTML, 'New Content');
      done();
    });
  });

  test('append the same css script', function(done) {
    var numStyles = countStyles();
    LazyLoader.load('support/styles.css', function() {
      assert.equal(countStyles(), numStyles);
      done();
    });
  });

  test('existing dom nodes trigger callback', function(done) {
    var numStyles = countSytles();

    // Manually reset LazyLoader._loaded
    LazyLoader._loaded = {};

    LazyLoader.load(['support/styles.css', 'support/inc.js'], function() {
      assert.equal(window.jsCount, 1);
      assert.equal(countSytles(), numStyles);
      done();
    });
  });


  test('appending multiple nodes works', function(done) {
    var numStyles = countStyles();

    // Manually reset LazyLoader._loaded
    LazyLoader._loaded = {};

    // Remove nodes from DOM
    var style = document.querySelector('link[href="support/styles.css"]');
    style.parentNode.removeChild(style);
    var script = document.querySelector('script[src="support/inc.js"]');
    script.parentNode.removeChild(script);
    addNodeToLazyLoad();
    var parent = document.getElementById('parent');

    LazyLoader.load([
        'support/styles.css',
        'support/inc.js',
        parent
      ], function() {
      assert.equal(window.jsCount, 2);
      assert.equal(countStyles(), numStyles);
      assert.equal(
        document.getElementById('lazyload-me').toString(),
        '[object HTMLDivElement]'
      );
      done();
    });
  });
});
