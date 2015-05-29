/**
 * OperatorItem is a model presenting the information and the current connecting
 * status of an operator. OperatorManager is responsible for update the
 * information of this type of objects.
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  const STATE = {
    IDLE: 'idle',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    FAILED: 'failed'
  };

  const TYPE = {
    AVAILABLE: 'available',
    FORBIDDEN: 'forbidden',
    UNKNOWN: 'unknown'
  };

  var OperatorItem = Module.create(function OperatorItem(network) {
    this.super(Observable).call(this);

    this._network = network;
    this._name = network.shortName || network.longName;
    switch (network.state) {
      case 'connected':
      case 'current':
        this._state = STATE.CONNECTED;
        this._type = TYPE.AVAILABLE;
        break;
      case 'available':
        this._state = STATE.IDLE;
        this._type = TYPE.AVAILABLE;
        break;
      case 'forbidden':
        this._state = STATE.IDLE;
        this._type = TYPE.FORBIDDEN;
        break;
      default:
        this._state = STATE.IDLE;
        this._type = TYPE.UNKNOWN;
        break;
    }

    this.observe('state', this._updateInfo.bind(this));
    this._updateInfo();
  }).extend(Observable);

  Object.defineProperty(OperatorItem, 'STATE', {
    get: function() {
      return STATE;
    }
  });

  Object.defineProperty(OperatorItem, 'TYPE', {
    get: function() {
      return TYPE;
    }
  });

  Object.defineProperty(OperatorItem.prototype, 'name', {
    get: function() {
      return this._name;
    }
  });

  Object.defineProperty(OperatorItem.prototype, 'network', {
    get: function() {
      return this._network;
    }
  });

  Observable.defineObservableProperty(OperatorItem.prototype, 'state', {
    readonly: true,
    value: null
  });

  Observable.defineObservableProperty(OperatorItem.prototype, 'info', {
    readonly: true,
    value: ''
  });

  OperatorItem.prototype.setState = function oi_setState(state) {
    this._state = state;
  };

  OperatorItem.prototype._updateInfo = function oi__updateInfo() {
    // We display the type of the operator item if it is not connecting,
    // otherwise we display the conection state.
    this._info = this._state === STATE.IDLE ? this._type : this._state;
    this._info = this._info || TYPE.UNKNOWN;
  };

  return OperatorItem;
});
