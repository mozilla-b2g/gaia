require('/shared/js/lazy_loader.js');
requireApp('communications/dialer/js/lazy_l10n.js');

suite('LazyL10n', function() {
  var realL10n;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key) {
        return key;
      },
      language: {
        code: 'US',
        direction: 'ltr'
      }
    };
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  teardown(function() {
    LazyL10n._inDOM = false;
    LazyL10n._loaded = false;
  });

  suite('get', function() {
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

      var evtObject = document.createEvent('Event');
      evtObject.initEvent('localized', false, false);
      window.dispatchEvent(evtObject);
    });

    test('should insert then wait for the localized event if not loaded',
    function(done) {
      var headCount = document.head.childNodes.length;

      var callback = function() {
        // l10n.js and l10n_date.js were inserted
        assert.isTrue(LazyL10n._inDOM);
        assert.equal(headCount + 2, document.head.childNodes.length);

        done();
      };

      LazyL10n.get(callback);

      var evtObject = document.createEvent('Event');
      evtObject.initEvent('localized', false, false);
      window.dispatchEvent(evtObject);
    });
  });
});
