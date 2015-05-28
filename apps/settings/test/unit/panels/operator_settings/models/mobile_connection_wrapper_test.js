'use strict';

suite('MobileConnectionWrapper', function() {
  var MobileConnectionWrapper;

  var wrapper;
  var mockConn;
  var mockNetworks = [];
  var mockNetwork = {};

  var modules = [
    'panels/operator_settings/models/mobile_connection_wrapper'
  ];

  suiteSetup(function(done) { 
    testRequire(modules, (connWrapper) => {
      MobileConnectionWrapper = connWrapper;
      done();
    });
  });

  setup(function() {
    mockConn = {
      networkSelectionMode: 'auto',
      getNetworks: sinon.stub().returns(Promise.resolve(mockNetworks)),
      selectNetwork: sinon.stub().returns(Promise.resolve()),
      selectNetworkAutomatically: sinon.stub().returns(Promise.resolve())
    };
    wrapper = MobileConnectionWrapper(mockConn);
  });

  suite('initial state', function() {
    test('should store correct mobile connection object', function() {
      assert.equal(wrapper._conn, mockConn);
    });

    test('the state should be idle', function() {
      assert.equal(wrapper.state, MobileConnectionWrapper.STATE.IDLE);
    });
  });

  suite('networkSelectionMode', function() {
    test('should return correct mode', function() {
      assert.equal(wrapper.networkSelectionMode, mockConn.networkSelectionMode);
    });
  });

  suite('stop', () => {
    test('should cancel the current search', function(done) {
      assert.isRejected(wrapper.search(), /^canceled$/).notify(done);
      wrapper.stop();
    });
  });

  // The behavior of the following three methods are the same.
  [{
    method: 'search',
    mozConnMethod: 'getNetworks'
  }, {
    method: 'connect',
    mozConnMethod: 'selectNetwork',
    params: [mockNetwork]
  }, {
    method: 'setAutoSelection',
    mozConnMethod: 'selectNetworkAutomatically'
  }].forEach(function({method, params, mozConnMethod}) {
    var callMethod = function(p) {
      return wrapper[method].apply(wrapper, p);
    };

    suite(method, function() {
      suite('when the state is not idle', function() {
        setup(function() {
          wrapper._state = MobileConnectionWrapper.STATE.BUSY;
        });

        test('should reject', function(done) {
          assert.isRejected(callMethod(params), /^busy$/).notify(done);
        });

        test('should not call to method on mobile connection', function(done) {
          callMethod(params).catch(() => {
            sinon.assert.notCalled(mockConn[mozConnMethod]);
          }).then(done, done); 
        });
      });

      suite('when the state is idle', function() {
        test('should call to mobile connection with correct parameters',
          function(done) {
            callMethod(params).then(() => {
              sinon.assert.calledWith.apply(null,
                [mockConn[mozConnMethod]].concat(params));
            }).then(done, done);
        });

        test('the state should change to busy and then idle when completed',
          function(done) {
            callMethod(params).then(() => {
              assert.equal(wrapper.state, MobileConnectionWrapper.STATE.IDLE);
            }).then(done, done);
            assert.equal(wrapper.state, MobileConnectionWrapper.STATE.BUSY);
        });
      });

      suite('when mobile connection rejects', function() {
        setup(function() {
          mockConn[mozConnMethod] =
            sinon.stub().returns(Promise.reject('error'));
        });

        test('should reject with the error', function(done) {
          assert.isRejected(callMethod(params), /^error$/).notify(done);
        });

        test('the state should change to busy and then idle when rejected',
          function(done) {
            callMethod(params).catch(() => {
              assert.equal(wrapper.state, MobileConnectionWrapper.STATE.IDLE);
            }).then(done, done);
            assert.equal(wrapper.state, MobileConnectionWrapper.STATE.BUSY);
        });
      });
    });
  });
});
