/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Raindrop Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Raindrop-specific testing setup, friends with log.js; right now holds parts
 *  of the 'loggest' implementation involving only testing (and which should
 *  end up in their own project initially.)
 *
 * All classes in this file are definition-support and data structures only;
 *  they do not directly run the tests themselves, although some data-structures
 *  are only populated as a byproduct of function execution.  Namely,
 *  TestContexts are populated and fed to `TestCase` functions during the
 *  execution phase, producing test step definitions as a byproduct.  The
 *  actual run-logic lives in `testdriver.js`.
 *
 * Note, however, that the classes in this file do hold the loggers associated
 *  with their runtime execution.
 **/

define(
  [
    './log',
    'exports'
  ],
  function(
    $log,
    exports
  ) {

const UNSPECIFIED_STEP_TIMEOUT_MS = exports.UNSPECIFIED_STEP_TIMEOUT_MS = null;
const STEP_TIMEOUT_MS = exports.STEP_TIMEOUT_MS = 1000;

/**
 * Data-record class for test steps; no built-in logic.
 */
function TestStep(_log, kind, descBits, actors, testFunc, isBoring, groupName) {
  this.kind = kind;
  this.descBits = descBits;
  this.actors = actors;
  this.testFunc = testFunc;
  this.timeoutMS = UNSPECIFIED_STEP_TIMEOUT_MS;

  this.log = LOGFAB.testStep(this, _log, descBits);
  this.log.boring(isBoring);
  if (groupName)
    this.log.group(groupName);
}
TestStep.prototype = {
  toString: function() {
    return '[TestStep]';
  },
  toJSON: function() {
    return {type: 'TestStep'};
  },
};

/**
 * TestContexts are used to create actors and define the actions that define
 *  the steps of the test.  Each context corresponds with a specific run of a
 *  test case.  In a test case with only 1 permutation, there will be just one
 *  `TestContext`, but in a case with N permutations, there will be N
 *  `TestContext`s.
 *
 * There is some wastefulness to this approach since all of the steps are
 *  re-defined and the step functions get new closures, etc.  This is done in
 *  the name of safety (no accidental object re-use) and consistency with the
 *  Jasmine idiom.
 */
function TestContext(testCase, permutationIndex) {
  this.__testCase = testCase;
  this._permIdx = permutationIndex;
  this._permutations = 1;
  this.__steps = [];
  this._deferredSteps = null;

  this._log = LOGFAB.testCasePermutation(this, testCase.log,
                                         permutationIndex);
  // this is a known-but-null-by-default thing that gets copied to the JSON
  //  blob when present.
  this._log._named = {};

  /**
   * The name of the step group we are currently defining.  This is intended
   *  as a lightweight tagging mechanism for steps so that we can use a wmsy
   *  interposing viewslice to delineate separate groups without having to
   *  add another layer of explicit hierarchy.
   */
  this._definingGroup = null;

  this._actors = [];
}
TestContext.prototype = {
  toString: function() {
    return '[TestContext]';
  },
  toJSON: function() {
    return {type: 'TestContext'};
  },

  /**
   * Allow the test to explicitly set the latched 'variant' on the
   * TestCasePermutation logger for log consumers.  This is being introduced
   * so GELAM tests can identify if a run was for an IMAP run or an AS run.
   */
  setPermutationVariant: function(variant) {
    this._log.variant(variant);
  },

  /**
   * Mix-in contributions from testhelper actorMixins or thingMixins entries.
   */
  _mixinFromHelperDefs: function(target, what, type, invokeConstructor,
                                 constructorArgs) {
    var useDict = what + 'Mixins';

    var helperDefs = this.__testCase.definer.__testHelperDefs;
    if (helperDefs) {
      for (var iHelpDef = 0; iHelpDef < helperDefs.length; iHelpDef++) {
        var helperDef = helperDefs[iHelpDef];

        if (!(useDict in helperDef) ||
            !helperDef[useDict].hasOwnProperty(type))
          continue;
        var mixyBits = helperDef[useDict][type];
        for (var key in mixyBits) {
          target[key] = mixyBits[key];
        }
      }

      if (invokeConstructor && '__constructor' in target)
        target.__constructor.apply(target, constructorArgs);
    }
  },

  /**
   * A testing stand-in for a player in the test that does stuff; for example, a
   *  client or a server.  An actor correlates with and is associated with
   *  exactly one logger.  You use the actor to specify expectations about
   *  what that logger will log for the implementing class that is driving it.
   *  Actors may also expose convenience functions that directly manipulate the
   *  underlying implementation class.  The convenience functions may
   *  automatically generate expectations.
   *
   * Actors are paired with their logger at logger creation time.  You define
   *  the actor to the testing framework using this method AND name it in a test
   *  step in order to get it pushed on the watch-list prior to causing the
   *  associated logger to be created.  Convenience functions can automate this
   *  process but still need to abide by it.
   *
   * An actor itself is not a logger and by default does not contain a secret
   *  internal logger.  However, testhelper implementations tend to create
   *  synthetic actors that self-create a logger implementation of their own
   *  defined in the same file.  This allows the testhelper to define events
   *  that can be waited on.
   */
  actor: function actor(type, name, opts, optionalParentActor) {
    var fabs = this.__testCase.definer.__logfabs;
    for (var iFab = 0; iFab < fabs.length; iFab++) {
      var actorDir = fabs[iFab]._actorCons;
      if (actorDir.hasOwnProperty(type)) {
        // - create the actor
        var actor = new actorDir[type](
          name, optionalParentActor ? optionalParentActor._uniqueName : null);
        // tell it about us, the operational context
        actor.T = this;
        actor.RT = this.__testCase.definer._runtimeContext;

        // - augment with test helpers
        // (from an efficiency perspective, we might be better off creating a
        //  parameterized prototype descendent during the defineTestsFor call
        //  since we can establish linkages at that point.)
        this._mixinFromHelperDefs(actor, 'actor', type, false);

        // - poke it into our logger for reporting.
        this._log._named[actor._uniqueName] = actor;

        // - invoke the constructor helper if it has one
        if ("__constructor" in actor) {
          this._log.actorConstructor(type, name,
                                     actor, actor.__constructor,
                                     actor, opts);
        }

        return actor;
      }
    }
    throw new Error("Unknown actor type '" + type + "'");
  },

  /**
   * Create a actor/logger combo that only has a single event type "event" with
   *  a single checked argument.  Intended to be an alternative to creating your
   *  own custom logger or complicating the test framework.
   */
  lazyLogger: function lazyLogger(name) {
    // create the actor
    var actor = new LAZYLOGFAB._actorCons.lazyLogger(name);
    actor.T = this;
    actor.RT = this.__testCase.definer._runtimeContext;
    this._log._named[actor._uniqueName] = actor;
    // set our global to that when we create the logger, it gets linked up...
    // (this happens at the bottom of this file, and the global gets cleared)
    gNextLazyLoggerActor = actor;
    // figure out the parent logger by getting at the TestRuntimeContext which
    //  we can find on the definer
    var parentLogger = this.__testCase.definer._runtimeContext.peekLogger();
    // create the logger so it immediately bonds with the actor
    var logger = LAZYLOGFAB.lazyLogger(null, parentLogger, name);

    // directly copy across/bind the logger's event method for simplicity
    // XXX this is brittle if we add other methods
    actor.event = logger.event.bind(logger);
    actor.eventD = logger.eventD.bind(logger);
    actor.value = logger.value.bind(logger);
    actor.namedValue = logger.namedValue.bind(logger);
    actor.namedValueD = logger.namedValueD.bind(logger);
    actor.error = logger.error.bind(logger);

    return actor;
  },

  /**
   * An conceptual object in the test, usually represented as relatively inert
   *  data structures that the actors create/modify/etc.  Things do not have
   *  associated loggers but are sufficiently notable that they will be named by
   *  (test) loggers and their movement throughout a distributed system can be
   *  derived.  A thing may have multiple names/representations throughout its
   *  life cycle.  Much of the point of the thing abstraction is to allow us to
   *  tie all those representations together.
   *
   * Simple thing naming just lets us bind a name to a public key or the like.
   *
   * Complex thing naming and reconstruction is accomplished by using consistent
   *  argument names across logging layers that are made known to the
   *  reconstruction layer.  Message layering/containment is accomplished
   *  by logging an event when the encapsulation/decapsulation occurs that
   *  contains both identifiers.
   *
   * Because complex things can be exist and may need to be named prior to the
   *  true name they will eventually know, they are given unique identifiers
   *  within their containing namespaces.  Simple things are just reusing the
   *  infrastructure and don't really need the unique name support.
   *
   * Things, like actors, can have convenience functions placed onto their
   *  prototype chain.
   *
   * @args[
   *   @param[type String]
   *   @param[humanName String]
   *   @param[digitalName #:optional String]{
   *     If the thing is a crypto key, the public key which we should map to the
   *     human name when we see it.
   *   }
   * ]
   */
  thing: function thing(type, humanName, digitalName) {
    var thang = $log.__makeThing(type, humanName, digitalName);
    this._mixinFromHelperDefs(thang, 'thing', type, true, []);
    // poke it into our logger for reporting.
    this._log._named[thang._uniqueName] = thang;
    return thang;
  },

  ownedThing: function ownedThing(actor, type, humanName, digitalName) {
    var thang = $log.__makeThing(type, humanName, digitalName);
    this._mixinFromHelperDefs(thang, 'thing', type, true, []);
    if (!actor._logger._named)
      actor._logger._named = {};
    actor._logger._named[thang._uniqueName] = thang;
    return thang;
  },

  _newStep: function(kind, args, isBoring) {
    var actors = [], descBits = [];
    // args[:-1] are actors/description intermixed, args[-1] is the testfunc
    var iArg;
    for (iArg = 0; iArg < args.length - 1; iArg++) {
      var arg = args[iArg];
      // we allow the contents of arrays to be spliced in for the benefit of
      //  test helper functions that get mixed in.
      if (Array.isArray(arg)) {
        for (var iNestedArg = 0; iNestedArg < arg.length; iNestedArg++) {
          var nestedArg = arg[iNestedArg];
          if ($log.TestActorProtoBase.isPrototypeOf(nestedArg))
            actors.push(nestedArg);
          descBits.push(nestedArg);
        }
      }
      else {
        if ($log.TestActorProtoBase.isPrototypeOf(arg))
          actors.push(arg);
        descBits.push(arg);
      }
    }
    var testFunc = args[iArg];
    var step = new TestStep(this._log, kind, descBits, actors, testFunc,
                            isBoring, this._definingGroup);
    this.__steps.push(step);
    return step;
  },

  _newDeferredStep: function(kind, args, isBoring) {
    if (!this._deferredSteps)
      this._deferredSteps = [];
    this._deferredSteps.push([kind, args, isBoring]);
    return null;
  },

  __postSetupFunc: function() {
    if (this._deferredSteps) {
      for (var i = 0; i < this._deferredSteps.length; i++) {
        var stepDef = this._deferredSteps[i];
        this._newStep(stepDef[0], stepDef[1], stepDef[2]);
      }
      this._deferredSteps = null;
    }
  },

  group: function group(groupName) {
    this._definingGroup = groupName;
  },

  /**
   * Defines a test step/action.  Each action has a description that is made
   *  up of strings and actors (defined via `entity`).  All actors
   *  participating in/relevant to the test step must be named.  The last
   *  argument is always the test function to run to initiate the step/action.
   *
   * The step/action is marked complete when all of the expectations have been
   *  correctly satisfied.  The step fails and the test is aborted if unexpected
   *  non-boring logging invocations occur for the actors involved in the
   *  step.
   *
   * Actors defined in a test-case that are not involved in the step/action
   *  accumulate their entries which will be considered in the next step they
   *  are involved in, save for any entries filtered to be boring during that
   *  step.  This is intended to allow actions that have side-effects that
   *  affect multiple actors to be decomposed into specific pairwise
   *  interactions for clarity.
   */
  action: function action() {
    return this._newStep('action', arguments, false);
  },

  /**
   * Defines a test step that just checks the state of things and does not
   *  affect anything.
   */
  check: function action() {
    return this._newStep('check', arguments, false);
  },

  /**
   * Defines a step where two or more alternative actions should be run.
   *  Implicitly results in the test case as a whole being run a sufficient
   *  number of times to satisfy all contained permutations.
   */
  permutation: function permutation(variesDesc, variants) {
    var numVariants = variants.length;
    this._permutations *= numVariants;

    // The last numVariants steps should be what is handed to us.  If this
    //  is not the case, we are boned.
    var baseStep = this.__steps.length - numVariants;
    for (var i = 0; i < numVariants.length; i++) {
      if (variants[i] !== this.__steps[baseStep])
        throw new Error("Step sequence invariant violation");
    }
    // (use the splice retval rather than the passed in for extra safety)
    var saferVariants = this.__steps.splice(baseStep, numVariants);
    this.__steps.push(saferVariants);
  },

  /**
   * Define a setup test step.  While operationally the same as an action,
   *  setup steps are treated specially for reporting and aggregation purposes.
   *  Setup steps have less focus in the reporting UI, and a test that fails
   *  during its setup steps is treated differently than a test that fails
   *  during an action step.  The theory is that you should look at the tests
   *  that are failing during an action step before tests failing during a setup
   *  step because the setup failures are likely an outgrowth of the action
   *  failures of lower level tests.
   */
  setup: function() {
    return this._newStep('setup', arguments, true);
  },

  /**
   * Setup test step defined by a convenience helper and which should
   *  accordingly be marked as boring.
   */
  convenienceSetup: function() {
    return this._newStep('setup', arguments, true);
  },

  /**
   * Define a cleanup test step to perform any shutdown procedures to cleanup
   *  after a test that garbage collection would not take care of on its own.
   *  These steps should usually be automatically generated by testhelper
   *  logic for entities to match automatically generated setup steps.  They
   *  should also preferably be synchronous/fast.
   *
   * In the event that any step in a test fails, we still attempt to run all of
   *  the cleanup steps, even though they may also experience failures.
   */
  cleanup: function() {
    return this._newStep('cleanup', arguments, true);
  },

  /**
   * A cleanup step defined by a convenience helper that is added to the current
   *  list of steps as it stands right now.  Contrast with
   *  `convenienceDeferredCleanup` which defines a step that
   */
  convenienceCleanup: function() {
    return this._newStep('cleanup', arguments, true);
  },

  /**
   * A cleanup step defined by a convenience helper which is only added to the
   *  list of steps after the function defining the test case has finished
   *  executing.
   */
  convenienceDeferredCleanup: function() {
    return this._newDeferredStep('cleanup', arguments, true);
  },
};
exports.TestContext = TestContext;

function TestCase(definer, kind, desc, setupFunc) {
  this.definer = definer;
  this.kind = kind;
  this.desc = desc;
  this.setupFunc = setupFunc;

  this.log = LOGFAB.testCase(this, definer._log, desc);

  this.context = null;
}
TestCase.prototype = {
  toString: function() {
    return '[TestCase]';
  },
  toJSON: function() {
    return {type: 'TestCase'};
  },
};

function TestDefiner(modname, logfabs, testHelpers, tags) {
  this.__logfabs = logfabs;
  this.__testHelperDefs = testHelpers;
  this.__tags = tags;

  this._log = LOGFAB.testDefiner(this, null, modname);
  this._runtimeContext = null;

  this.__testCases = [];
}
TestDefiner.prototype = {
  toString: function() {
    return '[TestDefine]';
  },
  toJSON: function() {
    return {type: 'TestDefiner'};
  },

  _newCase: function(kind, desc, setupFunc) {
    var testCase = new TestCase(this, kind, desc, setupFunc);
    this.__testCases.push(testCase);
  },

  _newSimpleCase: function(kind, desc, testFunc) {
    var testCase = new TestCase(this, kind, desc, function(T) {
      if (testFunc.length === 0) {
        T.action(desc, testFunc);
      }
      else {
        var lazy = T.lazyLogger('lazy');
        T.action(desc, lazy, function() {
          testFunc(lazy);
        });
      }
    });
    this.__testCases.push(testCase);
  },

  /**
   * Something that does not happen outside of a unit testing environment but
   *  serves as a useful functional test.
   */
  artificialCase: function artificialCase(desc, setupFunc) {
    this._newCase('artificial', desc, setupFunc);
  },

  /**
   * Something realistic that is expected to happen a lot.
   */
  commonCase: function commonCase(desc, setupFunc) {
    this._newCase('common', desc, setupFunc);
  },

  /**
   * Something realistic that is expected to happen rarely.
   */
  edgeCase: function edgeCase(desc, setupFunc) {
    this._newCase('edge', desc, setupFunc);
  },

  /**
   * A single-step test case; appropriate for simple unit tests.
   */
  commonSimple: function commonSimple(desc, testFunc) {
    this._newSimpleCase('common', desc, testFunc);
  },

  DISABLED_artificialCase: function() {
  },
  DISABLED_commonCase: function() {
  },
  DISABLED_edgeCase: function() {
  },
  DISABLED_commonSimple: function() {
  },
};

exports.defineTestsFor = function defineTestsFor(testModule, logfabs,
                                                 testHelpers, tags) {
  if (logfabs == null)
    logfabs = [];
  else if (!Array.isArray(logfabs))
    logfabs = [logfabs];
  else // need to be able to mutate it
    logfabs = logfabs.concat();
  if (testHelpers == null)
    testHelpers = [];
  else if (!Array.isArray(testHelpers))
    testHelpers = [testHelpers];
  // smoosh any testhelper logfab deps in.
  for (var iHelper = 0; iHelper < testHelpers.length; iHelper++) {
    var testHelper = testHelpers[iHelper];
    if ("LOGFAB_DEPS" in testHelper) {
      // want to eliminate dupes, so we can't just concat
      for (var iFab = 0; iFab < testHelper.LOGFAB_DEPS.length; iFab++) {
        var logfab = testHelper.LOGFAB_DEPS[iFab];
        if (logfabs.indexOf(logfab) === -1)
          logfabs.push(logfab);
      }
    }
    // transitively traverse/(idempotent) merge testhelpers; works because
    // we're adding stuff to the outer loop as we go and length is not cached
    if ('TESTHELPER_DEPS' in testHelper) {
      for (var iSub = 0; iSub < testHelper.TESTHELPER_DEPS.length; iSub++) {
        var subHelper = testHelper.TESTHELPER_DEPS[iSub];
        if (testHelpers.indexOf(subHelper) === -1)
          testHelpers.push(subHelper);
      }
    }
  }
console.log("defining tests for", testModule.id);
  return new TestDefiner(testModule.id, logfabs, testHelpers, tags);
};

var LOGFAB = exports.LOGFAB = $log.register(null, {
  testDefiner: {
    //implClass: TestDefiner,
    type: $log.TEST_DRIVER,
    subtype: $log.TEST_GROUP,
    asyncJobs: {
      run: {},
    },
    latchState: {
      result: false,
    }
  },
  testCase: {
    //implClass: TestCase,
    type: $log.TEST_DRIVER,
    subtype: $log.TEST_CASE,
    asyncJobs: {
      run: {},
    },
    latchState: {
      result: false,
      /**
       * Optional string that identifies the variant of the test.  For example,
       * "imap" for a test case run against an IMAP server, "activesync" for
       * the same test run against an activesync server, etc.
       */
      variant: false
    },
  },
  testCasePermutation: {
    //implClass: TestContext,
    type: $log.TEST_DRIVER,
    subtype: $log.TEST_PERMUTATION,
    asyncJobs: {
      run: {},
    },
    calls: {
      setupFunc: {},
      actorConstructor: {actorType: false, actorName: false},
    },
    latchState: {
      result: false,
      /** Same as on testCase. */
      variant: false
    }
  },
  /**
   * Log container for the execution of the test step that is expected to get
   *  exposed to the UI, but separately from its descendents which end up
   *  flattened and (probably) visualized like a sequence diagram.
   *
   * For a healthy test run we expect the 'run' async job to bracket the
   *  stepFunc invocation and that's it.  For an unhealthy run any of the
   *  errors defined below can show up.
   */
  testStep: {
    //implClass: TestStep,
    type: $log.TEST_DRIVER,
    subtype: $log.TEST_STEP,

    asyncJobs: {
      run: {},
    },
    calls: {
      stepFunc: {},
    },
    latchState: {
      boring: false,
      result: false,
      group: false,
    },
    errors: {
      /**
       * The test step did not complete (because not all actor expectations
       *  were fulfilled) within the allowed time duration.  This will also
       *  be accompanied by 1) expectation failures being generated on all the
       *  loggers whose actors still had pending expectations, and 2) unresolved
       *  promise errors for all outstanding promises here on the step as
       *  "unresolvedPromise" errors.
       */
      timeout: {},
      /**
       * An actor that was expected to be active this test step never had a
       *  logger get created that ended up associated with it.
       */
      actorNeverGotLogger: { type: false, name: false },
      /**
       * We heard about an uncaught exception via global means: node's
       *  "uncaughException" event, RequireJS' "require.onError" handler, or
       *  a Q (promise) rejection that no one listened for.  The Q case could
       *  be an explicit rejection or an exception that the Q internals
       *  converted into a rejection.  We may end up breaking out non-expection
       *  rejections into their own handler.
       */
      uncaughtException: { ex: $log.EXCEPTION },
      /**
       * Generated on timeout using Q introspection capabilities (when
       *  available)
       */
      unresolvedPromise: { annotation: false },
    },
  },
});
// Test contexts always want logging.
LOGFAB._generalLog = true;
// other people should stay away from this dude
var LAZYLOGFAB = exports.__LAZYLOGFAB = $log.register(null, {
  /**
   * Very generic logger to simplify test development...
   */
  lazyLogger: {
    type: $log.TEST_LAZY,
    subtype: $log.TEST_LAZY,
    events: {
      event: { name: true },
      eventD: { name: true, detail: false },
      value: { value: true },
      namedValue: { name: true, value: true },
      // provide detail that should not be part of the expectation
      namedValueD: { name: true, value: true, detail: false },
    },
    errors: {
      error: {what: $log.EXCEPTION},
    },
  },
});

var gNextLazyLoggerActor = null;
// lazy loggers are always under test!
LAZYLOGFAB.lazyLogger._underTest = {
  reportNewLogger: function(logger, currentParent) {
    if (gNextLazyLoggerActor) {
      gNextLazyLoggerActor._logger = logger;
      logger._actor = gNextLazyLoggerActor;
      if (!currentParent && gNextLazyLoggerActor.RT._loggerStack.length) {
        currentParent = gNextLazyLoggerActor.RT._loggerStack[
                          gNextLazyLoggerActor.RT._loggerStack.length - 1];
      }
      gNextLazyLoggerActor = null;
    }
    return currentParent;
  }
};

}); // end define
