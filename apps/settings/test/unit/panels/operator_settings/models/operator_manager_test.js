'use strict';

suite('OperatorManager', function() {
  var OperatorManager;
  var OperatorItem;
  var Observable;
  var AutoSelectionModel;
  var mockConn = {};

  var mockAutoSelectionModel;
  var mockConnWrapper;

  var operatorManager;

  var modules = [
    'panels/operator_settings/models/operator_manager',
    'panels/operator_settings/models/operator_item',
    'panels/operator_settings/models/auto_selection_model',
    'modules/mvvm/observable'
  ];

  var map = {
    '*': {
      'panels/operator_settings/models/mobile_connection_wrapper':
        'MockMobileConnectionWrapper',
      'panels/operator_settings/models/auto_selection_model':
        'MockAutoSelectionModel',
      'panels/operator_settings/models/operator_item':
        'MockOperatorItem'
    }
  };

  setup(function(done) {
    var requireCtx = testRequire([], map, function() {});

    mockConnWrapper = {
      search: function() {},
      stop: function() {},
      connect: function() {}
    };
    define('MockMobileConnectionWrapper', function() {
      return function() {
        return mockConnWrapper;
      };
    });

    define('MockAutoSelectionModel', function() {
      var ctor = function() {
        return mockAutoSelectionModel;
      };
      ctor.STATE = {
        UNKNOWN: 0,
        ENABLED: 1,
        DISABLED: 2
      };
      return ctor;
    });

    define('MockOperatorItem', function() {
      var ctor = function(network) {
        return {
          network: network
        };
      };
      ctor.STATE = {
        IDLE: 'idle',
        CONNECTING: 'connecting',
        CONNECTED: 'connected',
        FAILED: 'failed'
      };
      return ctor;
    });

    requireCtx(modules, (_OperatorManager, _OperatorItem, _AutoSelectionModel,
        _Observable) => {
      OperatorManager = _OperatorManager;
      OperatorItem = _OperatorItem;
      AutoSelectionModel = _AutoSelectionModel;
      Observable = _Observable;

      mockAutoSelectionModel = Observable({
        targetState: null
      });

      operatorManager = OperatorManager(mockConn);
      done();
    });
  });

  suite('autoSelectionState', function() {
    var mockAutoSelectionState = 'mockState';
    
    setup(function() {
      mockAutoSelectionModel.targetState = mockAutoSelectionState;
    });

    test('autoSelectionState should be the current target state of the auto ' +
      'selection model', function(done) {
        var doAssert = function() {
          if (operatorManager.autoSelectionState !== null) {
            assert.equal(operatorManager.autoSelectionState,
              mockAutoSelectionState);
            done();
          }
        };
        operatorManager.observe('autoSelectionState', doAssert);
        doAssert();
    });

    test('autoSelectionState should change along with the target state of ' +
      'the auto selection model', function() {
        mockAutoSelectionModel.targetState = 'anotherState';
        assert.equal(operatorManager.autoSelectionState,
          mockAutoSelectionModel.targetState);
    });

    test('the target state of the auto selection mode should change along ' +
      'with _autoSelectionState', function() {
        operatorManager._autoSelectionState = 'anoterState';
        assert.equal(mockAutoSelectionModel.targetState,
          operatorManager.autoSelectionState);
      });
  });

  suite('search', function() {
    var mockNetworks = [{
      state: 'connected'
    }, {
      state: 'available'
    }, {
      state: 'forbidden'
    }];

    suite('when searching', function() {
      test('should do nothing', function() {
        this.sinon.stub(mockConnWrapper, 'search');
        operatorManager._searching = true;
        operatorManager.search();
        sinon.assert.notCalled(mockConnWrapper.search);
      });
    });

    suite('when not searching', function() {
      test('operators should become the result returned from conn wrapper',
        function(done) {
          this.sinon.stub(mockConnWrapper, 'search', function() {
            return Promise.resolve(mockNetworks);
          });
          operatorManager._searching = false;
          operatorManager.search().then(function() {
            mockNetworks.forEach(function(network, index) {
              assert.equal(network.state,
                operatorManager.operators.get(index).network.state);
            });
          }).then(done, done);
      });

      test('searching should be true while searching', function(done) {
        this.sinon.stub(mockConnWrapper, 'search', function() {
          return Promise.resolve();
        });
        operatorManager._searching = false;
        operatorManager.search().then(function() {
          assert.isFalse(operatorManager.searching);
        }).then(done, done);
        assert.isTrue(operatorManager.searching);
      });

      test('should not clear the operator list when being rejected with busy',
        function(done) {
          var mockOperators = [{}, {}];
          this.sinon.stub(mockConnWrapper, 'search', function() {
            return Promise.reject('busy');
          });
          operatorManager._searching = false;
          operatorManager._operators.reset(mockOperators);
          operatorManager.search().then(function() {
            assert.deepEqual(operatorManager.operators.array, mockOperators);
          }).then(done, done);
      });
    });
  });

  suite('stop', function() {
    test('should call to stop of the mobile connection wrapper', function() {
      this.sinon.stub(operatorManager._connWrapper, 'stop');
      operatorManager.stop();
      sinon.assert.called(operatorManager._connWrapper.stop);
    });

    test('_isSearching should be set to false', function() {
      operatorManager._searching = true;
      operatorManager.stop();
      assert.isFalse(operatorManager._searching);
    });
  });

  suite('connect', function() {
    var operatorItem;
    setup(function() {
      operatorItem = {
        setState: sinon.stub()
      };
    });

    test('should early return when operator manager is connecting', function() {
      this.sinon.stub(mockConnWrapper, 'connect', function() {
        return Promise.resolve();
      });
      operatorManager._connecting = true;
      operatorManager.connect(operatorItem);
      sinon.assert.notCalled(mockConnWrapper.connect);
    });

    test('should early return when the operator is already connected',
      function() {
        this.sinon.stub(mockConnWrapper, 'connect', function() {
          return Promise.resolve();
        });
        operatorManager._connecting = false;
        operatorManager._connectedOperatorItem = operatorItem;
        operatorManager.connect(operatorItem);
        sinon.assert.notCalled(mockConnWrapper.connect);
    });

    test('connectedOperatorItem should be the set correctly when success',
      function() {
        this.sinon.stub(mockConnWrapper, 'connect', function() {
          return Promise.resolve();
        });
        operatorManager.connect(operatorItem).then(function() {
          assert.equal(operatorManager.connectedOperatorItem, operatorItem);
        });
    });

    suite('operator item states', function() {
      test('should set the operator item as connecting at start', function() {
        this.sinon.stub(mockConnWrapper, 'connect', function() {
          return Promise.resolve();
        });
        operatorManager.connect(operatorItem);
        sinon.assert.calledWith(operatorItem.setState,
          OperatorItem.STATE.CONNECTING);
      });

      test('should set the operator item as connected when success',
        function(done) {
          this.sinon.stub(mockConnWrapper, 'connect', function() {
            return Promise.resolve();
          });
          operatorManager.connect(operatorItem).then(function() {
            sinon.assert.calledWith(operatorItem.setState,
              OperatorItem.STATE.CONNECTED);
            done();
          });
      });

      test('should set the operator item as connected when failed',
        function(done) {
          this.sinon.stub(mockConnWrapper, 'connect', function() {
            return Promise.reject();
          });
          operatorManager.connect(operatorItem).then(function() {
            sinon.assert.calledWith(operatorItem.setState,
              OperatorItem.STATE.FAILED);
          }).then(done, done);
      });

      test('should set the operator item as idle when reconnecting',
        function(done) {
          var clock = sinon.useFakeTimers();
          this.sinon.stub(mockConnWrapper, 'connect', function() {
            return Promise.reject();
          });
          operatorManager.connect(operatorItem).then(function() {
            operatorItem.setState.reset();
            clock.tick(6000);
            sinon.assert.calledWith(operatorItem.setState,
              OperatorItem.STATE.IDLE);
            clock.restore();
          }).then(done, done);
        });
    });

    suite('should reconnect when possible', function() {
      var clock;
      var originalConnectedItem;

      setup(function() {
        clock = sinon.useFakeTimers();
        this.sinon.stub(mockConnWrapper, 'connect', function() {
          return Promise.reject();
        });
        this.sinon.spy(operatorManager, 'connect');
        this.sinon.stub(operatorManager, 'search');
        originalConnectedItem = {
          setState: sinon.stub()
        };
      });

      teardown(function() {
        clock.restore();
      });

      test('original operator is available and auto selection is disabled ',
        function(done) {
          operatorManager._connectedOperatorItem = originalConnectedItem;
          operatorManager._autoSelectionState =
            AutoSelectionModel.STATE.DISABLED;

          operatorManager.connect(operatorItem).then(function() {
            clock.tick(6000);
            sinon.assert.calledWith(operatorManager.connect,
              originalConnectedItem);
          }).then(done, done);
      });

      test('original operator is unavailable', function(done) {
        operatorManager._connectedOperatorItem = null;
        operatorManager._autoSelectionState = AutoSelectionModel.STATE.DISABLED;

        operatorManager.connect(operatorItem).then(function() {
          clock.tick(6000);
          sinon.assert.calledOnce(operatorManager.connect,
            originalConnectedItem);
        }).then(done, done);
      });

      test('auto selection is enabled', function(done) {
        operatorManager._connectedOperatorItem = originalConnectedItem;
        operatorManager._autoSelectionState = AutoSelectionModel.STATE.ENABLED;

        operatorManager.connect(operatorItem).then(function() {
          clock.tick(6000);
          sinon.assert.calledOnce(operatorManager.connect,
            originalConnectedItem);
        }).then(done, done);
      });
    });
  });

  suite('setAutoSelection', function() {
    test('the state should be set as AutoSelectionModel.STATE.ENABLED ' +
      'when enabling', function() {
        operatorManager.setAutoSelection(true);
        assert.equal(operatorManager.autoSelectionState,
          AutoSelectionModel.STATE.ENABLED);
      });

    test('the state should be set as AutoSelectionModel.STATE.ENABLED ' +
      'when disabling', function() {
        this.sinon.stub(operatorManager, 'search');
        operatorManager.setAutoSelection(false);
        assert.equal(operatorManager.autoSelectionState,
          AutoSelectionModel.STATE.DISABLED);
      });
  });
});
