/**
 * OperatorManager manages the connection to operators. We can set automatic
 * operator selection or serach for available operators for manual connection.
 * The operator item provided in the list can actively report the connection
 * state so it can be easily bound to UI elements.
 *
 * @module panels/operator_settings/models/operator_manager
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');
  var ObservableArray = require('modules/mvvm/observable_array');
  var OperatorItem = require('panels/operator_settings/models/operator_item');
  var MobileConnectionWrapper =
    require('panels/operator_settings/models/mobile_connection_wrapper');
  var AutoSelectionModel =
    require('panels/operator_settings/models/auto_selection_model');

  const RECONNECT_TIMEOUT = 5000;

  /**
   * @class OperatorManager
   * @requires module:modules/base/module
   * @requires module:modules/mvvm/observable
   * @requires module:modules/mvvm/observable_array
   * @requires module:panels/operator_settings/models/operator_item
   * @requires module:panels/operator_settings/models/mobile_connection_wrapper
   * @requires module:panels/operator_settings/models/auto_selection_model
   * @params {MozMobileConnection} conn
   * @returns {OperatorManager}
   */
  var OperatorManager = Module.create(function OperatorManager(conn) {
    this.super(Observable).call(this);

    this._connWrapper = MobileConnectionWrapper(conn);
    this._operators = ObservableArray();
    this._autoSelectionModel = AutoSelectionModel(this._connWrapper);

    // bind the two properties.
    this._autoSelectionState = this._autoSelectionModel.targetState;
    this._autoSelectionModel.observe('targetState', (newState) => {
      this._autoSelectionState = newState;
    });
    this.observe('_autoSelectionState', (newState) => {
      this._autoSelectionModel.targetState = newState;
    });

    this.observe('_autoSelectionState', (newState) => {
      if (newState === AutoSelectionModel.STATE.ENABLED) {
        this._connectedOperatorItem = null;
      } else if (newState === AutoSelectionModel.STATE.DISABLED) {
        this.search();
      }
    });

    this._connecting = false;
    this._connectedOperatorItem = null;
  }).extend(Observable);

  /**
   * A static property. The enumeration of the possible states.
   *
   * @access public
   * @memberOf OperatorManager
   * @type {Object}
   */
  Object.defineProperty(OperatorManager, 'AUTO_SELECTION_STATE', {
    get: function() {
      return AutoSelectionModel.STATE;
    }
  });

  /**
   * The search result of the currently available operators.
   *
   * @access public
   * @readonly
   * @memberOf OperatorManager.prototype
   * @type {ObservableArray.<OperatorItem>}
   */
  Object.defineProperty(OperatorManager.prototype, 'operators', {
    get: function() {
      return this._operators;
    }
  });

  /**
   * An observable property indicating the automatic selection state.
   *
   * @access public
   * @readonly
   * @memberOf OperatorManager.prototype
   * @type {OperatorManager.AUTO_SELECTION_STATE}
   */
  Observable.defineObservableProperty(OperatorManager.prototype,
    'autoSelectionState', {
      readonly: true,
      value: null
  });

  /**
   * An observable property indicating the currently connected operator.
   *
   * @access public
   * @readonly
   * @memberOf OperatorManager.prototype
   * @type {OperatorItem}
   */
  Observable.defineObservableProperty(OperatorManager.prototype,
    'connectedOperatorItem', {
      readonly: true,
      value: null
  });

  /**
   * An observable property indicating the searching status.
   *
   * @access public
   * @readonly
   * @memberOf OperatorManager.prototype
   * @type {Boolean}
   */
  Observable.defineObservableProperty(OperatorManager.prototype,
    'searching', {
      readonly: true,
      value: false
  });

  /**
   * Request to search available operators and update the operator list.
   *
   * @access public
   * @memberOf OperatorManager.prototype
   * @returns {Promise}
   */
  OperatorManager.prototype.search = function() {
    if (this._searching) {
      return Promise.resolve();
    }

    this.debug('search');
    this._searching = true;
    return this._connWrapper.search().then((networks = []) => {
      var operators = networks.map((network) => OperatorItem(network));
      operators.forEach((operator) => {
        if (operator.network.state === OperatorItem.STATE.CONNECTED) {
          this._connectedOperatorItem = operator;
        }
      });
      this._operators.reset(operators);
    }).catch((error) => {
      if (error !== 'busy') {
        // keep the original operators if other errors.
        this._operators.reset([]);
      }
      this.error('could not retrieve any network operator: ' + error);
    }).then(() => {
      this._searching = false;
    });
  };

  /**
   * Stop the search.
   *
   * @access public
   * @memberOf OperatorManager.prototype
   */
  OperatorManager.prototype.stop = function() {
    this._connWrapper.stop();
    this._searching = false;
  };

  /**
   * Connect to a network. If it fails, reconnect to the original operator 5
   * seconds later.
   *
   * @access public
   * @memberOf OperatorManager.prototype
   * @params {OperatorItem} operatorItem
   * @returns {Promise}
   */
  OperatorManager.prototype.connect = function(operatorItem) {
    if (this._connecting || operatorItem === this._connectedOperatorItem) {
        return Promise.resolve();
    }

    this.debug('connect');

    this._connecting = true;
    operatorItem.setState(OperatorItem.STATE.CONNECTING);
    return this._connWrapper.connect(operatorItem.network).then(() => {
      operatorItem.setState(OperatorItem.STATE.CONNECTED);
      this._connectedOperatorItem = operatorItem;
    }).catch((error) => {
      this.error('unable to connect to the network: ' + error);
      operatorItem.setState(OperatorItem.STATE.FAILED);
      // recover the connection
      setTimeout(function(originalOperatorItem) {
        operatorItem.setState(OperatorItem.STATE.IDLE);
        if (originalOperatorItem &&
          this.autoSelectionState === AutoSelectionModel.STATE.DISABLED) {
            this.connect(originalOperatorItem);
        }
      }.bind(this, this._connectedOperatorItem), RECONNECT_TIMEOUT);
    }).then(() => {
      this._connecting = false;
    });
  };

  /**
   * Request to select an operator automatically.
   *
   * @access public
   * @memberOf OperatorManager.prototype
   * @params {Boolean} enabled
   */
  OperatorManager.prototype.setAutoSelection = function(enabled) {
      this.debug('setAutoSelection: ' + enabled);
    this._autoSelectionModel.targetState = enabled ?
      AutoSelectionModel.STATE.ENABLED : AutoSelectionModel.STATE.DISABLED;
  };

  return OperatorManager;
});
