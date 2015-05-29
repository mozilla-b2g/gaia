/**
 * MobileConnectionWrapper wraps functions that are used in the operator
 * settings panel.
 * The responsibility of the module is to ensure all of the functions reject if
 * the mobile connection is busy. This is important because calling to these
 * functions when the mobile connection is busy gecko may return with unknown
 * errors, so we need to ensure this won't happen. 
 * The module also reports the mobile connection state so that the other module
 * can do some scheduling on the operations or reflecting it on the UI.
 *
 * @module panels/operator_settings/models/mobile_connection_wrapper
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  // Mobile connection state
  const STATE = {
    IDLE: 0,
    BUSY: 1
  };

  // A structure that makes a task cancelable. It rejects with 'canceled' if
  // the task is canceled. 
  function Task(promise) {
    var canceled = false;
    var task = new Promise((resolve, reject) => {
      promise.then((result) => {
        if (!canceled) {
          resolve(result);
        } else {
          reject('canceled');
        }
      }, (error) => {
        if (!canceled) {
          reject(error);
        } else {
          reject('canceled');
        }
      });
    });
    task.cancel = function() {
      canceled = true;
    };
    return task;
  }

  /**
   * @class MobileConnetionWrapper
   * @requires module:modules/base/module
   * @requires module:modules/mvvm/observable
   * @params {MozMobileConnection} conn
   * @returns {MobileConnetionWrapper}
   */
  var Wrapper = Module.create(function MobileConnetionWrapper(conn) {
    this.super(Observable).call(this);

    this._conn = conn;
    this._curSearch = null;
    this._state = STATE.IDLE;
  }).extend(Observable);

  /**
   * A static property. The enumeration of the possible states.
   *
   * @access public
   * @memberOf MobileConnetionWrapper
   * @type {Object}
   */
  Object.defineProperty(Wrapper, 'STATE', {
    get: function() {
      return STATE;
    }
  });

  /**
   * An observable property indicating the state of the mobile connection.
   *
   * @access public
   * @readonly
   * @memberOf MobileConnetionWrapper.prototype
   * @type {MobileConnetionWrapper.STATE}
   */
  Observable.defineObservableProperty(Wrapper.prototype, 'state', {
    readonly: true
  });

  /**
   * A property indicating the network selection mode.
   *
   * @access public
   * @readonly
   * @memberOf MobileConnetionWrapper.prototype
   * @type {String}
   */
  Object.defineProperty(Wrapper.prototype, 'networkSelectionMode', {
    get: function() {
      return this._conn.networkSelectionMode;
    } 
  });

  /**
   * Ask the mobile connection to serach available operators. It rejects if
   * the mobile connection is busy.
   * The search can be stopped by calling to `stop`. If it is stopped, the
   * promise never resolves nor rejects.
   *
   * @access public
   * @memberOf MobileConnetionWrapper.prototype
   * @returns {Promise}
   */
  Wrapper.prototype.search = function mcw_search() {
    this.debug('search');

    if (this._state !== STATE.IDLE) {
      this.error('mobile connection is busy');
      return Promise.reject('busy');
    }
    this._state = STATE.BUSY;
    this._curSearch = Task(this._conn.getNetworks());
    return this._curSearch.then((networks) => {
      this.debug('search completed');
      this._state = STATE.IDLE;
      return networks;
    }).catch((error) => {
      this._state = STATE.IDLE;
      if (error === 'canceled') {
        this.debug('search canceled');
      } else {
        this.debug('search error: ' + error);
      }
      return Promise.reject(error);
    });
  };

  /**
   * Stop the current search if any.
   *
   * @access public
   * @memberOf MobileConnetionWrapper.prototype
   */
  Wrapper.prototype.stop = function mcw_stop() {
    this.debug('stop');

    if (this._curSearch) {
      this._curSearch.cancel();
      this._curSearch = null;
    }
  };

  /**
   * Connect to a network. It rejects if the mobile connection is busy.
   *
   * @access public
   * @memberOf MobileConnetionWrapper.prototype
   * @params {MozMobileNetworkInfo} network
   * @returns {Promise}
   */
  Wrapper.prototype.connect = function mcw_connect(network) {
    this.debug('connect');

    if (this._state !== STATE.IDLE) {
      return Promise.reject('busy');
    }
    this._state = STATE.BUSY;
    return this._conn.selectNetwork(network).then(() => {
      this.debug('select network succeed');
      this._state = STATE.IDLE;
    }).catch((error) => {
      this.debug('select network error: ' + error);
      this._state = STATE.IDLE;
      return Promise.reject(error);
    });
  };

  /**
   * Request to select an operator automatically. It rejects if the mobile
   * connection is busy.
   *
   * @access public
   * @memberOf MobileConnetionWrapper.prototype
   * @returns {Promise}
   */
  Wrapper.prototype.setAutoSelection = function mcw_setAutoSelection() {
    this.debug('setAutoSelection');

    if (this._state !== STATE.IDLE) {
      return Promise.reject('busy');
    }
    this._state = STATE.BUSY;
    return this._conn.selectNetworkAutomatically().then(() => {
      this.debug('setAutoSelection succeed');
      this._state = STATE.IDLE;
    }).catch((error) => {
      this.debug('setAutoSelection error: ' + error);
      this._state = STATE.IDLE;
      return Promise.reject(error);
    });
  };

  return Wrapper;
});
