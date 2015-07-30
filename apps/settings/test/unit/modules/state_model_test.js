'use strict';

suite('StateModel', function() {
  var StateModel;

  var modules = [
    'modules/state_model'
  ];

  suiteSetup(function(done) {
    testRequire(modules, (stateModel) => {
      StateModel = stateModel;
      done();
    });
  });

  suite('initial state', function() {
    test('the state should change from the initial state to the first state',
      function(done) {
        var initialState = 'initialState';
        var firstState = 'firstState';

        var model = StateModel({
          _state: initialState,
          onInit: function() {
            return this._state;
          },
          onGetState: function() {
            return new Promise((resolve) => {
              setTimeout(() => {
                this._state = firstState;
                resolve(this._state);
              });
            });
          },
          onSetState: function() {}
        });
        model.observe('currentState', function() {
          // Ensure the first state.
          if (model.currentState === firstState) {
            done();
          }
        });
        // Ensure the initial state.
        assert.equal(model.targetState, initialState);
        assert.equal(model.currentState, initialState);
    });
  });

  suite('set target state', function() {
    test('the final state should be the last state if success', function(done) {
      var initialState = 'initialState';
      var finalTargetState = 'finalState';

      // Note that OPERATION_TIME should be larger than the total time required
      // for performing the random user actions.
      var OPERATION_TIME = 300;
      var USER_ACTION_TIME = 10;

      var model = StateModel({
        _state: initialState,
        onInit: function() {
          return this._state;
        },
        onGetState: function() {
          return Promise.resolve(this._state);
        },
        onSetState: function(newState) {
          // a fake time consuming operation
          return new Promise((resolve) => {
            setTimeout(() => {
              this._state = newState;
              resolve(this._state);
            }, OPERATION_TIME);
          });
        }
      });
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
        } else {
          // Some random actions.
          model.targetState = (Math.random() * 10) % 10;
        }
      }, USER_ACTION_TIME);
    });
  
    test('the final state should be the reported state if failed',
      function(done) {
        var initialState = 'initialState';
        var targetState = 'targetState';
        var realState = 'realState';

        var model = StateModel({
          _state: initialState,
          onInit: function() {
            return this._state;
          },
          onGetState: function() {
            return Promise.resolve(this._state);
          },
          onSetState: function(newState) {
            // a fake time consuming operation
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                this._state = realState;
                reject(this._state);
              });
            });
          }
        });
        model.observe('transitioning', function(transitioning) {
          if (transitioning) {
            return;
          }
          assert.equal(model.targetState, realState);
          assert.equal(model.currentState, realState);
          done();
        });
        model.targetState = targetState;
    });
  });

  suite('state change', function() {
    test('the final state should change to the real state', function(done) {
      var initialState = 'initialState';
      var realState = 'realState';

      var _onStateChange = null;
      var model = StateModel({
        _state: initialState,
        onInit: function(onStateChange) {
          _onStateChange = onStateChange;
          return this._state;
        },
        onGetState: function() {
          return Promise.resolve(this._state);
        },
        onSetState: function() {}
      });

      var targetStateChecked = false;
      var currentStateChecked = false;

      model.observe('targetState', function() {
        targetStateChecked = model.targetState == realState;
        if (targetStateChecked && currentStateChecked) {
          done();
        }
      });
      model.observe('currentState', function() {
        currentStateChecked = model.currentState == realState;
        if (targetStateChecked && currentStateChecked) {
          done();
        }
      });
      // trigger the state change
      _onStateChange('realState');
    });
  });
});
