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
        assert.isTrue(LazyL10n._inDOM);
        assert.isTrue(checkLinkedScripts(['/shared/js/l10n.js',
          '/shared/js/l10n_date.js']));
        done();
      };

      LazyL10n.get(callback);

      var evtObject = document.createEvent('Event');
      evtObject.initEvent('localized', false, false);
      window.dispatchEvent(evtObject);
    });

  });
});
