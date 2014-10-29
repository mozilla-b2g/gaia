/* global LazyLoader */

'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/js/html_imports.js');

suite('lazy loader', function() {

  function countStyles() {
    return document.querySelectorAll('link').length;
  }

  function addNodeToLazyLoad() {
    document.body.innerHTML = [
    '<div id="parent">',
      '<!-- ',
        '<div id="lazyload-me">',
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

  var stub;
  setup(function() {
    stub = sinon.stub();
  });

  test('everything looks ok', function() {
    assert.equal(window.jsCount, 0);
    assert.typeOf(LazyLoader, 'object');
    assert.typeOf(LazyLoader.load, 'function');
    assert.typeOf(LazyLoader.getJSON, 'function');
  });

  test('load json', function(done) {
    LazyLoader.getJSON('/apps/sharedtest/test/unit/support/test.json')
      .then(function(json) {
        done(function() {
          assert.notStrictEqual(json, null);
          assert.equal('org' in json, true);
          assert.equal(json.org, 'Mozilla');
        });
      });
  });

  test('load malformed json', function(done) {
    LazyLoader.getJSON('/apps/sharedtest/test/unit/support/malformedJson')
      .then(function(json) {
        done(new Error('A resolve promise was returned.' +
                       ' Expected Reject promise'));
      }, function(error) {
        done(function() {
          assert.instanceOf(error, Error);
          assert.equal(error.message,
                       'No valid JSON object was found (200 OK)');
        });
      });
  });

  test('load inexisting json', function(done) {
    LazyLoader.getJSON('/apps/sharedtest/test/unit/support/non_existant.json')
      .then(function(json) {
        done(new Error('Resolve promise was returned.' +
                       ' Expected Reject promise'));
      }, function(error) {
        done(function() {
          assert.instanceOf(error, Error);
          assert.equal(error.message,
                       'No valid JSON object was found (404 Not Found)');
        });
      });
  });

  test('append single js script', function(done) {
    LazyLoader.load('support/inc.js', stub).then(function() {
      assert.equal(window.jsCount, 1);
      sinon.assert.calledOnce(stub);
    }).then(done, done);
  });

  test('append the same js script', function(done) {
    LazyLoader.load('support/inc.js', stub).then(function() {
      assert.equal(window.jsCount, 1);
      sinon.assert.calledOnce(stub);
    }).then(done, done);
  });

  test('append css script', function(done) {
    var numStyles = countStyles();
    LazyLoader.load('support/styles.css', stub).then(function() {
      assert.equal(countStyles(), (numStyles + 1));
      sinon.assert.calledOnce(stub);
    }).then(done, done);
  });

  test('lazyload HTML node', function(done) {
    addNodeToLazyLoad();
    var parent = document.getElementById('parent');
    LazyLoader.load(parent, stub).then(function() {
      assert.equal(
        document.getElementById('lazyload-me').toString(),
        '[object HTMLDivElement]'
      );
      sinon.assert.calledOnce(stub);
    }).then(done, done);
  });

  test('lazyload the same HTML node', function(done) {
    var parent = document.getElementById('parent');
    var child = document.getElementById('lazyload-me');

    child.innerHTML = 'New Content';
    LazyLoader.load(parent, stub).then(function() {
      assert.equal(child.innerHTML, 'New Content');
      sinon.assert.calledOnce(stub);
    }).then(done, done);
  });

  test('append the same css script', function(done) {
    var numStyles = countStyles();
    LazyLoader.load('support/styles.css', stub).then(function() {
      assert.equal(countStyles(), numStyles);
      sinon.assert.calledOnce(stub);
    }).then(done, done);
  });

  test('Loaded callback is invoked correctly if node already exists on the DOM',
       function(done) {
    Promise.all([
      LazyLoader.load(['support/long_load.js'], stub),
      LazyLoader.load(['support/long_load.js'], stub)
    ]).then(function() {
      assert.equal(window.totalResult, 10000);
      sinon.assert.calledTwice(stub);
    }).then(done, done);
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
    ], stub).then(function() {
      assert.equal(window.jsCount, 2);
      assert.equal(countStyles(), numStyles);
      assert.equal(
        document.getElementById('lazyload-me').toString(),
        '[object HTMLDivElement]'
      );
      sinon.assert.calledOnce(stub);
    }).then(done, done);
  });

  test('populate web components', function(done) {
    document.body.innerHTML = [
      '<link rel="import" href="/test/unit/support/elements.html"> ',
      '<div id="wrapper" is="custom-content"></div>'
      ].join('');

    var wrapper = document.getElementById('wrapper');

    LazyLoader.load(wrapper, stub).then(function() {
      assert.equal(wrapper.innerHTML, 'hello.');
      sinon.assert.calledOnce(stub);
    }).then(done, done);
  });
});
