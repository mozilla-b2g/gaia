(function() {

  var isNode = typeof(window) === 'undefined',
      Responder;

  if (!isNode) {
    if (typeof(TestAgent.Mocha) === 'undefined') {
      TestAgent.Mocha = {};
    }
    Responder = TestAgent.Responder;
  } else {
    Responder = require('../responder');
  }

  /**
   * Removes a value from an array.
   *
   * @param {Array} array target to remove value from.
   * @param {Object} value value to remove from array.
   */
  function removeIndex(array, value) {
    var index = array.indexOf(value);

    if (index !== -1) {
      array.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Creates a thread manager able to
   * accept test events from multiple sources.
   *
   *
   * @param {Object} options config.
   * @param {Array} options.envs object containing a list of
   *                                     environments to keep track of.
   * @constructor
   */
  function ConcurrentReportingEvents(options) {
    var key;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    for (key in options) {
      if (options.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    }

    this.envOrder = [];
    this.envQueue = {};
    //clone
    this.total = 0;
    this.startQueue = this.envs.concat([]);
    this.timeoutId = null;
    this.currentEnv = null;

    Responder.call(this);
  }

  var proto = ConcurrentReportingEvents.prototype = Object.create(
    Responder.prototype
  );

  /**
   * Name of start event
   *
   * @type String
   */
  proto.START = 'start';

  /**
   * Name of end event
   *
   * @type String
   */
  proto.END = 'end';

  /**
   * Time between events before
   * throwing an error.
   *
   * @type Numeric
   */
  proto.envTimeout = 10000;

  var emit = proto.emit;

  /**
   * Emits queued events for envId.
   *
   * @this
   * @param {String} envId id of env to emit.
   */
  proto._emitQueuedEvents = function(envId) {
    var queue = this.envQueue[envId],
        event;

    while ((event = queue.shift())) {
      this.emit.apply(this, event);
    }
  };

  /**
   * Emits runner error.
   * @this
   * @param {Object} self context to emit event from.
   */
  proto._emitRunnerError = function _emitRunnerError(self) {
    var context = self || this;
    context.emit('runner error', new Error('timeout'));
  };

  /**
   * Clears and resets the event timer.
   * If no events occur within the .envTimeout
   * period the 'runner error' event will be sent.
   * @this
   */
  proto._setTimeout = function _setTimeout() {
    this._clearTimeout();
    this.timeoutId = setTimeout(
      this._emitRunnerError,
      this.envTimeout,
      this
    );
  };


  /**
   * Clears timeout.
   * @this
   */
  proto._clearTimeout = function _clearTimeout() {
    clearTimeout(this.timeoutId);
  };

  /**
   * Checks if current report is complete.
   *
   * @this
   * @return {Boolean} true when all envs are done.
   */
  proto.isComplete = function() {
    return this.envs.length === 0;
  };

  /**
   * Triggers the start event.
   */
  proto.emitStart = function() {
    emit.call(this, 'start', { total: this.total });
  };

  /**
   * Emits an event on this object.
   * Events will be emitted in groups
   * based on the testAgentEnvId value in
   * data. If one is not present this
   * will act as a normal emit function.
   *
   * @this
   * @param {String} event events name.
   * @param {Object} data data to emit.
   * @return {Object} self.
   */
  proto.emit = function(event, data) {
    var envId,
        currentEnv;

    if (typeof(data) !== 'object' || !('testAgentEnvId' in data)) {
      //act like a normal responder
      return emit.apply(this, arguments);
    }

    envId = data.testAgentEnvId;
    currentEnv = this.currentEnv;

    this._setTimeout();

    //when another env sends the start event queue
    //it to be next in line.
    if (event === this.START) {
      this.total = this.total + data.total;

      this.envOrder.push(envId);

      //create env queue if it does not exist
      if (!(envId in this.envQueue)) {
        this.envQueue[envId] = [];
      }

      removeIndex(this.startQueue, envId);

      if (this.startQueue.length === 0) {
        this.emitStart();
        this.currentEnv = this.envOrder.shift();
        this._emitQueuedEvents(this.currentEnv);
      }

      return this;
    }

    //if this event is for a different group
    //queue the event until the current group
    //emits an 'end' event
    if (envId !== currentEnv) {
      this.envQueue[envId].push(arguments);
      return this;
    }

    //when the end event fires
    //on the current group
    if (event === this.END) {
      removeIndex(this.envs, currentEnv);

      this.currentEnv = this.envOrder.shift();
      //emit the next groups events
      if (this.currentEnv) {
        this._emitQueuedEvents(this.currentEnv);
        //and suppress this 'end' event
        return this;
      }

      if (!this.isComplete()) {
        //don't emit end until all envs are complete
        return this;
      }

      this._clearTimeout();
      //if this is the last
      //env send the end event.
    }

    emit.apply(this, arguments);

    return this;
  };

  if (isNode) {
    module.exports = ConcurrentReportingEvents;
  } else {
    TestAgent.Mocha.ConcurrentReportingEvents = ConcurrentReportingEvents;
  }

}());
