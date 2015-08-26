/* global performance */
(function(exports) {
  'use strict';

  var debug = false;
  function log(str) {
    if (!debug) {
      return;
    }

    console.log('🎶 ', str);
  }

  // The naive mode just executes all blocks right away
  // (useful for performance comparison).
  var naive = false;
  var naiveExec = function(block) {
    block();
    return Promise.resolve();
  };

  var directProtectionWindow = 360;

  var Scheduler = function() {
    this._directTracking = {};

    this._ongoingTransitions = 0;
    this._queuedTransitions = [];

    this._flushing = false;
    this._pendingMutations = [];
  };

  Scheduler.prototype = {
    // *Direct* blocks should be used for direct manipulation use cases
    // (touchevents, scrollevents...).
    // They're exectuted in a requestAnimationFrame block and are protected
    // from mutations. Request might be cancelled by subsequent direct blocks if
    // the event loop gets too busy.
    attachDirect: function(elm, evtType, block) {
      var tracking = this._directTracking;
      if (!(elm in tracking)) {
        tracking[elm] = {};
      }
      var tElm = tracking[elm];

      if (!(evtType in tElm)) {
        tElm[evtType] = {
          rafID: null,
          protectionTimeout: null,
          blocks: []
        };
      }
      var tEvt = tElm[evtType];

      if (!tEvt.blocks.length) {
        elm.addEventListener(evtType, this);
      }

      tEvt.blocks.push(block);
    },

    detachDirect: function(elm, evtType, block) {
      var tEvt = this._trackingFor(elm, evtType);
      if (!tEvt) {
        return;
      }

      if (tEvt.rafID) {
        window.cancelAnimationFrame(tEvt.rafID);
      }

      if (tEvt.protectionTimeout) {
        clearTimeout(tEvt.protectionTimeout);
        tEvt.protectionTimeout = null;
        this._stopProtectingDirect();
      }

      var toRemove = tEvt.blocks.indexOf(block);
      if (toRemove === -1) {
        log('wrong detach block');
        return;
      }

      tEvt.blocks.splice(toRemove, 1);

      if (!tEvt.blocks.length) {
        elm.removeEventListener(evtType, this);
        delete this._directTracking[elm][evtType];

        if (Object.keys(this._directTracking[elm]).length === 0) {
          delete this._directTracking[elm];
        }
      }
    },

    _trackingFor: function(elm, evtType) {
      var tracking = this._directTracking;
      if (!(elm in tracking)) {
        log('wrong detach element');
        return;
      }
      var tElm = tracking[elm];

      if (!(evtType in tElm)) {
        log('wrong detach event');
        return;
      }
      return tElm[evtType];
    },

    _shouldProtectDirect: function() {
      var tracking = this._directTracking;

      for (var elm in tracking) {
        var tElm = tracking[elm];
        for (var evtType in tElm) {
          var tEvt = tElm[evtType];
          if (tEvt.protectionTimeout !== null) {
            return true;
          }
        }
      }
      return false;
    },

    _stopProtectingDirect: function() {
      this._dequeueTransitions();
      this._flushMutations();
      if (debug) {
        console.timeEnd('protecting');
      }
    },

    handleEvent: function(evt) {
      var tEvt = this._trackingFor(evt.currentTarget, evt.type);
      if (!tEvt) {
        return;
      }

      if (naive) {
        tEvt.blocks.forEach(function(block) {
          block(evt);
        });
        return;
      }

      if (tEvt.protectionTimeout) {
        clearTimeout(tEvt.protectionTimeout);
      } else {
        if (debug) {
          console.time('protecting');
        }
      }

      tEvt.protectionTimeout = setTimeout((function() {
        tEvt.protectionTimeout = null;
        this._stopProtectingDirect();
      }).bind(this), directProtectionWindow);

      if (tEvt.rafID) {
        window.cancelAnimationFrame(tEvt.rafID);
      }

      tEvt.rafID = window.requestAnimationFrame(function() {
        tEvt.blocks.forEach(function(block) {
          var startDate;
          if (debug) {
            startDate = performance.now();
          }

          block(evt);

          if (debug) {
            var blockDuration = performance.now() - startDate;
            if (blockDuration > 16) {
              log('Direct block took more than a frame (' +
                   blockDuration.toString() + 'ms)');
            }
          }
        });
      });
    },

    // *Feedbacks* blocks have a built in 'transitionend' wait mechanism.
    // They're protected from mutation and will be delayed during a mutation
    // flush.
    // They have the same priority as `direct` blocks.
    //
    // -> Returns a promise fullfilled at the end of the transition for chaining
    feedback: function(block, elm, evt, timeout) {
      return this._transition(block, true, elm, evt, timeout);
    },

    // *Transitions* blocks have a built in 'transitionend' wait mechanism.
    // They're protected from mutation and will be delayed during a mutation
    // flush.
    // They will also be delayed by `direct` blocks.
    //
    // -> Returns a promise fullfilled at the end of the transition for chaining
    transition: function(block, elm, evt, timeout) {
      return this._transition(block, false, elm, evt, timeout);
    },

    _transition: function(block, feedback, elm, evt, timeout) {
      if (naive) {
        return naiveExec(block);
      }

      timeout = timeout || 500;

      return new Promise((function(resolve, reject) {
        var content = (function() {
          this._ongoingTransitions++;

          block();

          if (!elm || !evt) {
            this._ongoingTransitions--;
            resolve();
            return;
          }

          if (debug) {
            console.time('animating');
          }

          var finishTimeout;

          var done = (function() {
            clearTimeout(finishTimeout);
            elm.removeEventListener(evt, done);

            this._ongoingTransitions--;
            if (debug) {
              console.timeEnd('animating');
            }

            if (this._ongoingTransitions === 0) {
              setTimeout(this._flushMutations.bind(this));
            }

            resolve();
          }).bind(this);

          elm.addEventListener(evt, done);
          finishTimeout = setTimeout(function() {
            done();
            log('Transition block saved by a timeout of ' + timeout + ' ~ ' +
                elm.style.transition);
          }, timeout);
        }).bind(this);

        if (this._flushing || (this._shouldProtectDirect() && !feedback)) {
          this._queuedTransitions.push(content);
        } else {
          content();
        }
      }).bind(this));
    },

    _dequeueTransitions: function() {
      if (this._queuedTransitions.length === 0) {
        return;
      }

      if (this._flushing || this._shouldProtectDirect()) {
        return;
      }

      var transitions = this._queuedTransitions;
      transitions.forEach(function(transition) {
        transition();
      });
      this._queuedTransitions = [];
    },

    // *Mutations* blocks should be used to write to the DOM or perform
    // actions requiring a reflow that are not direct manipulations.
    // We shoud always aim for the document to be almost visually identical
    // _before_ and _after_ a mutation block.
    // Any big change in layout/size will cause a flash/jump.
    //
    // -> Returns a promise fullfilled after the reflow for chaining
    mutation: function(block) {
      if (naive) {
        return naiveExec(block);
      }

      return new Promise((function(resolve, reject) {
        if (this._shouldProtectDirect() || this._ongoingTransitions > 0) {
          this._pendingMutations.push({
            block: block,
            resolve: resolve
          });
        } else {
          block();
          resolve();
        }
      }).bind(this));
    },

    _flushMutations: function() {
      if (this._pendingMutations.length === 0) {
        return;
      }

      if (this._shouldProtectDirect() || this._ongoingTransitions > 0) {
        return;
      }

      this._flushing = true;

      var fulfilments =
        this._pendingMutations
          .map(function(obj) { return obj.resolve; });

      var mutations = this._pendingMutations;
      mutations.forEach(function(mutation) {
        mutation.block();
      });
      this._pendingMutations = [];
      this._flushing = false;

      fulfilments.forEach(function(resolve) { resolve(); });

      this._dequeueTransitions();
    }
  };

  exports.DomScheduler = Scheduler;

  // We only ever want there to be
  // one instance of the scheduler
  exports.scheduler = exports.scheduler || new Scheduler();
})(window);
