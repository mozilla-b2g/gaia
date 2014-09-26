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
 * Raindrop-specific testing/logging setup; right now holds initial 'loggest'
 *  implementation details that should get refactored out into their own
 *  thing.
 *
 * The permutations of logger logic is getting a bit ugly and may be burning
 *  more cycles than is strictly necessary.  The long-term plan is some kind
 *  of simple (runtime) code generation.  The biggest win for that is considered
 *  that it will simplify our code in here and generate an obvious byproduct
 *  that is easily understood.  In cases where startup time is a concern, the
 *  generated code can also be persisted (like via RequireJS optimizer stage).
 *  This is not happening yet.
 *
 *
 * There is a need for raindrop-specific logging logic because names tend to
 *  be application specific things as well as the determination of what is
 *  interesting.
 *
 * @typedef[ListyLogEntry @list[
 *   @param[eventName String]
 *   @rest[Object]
 * ]]{
 *   The current format is meant to be generally human-readable.  We put the
 *   name of the event at the front because it most concisely expresses what
 *   is happening.  We put the details of the event after that, with the
 *   timestamp second from last and the global sequence number last.  The timing
 *   information goes last because the timestamp (uS) is going to tend to be a
 *   big number that is hard for a human to process, but serves as a nice visual
 *   delimiter for the sequence id that comes after that humans can understand.
 *   It is not useful to have it earlier because it would offset the details of
 *   the event too far from the event name.
 * }
 * @typedef[ActorUniqueName Number]{
 *   A positive (> 0) unique value for the effective namespace.
 * }
 * @typedef[ThingUniqueName Number]{
 *   A negative (< 0) unique value for the effective namespace.
 * }
 * @typedef[UniqueName @oneof[ActorUniqueName ThingUniqueName]]{
 *   Actor/logger names are positive, thing names are negative.  We do this so
 *   that even without resolving the identifiers we can present a human
 *   comprehensible understanding of semantic identifiers.
 * }
 * @typedef[SemanticIdent @oneof[
 *   @case[String]{
 *     A human readable string with no special significance.
 *   }
 *   @case[@listof[@oneof[UniqueName String]]]{
 *     A list containing human-readable strings with interspersed references to
 *     loggers/actors and things.  When displayed, the unique name references
 *     should be replaced with custom display objects (possibly just hyperlinks)
 *     which should include a human-understandable representation of what the
 *     name is referencing.  Entries in the list should be joined so that
 *     whitespace is inserted if the adjacent object is not a string or the
 *     string does not already contain whitespace or punctuation that does not
 *     require whitespace at the given point.  More specifically, the "inside"
 *     of parentheses/brackets/braces and the left side of
 *     colons/semicolons/commas do not require whitespace.  We also
 *     automatically insert commas-with-whitespace between consecutive named
 *     references.
 *
 *     String literals must not be adjacent to other string literals; you must
 *     coalesce them.  The whitespace logic can optimize based on this
 *     assumption.
 *   }
 * ]]
 * @typedef[HierLogFrag @dict[
 *   @key[loggerIdent String]{
 *     The schema name that defines this logger; the key in the dictionary
 *     passed to `register`.
 *   }
 *   @key[semanticIdent SemanticIdent]{
 *     Explains to humans what this logger is about.  It is not required to be
 *     unique, but if code always passes in the same constant string, it's
 *     probably not being super helpful.
 *
 *     Examples include:
 *     - Test case names.
 *     - Parameterized test steps. (Client A sending a message to Client B.)
 *     - Parameterized connections. (Server A talking to Server B.)
 *   }
 *   @key[uniqueName UniqueName]{
 *     A unique identifier not previously used in the effective namespace
 *     of the root HierLogFrag for this tree and all its descendents.
 *   }
 *   @key[born #:optional TimestampUS]{
 *     Timestamp of when this logger was instantiated.
 *   }
 *   @key[died #:optional TimestampUS]{
 *     Timestamp of when this logger was marked dead.
 *   }
 *   @key[entries @listof[ListyLogEntry]]{
 *     The log entries for this logger this time-slice.
 *   }
 *   @key[kids #:optional @listof[HierLogFrag]]{
 *     Log fragments of loggers deemed to be conceptually children of the logger
 *     that produced this logger.  For example, an HTTP server would have a
 *     logger and its connection workers would be loggers that are children of
 *     the server.
 *   }
 * ]]{
 *   Loggers are organized into hierarchies
 * }
 * @typedef[HierLogTimeSlice @dict[
 *   @key[begin TimestampUS]
 *   @key[end TimestampUS]
 *   @key[logFrag HierLogFrag]
 * ]]{
 *
 * }
 *
 * @typedef[ActorLifecycleNotifFunc @func[
 *   @args[
 *     @param[event @oneof["attach" "dead"]]
 *     @param[instance Object]{
 *       The instance associated with the logger.
 *     }
 *     @param[logger Logger]
 *   ]
 * ]]{
 *   Notification function to be invoked when an actor gets attached to its
 *   matching logger.
 * }
 *
 * == Original Brainstorming ==
 *  + Unit Test Understanding
 *    - Want to know what the participants are and the high-level messages that
 *       are being exchanged, plus the ability to drill down into the messages.
 *      => logging should expose the actor (with type available)
 *      => message transmission should optionally have high-level logging
 *          associated in a way that provides us with the message or lets us
 *          sniff the payload
 *  + Unit Test Failure Diagnosis
 *    - Want to know what a good run looked like, and the differences between
 *       this run and that run.
 *      => the viewer has access to a data-store.
 *  + Debugging (General)
 *    - Want to be able to trace message delivery and related activities
 *       across the system.
 *      => Use global names where possible, perhaps identity key and message
 *          hashes and TCP endpoint identifiers should allow reconstitution.
 *      x> Having clients pass around extra identifiers seems dangerous.  (Do
 *          not provide attackers with anything they do not already have,
 *          although debugging tools will of course make making use of that
 *          info easier.)
 *  + System Understanding (Initial, non-live, investigative)
 *    - Likely want what unit test understanding provides but with higher level
 *       capabilities.
 *  + System Understanding (Steady-state with testing system)
 *    - Likely want initial understanding unit test-level data but with only
 *       the traffic information and no ability to see the (private) data.
 *  + Automated Performance Runs / Regression Detection
 *    - Want timestamps of progress of message delivery.
 *    - Want easily comparable data.
 *  + At Scale Performance Understanding
 *    - Want to know throughput, latency of the various parts of the system,
 *       plus the ability to sample specific trace timelines.
 *  + At Scale Debugging of specific failures (ex: 1 user having trouble)
 *    - Want to be able to enable logging for the specific user, trace
 *       across the system.
 *
 *  + General
 *    - Want to be able to easily diff for notable changes...
 *      => Markup or something should indicate values that will vary between
 *          runs.  (Maybe as part of context?)
 *
 *  + Logging efficiency
 *    - Want minimal impact when not enabled.
 *      - But willing to accept some hit for the benefit of logging.
 *      - Assume JITs can try and help us out if we help them.
 *    - Don't want to clutter up the code with logging code.
 *    - Don't want debugging logging code that can compromise privacy
 *       accidentally active.
 *      => Use decoration/monkeypatching for debugging logging, isolated in
 *          a sub-tree that can be completely excluded from the production
 *          build process.  Have the decoration/monkeypatching be loud
 *          about what it's doing or able to fail, etc.
 *    - Nice if it's obvious that we can log/trace at a point.
 *    => Place always-on event logging in the code at hand.
 *    => Use (pre-computed) conditionals or maybe alternate classes for
 *        runtime optional logging.
 *
 *  + Storage / Transit efficiency
 *    - Want logging for test runs broken up into initialization logging and
 *       per-test compartments.
 *    => Time-bucketing (per "channel") likely sufficient for debugging logging
 *        purposes.
 *    => Performance stuff that can't be reduced to time-series probably wants
 *        its own channel, and its data should be strongly biased to aggregates.
 **/

define(
  [
    './deferred',
    './microtime',
    './extransform',
    'exports'
  ],
  function(
    Deferred,
    $microtime,
    $extransform,
    exports
  ) {

var rawGimmeStack = $extransform.gimmeStack;
var gimmeStack = function() {
  // Slice off the logger calling us and ourselves.
  return rawGimmeStack().slice(2);
};

/**
 * Per-thread/process sequence identifier to provide unambiguous ordering of
 *  logging events in the hopeful event we go faster than the timestamps can
 *  track.
 *
 * The long-term idea is that this gets periodically reset in an unambiguous
 *  fashion.  Because we also package timestamps in the logs, right now we
 *  can get away with just making sure not to reset the sequence more than
 *  once in a given timestamp unit (currently 1 microsecond).  This seems
 *  quite do-able.
 *
 * Note: Timestamp granularity was initially millisecond level, which was when
 *  this really was important.
 */
var gSeq = 0;

exports.getCurrentSeq = function() {
  return gSeq;
};

/**
 * Per-thread/process next unique actor/logger name to allocate.
 */
var gUniqueActorName = 1;
/**
 * Per-thread/process next unique thing name to allocate.
 */
var gUniqueThingName = -1;

var ThingProto = exports.ThingProto = {
  get digitalName() {
    return this.__diginame;
  },
  set digitalName(val) {
    this.__diginame = val;
  },
  toString: function() {
    return '[Thing:' + this.__type + ']';
  },
  toJSON: function() {
    var o = {
      type: this.__type,
      name: this.__name,
      dname: this.__diginame,
      uniqueName: this._uniqueName,
    };
    if (this.__hardcodedFamily)
      o.family = this.__hardcodedFamily;
    return o;
  },
};

/**
 * Create a thing with the given type, name, and prototype hierarchy and which
 *  is allocated with a unique name.
 *
 * This should not be called directly by user code; it is being surfaced for use
 *  by `testcontext.js` in order to define things with names drawn from an
 *  over-arching global namespace.  The caller needs to take on the
 *  responsibility of exposing the thing via a logger or the like.
 */
exports.__makeThing = function makeThing(type, humanName, digitalName, proto) {
  var thing;
  if (proto === undefined)
    proto = ThingProto;
  thing = Object.create(proto);

  thing.__type = type;
  thing.__name = humanName;
  thing.__diginame = digitalName;
  thing.__hardcodedFamily = null;
  thing._uniqueName = gUniqueThingName--;
  return thing;
};

function NOP() {
}

/**
 * Dummy logger prototype; instances gather statistics but do not generate
 *  detailed log events.
 */
var DummyLogProtoBase = {
  _kids: undefined,
  logLevel: 'dummy',
  toString: function() {
    return '[DummyLog]';
  },
  toJSON: function() {
    // will this actually break JSON.stringify or just cause it to not use us?
    throw new Error("I WAS NOT PLANNING ON BEING SERIALIZED");
  },
  __die: NOP,
  __updateIdent: NOP,
};

/**
 * Full logger prototype; instances accumulate log details but are intended by
 *  policy to not log anything considered user-private.  This differs from
 *  `TestLogProtoBase` which, in the name of debugging and system understanding
 *  can capture private data but which should accordingly be test data.
 */
var LogProtoBase = {
  /**
   * For use by `TestContext` to poke things' names in.  Actors'/loggers' names
   *  are derived from the list of kids.  An alternate mechanism might be in
   *  order for this, since it is so extremely specialized.  This was
   *  determined better than adding yet another generic logger mechanism until
   *  a need is shown or doing monkeypatching; at least for the time-being.
   */
  _named: null,
  logLevel: 'safe',
  toJSON: function() {
    var jo = {
      loggerIdent: this.__defName,
      semanticIdent: this._ident,
      uniqueName: this._uniqueName,
      born: this._born,
      died: this._died,
      events: this._eventMap,
      entries: this._entries,
      kids: this._kids
    };
    if (this.__latchedVars.length) {
      var latchedVars = this.__latchedVars, olv = {};
      for (var i = 0; i < latchedVars.length; i++) {
        olv[latchedVars[i]] = this[':' + latchedVars[i]];
      }
      jo.latched = olv;
    }
    if (this._named)
      jo.named = this._named;
    return jo;
  },
  __die: function() {
    this._died = $microtime.now();
    if (this.__FAB._onDeath)
      this.__FAB._onDeath(this);
  },
  __updateIdent: function(ident) {
    // NOTE: you need to update useSemanticIdent if you change this.
    // normalize all object references to unique name references.
    if (Array.isArray(ident)) {
      var normIdent = [];
      for (var i = 0; i < ident.length; i++) {
        var identBit = ident[i];
        if (typeof(identBit) !== "object" || identBit == null)
          normIdent.push(identBit);
        else
          normIdent.push(identBit._uniqueName);
      }
      ident = normIdent;
    }
    this._ident = ident;
  },
};

/**
 * Test (full) logger prototype; instances generate notifications for actor
 *  expectation checking on all calls and observe arguments that may contain
 *  user-private data (but which should only contain definitively non-private
 *  test data.)
 *
 * For simplicity of implementation, this class currently just takes the
 *  functions implemented by LogProtoBase and wraps them with a parameterized
 *  decorator.
 */
var TestLogProtoBase = Object.create(LogProtoBase);
TestLogProtoBase.logLevel = 'dangerous';
TestLogProtoBase.__unexpectedEntry = function(iEntry, unexpEntry) {
  var entry = ['!unexpected', unexpEntry];
  this._entries[iEntry] = entry;
};

TestLogProtoBase.__mismatchEntry = function(iEntry, expected, actual) {
  var entry = ['!mismatch', expected, actual];
  this._entries[iEntry] = entry;
};

TestLogProtoBase.__failedExpectation = function(exp) {
  var entry = ['!failedexp', exp, $microtime.now(), gSeq++];
  this._entries.push(entry);
};

TestLogProtoBase.__die = function() {
  this._died = $microtime.now();
  var testActor = this._actor;
  if (testActor) {
    if (testActor._expectDeath) {
      testActor._expectDeath = false;
      testActor.__loggerFired();
    }
    if (testActor._lifecycleListener)
      testActor._lifecycleListener.call(null, 'dead', this.__instance, this);
  }
};

var DIED_EVENTNAME = '(died)', DIED_EXP = [DIED_EVENTNAME];

var TestActorProtoBase = {
  toString: function() {
    return '[Actor ' + this.__defName + ': ' + this.__name + ']';
  },
  toJSON: function() {
    return {
      actorIdent: this.__defName,
      semanticIdent: this.__name,
      uniqueName: this._uniqueName,
      parentUniqueName: this._parentUniqueName,
      loggerUniqueName: this._logger ? this._logger._uniqueName : null,
    };
  },

  /**
   * Invoked to attach a logger to an instance; exists to provide the
   *  possibility to generate a notification event.
   */
  __attachToLogger: function(logger) {
    logger._actor = this;
    this._logger = logger;
    if (this._lifecycleListener)
      this._lifecycleListener.call(null, 'attach', logger.__instance, logger);
  },

  /**
   * Invoke a notification function when this actor gets attached to its
   *  matching logger.  This function should be invoked as soon as possible
   *  after the creation of the actor.
   *
   * @args[
   *   @param[func ActorLifecycleNotifFunc]
   * ]
   */
  attachLifecycleListener: function(func) {
    this._lifecycleListener = func;
  },

  /**
   * Indicate that the caller is going to schedule some test events
   *  asynchronously while the step is running, so we should make sure to
   *  forbid our actor from resolving itself before a matching call to
   *  `asyncEventsAllDoneDoResolve` is made.
   */
  asyncEventsAreComingDoNotResolve: function() {
    if (!this._activeForTestStep)
      throw new Error("Attempt to set expectations on an actor (" +
                      this.__defName + ": " + this.__name + ") that is not " +
                      "participating in this test step!");
    if (this._resolved)
      throw new Error("Attempt to add expectations when already resolved!");

    // (sorta evil-hack)
    // We can reuse the _expectDeath flag as a means to ensure that we don't
    //  resolve the promise prematurely, although it's semantically suspect.
    //  (And bad things will happen if the test logger does actually die...)
    if (this._expectDeath)
      throw new Error("death expectation incompatible with async events");
    this._expectDeath = true;
  },

  /**
   * Indiate that the caller is all done dynamically scheduling test events
   *  while a test step is running, and that accordingly we can allow our
   *  test actor to resolve its promise when all the events have completed.
   */
  asyncEventsAllDoneDoResolve: function() {
    // stop saying we are expecting our death; new events will trigger
    //  resolution
    this._expectDeath = false;
    // pretend something happened to potentially trigger things now.
    this.__loggerFired();
  },

  /**
   * Expect nothing to be logged this turn, and therefore also that no
   * expectations will be added.
   */
  expectNothing: function() {
    if (this._expectations.length)
      throw new Error("Already expecting something this turn! " +
                      JSON.stringify(this._expectations[0]));
    this._expectNothing = true;
  },

  /**
   * Indicate that the only expectation we have on this actor is that its
   *  logger will die during this step.
   */
  expectOnly__die: function() {
    if (!this._activeForTestStep)
      throw new Error("Attempt to set expectations on an actor (" +
                      this.__defName + ": " + this.__name + ") that is not " +
                      "participating in this test step!");
    if (this._resolved)
      throw new Error("Attempt to add expectations when already resolved!");

    if (this._expectDeath)
      throw new Error("Already expecting our death!  " +
                      "Are you using asyncEventsAreComingDoNotResolve?");
    this._expectDeath = true;
  },

  /**
   * Set this actor to use 'set' matching for only this round; the list of
   *  expectations will be treated as an unordered set of expectations to
   *  match instead of an ordered list that must be matched exactly in order.
   *  Failures will still be generated if an entry is encountered that does not
   *  have a corresponding entry in the expectation list.
   *
   * One side-effect of this mode is that we no longer can detect what
   *  constitutes a mismatch, so we call everything unexpected that doesn't
   *  match.
   */
  expectUseSetMatching: function() {
    this._unorderedSetMode = true;
  },

  /**
   * Prepare for activity in a test step.  If we do not already have a paired
   *  logger, this will push us onto the tracking list so we will be paired when
   *  the logger is created.
   */
  __prepForTestStep: function(testRuntimeContext) {
    if (!this._logger)
      testRuntimeContext.reportPendingActor(this);
    // we should have no expectations going into a test step.
    if (this._activeForTestStep)
      this.__resetExpectations();
    this._activeForTestStep = true;
    // and also all current entries should not be considered for expectations
    // (We originally considered that we could let loggers accumulate entries
    //  in the background and then specify expectations about them in a
    //  subsequent step.  That seems confusing.  Seems far better for us to
    //  just slice a single step into multiple perspectives...)
    if (this._logger)
      this._iEntry = this._logger._entries.length;
  },

  /**
   * Issue a promise that will be resolved when all expectations of this actor
   *  have been resolved.  If no expectations have been issued, just return
   *  null.
   */
  __waitForExpectations: function() {
    if (this._expectNothing &&
        (this._expectations.length || this._iExpectation))
      return false;
    // Fail immediately if a synchronous check already failed.  (It would
    // have tried to generate a rejection, but there was no deferral at the
    // time.)
    if (!this._expectationsMetSoFar)
      return false;
    if ((this._iExpectation >= this._expectations.length) &&
        (this._expectDeath ? (this._logger && this._logger._died) : true)) {
      this._resolved = true;
      return this._expectationsMetSoFar;
    }

    if (!this._deferred) {
      this._deferred = new Deferred();
    }
    return this._deferred.promise;
  },

  __stepCleanup: null,

  /**
   * Cleanup state at the end of the step; also, check if we moved into a
   *  failure state after resolving our promise.
   *
   * @return["success" Boolean]{
   *   True if everything is (still) satisfied, false if a failure occurred
   *   at some point.
   * }
   */
  __resetExpectations: function() {
    if (this.__stepCleanup)
      this.__stepCleanup();

    var expectationsWereMet = this._expectationsMetSoFar;
    this._expectationsMetSoFar = true;
    // kill all processed entries.
    this._iExpectation = 0;
    this._ignore = null;
    this._expectations.splice(0, this._expectations.length);
    this._expectNothing = false;
    this._expectDeath = false;
    this._unorderedSetMode = false;
    this._deferred = null;
    this._resolved = false;
    this._activeForTestStep = false;
    return expectationsWereMet;
  },

  __failUnmetExpectations: function() {
    if (this._iExpectation < this._expectations.length && this._logger) {
      for (var i = this._iExpectation; i < this._expectations.length; i++) {
        this._logger.__failedExpectation(this._expectations[i]);
      }
    }
    if (this._expectDeath && !this._logger._died)
      this._logger.__failedExpectation(DIED_EXP);
  },

  /**
   * Invoked by the test-logger associated with this actor to let us know that
   *  something has been logged so that we can perform an expectation check and
   *  fulfill our promise/reject our promise, as appropriate.
   */
  __loggerFired: function() {
    // we can't do anything if we don't have an actor.
    var entries = this._logger._entries, expy, entry;
    // -- unordered mode
    if (this._unorderedSetMode) {

      while (this._iExpectation < this._expectations.length &&
             this._iEntry < entries.length) {
        entry = entries[this._iEntry++];
        // ignore meta-entries (which are prefixed with a '!')
        if (entry[0][0] === "!")
          continue;
        // ignore ignored entries
        if (this._ignore && this._ignore.hasOwnProperty(entry[0]))
          continue;

        // - try all the expectations for a match
        var foundMatch = false;
        for (var iExp = this._iExpectation; iExp < this._expectations.length;
             iExp++) {
          expy = this._expectations[iExp];

          // - on matches, reorder the expectation and bump our pointer
          if (expy[0] === entry[0] &&
              this['_verify_' + expy[0]](expy, entry)) {
            if (iExp !== this._iExpectation) {
              this._expectations[iExp] = this._expectations[this._iExpectation];
              this._expectations[this._iExpectation] = expy;
            }
            this._iExpectation++;
            foundMatch = true;
            break;
          }
        }
        if (!foundMatch) {
          this._logger.__unexpectedEntry(this._iEntry - 1, entry);
          this._expectationsMetSoFar = false;
          if (this._deferred)
            this._deferred.reject([this.__defName, expy, entry]);
        }
      }

      // - generate an unexpected failure if we ran out of expectations
      if ((this._iExpectation === this._expectations.length) &&
          (entries.length > this._iEntry)) {
        // note: as below, there is no point trying to generate a rejection
        //  at this stage.
        this._expectationsMetSoFar = false;
        // no need to -1 because we haven't incremented past the entry.
        this._logger.__unexpectedEntry(this._iEntry, entries[this._iEntry]);
        // do increment past...
        this._iEntry++;
      }
      // - generate success if we have used up our expectations
      else if ((this._iExpectation >= this._expectations.length) &&
               this._deferred &&
               (this._expectDeath ? (this._logger && this._logger._died)
                                  : true)) {
        this._resolved = true;
        this._deferred.resolve();
      }
      return;
    }

    // -- ordered mode
    while (this._iExpectation < this._expectations.length &&
           this._iEntry < entries.length) {
      expy = this._expectations[this._iExpectation];
      entry = entries[this._iEntry++];

      // ignore meta-entries (which are prefixed with a '!')
      if (entry[0][0] === "!")
        continue;
        // ignore ignored entries
      if (this._ignore && this._ignore.hasOwnProperty(entry[0]))
        continue;

      // Currently, require exact pairwise matching between entries and
      //  expectations.
      if (expy[0] !== entry[0]) {
        this._logger.__unexpectedEntry(this._iEntry - 1, entry);
        // (fallout, triggers error)
      }
      else if (!this['_verify_' + expy[0]](expy, entry)) {
        this._logger.__mismatchEntry(this._iEntry - 1, expy, entry);
        // things did line up correctly though, so boost the expecation number
        //  so we don't convert subsequent expectations into unexpected ones.
        this._iExpectation++;
        // (fallout, triggers error)
      }
      else {
        this._iExpectation++;
        continue;
      }
      // (only bad cases fall out without hitting a continue)
      if (this._expectationsMetSoFar) {
        this._expectationsMetSoFar = false;
        if (this._deferred)
          this._deferred.reject([this.__defName, expy, entry]);
      }
      return;
    }
    // - unexpected log events should count as failure
    // We only care if: 1) we were marked active, 2) we had at least one
    //  expectation this step OR we were explicitly marked to have no
    //  expectations this step.
    // Because we will already have resolved() our promise if we get here,
    //  it's up to the test driver to come back and check us for this weird
    //  failure, possibly after waiting a tick to see if any additional events
    //  come in.
    if (this._activeForTestStep &&
        ((this._expectations.length &&
          (this._iExpectation === this._expectations.length) &&
          (entries.length > this._iEntry)) ||
         (!this._expectations.length &&
          this._expectNothing))) {
      // Only get upset if this is not an ignored event.
      if (!this._ignore ||
          !this._ignore.hasOwnProperty(entries[this._iEntry][0])) {
        this._expectationsMetSoFar = false;
        this._logger.__unexpectedEntry(this._iEntry, entries[this._iEntry]);
      }
      // We intentionally increment iEntry because otherwise we'll keep marking
      // the same entry as unexpected when that is in fact not what we desire.
      // In previous parts of this function it made sense not to increment, but
      // here it just causes confusion.
      this._iEntry++;
    }

    if ((this._iExpectation >= this._expectations.length) && this._deferred &&
        (this._expectDeath ? (this._logger && this._logger._died) : true)) {
      this._resolved = true;
      this._deferred.resolve();
    }
  },
};
exports.TestActorProtoBase = TestActorProtoBase;

/**
 * Recursive traverse objects looking for (and eliding) very long strings.  We
 *  do this because our logs are getting really large (6 megs!), and a likely
 *  source of useless bloat are the encrypted message strings.  Although we
 *  care how big the strings get, the reality is that until we switch to
 *  avro/a binary encoding, they are going to bloat horribly under JSON,
 *  especially when nested levels of encryption and JSON enter the picture.
 *
 * We will go a maximum of 3 layers deep.  Because this complicates having an
 *  efficient fast-path where we detect that we don't need to clone-and-modify,
 *  we currently always just clone-and-modify.
 */
function simplifyInsaneObjects(obj, dtype, curDepth) {
  if (obj == null || typeof(obj) !== "object")
    return obj;
  if (!curDepth)
    curDepth = 0;
  var nextDepth = curDepth + 1;
  var limitStrings = 64;

  if (dtype) {
    if (dtype === 'tostring') {
      if (Array.isArray(obj))
        return obj.join('');
      else if (typeof(obj) !== 'string')
        return obj.toString();
    }
  }

  var oot = {};
  for (var key in obj) {
    var val = obj[key];
    switch (typeof(val)) {
      case "string":
        if (limitStrings && val.length > limitStrings) {
          oot[key] = "OMITTED STRING, originally " + val.length +
                       " bytes long";
        }
        else {
          oot[key] = val;
        }
        break;
      case "object":
        if (val == null ||
            Array.isArray(val) ||
            ("toJSON" in val) ||
            curDepth >= 2) {
          oot[key] = val;
        }
        else {
          oot[key] = simplifyInsaneObjects(val, null, nextDepth);
        }
        break;
      default:
        oot[key] = val;
        break;
    }
  }
  return oot;
}

/**
 * Maximum comparison depth for argument equivalence in expectation checking.
 *  This value gets bumped every time I throw something at it that fails that
 *  still seems reasonable to me.
 */
var COMPARE_DEPTH = 6;
function boundedCmpObjs(a, b, depthLeft) {
  var aAttrCount = 0, bAttrCount = 0, key, nextDepth = depthLeft - 1;

  if ('toJSON' in a)
    a = a.toJSON();
  if ('toJSON' in b)
    b = b.toJSON();

  for (key in a) {
    aAttrCount++;
    if (!(key in b))
      return false;

    if (depthLeft) {
      if (!smartCompareEquiv(a[key], b[key], nextDepth))
        return false;
    }
    else {
      if (a[key] !== b[key])
        return false;
    }
  }
  // the theory is that if every key in a is in b and its value is equal, and
  //  there are the same number of keys in b, then they must be equal.
  for (key in b) {
    bAttrCount++;
  }
  if (aAttrCount !== bAttrCount)
    return false;
  return true;
}

/**
 * @return[Boolean]{
 *   True when equivalent, false when not equivalent.
 * }
 */
function smartCompareEquiv(a, b, depthLeft) {
  var ta = typeof(a), tb = typeof(b);
  if (ta !== 'object' || (tb !== ta) || (a == null) || (b == null))
    return a === b;
  // fast-path for identical objects
  if (a === b)
    return true;
  if (Array.isArray(a)) {
    if (!Array.isArray(b))
      return false;
    if (a.length !== b.length)
      return false;
    for (var iArr = 0; iArr < a.length; iArr++) {
      if (!smartCompareEquiv(a[iArr], b[iArr], depthLeft - 1))
        return false;
    }
    return true;
  }
  return boundedCmpObjs(a, b, depthLeft);
}
exports.smartCompareEquiv = smartCompareEquiv;

function makeIgnoreFunc(name) {
  return function ignoreFunc() {
    if (!this._ignore)
      this._ignore = {};
    this._ignore[name] = true;
  };
};

/**
 * Builds the logging and testing helper classes for the `register` driver.
 *
 * It operates in a similar fashion to wmsy's ProtoFab mechanism; state is
 *  provided to helpers by lexically closed over functions.  No code generation
 *  is used, but it's intended to be an option.
 */
function LoggestClassMaker(moduleFab, name) {
  this.moduleFab = moduleFab;
  this.name = name;

  this._latchedVars = [];

  // steady-state minimal logging logger (we always want statistics!)
  var dummyProto = this.dummyProto = Object.create(DummyLogProtoBase);
  dummyProto.__defName = name;
  dummyProto.__latchedVars = this._latchedVars;
  dummyProto.__FAB = this.moduleFab;

  // full-logging logger
  var logProto = this.logProto = Object.create(LogProtoBase);
  logProto.__defName = name;
  logProto.__latchedVars = this._latchedVars;
  logProto.__FAB = this.moduleFab;

  // testing full-logging logger
  var testLogProto = this.testLogProto = Object.create(TestLogProtoBase);
  testLogProto.__defName = name;
  testLogProto.__latchedVars = this._latchedVars;
  testLogProto.__FAB = this.moduleFab;

  // testing actor for expectations, etc.
  var testActorProto = this.testActorProto = Object.create(TestActorProtoBase);
  testActorProto.__defName = name;

  /** Maps helper names to their type for collision reporting by `_define`. */
  this._definedAs = {};
}
LoggestClassMaker.prototype = {
  /**
   * Name collision detection helper; to be invoked prior to defining a name
   *  with the type of name being defined so we can tell you both types that
   *  are colliding.
   */
  _define: function(name, type) {
    if (this._definedAs.hasOwnProperty(name)) {
      throw new Error("Attempt to define '" + name + "' as a " + type +
                      " when it is already defined as a " +
                      this._definedAs[name] + "!");
    }
    this._definedAs[name] = type;
  },

  /**
   * Wrap a logProto method to be a testLogProto invocation that generates a
   *  constraint checking thing.
   */
  _wrapLogProtoForTest: function(name) {
    var logFunc = this.logProto[name];
    this.testLogProto[name] = function() {
      var rval = logFunc.apply(this, arguments);
      var testActor = this._actor;
      if (testActor)
        testActor.__loggerFired();
      return rval;
    };
  },

  addStateVar: function(name) {
    this._define(name, 'state');

    this.dummyProto[name] = NOP;

    var stateStashName = ':' + name;
    this.logProto[name] = function(val) {
      var oldVal = this[stateStashName];
      // only log the transition if it's an actual transition
      if (oldVal === val)
        return;
      this[stateStashName] = val;
      this._entries.push([name, val, $microtime.now(), gSeq++]);
    };

    this._wrapLogProtoForTest(name);

    this.testActorProto['expect_' + name] = function(val) {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");
      // If we are being told to ignore stuff this round, eat the expectation.
      if (!this._ignore || !this._ignore[name])
        this._expectations.push([name, gimmeStack(), val]);
      return this;
    };
    this.testActorProto['ignore_' + name] = makeIgnoreFunc(name);
    this.testActorProto['_verify_' + name] = function(exp, entry) {
      return smartCompareEquiv(exp[2], entry[1], COMPARE_DEPTH);
    };
  },
  /**
   * Dubious mechanism to allow logger objects to be used like a task
   *  construct that can track success/failure or some other terminal state.
   *  Contrast with state-vars which are intended to track an internal state
   *  for analysis but not to serve as a summarization of the application
   *  object's life.
   * This is being brought into being for the unit testing framework so that
   *  we can just use the logger hierarchy as the actual result hierarchy.
   *  This may be a horrible idea.
   *
   * This currently does not generate or support the expectation subsystem
   *  since the only use right now is the testing subsystem.
   */
  addLatchedState: function(name) {
    this._define(name, 'latchedState');
    this._latchedVars.push(name);
    var latchedName = ':' + name;

    this.testLogProto[name] = this.logProto[name] = this.dummyProto[name] =
        function(val) {
      this[latchedName] = val;
    };
  },
  addEvent: function(name, args, testOnlyLogArgs) {
    this._define(name, 'event');

    var numArgs = 0, useArgs = [];
    for (var key in args) {
      numArgs++;
      useArgs.push(args[key]);
    }

    this.dummyProto[name] = function() {
      this._eventMap[name] = (this._eventMap[name] || 0) + 1;
    };

    this.logProto[name] = function() {
      this._eventMap[name] = (this._eventMap[name] || 0) + 1;
      var entry = [name];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] === EXCEPTION) {
          var arg = arguments[iArg];
          entry.push($extransform.transformException(arg));
        }
        else {
          entry.push(arguments[iArg]);
        }
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      this._entries.push(entry);
    };

    if (!testOnlyLogArgs) {
      this._wrapLogProtoForTest(name);
    }
    else {
      var numTestOnlyArgs = 0, useTestArgs = [];
      for (key in testOnlyLogArgs) {
        numTestOnlyArgs++;
        useTestArgs.push(testOnlyLogArgs[key]);
      }
      this.testLogProto[name] = function() {
        this._eventMap[name] = (this._eventMap[name] || 0) + 1;
        var entry = [name], iArg;
        for (iArg = 0; iArg < numArgs; iArg++) {
          if (useArgs[iArg] === EXCEPTION) {
            var arg = arguments[iArg];
            entry.push($extransform.transformException(arg));
          }
          else {
            entry.push(arguments[iArg]);
          }
        }
        entry.push($microtime.now());
        entry.push(gSeq++);
        // ++ new bit
        for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
          entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
        }
        // -- end new bit
        this._entries.push(entry);
        // ++ firing bit...
        var testActor = this._actor;
        if (testActor)
          testActor.__loggerFired();
      };
    }

    this.testActorProto['expect_' + name] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name, gimmeStack()];
      for (var iArg = 0; iArg < arguments.length; iArg++) {
        if (useArgs[iArg] && useArgs[iArg] !== EXCEPTION) {
          exp.push(arguments[iArg]);
        }
      }
      // If we are being told to ignore stuff this round, eat the expectation.
      if (!this._ignore || !this._ignore[name])
        this._expectations.push(exp);
      return this;
    };
    this.testActorProto['ignore_' + name] = makeIgnoreFunc(name);
    this.testActorProto['_verify_' + name] = function(tupe, entry) {
      // only check arguments we had expectations for.
      for (var iArg = 2; iArg < tupe.length; iArg++) {
        if (!smartCompareEquiv(tupe[iArg], entry[iArg - 1], COMPARE_DEPTH))
          return false;
      }
      return true;
    };
  },
  addAsyncJob: function(name, args, testOnlyLogArgs) {
    var name_begin = name + '_begin', name_end = name + '_end';
    this.dummyProto[name_begin] = NOP;
    this.dummyProto[name_end] = NOP;

    var numArgs = 0, numTestOnlyArgs = 0, useArgs = [], useTestArgs = [];
    for (var key in args) {
      numArgs++;
      useArgs.push(args[key]);
    }

    this.logProto[name_begin] = function() {
      this._eventMap[name_begin] = (this._eventMap[name_begin] || 0) + 1;
      var entry = [name_begin];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] === EXCEPTION) {
          var arg = arguments[iArg];
          entry.push($extransform.transformException(arg));
        }
        else {
          entry.push(arguments[iArg]);
        }
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      this._entries.push(entry);
    };
    this.logProto[name_end] = function() {
      this._eventMap[name_end] = (this._eventMap[name_end] || 0) + 1;
      var entry = [name_end];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] === EXCEPTION) {
          var arg = arguments[iArg];
          entry.push($extransform.transformException(arg));
        }
        else {
          entry.push(arguments[iArg]);
        }
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      this._entries.push(entry);
    };

    if (!testOnlyLogArgs) {
      this._wrapLogProtoForTest(name_begin);
      this._wrapLogProtoForTest(name_end);
    }
    else {
      for (key in testOnlyLogArgs) {
        numTestOnlyArgs++;
        useTestArgs.push(testOnlyLogArgs[key]);
      }
      // cut-paste-modify of the above...
      this.testLogProto[name_begin] = function() {
        this._eventMap[name_begin] = (this._eventMap[name_begin] || 0) + 1;
        var entry = [name_begin];
        for (var iArg = 0; iArg < numArgs; iArg++) {
          if (useArgs[iArg] === EXCEPTION) {
            var arg = arguments[iArg];
            entry.push($extransform.transformException(arg));
          }
          else {
            entry.push(arguments[iArg]);
          }
        }
        entry.push($microtime.now());
        entry.push(gSeq++);
        // ++ new bit
        for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
          entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
        }
        // -- end new bit
        this._entries.push(entry);
        // ++ firing bit...
        var testActor = this._actor;
        if (testActor)
          testActor.__loggerFired();
      };
      this.testLogProto[name_end] = function() {
        this._eventMap[name_end] = (this._eventMap[name_end] || 0) + 1;
        var entry = [name_end];
        for (var iArg = 0; iArg < numArgs; iArg++) {
          if (useArgs[iArg] === EXCEPTION) {
            var arg = arguments[iArg];
            entry.push($extransform.transformException(arg));
          }
          else {
            entry.push(arguments[iArg]);
          }
        }
        entry.push($microtime.now());
        entry.push(gSeq++);
        // ++ new bit
        for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
          entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
        }
        // -- end new bit
        this._entries.push(entry);
        // ++ firing bit...
        var testActor = this._actor;
        if (testActor)
          testActor.__loggerFired();
      };
    }

    this.testActorProto['expect_' + name_begin] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name_begin, gimmeStack()];
      for (var iArg = 0; iArg < arguments.length; iArg++) {
        if (useArgs[iArg] && useArgs[iArg] !== EXCEPTION)
          exp.push(arguments[iArg]);
      }
      // If we are being told to ignore stuff this round, eat the expectation.
      if (!this._ignore || !this._ignore[name_begin])
        this._expectations.push(exp);
      return this;
    };
    this.testActorProto['ignore_' + name_begin] = makeIgnoreFunc(name_begin);
    this.testActorProto['expect_' + name_end] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name_end, gimmeStack()];
      for (var iArg = 0; iArg < arguments.length; iArg++) {
        if (useArgs[iArg] && useArgs[iArg] !== EXCEPTION)
          exp.push(arguments[iArg]);
      }
      // If we are being told to ignore stuff this round, eat the expectation.
      if (!this._ignore || !this._ignore[name_end])
        this._expectations.push(exp);
      return this;
    };
    this.testActorProto['ignore_' + name_end] = makeIgnoreFunc(name_end);
    this.testActorProto['_verify_' + name_begin] =
        this.testActorProto['_verify_' + name_end] = function(tupe, entry) {
      // only check arguments we had expectations for.
      for (var iArg = 2; iArg < tupe.length; iArg++) {
        if (!smartCompareEquiv(tupe[iArg], entry[iArg - 1], COMPARE_DEPTH))
          return false;
      }
      return true;
    };
  },
  /**
   * Call like: loggedCall(logArg1, ..., logArgN, useAsThis, func,
   *                       callArg1, ... callArgN);
   */
  addCall: function(name, logArgs, testOnlyLogArgs) {
    this._define(name, 'call');

    var numLogArgs = 0, numTestOnlyArgs = 0, useArgs = [], useTestArgs = [];
    for (var key in logArgs) {
      numLogArgs++;
      useArgs.push(logArgs[key]);
    }

    this.dummyProto[name] = function() {
      var rval;
      try {
        rval = arguments[numLogArgs+1].apply(
          arguments[numLogArgs], Array.prototype.slice.call(arguments,
                                                            numLogArgs+2));
      }
      catch(ex) {
        // (call errors are events)
        this._eventMap[name] = (this._eventMap[name] || 0) + 1;
        rval = ex;
      }
      return rval;
    };

    this.logProto[name] = function() {
      var rval, iArg;
      var entry = [name];
      for (iArg = 0; iArg < numLogArgs; iArg++) {
        entry.push(arguments[iArg]);
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      // push this prior to the call for ordering reasons (the call can log
      //  entries too!)
      this._entries.push(entry);
      try {
        rval = arguments[numLogArgs+1].apply(
          arguments[numLogArgs], Array.prototype.slice.call(arguments, iArg+2));
        entry.push($microtime.now());
        entry.push(gSeq++);
        entry.push(null);
      }
      catch(ex) {
        entry.push($microtime.now());
        entry.push(gSeq++);
        // We can't push the exception directly because its "arguments" payload
        //  can have rich object references that will cause issues during JSON
        //  serialization.  We most care that it can create circular references,
        //  but also are not crazy about serializing potentially huge object
        //  graphs.  This might be a great place to perform some logHelper
        //  style transformations.
        entry.push($extransform.transformException(ex));
        // (call errors are events)
        this._eventMap[name] = (this._eventMap[name] || 0) + 1;
        rval = ex;
      }

      return rval;
    };

    if (!testOnlyLogArgs) {
      this._wrapLogProtoForTest(name);
    }
    else {
      for (key in testOnlyLogArgs) {
        numTestOnlyArgs++;
        useTestArgs.push(testOnlyLogArgs[key]);
      }
      // cut-paste-modify of the above...
      this.testLogProto[name] = function() {
        var rval, iArg;
        var entry = [name];
        for (iArg = 0; iArg < numLogArgs; iArg++) {
          entry.push(arguments[iArg]);
        }
        entry.push($microtime.now());
        entry.push(gSeq++);
        // push this prior to the call for ordering reasons (the call can log
        //  entries too!)
        this._entries.push(entry);
        try {
          rval = arguments[numLogArgs+1].apply(
            arguments[numLogArgs], Array.prototype.slice.call(arguments, iArg+2));
          entry.push($microtime.now());
          entry.push(gSeq++);
          entry.push(null);
          // ++ new bit
          iArg += 2;
          for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
            entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
          }
          // -- end new bit
        }
        catch(ex) {
          entry.push($microtime.now());
          entry.push(gSeq++);
          // We can't push the exception directly because its "arguments" payload
          //  can have rich object references that will cause issues during JSON
          //  serialization.  We most care that it can create circular references,
          //  but also are not crazy about serializing potentially huge object
          //  graphs.  This might be a great place to perform some logHelper
          //  style transformations.
          entry.push($extransform.transformException(ex));
          // ++ new bit
          iArg += 2;
          for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
            entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
          }
          // -- end new bit
          // (call errors are events)
          this._eventMap[name] = (this._eventMap[name] || 0) + 1;
          rval = ex;
        }

        // ++ firing bit...
        var testActor = this._actor;
        if (testActor)
          testActor.__loggerFired();
        return rval;
      };
    }

    // XXX we have no way to indicate we expect/desire an assertion
    //  (we will just explode on any logged exception)
    this.testActorProto['expect_' + name] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name, gimmeStack()];
      for (var iArg = 0; iArg < arguments.length; iArg++) {
        if (useArgs[iArg])
          exp.push(arguments[iArg]);
      }
      // If we are being told to ignore stuff this round, eat the expectation.
      if (!this._ignore || !this._ignore[name])
        this._expectations.push(exp);
      return this;
    };
    this.testActorProto['ignore_' + name] = makeIgnoreFunc(name);
    this.testActorProto['_verify_' + name] = function(tupe, entry) {
      // report failure if an exception was returned!
      if (entry.length > numLogArgs + numTestOnlyArgs + 6) {
        return false;
      }
      // only check arguments we had expectations for.
      for (var iArg = 2; iArg < tupe.length; iArg++) {
        if (!smartCompareEquiv(tupe[iArg], entry[iArg - 1], COMPARE_DEPTH))
          return false;
      }
      return true;
    };
  },
  addError: function(name, args) {
    this._define(name, 'error');

    var numArgs = 0, useArgs = [];
    for (var key in args) {
      numArgs++;
      useArgs.push(args[key]);
    }

    this.dummyProto[name] = function() {
      this._eventMap[name] = (this._eventMap[name] || 0) + 1;
    };

    this.logProto[name] = function() {
      this._eventMap[name] = (this._eventMap[name] || 0) + 1;
      var entry = [name];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] === EXCEPTION) {
          var arg = arguments[iArg];
          entry.push($extransform.transformException(arg));
        }
        else {
          entry.push(arguments[iArg]);
        }
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      this._entries.push(entry);
    };

    this._wrapLogProtoForTest(name);

    this.testActorProto['expect_' + name] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name];
      for (var iArg = 0; iArg < arguments.length; iArg++) {
        if (useArgs[iArg] && useArgs[iArg] !== EXCEPTION)
          exp.push(arguments[iArg]);
      }
      // If we are being told to ignore stuff this round, eat the expectation.
      if (!this._ignore || !this._ignore[name])
        this._expectations.push(exp);
      return this;
    };
    this.testActorProto['ignore_' + name] = makeIgnoreFunc(name);
    this.testActorProto['_verify_' + name] = function(tupe, entry) {
      // only check arguments we had expectations for.
      for (var iArg = 2; iArg < tupe.length; iArg++) {
        if (!smartCompareEquiv(tupe[iArg], entry[iArg - 1], COMPARE_DEPTH))
          return false;
      }
      return true;
    };
  },
  /**
   * Process the description of how to map the semantic ident list.  Currently
   *  we do absolutely nothing with this on the generation side, but the blob
   *  is used by log processing logic to stitch stuff together in the UI.
   *
   * We might end up using this on the generation side when under test so
   *  that we can better link loggers with actors in the face of potential
   *  ambiguity about who goes with which actor.  The counter-argument to that
   *  idea is that during functional testing we don't want that much activity
   *  going on.  When performance testing, we would want that, but in that
   *  case we won't be running with actors anyways.
   */
  useSemanticIdent: function(args) {
  },

  makeFabs: function() {
    var moduleFab = this.moduleFab;

    var dummyCon = function dummyConstructor() {
      this._eventMap = {};
    };
    dummyCon.prototype = this.dummyProto;

    var loggerCon = function loggerConstructor(ident) {
      this.__updateIdent(ident);
      this._uniqueName = gUniqueActorName++;
      this._eventMap = {};
      this._entries = [];
      this._born = $microtime.now();
      this._died = null;
      this._kids = null;
    };
    loggerCon.prototype = this.logProto;

    var testerCon = function testerLoggerConstructor(ident) {
      loggerCon.call(this, ident);
      this._actor = null;
    };
    testerCon.prototype = this.testLogProto;

    var testActorCon = function testActorConstructor(name, _parentUniqueName) {
      this.__name = name;
      this._uniqueName = gUniqueActorName++;
      this._parentUniqueName = _parentUniqueName;
      // initially undefined, goes null when we register for pairing, goes to
      //  the logger instance when paired.
      this._logger = undefined;
      this._ignore = null;
      this._expectations = [];
      this._expectationsMetSoFar = true;
      this._expectNothing = false;
      this._expectDeath = false;
      this._unorderedSetMode = false;
      this._activeForTestStep = false;
      this._iEntry = this._iExpectation = 0;
      this._lifecycleListener = null;
    };
    testActorCon.prototype = this.testActorProto;
    this.moduleFab._actorCons[this.name] = testActorCon;

    /**
     * Determine what type of logger to create, whether to tell other things
     *  in the system about it, etc.
     */
    var loggerDecisionFab = function loggerDecisionFab(implInstance,
                                                       parentLogger, ident) {
      var logger, tester;
      // - Testing
      if ((tester = (moduleFab._underTest || loggerDecisionFab._underTest))) {
//console.error("MODULE IS UNDER TEST FOR: " + testerCon.prototype.__defName);
        if (typeof(parentLogger) === "string")
          throw new Error("A string can't be a logger => not a valid parent");
        logger = new testerCon(ident);
        logger.__instance = implInstance;
        parentLogger = tester.reportNewLogger(logger, parentLogger);
      }
      // - Logging
      else if (moduleFab._generalLog || testerCon._generalLog) {
//console.error("general logger for: " + testerCon.prototype.__defName);
        logger = new loggerCon(ident);
      }
      // - Statistics Only
      else {
//console.error("statistics only for: " + testerCon.prototype.__defName);
        return new dummyCon();
      }

      if (parentLogger) {
        if (parentLogger._kids === undefined) {
        }
        else if (parentLogger._kids === null) {
          parentLogger._kids = [logger];
        }
        else {
          parentLogger._kids.push(logger);
        }
      }
      return logger;
    };
    this.moduleFab[this.name] = loggerDecisionFab;
  },
};

var LEGAL_FABDEF_KEYS = [
  'implClass', 'type', 'subtype', 'topBilling', 'semanticIdent', 'dicing',
  'stateVars', 'latchState', 'events', 'asyncJobs', 'calls', 'errors',
  'TEST_ONLY_calls', 'TEST_ONLY_events', 'TEST_ONLY_asyncJobs',
  'LAYER_MAPPING',
];

function augmentFab(mod, fab, defs) {
  var testActors = fab._testActors, rawDefs = fab._rawDefs;

  for (var defName in defs) {
    var key, loggerDef = defs[defName], testOnlyMeta;
    rawDefs[defName] = loggerDef;

    for (key in loggerDef) {
      if (LEGAL_FABDEF_KEYS.indexOf(key) === -1) {
        throw new Error("key '" + key + "' is not a legal log def key");
      }
    }

    var maker = new LoggestClassMaker(fab, defName);

    if ("semanticIdent" in loggerDef) {
      maker.useSemanticIdent(loggerDef.semanticIdent);
    }
    if ("stateVars" in loggerDef) {
      for (key in loggerDef.stateVars) {
        maker.addStateVar(key);
      }
    }
    if ("latchState" in loggerDef) {
      for (key in loggerDef.latchState) {
        maker.addLatchedState(key);
      }
    }
    if ("events" in loggerDef) {
      var testOnlyEventsDef = null;
      if ("TEST_ONLY_events" in loggerDef)
        testOnlyEventsDef = loggerDef.TEST_ONLY_events;
      for (key in loggerDef.events) {
        testOnlyMeta = null;
        if (testOnlyEventsDef && testOnlyEventsDef.hasOwnProperty(key))
          testOnlyMeta = testOnlyEventsDef[key];
        maker.addEvent(key, loggerDef.events[key], testOnlyMeta);
      }
    }
    if ("asyncJobs" in loggerDef) {
      var testOnlyAsyncJobsDef = null;
      if ("TEST_ONLY_asyncJobs" in loggerDef)
        testOnlyAsyncJobsDef = loggerDef.TEST_ONLY_asyncJobs;
      for (key in loggerDef.asyncJobs) {
        testOnlyMeta = null;
        if (testOnlyAsyncJobsDef && testOnlyAsyncJobsDef.hasOwnProperty(key))
          testOnlyMeta = testOnlyAsyncJobsDef[key];
        maker.addAsyncJob(key, loggerDef.asyncJobs[key], testOnlyMeta);
      }
    }
    if ("calls" in loggerDef) {
      var testOnlyCallsDef = null;
      if ("TEST_ONLY_calls" in loggerDef)
        testOnlyCallsDef = loggerDef.TEST_ONLY_calls;
      for (key in loggerDef.calls) {
        testOnlyMeta = null;
        if (testOnlyCallsDef && testOnlyCallsDef.hasOwnProperty(key))
          testOnlyMeta = testOnlyCallsDef[key];
        maker.addCall(key, loggerDef.calls[key], testOnlyMeta);
      }
    }
    if ("errors" in loggerDef) {
      for (key in loggerDef.errors) {
        maker.addError(key, loggerDef.errors[key]);
      }
    }

    maker.makeFabs();
  }

  return fab;
};
exports.__augmentFab = augmentFab;

var ALL_KNOWN_FABS = [];

/**
 * Do not turn on event-logging without an explicit call to
 * `enableGeneralLogging`.  This is done because logging is a memory leak
 * without a known consumer.
 */
var GENERAL_LOG_DEFAULT = false;
var UNDER_TEST_DEFAULT = false;

exports.register = function register(mod, defs) {
  var fab = {
    _generalLog: GENERAL_LOG_DEFAULT,
    _underTest: UNDER_TEST_DEFAULT,
    _actorCons: {},
    _rawDefs: {},
    _onDeath: null
  };
  ALL_KNOWN_FABS.push(fab);
  return augmentFab(mod, fab, defs);
};

/**
 * Provide schemas for every logger that has been registered.
 */
exports.provideSchemaForAllKnownFabs = function schemaForAllKnownFabs() {
  var schema = { $v: 2 };
  for (var i = 0; i < ALL_KNOWN_FABS.length; i++) {
    var rawDefs = ALL_KNOWN_FABS[i]._rawDefs;
    for (var key in rawDefs) {
      schema[key] = rawDefs[key];
    }
  }
  return schema;
};

var BogusTester = {
  reportNewLogger: function(logger, parentLogger) {
    // No one cares, this is just a way to get the tester constructors
    //  triggered.
    return parentLogger;
  },
};

/**
 * Turn on logging at an event granularity.
 */
exports.enableGeneralLogging = function() {
  GENERAL_LOG_DEFAULT = true;
  for (var i = 0; i < ALL_KNOWN_FABS.length; i++) {
    var logfab = ALL_KNOWN_FABS[i];
    logfab._generalLog = true;
  }
};

/**
 * Mark all logfabs under test so we get full log data; DO NOT USE THIS UNDER
 *  NON-DEVELOPMENT PURPOSES BECAUSE USER DATA CAN BE ENTRAINED AND THAT IS VERY
 *  BAD.
 *
 * Note: No effort is made to avoid marking any logfabs as under test.  This
 *  would be a problem if used while the testing subsystem is active, but you
 *  shouldn't do that.
 */
exports.DEBUG_markAllFabsUnderTest = function() {
  UNDER_TEST_DEFAULT = BogusTester;
  for (var i = 0; i < ALL_KNOWN_FABS.length; i++) {
    var logfab = ALL_KNOWN_FABS[i];

    logfab._underTest = BogusTester;
  }
};

/**
 * For EXTREME debugging similar to DEBUG_markAllFabsUnderTest; log entries are
 * both:
 * 1) Passed to dumpFunc as they are logged so we get the logs in the "adb
 *    logcat" output.
 * 2) Retained so you better have hooked up circular logging or you better have
 *    infinite memory.
 *
 * @param {Function} dumpFunc
 *   This should resemble the standard mozilla dump() func wherein we must
 *   provide newlines.  (And we definitely will provide them.)
 */
exports.DEBUG_realtimeLogEverything = function(dumpFunc) {
  var EverythingTester = {
    reportNewLogger: function(logger, parentLogger) {
      logger._actor = {
        __loggerFired: function() {
          // Destructively pop it off the end of the list; inductively this
          // should always be index 0, but you never know!
          var entry = logger._entries.pop();
          // Let's look like: LoggerType(semanticIdent)["name", ...]
          dumpFunc(logger.__defName + '(' + logger._ident + ')' +
                   JSON.stringify(entry) + '\n');
        }
      };
    }
  };
  UNDER_TEST_DEFAULT = EverythingTester;
  for (var i = 0; i < ALL_KNOWN_FABS.length; i++) {
    var logfab = ALL_KNOWN_FABS[i];

    logfab._underTest = EverythingTester;
  }
};


/**
 * Evolutionary stopgap debugging helper to be able to put a module/logfab into
 *  a mode of operation where it dumps all of its loggers' entries to
 *  console.log when they die.
 */
exports.DEBUG_dumpEntriesOnDeath = function(logfab) {
  logfab._generalLog = true;
  logfab._onDeath = function(logger) {
    console.log("!! DIED:", logger.__defName, logger._ident);
    console.log(JSON.stringify(logger._entries, null, 2));
  };
};

exports.DEBUG_dumpAllFabEntriesOnDeath = function() {
  for (var i = 0; i < ALL_KNOWN_FABS.length; i++) {
    var logfab = ALL_KNOWN_FABS[i];
    exports.DEBUG_dumpEntriesOnDeath(logfab);
  }
};

// role information
exports.CONNECTION = 'connection';
exports.SERVER = 'server';
exports.CLIENT = 'client';
exports.TASK = 'task';
exports.DAEMON = 'daemon';
exports.DATABASE = 'database';
exports.CRYPTO = 'crypto';
exports.QUERY = 'query';
exports.ACCOUNT = 'account';
exports.LOGGING = 'log';

exports.TEST_DRIVER = 'testdriver';
exports.TEST_GROUP = 'testgroup';
exports.TEST_CASE = 'testcase';
exports.TEST_PERMUTATION = 'testperm';
exports.TEST_STEP = 'teststep';
exports.TEST_LAZY = 'testlazy';

exports.TEST_SYNTHETIC_ACTOR = 'test:synthactor';

// argument information
var EXCEPTION = exports.EXCEPTION = 'exception';
/**
 * In short, something that we can JSON.stringify without throwing an exception
 *  and that is strongly expected to have a reasonable, bounded size.  This
 *  value is *not* snapshotted when it is provided, and so should be immutable
 *  for this to not turn out confusing.
 */
var JSONABLE = exports.JSONABLE = 'jsonable';
var TOSTRING = exports.TOSTRING = 'tostring';
/**
 * XXX speculative, we currently are just using JSON.stringify and putting
 *  toJSON methods on complex objects that there is no benefit from recursively
 *  traversing.
 *
 * An object that could be anything, including resulting in deep or cyclic
 *  data structures.  We will serialize type information where available.  This
 *  will necessarily be more expensive to serialize than a `JSONABLE` data
 *  structure.  This type of data *is snapshotted* when logged, allowing it to
 *  be used on mutable data structures.
 *
 * A data-biased raw-object will just report the type of instances it encounters
 *  unless they have a toJSON method, in which case it will invoke that.
 */
var RAWOBJ_DATABIAS = exports.RAWOBJ_DATABIAS = 'jsonable'; //'rawobj:databias';

////////////////////////////////////////////////////////////////////////////////
// State/Delta Representation Support
//
// Specialized schema support to allow, by convention, the log viewer to
//  visualize simple containment hierarchies and display annotations on those
//  hierarchies.  Each entry in the hierarchy requires a unique name.
//
// The reconstruction mechanism works like so:
// - For each logger, we latch any STATEREP we observe as the current state.
// - Statereps are visualized as a simple hierarchy.
// - Annotations (STATEANNO) affect display by colorizing/exposing a string on
//    the object indexed by name.  For now, we use numbers to convey
//    semantic colorization desires: -1 is deletion/red, 0 is notable/yellow,
//    1 is addition/green.
// - Deltas combine an annotation entry relevant to the prior state, the new
//    state, and annotations relevant to the new state.  For example,
//    expressing a deletion and an addition would have us annotate the
//    deleted item in the pre-state and the added item in the post-state.

/**
 * Simple state representation.
 */
var STATEREP = exports.STATEREP = 'staterep';
var STATEANNO = exports.STATEANNO = 'stateanno';
var STATEDELTA = exports.STATEDELTA = 'statedelta';

////////////////////////////////////////////////////////////////////////////////

}); // end define
