suite('FMRadio', function() {
  // XXX This is a dirty hack to skip the tests on B2G desktop, because the
  // WebFM api is unavailable on the B2G desktop.
  // If we add some options to skip tests on B2G desktop one day, delete me pls.
  if (!('mozFMRadio' in navigator) || !navigator.mozFMRadio) {
    test('fm radio is disabled', function(){});
    return;
  }

  var mozFMRadio;

  suiteSetup(function() {
    mozFMRadio = navigator.mozFMRadio;
    assert.isTrue(!mozFMRadio.enabled);
  });

  suiteTeardown(function() {
    assert.isTrue(!mozFMRadio.enabled);
  });

  suite('behaviors when disabled', function() {
    test('frequency == null', function() {
      assert.isTrue(mozFMRadio.frequency == null);
    });

    test('band', function() {
      assert.ok(mozFMRadio.frequencyLowerBound);
      assert.ok(mozFMRadio.frequencyUpperBound);
      assert.ok(mozFMRadio.frequencyUpperBound >
                           mozFMRadio.frequencyLowerBound);
      assert.ok(mozFMRadio.channelWidth);
    });
  });

  suite('behaviors when enabled', function() {
    test('enable', function(done) {
      this.timeout(3000);
      var request = mozFMRadio.enable(90);
      assert.ok(request);
      request.onsuccess = function() {
        assert.isTrue(mozFMRadio.enabled);
        assert.isTrue(mozFMRadio.frequency != null);
        assert.isTrue(mozFMRadio.frequency >= mozFMRadio.frequencyLowerBound);
        assert.isTrue(mozFMRadio.enabled);
      };

      var enabled = false;

      // Test if the 'frequencychange' event is fired after the 'enabled' event
      mozFMRadio.onenabled = function() {
        mozFMRadio.onenabled = null;
        enabled = mozFMRadio.enabled;
      };

      mozFMRadio.onfrequencychange = function() {
        mozFMRadio.onfrequencychange = null;
        assert.isTrue(enabled);
        done();
      };
    });

    test('set frequency', function(done) {
      var request = mozFMRadio.setFrequency(100);
      assert.ok(request);

      request.onsuccess = function() {
        done();
      };

      request.onerror = function() {
        assert.isTrue(false);
      };
    });

    test('set out-of-range frequency', function(done) {
      var request = mozFMRadio.setFrequency(mozFMRadio.frequencyUpperBound + 1);
      assert.ok(request);

      request.onsuccess = function() {
        done();
      };

      request.onerror = function() {
        done();
      };
    });

    test('cancel seek', function(done) {
      var request = mozFMRadio.seekUp();
      assert.ok(request);
      request.onerror = function() {
        done();
      };
      var cancelSeekReq = mozFMRadio.cancelSeek();
      assert.ok(cancelSeekReq);
    });

    test('one seek at once', function(done) {
      var request = mozFMRadio.seekUp();
      assert.ok(request);

      request.onerror = function() {
        done();
      };

      request.onsuccess = function() {
        assert.isTrue(false);
      };

      var seekAgainReq = mozFMRadio.seekUp();
      assert.ok(seekAgainReq);

      seekAgainReq.onerror = function() {
        // cancel seek to finish the test
        mozFMRadio.cancelSeek();
      };

      seekAgainReq.onsuccess = function() {
        assert.isTrue(false);
      };
    });

    test('seek up', function(done) {
      this.timeout(20000);

      var request = mozFMRadio.seekUp();
      assert.ok(request);

      request.onsuccess = function() {
        done();
      };

      request.onerror = function() {
        assert.isTrue(false);
      };
    });

    test('seek down', function(done) {
      this.timeout(20000);

      var request = mozFMRadio.seekDown();
      assert.ok(request);

      request.onsuccess = function() {
        done();
      };

      request.onerror = function() {
        assert.isTrue(false);
      };
    });
 });

  suite('disable', function() {
    test('disable', function(done) {
      var results = {
        onDisabledEventFired: false,
        seekErrorFired: false
      };

      var checkResults = function() {
        for (var r in results) {
          if (results[r] == false) {
            return;
          }
        }
        done();
      };

      var seekRequest = mozFMRadio.seekUp();

      seekRequest.onerror = function() {
        results.seekErrorFired = true;
        checkResults();
      };

      seekRequest.onsuccess = function() {
        assert.isTrue(false);
      };

      mozFMRadio.disable();
      mozFMRadio.ondisabled = function() {
        mozFMRadio.ondisabled = null;
        results.onDisabledEventFired = true;
        assert.isTrue(!mozFMRadio.enabled);
        checkResults();
      };
    });
  });
});
