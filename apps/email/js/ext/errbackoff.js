/**
 * Error-handling/backoff logic.
 *
 * - All existing-account network-accessing functionality uses this module to
 *   track the state of accounts and resources within accounts that are may
 *   experience some type of time-varying failures.
 * - Account autoconfiguration probing logic does not use this module; it just
 *   checks whether there is a network connection.
 *
 * - Accounts define 'endpoints' with us when they are instantiated for each
 *   server connection type they have.  For IMAP, this means an SMTP endpoint
 *   and an IMAP endpoint.
 * - These 'endpoints' may have internal 'resources' which may manifest failures
 *   of their own if-and-only-if it is expected that there could be transient
 *   failures within the endpoint.  For IMAP, it is possible for IMAP servers to
 *   not let us into certain folders because there are other active connections
 *   inside them.  If something can't fail, there is no need to name it as a
 *   resource.
 *
 * - All endpoints have exactly one status: 'healthy', 'unreachable', or
 *   'broken'.  Unreachable implies we are having trouble talking with the
 *   endpoint because of network issues.  Broken implies that although we can
 *   talk to the endpoint, it doesn't want to talk to us for reasons of being
 *   offline for maintenance or account migration or something like that.
 * - Endpoint resources can only be 'broken' and are only tracked if they are
 *   broken.
 *
 * - If we encounter a network error for an otherwise healthy endpoint then we
 *   try again once right away, as a lot of network errors only become evident
 *   once we have a new, good network.
 * - On subsequent network errors for the previously healthy endpoint where we
 *   have already retried, we try after a ~1 second delay and then a ~5 second
 *   delay.  Then we give up and put the endpoint in the unreachable or broken
 *   state, as appropriate.  These choice of delays are entirely arbitrary.
 *
 * - We only try once to connect to endpoints that are in a degraded state.  We
 *   do not retry because that would be wasteful.
 *
 * - Once we put an endpoint in a degraded (unreachable or broken) state, this
 *   module never does anything to try and probe for the endpoint coming back
 *   on its own.  We rely on the existing periodic synchronization logic or
 *   user actions to trigger a new attempt.  WE MAY NEED TO CHANGE THIS AT
 *   SOME POINT since it's possible that the user may have queued an email for
 *   sending that they want delivered sooner than the cron logic triggers, but
 *   that's way down the road.
 **/

define(
  [
    './date',
    'logic',
    'module',
    'exports'
  ],
  function(
    $date,
    logic,
    $module,
    exports
  ) {

var BACKOFF_DURATIONS = exports.BACKOFF_DURATIONS = [
  { fixedMS: 0,    randomMS: 0 },
  { fixedMS: 800,  randomMS: 400 },
  { fixedMS: 4500, randomMS: 1000 },
];

var BAD_RESOURCE_RETRY_DELAYS_MS = [
  1000,
  60 * 1000,
  2 * 60 * 1000,
];

var setTimeoutFunc = window.setTimeout.bind(window);

exports.TEST_useTimeoutFunc = function(func) {
  setTimeoutFunc = func;
  for (var i = 0; i < BACKOFF_DURATIONS.length; i++) {
    BACKOFF_DURATIONS[i].randomMS = 0;
  }
};

/**
 * @args[
 *   @param[listener @dict[
 *     @key[onEndpointStateChange @func[
 *       @args[state]
 *     ]]
 *   ]]
 * ]
 */
function BackoffEndpoint(name, listener) {
  /** @oneof[
   *    @case['healthy']
   *    @case['unreachable']
   *    @case['broken']
   *    @case['shutdown']{
   *      We are shutting down; ignore any/all errors and avoid performing
   *      activities that would result in new network traffic, etc.
   *    }
   *  ]
   */
  this.state = 'healthy';
  this._iNextBackoff = 0;

  logic.defineScope(this, 'BackoffEndpoint', { name: name });

  logic(this, 'state', { state: this.state });

  this._badResources = {};

  this.listener = listener;
}
BackoffEndpoint.prototype = {
  _setState: function(newState) {
    if (this.state === newState)
      return;
    this.state = newState;
    logic(this, 'state', { state: newState });
    if (this.listener)
      this.listener.onEndpointStateChange(newState);
  },

  noteConnectSuccess: function() {
    this._setState('healthy');
    this._iNextBackoff = 0;
  },

  /**
   * Logs a connection failure and returns true if a retry attempt should be
   * made.
   *
   * @args[
   *   @param[reachable Boolean]{
   *     If true, we were able to connect to the endpoint, but failed to login
   *     for some reason.
   *   }
   * ]
   * @return[shouldRetry Boolean]{
   *   Returns true if we should retry creating the connection, false if we
   *   should give up.
   * }
   */
  noteConnectFailureMaybeRetry: function(reachable) {
    logic(this, 'connectFailure', { reachable: reachable });
    if (this.state === 'shutdown')
      return false;

    if (reachable) {
      this._setState('broken');
      return false;
    }

    if (this._iNextBackoff > 0)
      this._setState(reachable ? 'broken' : 'unreachable');

    // (Once this saturates, we never perform retries until the connection is
    // healthy again.  We do attempt re-connections when triggered by user
    // activity or synchronization logic; they just won't get retries.)
    if (this._iNextBackoff >= BACKOFF_DURATIONS.length)
      return false;

    return true;
  },

  /**
   * Logs a connection problem where we can talk to the server but we are
   * confident there is no reason retrying.  In some cases, like bad
   * credentials, this is part of what you want to do, but you will still also
   * want to put the kibosh on additional requests at a higher level since
   * servers can lock people out if they make repeated bad authentication
   * requests.
   */
  noteBrokenConnection: function() {
    logic(this, 'connectFailure', { reachable: true });
    this._setState('broken');

    this._iNextBackoff = BACKOFF_DURATIONS.length;
  },

  scheduleConnectAttempt: function(connectFunc) {
    if (this.state === 'shutdown')
      return;

    // If we have already saturated our retries then there won't be any
    // automatic retries and this request is assumed to want us to try and
    // create a connection right now.
    if (this._iNextBackoff >= BACKOFF_DURATIONS.length) {
      connectFunc();
      return;
    }

    var backoff = BACKOFF_DURATIONS[this._iNextBackoff++],
        delay = backoff.fixedMS +
                Math.floor(Math.random() * backoff.randomMS);
    setTimeoutFunc(connectFunc, delay);
  },

  noteBadResource: function(resourceId) {
    var now = $date.NOW();
    if (!this._badResources.hasOwnProperty(resourceId)) {
      this._badResources[resourceId] = { count: 1, last: now };
    }
    else {
      var info = this._badResources[resourceId];
      info.count++;
      info.last = now;
    }
  },

  resourceIsOkayToUse: function(resourceId) {
    if (!this._badResources.hasOwnProperty(resourceId))
      return true;
    var info = this._badResources[resourceId], now = $date.NOW();
  },

  shutdown: function() {
    this._setState('shutdown');
  },
};

exports.createEndpoint = function(name, listener) {
  return new BackoffEndpoint(name, listener);
};

}); // end define
