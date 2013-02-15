/**
 * Tests for the shared lazy loader code
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
 */
require('/shared/js/script_loader.js');

mocha.setup({globals: ['jsCount']});

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
    assert.typeOf(utils.script, 'object');
    assert.typeOf(utils.script.load, 'function');
  });

  test('append single js script', function(done) {
    var req = utils.script.load('support/inc.js');
    req.onsuccess = function() {
      assert.equal(window.jsCount, 1);
      done();
    };

    req.onerror = function() {
      assert.fail('no error expected', 'there was error');
      done();
    }

    req.onresourceloaded = function(e) {
      assert.equal(e.target.resourceSrc,'inc.js');
    }
  });

  test('append the same js script', function(done) {
    var req = utils.script.load('support/inc.js');
    req.onsuccess = function() {
      assert.equal(window.jsCount, 1);
      done();
    };

    req.onerror = function() {
      assert.fail('no error expected', 'there was error');
      done();
    }

    req.onresourceloaded = function(e) {
      assert.equal(e.target.resourceSrc,'inc.js');
    }
  });

  test('append css script', function(done) {
    var numStyles = countSytles();
    var req = utils.script.load('support/styles.css');
    req.onsuccess = function() {
      assert.equal(countSytles(), (numStyles+1));
      done();
    };

    req.onerror = function() {
      assert.fail('no error expected', 'there was error');
      done();
    }

    req.onresourceloaded = function(e) {
      assert.equal(e.target.resourceSrc,'styles.css');
    }
  });

  test('append non existent script', function(done) {
    var req = utils.script.load('js/js/non_existent_file.js');

    req.onsuccess = function() {
      assert.fail('success callback not invoked', 'success callback invoked');
      done();
    }

    req.onerror = function(e) {
      assert.equal(e.target.resourceInError,'non_existent_file.js');
      done();
    }

    req.onresourceloaded = function() {
       assert.fail('resource loaded callback not invoked',
                   'resource loaded callback invoked');
    }
  });

  test('append the same css script', function(done) {
    var numStyles = countSytles();
    var req = utils.script.load('support/styles.css');
    req.onsuccess = function() {
      assert.equal(countSytles(), numStyles);
      done();
    };

    req.onerror = function() {
      assert.fail('no error expected', 'there was error');
      done();
    }

    req.onresourceloaded = function(e) {
      assert.equal(e.target.resourceSrc,'styles.css');
    }
  });

  test('append multiple scripts', function(done) {
    var numStyles = countSytles();

    var req = utils.script.load(['support/styles.css', 'support/inc.js']);
    req.onsuccess = function() {
      assert.equal(window.jsCount, 1);
      assert.equal(countSytles(), (numStyles));
      done();
    };

    req.onerror = function() {
      assert.fail('no error expected', 'there was error');
      done();
    }

    req.onresourceloaded = function(e) {
      assert.isTrue(e.target.resourceSrc === 'styles.css' ||
                    e.target.resourceSrc === 'inc.js');
    }
  });
});
