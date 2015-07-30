/**
 * StateModel reduces the complexibility of making the UI and a module state
 * synchronized while keeping the UI responsive at all times. A typical use case
 * would be bound a toggle to a hardware feature that requires time for turning
 * on and off.
 *
 * StateModel was designed for the following goals:
 * - Immediate response
 *   The UI is not blocked even the target module can not respond to the user
 *   request immediately.
 * - Displaying the target state
 *   The final state should always be the last state requested from users unless
 *   the module fails to fufill the request.
 * - Displaying the real state
 *   If the module fails to be set to the target state or it changes the state
 *   by itself, the final state is the real module state.
 *
 * StateModel needs to be created with an object used for performing the
 * state change operations. The object should define the following three
 * functinos:
 * - onInit
 *   It is called only once when the model is being initialized. The function
 *   takes a function as the parameter used for reporting the state changes
 *   from the module. It can be omitted if your module won't change the state
 *   by itself. onInit should also return an initial state immediately.
 *
 * - onSetState
 *   It is called with a target state. Do the operation required for switching
 *   to the target state. Always return a promise resolved/rejected with a
 *   state.
 *   If the promise resolves with a state that does not equal to the
 *   latest target state, StateModel will call to this function again with the
 *   target state. If the promise rejects, StateModel simply changes the
 *   target state to the reported state because the module fails to be changed
 *   to the desired state.
 *
 * - onGetState
 *   It is called for requesting the current state. Return a promise wrapping
 *   the current state. StateModel fails to be initialized if the returning
 *   promise rejects.
 *
 * StateModel provides three observable properties:
 * - targetState
 *   This is a property representing the user desired state and it gets updated
 *   to the real module state when required. Binding this property to the UI
 *   should be sufficient for most of the use cases.
 * - currentState
 *   This is a readonly property reporting the latest stable state.
 * - transitioning
 *   This is a readonly property showing if it is in transition between states.
 *
 * @example
 *   var stateModel = StateModel({
 *     _state: null,
 *     onInit: function(stateChange) {
 *       return this._state;
 *     },
 *     onSetState: function(state) {
 *       // A fake time consuming operation
 *       return new Promise((resolve) => {
 *         setTimeout(() => {
 *           this._state = state;
 *           resolve(this._state);
 *         }, 10000);
 *       });
 *     },
 *     onGetState: function() {
 *       return Promise.resolve(this._state);
 *     }
 *   });
 *
 *   // Do the binding
 *   checkbox.addEventListener('change', function() {
 *     stateModel.targetState = checkbox.checked;
 *   });
 *   stateModel.observe('targetState', function(newState) {
 *     checkbox.checked = newState;
 *   });
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  /**
   * @class StateModel
   * @param {Function} onInit
   * @param {Function} onSetState
   * @param {Function} onGetState
   * @returns {StateModel}
   */
  var StateModel = Module.create(
    function StateModel({onInit, onGetState, onSetState}) {
      if (typeof onInit !== 'function' ||
          typeof onGetState !== 'function' ||
          typeof onSetState !== 'function') {
        this.throw('invalid arguments');
      }
      this.super(Observable).call(this);

      var argument = arguments[0];
      this._init(onInit.bind(argument), onGetState.bind(argument),
        onSetState.bind(argument));
  }).extend(Observable);

  /**
   * An observable property indicating the desired state.
   *
   * @access public
   * @memberOf StateModel.prototype
   * @type {Object}
   */
  Observable.defineObservableProperty(StateModel.prototype, 'targetState', {
    value: null
  });

  /**
   * An observable property indicating the current state.
   *
   * @access public
   * @readonly
   * @memberOf StateModel.prototype
   * @type {Object}
   */
  Observable.defineObservableProperty(StateModel.prototype, 'currentState', {
    readonly: true,
    value: null
  });

  /**
   * An observable property indicating if it is in transition.
   *
   * @access public
   * @readonly
   * @memberOf StateModel.prototype
   * @type {Boolean}
   */
  Observable.defineObservableProperty(StateModel.prototype, 'transitioning', {
    readonly: true,
    value: false
  });

  StateModel.prototype._init = function(onInit, onGetState, onSetState) {
    this._onInit = onInit;
    this._onGetState = onGetState;
    this._onSetState = onSetState;

    this.targetState = this._onInit((realState) => {
      if (!this._transitioning) {
        this._currentState = realState;
        this.targetState = realState;
      }
    });
    this._currentState = this.targetState;

    // Do the initialization
    this._onGetState().then((realState) => {
      this._currentState = realState;
      if (this.targetState !== realState) {
        // If the current target state is not the real state, do set again.
        this._setState(this.targetState);
      }

      this.observe('targetState', (newState) => {
        if (this._transitioning || newState === this._currentState) {
          return;
        }
        this._setState(newState);
      });
    }).catch((err) => {
      this.error('initialization error ' + err);
    });
  };

  StateModel.prototype._setState = function(state) {
    this.debug('set state: ' + state);
    this._transitioning = true;
    return this._onSetState(state).then((realState) => {
      this.debug('set state completed: ' + state +
        ', real state: ' + realState);
      this._currentState = realState;
      if (this.targetState !== realState) {
        // If the current target state is not the real state, do set again.
        this._setState(this.targetState);
      } else {
        this._transitioning = false;
      }
    }, (realState) => {
      this.debug('set state failed: ' + state + ', real state: ' + realState);
      this._currentState = realState;
      this.targetState = realState;
      this._transitioning = false;
    });
  };

  return StateModel;
});
