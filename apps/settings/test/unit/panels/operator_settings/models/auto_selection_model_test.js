'use strict';

suite('AutoSelectionModel', function() {
  var AutoSelectionModel;
  var MobileConnectionWrapper;
  var Observable;

  var mockConnWrapper;

  var modules = [
    'panels/operator_settings/models/auto_selection_model',
    'panels/operator_settings/models/mobile_connection_wrapper',
    'modules/mvvm/observable'
  ];

  suiteSetup(function(done) {
    testRequire(modules, (asModel, connWrapper, observable) => {
      AutoSelectionModel = asModel;
      MobileConnectionWrapper = connWrapper;
      Observable = observable;
      done();
    });
  });

  setup(function() {
    mockConnWrapper = {
      networkSelectionMode: null,
      observe: function() {},
      setAutoSelection: function() {}
    };
  });

  suite('initial state', function() {
    test('networkSelectionMode is manual', function() {
        mockConnWrapper.networkSelectionMode = 'manual';
        var model = AutoSelectionModel(mockConnWrapper);
        assert.equal(model.targetState, AutoSelectionModel.STATE.DISABLED);
        assert.equal(model.currentState, AutoSelectionModel.STATE.DISABLED);
    });

    test('networkSelectionMode is automatic', function() {
        mockConnWrapper.networkSelectionMode = 'automatic';
        var model = AutoSelectionModel(mockConnWrapper);
        assert.equal(model.targetState, AutoSelectionModel.STATE.ENABLED);
        assert.equal(model.currentState, AutoSelectionModel.STATE.ENABLED);
    });

    test('networkSelectionMode is a value other then manual and automatic',
      function() {
        mockConnWrapper.networkSelectionMode = 'fake_value';
        var model = AutoSelectionModel(mockConnWrapper);
        assert.equal(model.targetState, AutoSelectionModel.STATE.UNKNOWN);
        assert.equal(model.currentState, AutoSelectionModel.STATE.UNKNOWN);
    });
  });

  suite('set target state', function() {
    suite('mobile connection is idle', function() {
      test('setAutoSelection should be called when setting the state to ' +
        'enabled', function(done) {
          mockConnWrapper.networkSelectionMode = 'manual';
          mockConnWrapper.state = MobileConnectionWrapper.STATE.IDLE;
          sinon.stub(mockConnWrapper, 'setAutoSelection', function() {
            return Promise.resolve();
          });

          var model = AutoSelectionModel(mockConnWrapper);
          model.observe('transitioning', function(transitioning) {
            if (transitioning) {
              return;
            }
            sinon.assert.called(mockConnWrapper.setAutoSelection);
            assert.equal(model.targetState, AutoSelectionModel.STATE.ENABLED);
            assert.equal(model.currentState, AutoSelectionModel.STATE.ENABLED);
            done();
          });
          model.targetState = AutoSelectionModel.STATE.ENABLED;
      });
      test('targetState should be the current network selection mode when ' +
        'setAutoSelection fails', function(done) {
          mockConnWrapper.networkSelectionMode = 'manual';
          mockConnWrapper.state = MobileConnectionWrapper.STATE.IDLE;
          sinon.stub(mockConnWrapper, 'setAutoSelection', function() {
            return Promise.reject();
          });

          var model = AutoSelectionModel(mockConnWrapper);
          model.observe('transitioning', function(transitioning) {
            if (transitioning) {
              return;
            }
            sinon.assert.called(mockConnWrapper.setAutoSelection);
            assert.equal(model.targetState, AutoSelectionModel.STATE.DISABLED);
            assert.equal(model.currentState, AutoSelectionModel.STATE.DISABLED);
            done();
          });
          model.targetState = AutoSelectionModel.STATE.ENABLED;
      });
    });

    suite('mobile connection is busy', function() {
      test('the final state should be the last targetState', function(done) {
        var USER_ACTION_TIME = 10;

        mockConnWrapper = Observable({
          networkSelectionMode: 'manual',
          state: MobileConnectionWrapper.STATE.BUSY,
          setAutoSelection: sinon.stub().returns(Promise.resolve())
        });

        var finalTargetState = AutoSelectionModel.STATE.ENABLED;
        var model = AutoSelectionModel(mockConnWrapper);
        model.observe('transitioning', function(transitioning) {
          if (transitioning) {
            return;
          }
          assert.equal(model.targetState, finalTargetState);
          assert.equal(model.currentState, finalTargetState);
          done();
        });

        // The following code tries to simulate random actions from the user and
        // stop at `finalTargetState`.
        var count = 0;
        var intervalId = setInterval(function() {
          count++;
          if (count === 11) {
            clearInterval(intervalId);
            model.targetState = finalTargetState;
            // After a series of operation, we make the mobile connection become
            // idle.
            setTimeout(() => {
              mockConnWrapper.state = MobileConnectionWrapper.STATE.IDLE;
            }, 100);
          } else {
            // Some random actions.
            model.targetState = (Math.random() * 100) % 2 ?
              AutoSelectionModel.STATE.ENABLED :
              AutoSelectionModel.STATE.DISABLED;
          }
        }, USER_ACTION_TIME);
      });
    });
  });
});
