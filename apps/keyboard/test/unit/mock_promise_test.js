'use strict';

/* global MockPromise */

require('/shared/test/unit/mocks/mock_promise.js');

suite('MockPromse', function() {
  var state;
  var resolveFn;
  var rejectFn;
  var resolveTo;
  var rejectTo;

  var p, p0, p1, p2, p3;

  setup(function() {
    this.sinon.spy(window, 'MockPromise');

    p = new MockPromise(function callback(resolve, reject) {
      state = 'callback';
      resolveFn = resolve;
      rejectFn = reject;
    }).then(function(val) {
      state = 'resolve1';
      resolveTo = val;
    }).then(function(val) {
      state = 'resolve2';
      resolveTo = val;
    }).then(function(val) {
      state = 'resolve3';
      resolveTo = val;
    }).catch(function(err) {
      state = 'reject4';
      rejectTo = err;
    });
  });

  suite('callback', function() {
    setup(function() {
      p0 = window.MockPromise.firstCall.returnValue;
      p0.mExecuteCallback(function resolve(val) {
        state = 'resolve0';
        resolveTo = val;
      }, function reject(err) {
        state = 'reject0';
        rejectTo = err;
      });

      assert.equal(state, 'callback');
    });

    test('reject', function() {
      var error = {};
      rejectFn(error);

      assert.equal(state, 'reject0');
      assert.equal(rejectTo, error);
    });

    suite('resolve', function() {
      var obj;
      setup(function() {
        obj = {};
        resolveFn(obj);
      });

      test('resolve', function() {
        assert.equal(state, 'resolve0');
        assert.equal(resolveTo, obj);
      });

      test('reject1', function() {
        var err1 = {};
        p0.mRejectToError(err1);

        assert.equal(state, 'reject4');
        assert.equal(rejectTo, err1);
      });

      suite('resolve1', function() {
        var obj1;
        setup(function() {
          obj1 = {};
          p0.mFulfillToValue(obj1);
          p1 = p0.mGetNextPromise();
        });

        test('resolve1', function() {
          assert.equal(state, 'resolve1');
          assert.equal(resolveTo, obj1);
        });

        test('reject2', function() {
          var err2 = {};
          p1.mRejectToError(err2);

          assert.equal(state, 'reject4');
          assert.equal(rejectTo, err2);
        });

        suite('resolve2', function() {
          var obj2;
          setup(function() {
            obj2 = {};
            p1.mFulfillToValue(obj2);
            p2 = p1.mGetNextPromise();
          });

          test('resolve2', function() {
            assert.equal(state, 'resolve2');
            assert.equal(resolveTo, obj2);
          });

          test('reject3', function() {
            var err3 = {};
            p2.mRejectToError(err3);

            assert.equal(state, 'reject4');
            assert.equal(rejectTo, err3);
          });

          suite('resolve3', function() {
            var obj3;
            setup(function() {
              obj3 = {};
              p2.mFulfillToValue(obj3);
              p3 = p2.mGetNextPromise();
            });

            test('resolve3', function() {
              assert.equal(state, 'resolve3');
              assert.equal(resolveTo, obj3);

              var p4 = p3.catch.firstCall.returnValue;
              assert.equal(p4, p);
            });

            test('reject4', function() {
              var err4 = {};
              p3.mRejectToError(err4);

              assert.equal(state, 'reject4');
              assert.equal(rejectTo, err4);
            });
          });
        });
      });
    });
  });
});
