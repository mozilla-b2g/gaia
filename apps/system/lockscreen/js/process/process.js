'use strict';

/**
 * A wrapped Promise, which provides more flow control APIs like
 * to stop, resumt and destroy the process.
 **/
(function(exports) {
  var Process = function() {
    this.status = {
      started: false,
      stopped: false,
      destroyed: false,
      phase: null
    };
    this.promises = {
      startedResolver: null,
      startedPromise: null,
      stoppedResolver: null,
      stoppedPromise: null,
      destroyedResolver: null,
      destroyedPromise: null,
      currentPromise: null,
      nextResolver: null,
      nextPromise: null
    };
    this.promises.startedPromise = new Promise(
    (resolver) => {
      this.promises.startedResolver = resolver;
    });
    this.promises.stoppedPromise = new Promise(
    (resolver) => {
      this.promises.stoppedResolver = resolver;
    });
    this.promises.destroyedPromise = new Promise(
    (resolver) => {
      this.promises.destroyedResolver = resolver;
    });
  };

  // Create an error type to distinguish other possible errors
  // from the steps of the promise chain.
  Process.Interrupt = function(reason) {
    this.type = reason;
  };
  Process.Interrupt.prototype = new Error();
  Process.Interrupt.prototype.constructor = Process.Interrupt;

  Process.prototype.start = function() {
    if (this.status.stopped || this.status.destroyed) {
      return;
    }
    this.status.started = true;
    // We have two ways to kick off the promises:
    // 1. If the current chain has not been done, but something happen and we
    //    need to switch to the next phase, interrupt the current chain and
    //    kick off the 'nextPromise'.
    // 2. If steps in the chain all get executed, and the method like this
    //    is invoked, it would kick off the next promise directly.
    // And in test to resolve a resolving function twice do only no-op,
    // so we don't need to keep extra information about which promise get
    // interrupted, which would add more complexity.
    this.promises.startedResolver();
    this.promises.currentPromise =
      this.promises.startedPromise;
    this.status.phase = 'started';
    this.promises.nextResolver = this.promises.stoppedResolver;
    this.promises.nextPromise = this.promises.stoppedPromise;
    return this;
  };
  Process.prototype.stop = function() {
    if (!this.status.started || this.status.destroyed) {
      return;
    }
    this.status.stopped = true;
    this.promises.stoppedResolver();
    this.promises.currentPromise =
      this.promises.stoppedPromise;
    this.status.phase = 'stopped';
    this.promises.nextResolver = this.promises.destroyedResolver;
    this.promises.nextPromise = this.promises.destroyedPromise;
    return this;
  };
  Process.prototype.destroy = function() {
    if (!this.status.started || this.status.destroyed) {
      return;
    }

    this.status.destroyed = true;
    this.promises.destroyedResolver();
    this.promises.currentPromise =
      this.promises.destroyedPromise;
    this.status.phase = 'destroyed';
    // User change from start to destroy directly. It's for convenience.
    this.promises.nextResolver = this.promises.destroyedResolver;
    this.promises.nextPromise = this.promises.destroyedPromise;
    return this;
  };
  Process.prototype.then = function(step) {
    // Step would be tagged to see which phase it belongs to,
    // and if it get executed at a different phase this means
    // we should interrupt it and the followers.
    //
    // And yes we can put a closure here but I think to make a
    // time-across closure variable is not so clear.
    step.phase = this.status.phase;
    this.promises.currentPromise =
      this.promises.currentPromise.then((value) => {
        // Interrupt the chain if the on going Promise
        // is not the same with the current status.
        if (this.checkInterrupt(step.phase)) {
          throw new Process.Interrupt('switchingphase');
        }
        return step(value);
      });
    return this;
  };
  Process.prototype.catch = function(step) {
    this.promises.currentPromise =
      this.promises.currentPromise.catch((err) => {
        if (err instanceof Process.Interrupt &&
            'switchingphase' === err.type) {
            // Start to run the steps after it get interrupted.
            this.promises.nextResolver();
        } else {
          step(err);
        }
      });
    return this;
  };
  Process.prototype.checkInterrupt = function(stepPhase) {
    if (stepPhase !== this.status.phase) {
      return true;
    }
    return false;
  };
  exports.Process = Process;
})(window);

