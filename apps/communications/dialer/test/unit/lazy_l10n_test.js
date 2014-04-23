require('/shared/js/lazy_loader.js');
require('/shared/js/lazy_l10n.js');

suite('LazyL10n', function() {
  var realL10n;

  suiteSetup(function() {
    if (window.Contacts && window.Contacts.close) {
      window.Contacts.close();
    }
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key) {
        return key;
      },
      once: function once(callback) {
        this._callbacks.push(callback);
      },
      _callbacks: [],
      _fire: function() {
        for (var callback of this._callbacks) {
          setTimeout(callback);
        }
        this._callbacks = [];
      }
    };
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  teardown(function() {
    LazyL10n._inDOM = false;
    LazyL10n._loaded = false;
    LazyLoader._loaded = {};
    LazyLoader._isLoading = {};
  });

  suite('get', function() {
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

    test('should call the callback directly if loaded', function(done) {
      LazyL10n._loaded = true;

      var callback = function(_) {
        assert.equal(navigator.mozL10n.get, _);
        done();
      };
      LazyL10n.get(callback);
    });

    test('should wait for the localized event if not loaded', function(done) {
      LazyL10n._loaded = false;
      LazyL10n._inDOM = true;

      var callback = function(_) {
        assert.equal(navigator.mozL10n.get, _);
        done();
      };

      LazyL10n.get(callback);

      navigator.mozL10n._fire();
    });

    test('should insert then wait for the localized event if not loaded',
    function(done) {
      var headCount = document.head.childNodes.length;

      var callback = function() {
        assert.isTrue(LazyL10n._inDOM);
        assert.isTrue(checkLinkedScripts(['/shared/js/l10n.js',
          '/shared/js/l10n_date.js']));
        assert.isTrue(checkLoadedScripts(['/shared/js/l10n.js',
          '/shared/js/l10n_date.js']));
        done();
      };

      LazyL10n.get(callback);

      navigator.mozL10n._fire();
    });

    test('subsequent gets should have all dependencies loaded', function(done) {
      var headCount = document.head.childNodes.length;

      var callback = function() {
        assert.isTrue(LazyL10n._inDOM);
        assert.isTrue(checkLinkedScripts(['/shared/js/l10n.js',
          '/shared/js/l10n_date.js']));
        assert.isTrue(checkLoadedScripts(['/shared/js/l10n.js',
          '/shared/js/l10n_date.js']));
        done();
      };

      LazyL10n.get(this.sinon.stub());
      LazyL10n.get(callback);

      // No need to explicitly fire the callbacks since on subsequent gets
      // navigator.mozL10n is the real mozL10n object and has the proper once
      // method relying on its internal event emitter.
    });

  });
});
