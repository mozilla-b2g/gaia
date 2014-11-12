/*jshint browser: true */
/*global requireApp, suite, setup, testConfig, test, assert,
  suiteSetup, suiteTeardown, Promise */
'use strict';
requireApp('email/js/alameda.js');
requireApp('email/test/config.js');

// Run some final test confirmations after current turn has passed. The idea
// being that the evt broadcasting to listeners will have completed once the
// function passed to this function is called. So, only call this method inside
// the first evt event listener, so that the future turn is clear from the
// turn used to notify evt listeners.
function onFutureTurn(fn) {
  Promise.resolve(true).then(fn);
}

suite('evt', function() {
  var evt;

  suiteSetup(function(done) {
    testConfig(
      {
        suiteTeardown: suiteTeardown,
        done: done
      },
      ['evt'],
      function(e) {
        evt = e;
      }
    );
  });

  suite('#on', function() {

    test('basic use', function(done) {
      var count = 0;

      evt.on('testOn', function() {
        count += 1;
        if (count === 2) {
          onFutureTurn(function() {
            assert.equal(count, 2);
            done();
          });
        }
      });
      evt.emit('testOn');
      evt.emit('testOn');
    });

    test('multiple args', function(done) {
      var count = 0;

      evt.on('testOn', function(first, second) {
        count += 1;
        if (count === 1) {
          assert.equal(first, 'one');
          assert.equal(second, 'two');
        } else if (count === 2) {
          assert.equal(first, 'three');
          assert.equal(second, 'four');

          onFutureTurn(function() {
            // Make sure notification count stayed at two
            assert.equal(count, 2);
            done();
          });
        }
      });
      evt.emit('testOn', 'one', 'two');
      evt.emit('testOn', 'three', 'four');
    });

    test('Catches both emits since async', function(done) {
      var count = 0;

      evt.emit('testOn2');

      evt.on('testOn2', function() {
        count += 1;
        if (count === 2) {
          assert.equal(count, 2);
          done();
        }
      });

      evt.emit('testOn2');
    });

  });

  suite('#once', function() {

    test('basic use', function(done) {
      var count = 0;

      evt.once('testOnce', function() {
        count += 1;
        onFutureTurn(function() {
          assert.equal(count, 1);
          done();
        });
      });
      evt.emit('testOnce');
      evt.emit('testOnce');
    });

  });

  suite('#removeListener', function() {

    test('basic use', function(done) {
      var count = 0;

      function onEvent() {
        count += 1;
        evt.removeListener('testRemoveListener', onEvent);
        onFutureTurn(function() {
          assert.equal(count, 1);
          assert.equal(evt._events.hasOwnProperty('testRemoveListener'), false);
          done();
        });
      }

      evt.on('testRemoveListener', onEvent);
      assert.equal(evt._events.hasOwnProperty('testRemoveListener'), true);

      evt.emit('testRemoveListener');
      evt.emit('testRemoveListener');
    });

  });


  suite('#emitWhenListener', function() {

    test('basic use', function(done) {
      var count = 0;

      evt.emitWhenListener('testEmitWhenListener');

      onFutureTurn(function(fn) {
        evt.on('testEmitWhenListener', function() {
          count += 1;
          if (count === 2) {
            onFutureTurn(function() {
              assert.equal(count, 2);
              done();
            });
          }
        });

        evt.emit('testEmitWhenListener');
      });
    });
  });

  suite('#latest', function() {
    var data;

    // Executed for each test() below
    setup(function() {
      data = {
        setToken: function(value) {
          this.token = value;
          this.emitWhenListener('token', this.token);
        },
        token: null
      };
      evt.mix(data);
    });

    test('delayed value', function(done) {
      var count = 0;

      data.latest('token', function(token) {
        count += 1;

        if (count === 1) {
          assert.equal(token, 'one');
        } else if (count === 2) {
          assert.equal(token, 'two');

          onFutureTurn(function() {
            assert.equal(count, 2);
            done();
          });
        }
      });

      data.setToken('one');
      data.setToken('two');
    });

    test('immediate value', function(done) {
      var count = 0;

      data.setToken('one');

      data.latest('token', function(token) {
        count += 1;

        if (count === 1) {
          assert.equal(token, 'one');
        } else if (count === 2) {
          assert.equal(token, 'two');
          onFutureTurn(function() {
            assert.equal(count, 2);
            done();
          });
        }
      });

      assert.equal(count, 1);

      data.setToken('two');
    });

    test('immediate value, after first listener', function() {
      var count = 0;

      data.setToken('one');

      data.latest('token', function(token) {
        count += 1;

        assert.equal(token, 'one');

        // Second latest, which should trigger the callback
        // even though there is no pending emit.
        data.latest('token', function(token) {
          count += 1;

          assert.equal(token, 'one');
          assert.equal(count, 2);
        });
      });

      assert.equal(count, 2);
    });

  });

  suite('#latestOnce', function() {
    var data;

    // Executed for each test() below
    setup(function() {
      data = {
        setToken: function(value) {
          this.token = value;
          this.emitWhenListener('token', this.token);
        },
        token: null
      };
      evt.mix(data);
    });


    test('double latestOnce listeners', function(done) {
      var count = 0;

      function onLatest(token) {
        count += 1;

        assert.equal(token, 'one');

        if (count === 2) {
          onFutureTurn(function() {
            assert.equal(count, 2);
            done();
          });
        }
      }

      data.latestOnce('token', onLatest);
      data.latestOnce('token', onLatest);

      data.setToken('one');
    });

    test('delayed value', function(done) {
      var count = 0;

      data.latestOnce('token', function(token) {
        count += 1;

        assert.equal(token, 'one');
        assert.equal(count, 1);

        onFutureTurn(function() {
          assert.equal(count, 1);
          done();
        });
      });

      data.setToken('one');
      data.setToken('two');
    });

    test('immediate value', function(done) {
      var count = 0;

      data.setToken('one');

      data.latestOnce('token', function(token) {
        count += 1;

        assert.equal(token, 'one');

        onFutureTurn(function() {
          assert.equal(count, 1);
          done();
        });
      });

      assert.equal(count, 1);
      data.setToken('two');
    });

    test('immediate value, after first listener', function() {
      var count = 0;

      data.setToken('one');

      data.latestOnce('token', function(token) {
        count += 1;

        assert.equal(token, 'one');

        // Second latestOnce, which should trigger the callback
        // even though there is no pending emit.
        data.latestOnce('token', function(token) {
          count += 1;
          assert.equal(token, 'one');
        });
      });

      assert.equal(count, 2);
    });

  });

});
