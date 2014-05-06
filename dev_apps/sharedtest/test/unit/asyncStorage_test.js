require('/shared/js/async_storage.js');

suite('asyncStorage', function() {
  test('API', function() {
    assert.typeOf(asyncStorage.length, 'function');
    assert.typeOf(asyncStorage.key, 'function');
    assert.typeOf(asyncStorage.getItem, 'function');
    assert.typeOf(asyncStorage.setItem, 'function');
    assert.typeOf(asyncStorage.removeItem, 'function');
    assert.typeOf(asyncStorage.clear, 'function');
  });

  test('set, get, overwrite, get, remove, get', function(done) {
    // test basic set and get
    asyncStorage.setItem('foo', 'bar', function() {
      asyncStorage.getItem('foo', function(value) {
        assert.equal(value, 'bar');

        // now test overwrite and get
        asyncStorage.setItem('foo', 'overwritten', function() {
          asyncStorage.getItem('foo', function(value) {
            assert.equal(value, 'overwritten');

            // now test remove and get
            asyncStorage.removeItem('foo', function() {
              asyncStorage.getItem('foo', function(value) {
                assert.equal(value, null);
                done();
              });
            });
          });
        });
      });
    });
  });

  test('set and get object values', function(done) {
    var object = {
      x: 1,
      y: 'foo',
      z: true
    };

    function next() {
      generator.next();
    }

    var generator = (function() {
      yield asyncStorage.setItem('myobj', object, next);

      yield asyncStorage.getItem('myobj', function(value) {
        assert.equal(object.x, value.x);
        assert.equal(object.y, value.y);
        assert.equal(object.z, value.z);
        next();
      });

      yield asyncStorage.removeItem('myobj', next);

      yield asyncStorage.getItem('myobj', function(value) {
        assert.equal(value, null);
        done();
      });
    }());
    next();
  });

  test('clear, length, key', function(done) {
    asyncStorage.clear(function() {
      asyncStorage.length(function(len) {
        // length should be 0 after clearing
        assert.equal(len, 0);
        asyncStorage.setItem('key1', 'value1', function() {
          asyncStorage.length(function(len) {
            assert.equal(len, 1);
            asyncStorage.setItem('key2', 'value2', function() {
              asyncStorage.length(function(len) {
                assert.equal(len, 2);
                asyncStorage.setItem('key3', 'value3', function() {
                  asyncStorage.length(function(len) {
                    assert.equal(len, 3);
                    asyncStorage.key(0, function(key) {
                      assert.equal(key, 'key1');
                      asyncStorage.key(1, function(key) {
                        assert.equal(key, 'key2');
                        asyncStorage.key(2, function(key) {
                          assert.equal(key, 'key3');
                          asyncStorage.key(3, function(key) {
                            assert.equal(key, null);
                            asyncStorage.clear(function() {
                              asyncStorage.key(0, function(key) {
                                assert.equal(key, null);
                                asyncStorage.length(function(len) {
                                  assert.equal(len, 0);
                                  done();
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

