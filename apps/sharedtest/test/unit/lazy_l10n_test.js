/* global LazyL10n, LazyLoader */

require('/shared/js/lazy_loader.js');
require('/shared/js/lazy_l10n.js');

suite('LazyL10n', function() {
  'use strict';
  var realL10n;

  suiteSetup(function() {
    if (window.Contacts && window.Contacts.close) {
      window.Contacts.close();
    }
  });

  teardown(function() {
    LazyL10n._baseLoaded = false;
    LazyL10n._ready = false;
    LazyLoader._loaded = {};
    LazyLoader._isLoading = {};
  });

  suite('get when partly or fully loaded', function() {
    // these tests test early-exit scenarios in LazyL10n by manipulating
    // _baseLoaded and _ready;  in those scenarios LazyL10n will not
    // actually load shared/js/l10n.js so we need to mock it
    suiteSetup(function() {
      realL10n = navigator.mozL10n;
      navigator.mozL10n = {
        get: function get(id) {
          return id;
        },
        once: function once(callback) {
          setTimeout(callback);
        }
      };
    });

    suiteTeardown(function() {
      navigator.mozL10n = realL10n;
    });

    test('should call the callback directly if loaded', function(done) {
      LazyL10n._ready = true;

      var callback = function(_) {
        assert.equal(navigator.mozL10n.get, _);
        done();
      };
      LazyL10n.get(callback);
    });

    test('should wait for mozL10n.once if not loaded', function(done) {
      LazyL10n._baseLoaded = true;
      LazyL10n._ready = false;

      var callback = function(_) {
        assert.equal(navigator.mozL10n.get, _);
        done();
      };

      LazyL10n.get(callback);
    });
  });

  suite('get', function() {

    suiteSetup(function() {
      realL10n = navigator.mozL10n;
    });

    suiteTeardown(function() {
      navigator.mozL10n = realL10n;
    });

    setup(function() {
      // for each test we need to simulate shared/js/l10n.js not being loaded
      navigator.mozL10n = undefined;
    });

    var checkLinkedScripts = function(scripts) {
      if (!scripts) {
        return true;
      }
      var foundScripts = [];
      var headChildNodes = document.head.childNodes;
      for (var j = 0; j < scripts.length; j++) {
        for (var i = 0; i < headChildNodes.length; i++) {
          if (headChildNodes[i].tagName === 'SCRIPT' &&
            headChildNodes[i].getAttribute('src') === scripts[j]) {
            foundScripts.push(scripts[j]);
            break;
          }
        }
      }
      return (foundScripts.length == scripts.length);
    };

    var checkLoadedScripts = function(scripts) {
      if (!scripts) {
        return true;
      }
      var numLoaded = 0;
      for (var j = 0; j < scripts.length; j++) {
        for (var loaded in LazyLoader._loaded) {
          if (loaded === scripts[j]) {
            numLoaded++;
            break;
          }
        }
      }
      return numLoaded == scripts.length;
    };

    test('should insert then wait for mozL10n.once if not loaded',
      function(done) {
      var callback = function() {
        assert.isTrue(LazyL10n._baseLoaded);
        assert.isTrue(checkLinkedScripts(['/shared/js/l10n.js',
          '/shared/js/l10n_date.js']));
        assert.isTrue(checkLoadedScripts(['/shared/js/l10n.js',
          '/shared/js/l10n_date.js']));
        done();
      };

      LazyL10n.get(callback);
    });

    test('subsequent gets should have all dependencies loaded', function(done) {
      var callback = function() {
        assert.isTrue(LazyL10n._baseLoaded);
        assert.isTrue(checkLinkedScripts(['/shared/js/l10n.js',
          '/shared/js/l10n_date.js']));
        assert.isTrue(checkLoadedScripts(['/shared/js/l10n.js',
          '/shared/js/l10n_date.js']));
        done();
      };

      LazyL10n.get(this.sinon.stub());
      LazyL10n.get(callback);
    });

  });
});
