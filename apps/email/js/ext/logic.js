/**
 * Logic is a structured logging system with bonus features for tracking
 * asynchronous code flow and simple unit testing.
 *
 * This docstring is a quick tutorial.
 *
 *******************************************************************************
 * SCOPES
 *
 * Every log must be associated with a Scope.
 *
 * A Scope is just a wrapper around a namespace and a set of default arguments.
 * When you hear "Scope", think "Logger". You could create a scope like so:
 *
 *   var scope = logic.scope('Animal');
 *
 * Then, you'd do this to log events (see below for more on logging):
 *
 *   logic(scope, 'createdAnimal'); // shorthand for logic.event(...)
 *
 * However, it's inconvenient to pass around scopes, just like it's inconvenient
 * to pass around loggers. So Logic allows you to associate a Scope with an
 * object, like a class instance, and use that object in place of the Scope:
 *
 *   function Animal(name) {
 *     logic.defineScope(this, 'Animal');
 *     logic(this, 'createdAnimal');
 *   }
 *
 * Scopes have two properties: a namespace and default details. When you log
 * an event, it absorbs these things from its associated scope.
 *
 * More about Scopes later; let's talk Events.
 *
 *******************************************************************************
 * EVENT BASICS
 *
 * Logic operates under the principle that "everything is an event", and your
 * program's execution flow can be encoded into a big list of events. Rather
 * than tracking hierarchical relationships in logged events itself, Logic
 * stores relevant information (such as a namespace) on each and every event.
 *
 * Every event, when serialized, is just a simple self-describing JSON payload.
 *
 * By distilling program execution into a linear sequence of Events, we can
 * later reconstruct additional hierarchy or metadata by analyzing the resulting
 * stream, rather than pushing the "burden of understanding" onto the logging
 * framework itself.
 *
 * While you can log events with "logic.event(...)", we also expose "logic(...)"
 * as a convenient shorthand.
 *
 * Events consist of the following:
 *
 *   scope:
 *     The associated scope, which lends a 'namespace' and default details.
 *   type:
 *     The type of the event. You define what it means.
 *   details:
 *     A key-value object of additional details. Any default details associated
 *     with the scope are merged into these details.
 *
 * So given the following code:
 *
 *   function Animal(name) {
 *     logic.defineScope('Animal', { name: name });
 *     logic(this, 'animalCreated', { why: 'because' });
 *   }
 *   Animal.prototype.say = function(what) {
 *     logic(this, 'said', { what: what });
 *   }
 *   new Animal('Riker').say('sup');
 *
 * Logic would output something like the following:
 *
 * [
 *   { namespace: 'Animal',
 *     type: 'animalCreated',
 *     details: { name: 'Riker', why: 'because' } },
 *   { namespace: 'Animal',
 *     type: 'said',
 *     details: { name: 'Riker', what: 'sup' } }
 * ]
 *
 * Notice how every event receives a copy of the details it has been passed?
 * This makes events self-describing. Note that the 'name' detail, passed in
 * logic.defineScope, is also copied to each event.
 *
 * It's often useful to log several things with a set of additional details, and
 * for that, we have subscopes:
 *
 *   var subscope = logic.subscope(animal, { color: 'brown' })
 *   logic(subscope, 'run') // ==> { details: { color: 'brown', name: 'Riker' }}
 *
 * There is no explicit concept of hierarchy. Rather, we expect to reconstruct
 * anything we need when viewing the logs later (i.e. in logic-inspector).
 *
 * There is also no concept of log levels. In practice, the logs we want
 * bug-reporters to see are console logs, not logic events, and only we can
 * understand what the chain of complex events means in context. For instance,
 * errors are often expected in unit tests, where it doesn't make sense to
 * categorically treat them as bright-red errors. (The distinction between
 * log/info/warn events is often unclear, but perhaps a case could be made for
 * distinguishing errors.)
 *
 * In general, our logs should just objectively report what happens, leaving
 * logic-inspector to decide what's important.
 *
 *******************************************************************************
 * ASYNC and AWAIT
 *
 * Tracking events _within_ an individual scope is nice, but often we need to
 * track asynchronous events that get passed around. For that, Logic provides
 * 'logic.async' and 'logic.await', two primitives to annotate async behavior.
 *
 *   var promise = logic.async(this, 'does a job', (resolve) => {...})
 *
 *   logic.await(otherScope, 'waiting for job done', promise)
 *     .then(...)
 *
 * Logic will then log events corresponding to the Promise's resolution and
 * state (such as which events depend on other events) so that we can later
 * reconstruct graphs of the code flow and dependencies. With those two
 * primitives, we could construct a graph like the following:
 *
 *   [ Animal ]               [ Owner ]
 *                             __________________
 *    ________________        | ASYNC            |
 *   | AWAIT dog bowl |       | Filling dog bowl |
 *   |                |       |                  |
 *   |                |       |                  |
 *   |________________|       |__________________|
 *         done  <--------------------/
 *
 * Unfortunately, it's hard to display all that information such that it doesn't
 * get in the way. :mcav attempted to add digraph-like views to logic-inspector,
 * but didn't have much success making it usable yet.
 *
 *******************************************************************************
 * TESTING
 *
 * To write tests against your logic logs, Logic provides the 'logic.match'
 * function.
 *
 * var promise = logic
 *   .match('Animal', 'animalCreated', { name: 'Riker' })
 *   .match('Animal', 'say')
 *   .failIfMatched('Animal', 'died');
 *
 * In the snippet above, the first logic.match call returns an object that has
 * `.then` and `.match`, so that you can treat it like a Promise as well as
 * easily chain further expectations. The promise chain will resolve after all
 * of those conditions have matched, or a timeout has been reached.
 *
 * See test_disaster_recovery.js for an example test using these primitives.
 */
define(function(require) {
  var evt = require('evt');
  var equal = require('equal');

  /**
   * The `logic` module is callable, as a shorthand for `logic.event()`.
   */
  function logic() {
    return logic.event.apply(logic, arguments);
  }

  evt.mix(logic);

  /**
   * Create a new Scope with the given namespace and default details.
   *
   * @param {string} namespace
   * @param {object|null} defaultDetails
   */
  logic.scope = function(namespace, defaultDetails) {
      return new Scope(namespace, defaultDetails);
  };

  var objectToScope = new WeakMap();

  function toScope(scope) {
    if (!(scope instanceof Scope)) {
      scope = objectToScope.get(scope);
      if (!scope) {
        throw new Error('Invalid scope ' + scope +
                        ' passed to logic.event(); ' +
                        'did you remember to call logic.defineScope()? ' +
                        new Error().stack);
      }
    }
    return scope;
  }

  /**
   * Most often, scopes and namespaces map one-to-one with class instances. With
   * defineScope(), you can associate a Scope with an object, and then use that
   * object in place of the scope. For instance:
   *
   *   function MyClass() {
   *     logic.defineScope(this, 'MyClass');
   *     logic.event(this, 'initialized');
   *   }
   */
  logic.defineScope = function(obj, namespace, defaultDetails) {
    // Default to the object's class name, if available.
    if (!namespace && obj && obj.constructor && obj.constructor.name) {
      namespace = obj.constructor.name;
    }
    var scope = new Scope(namespace, defaultDetails);
    objectToScope.set(obj, scope);
    return scope;
  };

  /**
   * Sometimes, you may want to log several events, each with shared
   * details. With logic.subscope(), you can create a child scope that
   * shares the same namespace, but adds additional default details
   * onto each message. For instance:
   *
   *   logic.defineScope(this, 'Account', { accountId: 1 });
   *   var scope = logic.subscope(this, { action: 'move' });
   *   logic.log(scope, 'start');
   *   // event: Account/start { accountId: 1, action: 'move' }
   */
  logic.subscope = function(scope, defaultDetails) {
    scope = toScope(scope);
    return new Scope(scope.namespace, into(shallowClone(scope.defaultDetails),
                                           shallowClone(defaultDetails)));
  };

  /**
   * Emit an event. `logic(...)` is shorthand for `logic.event(...)`.
   * See the module docs for more about events.
   *
   * @param {Scope} scope
   *   The scope (i.e. "namespace") for this event.
   * @param {string} type
   *   A string, typically camelCased, describing the event taking place.
   * @param {object} details
   *   Optional details about this event, such as identifiers or parameters.
   *   These details will be mixed in with any default details specified
   *   by the Scope.
   */
  logic.event = function(scope, type, details) {
    scope = toScope(scope);

    // Give others a chance to intercept this event before we do lots of hard
    // JSON object work.
    var isDefaultPrevented = false;
    var preprocessEvent = {
      scope: scope,
      namespace: scope.namespace,
      type: type,
      details: details,
      preventDefault: function() {
        isDefaultPrevented = true;
      }
    };
    logic.emit('preprocessEvent', preprocessEvent);

    if (isDefaultPrevented) {
      return { id: 0 }; // async/await require a return object regardless.
    }

    type = preprocessEvent.type;
    details = preprocessEvent.details;

    if (typeof type !== 'string') {
      throw new Error('Invalid "type" passed to logic.event(); ' +
                      'expected a string, got "' + type + '"');
    }

    if (scope.defaultDetails) {
      if(isPlainObject(details)) {
        details = into(shallowClone(scope.defaultDetails),
                       shallowClone(details));
      } else {
        details = shallowClone(scope.defaultDetails);
      }
    } else {
      details = shallowClone(details);
    }

    var event = new LogicEvent(scope, type, details);
    logic.emit('censorEvent', event);
    logic.emit('event', event);

    if (logic.realtimeLogEverything) {
      dump('logic: ' + event.toString() + '\n');
    }

    return event;
  };


  // True when being run within a test.
  logic.underTest = false;

  /**
   * Immediately fail the current test with the given exception. If no test is
   * in progress, an error is logged, but no exception is thrown. In other
   * words, logic.fail() will NOT throw on you.
   *
   * @param {object} ex
   *   Exception object, as with Promise.reject()
   */
  logic.fail = function(ex) {
    console.error('Not in a test, cannot logic.fail(' + ex + ')');
  };


  var nextId = 1;

  /**
   * Return a sequential unique identifier, unique for users of this module
   * instance.
   */
  logic.uniqueId = function() {
    return nextId++;
  };

  // Hacky way to pass around a global config:
  logic.isCensored = false;
  logic.realtimeLogEverything = false;

  var interceptions = {};

  /**
   * Provide a named hook which can be intercepted by tests.
   */
  logic.interceptable = function(type, fn) {
    if (interceptions[type]) {
      return interceptions[type]();
    } else {
      return fn();
    }
  };

  /**
   * Intercept a named logic.interceptable by calling your function instead.
   */
  logic.interceptOnce = function(type, replacementFn) {
    var prevFn = interceptions[type];
    interceptions[type] = function() {
      interceptions[type] = prevFn;
      return replacementFn();
    };
  }

  /**
   * Return a Promise-like object that is fulfilled when an event
   * matching the given details is logged. Chainable.
   *
   * detailPredicate is optional and can be any of the following:
   *
   *   an object:
   *     Checks to see if the given object is a SUBSET of the event's details.
   *
   *   a function:
   *     The event matches if detailPredicate(event.details) returns true.
   *
   * @param {string} ns
   * @param {string} type
   * @param {object|function} detailPredicate
   */
  logic.match = function(ns, type, detailPredicate) {
    return new LogicMatcher(
      LogicMatcher.normalizeMatchArgs(ns, type, detailPredicate));
  }


  function MismatchError(matcher, event) {
    this.matcher = matcher;
    this.event = event;
  }

  MismatchError.prototype = Object.create(Error.prototype, {
    constructor: { value: MismatchError },
    toString: { value: function() {
      if (this.matcher.not) {
        return 'MismatchError: expected ' + this.event +
          ' to not occur (failIfMatched ' + this.matcher + ').';
      } else {
        return 'MismatchError: expected ' + this.event +
          ' to match ' + this.matcher + '.';
      }
    }}
  });


  /**
   * This is the object returned from `logic.match`. It acts as a Promise that
   * resolves when a matching event has been logged.
   */
  function LogicMatcher(opts) {
    this.matchedLogs = opts.prevMatcher ? opts.prevMatcher.matchedLogs : [];
    this.capturedLogs = [];
    this.ns = opts.ns;
    this.type = opts.type;
    this.detailPredicate = opts.detailPredicate;
    this.failOnMismatchedDetails = true;
    this.not = opts.not;
    this.timeoutMS = 2000;
    this.resolved = false;
    this.anotherMatcherNeedsMyLogs = false;

    if (opts.prevMatcher) {
      // Tell the previous matcher to not remove its event listener until we've
      // had a chance to pull out any logs which occured between its resolution
      // and our start.
      opts.prevMatcher.anotherMatcherNeedsMyLogs = true;
    }

    logic.defineScope(this, 'LogicMatcher');

    var prevPromise = opts.prevPromise || Promise.resolve();

    if (this.not) {
      this.promise = prevPromise.then(() => {
        this.capturedLogs.some((event) => {
          if ((!this.ns || event.namespace === this.ns) &&
              event.matches(this.type, this.detailPredicate)) {
            throw new MismatchError(this, event);
          }
        });
      });
    } else if (this.type) {
      this.promise = new Promise((resolve, reject) => {
        // Once any previous match has been resolved,
        // subscribe to a following match.
        var subscribeToNextMatch = () => {
          var timeoutId = setTimeout(() => {
            reject(new Error('LogicMatcherTimeout: ' + this));
          }, this.timeoutMS);

          // Promise chains have "dead spots" in between resolution
          // callbacks. For instance:
          //                 [promise1.then]      [promise2.then]
          //    other events could be logged --^
          //
          // We could miss those events in the middle by just setting
          // up a new listener for each LogicMatcher. Instead, since
          // every matcher has a pointer to its prevMatcher, we can
          // just grab the missing logs from there.
          var resolveThisMatcher = (event) => {
            this.resolved = true;
            this.capturedLogs = []; // Extra events will go here.
            if (!this.anotherMatcherNeedsMyLogs) {
              this.removeMatchListener();
            }
          };

          var matchFn = (event) => {
            this.capturedLogs.push(event);
            if (this.resolved) {
              return;
            }

            if (this.ns && event.namespace !== this.ns ||
                event.type !== this.type) {
              return false; // did not match
            }
            if (event.matches(this.type, this.detailPredicate)) {
              resolveThisMatcher(event);
              this.matchedLogs.push(event);
              clearTimeout(timeoutId);
              logic(this, 'match', { ns: this.ns,
                                     type: this.type,
                                     event: event });
              resolve(event);
              return true;
            } else {
              if (this.failOnMismatchedDetails) {
                resolveThisMatcher(event);
                reject(new MismatchError(this, event));
                return true; // matched
              } else {
                // Ignore mismatched events; maybe we'll match later.
              }
            }
            return false; // not done yet, didn't find a match
          };

          this.removeMatchListener = () => {
            logic.removeListener('event', matchFn);
          };

          logic.on('event', matchFn);

          if (opts.prevMatcher) {
            var prevLogs = opts.prevMatcher.capturedLogs;
            // Run matchFn on prevLogs until one of them matches.
            var matchIndex = prevLogs.findIndex(matchFn);
            // Then, we get to start by capturing all logs that have occured in
            // the intervening time:
            if (matchIndex !== -1) {
              this.capturedLogs = prevLogs.slice(matchIndex + 1);
            }
            // Now that we're done with the previous matcher, it doesn't need to
            // listen to events any more.
            opts.prevMatcher.removeMatchListener();
          }
        }

        if (prevPromise) {
          prevPromise.then(subscribeToNextMatch, (e) => reject(e) );
        } else {
          try {
            subscribeToNextMatch();
          } catch(e) {
            reject(e);
          }
        }
      });
    } else {
      // This is the '.then()' case; we still want to return a
      // LogicMatcher so they can chain, but without any further expectations.
      this.promise = prevPromise;
    }
  }

  LogicMatcher.normalizeMatchArgs = function(ns, type, details) {
    // 'ns' is optional
    if (typeof type === 'object') {
      details = type;
      type = ns;
      ns = null;
    }
    return { ns: ns, type: type, detailPredicate: details };
  }

  LogicMatcher.prototype = {

    /**
     * Same as `logic.match`.
     */
    match(ns, type, details) {
      var args = LogicMatcher.normalizeMatchArgs(ns, type, details);
      args.prevMatcher = this;
      args.prevPromise = this.promise;
      return new LogicMatcher(args);
    },

    /**
     * Look at THE LOGS ALREADY CAPTURED by this LogicMatcher, and fail if any
     * of them match this one.
     */
    failIfMatched(ns, type, details) {
      var args = LogicMatcher.normalizeMatchArgs(ns, type, details);
      args.not = true;
      args.prevMatcher = this;
      args.prevPromise = this.promise;
      return new LogicMatcher(args);
    },

    /**
     * Like Promise.then(); resolves with an array of matched logs.
     */
    then(fn, catchFn) {
      return new LogicMatcher({
        prevPromise: this.promise.then(() => {
          var ret = fn(this.matchedLogs.slice());
          if (ret instanceof Promise) {
            ret = new LogicMatcher({
              prevPromise: ret
            });
          }
          return ret;
        }, catchFn)
      });
    },

    toString() {
      return '<LogicMatcher ' + (this.ns ? this.ns + '/' : '') +
        this.type + ' ' + new ObjectSimplifier().simplify(this.detailPredicate)
        + '>';
    }
  }

  function Scope(namespace, defaultDetails) {
    this.namespace = namespace;

    if (defaultDetails && !isPlainObject(defaultDetails)) {
      throw new Error('Invalid defaultDetails; expected a plain-old object: ' +
                      defaultDetails);
    }
    this.defaultDetails = defaultDetails;
  }

  function ObjectSimplifier(opts) {
    opts = opts || {};
    this.maxDepth = opts.maxDepth || 10;
    this.maxStringLength = opts.maxStringLength || 1000;
    this.maxArrayLength = opts.maxArrayLength || 1000;
    this.maxObjectLength = opts.maxObjectLength || 10;
  }

  ObjectSimplifier.prototype = {
    simplify: function(x) {
      return this._simplify(x, 0, new WeakSet());
    },

    _simplify: function(x, depth, cacheSet) {
      if (cacheSet.has(x)) {
        return '(cycle)';
      }
      if (typeof x === 'number') {
        return x;
      } else if (typeof x === 'string') {
        return x.slice(0, this.maxStringLength);
      } else if (x && x.BYTES_PER_ELEMENT) {
        // TypedArray
        return x.slice(0, this.maxArrayLength);
      } else if (Array.isArray(x)) {
        if (depth < this.maxDepth) {
          return x.slice(0, this.maxArrayLength)
            .map((element) => this._simplify(element, depth + 1, cacheSet));
        } else {
          return '[Array length=' + x.length + ']';
        }
      } else if (x && typeof x === 'object') {
        cacheSet.add(x);
        if (!isPlainObject(x)) {
          if (x.toJSON) {
            return this._simplify(x.toJSON(), depth, cacheSet);
          } else if (x.toString) {
            return this._simplify(x.toString(), depth, cacheSet);
          } else {
            return '(?)';
          }
        } else {
          if (depth < this.maxDepth) {
            var retObj = {};
            var idx = 0;
            for (var key in x) {
              if (idx > this.maxObjectLength) {
                break;
              }
              retObj[key] = this._simplify(x[key], depth + 1, cacheSet);
              idx++;
            }
            return retObj;
          } else if (x.toString) {
            return this._simplify(x.toString(), depth, cacheSet);
          } else {
            return '(object?)';
          }
        }
      } else if (typeof x === 'function') {
        return '(function)';
      } else {
        return x;
      }
    }
  }

  function LogicEvent(scope, type, details) {
    if (!(scope instanceof Scope)) {
      throw new Error('Invalid "scope" passed to LogicEvent(); ' +
                      'did you remember to call logic.defineScope()?');
    }

    this.scope = scope;
    this.type = type;
    this.details = details;
    this.time = Date.now();
    this.id = logic.uniqueId();
    this.jsonRepresentation = {
      namespace: this.scope.namespace,
      type: this.type,
      details: new ObjectSimplifier().simplify(this.details),
      time: this.time,
      id: this.id
    };
  }

  LogicEvent.fromJSON = function(data) {
    var event = new LogicEvent(new Scope(data.namespace),
                               data.type,
                               data.details);
    event.time = data.time;
    event.id = data.id;
    return event;
  }

  LogicEvent.prototype = {
    get namespace() {
      return this.scope.namespace;
    },

    toJSON: function() {
      return this.jsonRepresentation;
    },

    toString: function() {
      return '<LogicEvent ' + this.namespace + '/' + this.type + ' ' +
        JSON.stringify(this.jsonRepresentation.details) + '>';
    },

    /**
     * Return true if this event matches the given predicate, using the same
     * rules as `logic.match()`.
     *
     * @param {string} type
     * @param {object|function|null} detailPredicate
     */
    matches: function(type, detailPredicate) {
      if (this.type !== type) {
        return false;
      }

      if (typeof detailPredicate === 'function') {
        return !!detailPredicate(this.details);
      } else if (isPlainObject(detailPredicate)) {
        for (var key in detailPredicate) {
          var expected = detailPredicate && detailPredicate[key];
          var actual = this.details && this.details[key];
          if (actual === undefined) {
            actual = null; // For actual comparison, undefined equates to null.
          }

          if (expected === undefined) {
            continue; // We don't care about these.
          } else if (!this.details ||
                     !equal(expected, actual)) {
            return false;
          }
        }
        return true;
      } else if (detailPredicate != null) {
        return equal(this.details, detailPredicate);
      } else {
        return true;
      }
    }
  };

  function isPlainObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    // Object.create(null) has no .toString().
    if (obj.toString && (obj.toString() !== '[object Object]')) {
      return false;
    }
    for (var k in obj) {
      if (typeof k === 'function') {
        return false;
      }
    }
    return true;
  }

  logic.isPlainObject = isPlainObject;

  //----------------------------------------------------------------
  // Promises

  var promiseToStartEventMap = new WeakMap();
  var promiseToResultEventMap = new WeakMap();

  /**
   * For those cases when your logic starts in one place but ends in
   * another, logic.async is slightly inconvenient. This function
   * tracks an async event much like `logic.async`, except that this
   * helper pulls out 'resolve' and 'reject' to allow you to log
   * completion elsewhere.
   *
   * @return An object with 'resolve' and 'reject' properties.
   */
  logic.startAsync = function(scope, type, details) {
    var resolve, reject;
    var promise = logic.async(scope, type, details, (_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
    return {
      resolve: resolve,
      reject: reject
    };
  }

  /**
   * A tracked version of `new Promise()`, where `fn` here is your promise
   * executor function. As with `logic.event()`, details is optional, but type
   * is required. Events will be logged to track the promise's resolution.
   */
  logic.async = function(scope, type, details, fn) {
    if (!fn && typeof details === 'function') {
      fn = details;
      details = null;
    }

    scope = logic.subscope(scope, details);

    var startEvent;
    var promise = new Promise((resolve, reject) => {
      startEvent = logic(scope, 'begin ' + type, {
        asyncStatus: 0, // 'pending', as per Promise's private 'status' property.
        asyncName: type
      });

      fn((result) => {
        promiseToResultEventMap.set(promise, logic(scope, type, {
          asyncStatus: 1, // 'resolved'
          sourceEventIds: [startEvent.id],
          result: result
        }));
        resolve(result);
      }, (error) => {
        promiseToResultEventMap.set(promise, logic(scope, type, {
          asyncStatus: 2, // 'rejected'
          sourceEventIds: [startEvent.id],
          error: error
        }));
        reject(error);
      });
    });

    promiseToStartEventMap.set(promise, startEvent);
    return promise;
  };

  /**
   * Wraps a Promise, logging events that say "I'm waiting for this Promise" and
   * "I finally got this Promise's result". If the originating promise was
   * created with `logic.async`, we can link the two semantically.
   */
  logic.await = function(scope, type, details, promise) {
    if (!promise && details.then) {
      promise = details;
      details = null;
    }

    scope = logic.subscope(scope, details).subscope(scope);

    var startEvent = promiseToStartEventMap.get(promise);
    var awaitEvent = logic.event(scope, 'await ' + type, {
      awaitStatus: 0, // 'pending', as per Promise's private 'status' property.
      sourceEventIds: startEvent ? [startEvent.id] : null,
      awaitName: type
    });

    return promise.then((result) => {
      var resultEvent = promiseToResultEventMap.get(promise);
      logic(scope, type, {
        awaitStatus: 1, // 'resolved'
        result: result,
        sourceEventIds: (resultEvent
                         ? [resultEvent.id, awaitEvent.id]
                         : [awaitEvent.id])
      });
      return result;
    }, (error) => {
      var resultEvent = promiseToResultEventMap.get(promise);
      logic(scope, type, {
        awaitStatus: 2, // 'rejected'
        error: error,
        sourceEventIds: (resultEvent
                         ? [resultEvent.id, awaitEvent.id]
                         : [awaitEvent.id])
      });
      throw error;
    });
  };

  function shallowClone(x) {
    if (isPlainObject(x)) {
      var ret = {};
      for (var key in x) {
        ret[key] = x[key];
      }
      return ret;
    } else {
      return x;
    }
  }

  /**
   * Merge `source` into `target`.
   */
  function into(target, source) {
    if (!target) {
      target = {};
    }
    for (var key in source) {
      target[key] = source[key];
    }
    return target;
  }


  return logic;
});
