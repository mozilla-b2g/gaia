define('mailapi/syncbase',
  [
    './date',
    'exports'
  ],
  function(
    $date,
    exports
  ) {

////////////////////////////////////////////////////////////////////////////////
// Display Heuristic Time Values
//
// Here are some values we can tweak to try and strike a balance between how
// long before we display something when entering a folder and avoiding visual
// churn as new messages are added to the display.
//
// These are not constants because unit tests need to muck with these.

/**
 * How recently do we have to have synced a folder for us to to treat a request
 * to enter the folder as a database-backed load followed by a refresh rather
 * than falling back to known-date-range sync (which does not display anything
 * until the sync has completed) or (the same thing we use for initial sync)
 * iterative deepening?
 *
 * This is sync strategy #1 per `sliceOpenFromNow`.
 *
 * A good value is approximately how long we would expect it to take for V/2
 * messages to show up in the folder, where V is the number of messages the
 * device's screen can display at a time.  This is because since we will
 * populate the folder prior to the refresh, any new messages will end up
 * displacing the messages.
 *
 * There are non-inbox and inbox variants of this value because we expect
 * churn in the INBOX to happen at a much different rate than other boxes.
 * Ideally, we might also be able to detect folders that have new things
 * filtered into them, as that will affect this too.
 *
 * There is also a third variant for folders that we have previously
 * synchronized and found that their messages start waaaay in the past,
 * suggesting that this is some type of archival folder with low churn,
 * `REFRESH_USABLE_DATA_OLD_IS_SAFE_THRESH`.
 */
exports.REFRESH_USABLE_DATA_TIME_THRESH_NON_INBOX = 6 * $date.HOUR_MILLIS;
exports.REFRESH_USABLE_DATA_TIME_THRESH_INBOX = 2 * $date.HOUR_MILLIS;

/**
 * If the most recent message in a folder is older than this threshold, then
 * we assume it's some type of archival folder and so is unlikely to have any
 * meaningful churn so a refresh is optimal.  Also, the time range is
 * far enough back that our deepening strategy would result in unacceptable
 * latency.
 */
exports.REFRESH_USABLE_DATA_OLD_IS_SAFE_THRESH = 4 * 30 * $date.DAY_MILLIS;
exports.REFRESH_USABLE_DATA_TIME_THRESH_OLD = 2 * 30 * $date.DAY_MILLIS;

/**
 * How recently do we have to have synced a folder for us to reuse the known
 * date bounds of the messages contained in the folder as the basis for our
 * sync?  We will perform a sync with this date range before displaying any
 * messages, avoiding churn should new messages have appeared.
 *
 * This is sync strategy #2 per `sliceOpenFromNow`, and is the fallback mode
 * if the #1 strategy is not appropriate.
 *
 * This is most useful for folders with a message density lower than
 * INITIAL_FILL_SIZE / INITIAL_SYNC_DAYS messages/day.  If we are able
 * to characterize folders based on whether new messages show up in them
 * based on some reliable information, then we could let #1 handle more cases
 * that this case currently covers.
 */
exports.USE_KNOWN_DATE_RANGE_TIME_THRESH_NON_INBOX = 7 * $date.DAY_MILLIS;
exports.USE_KNOWN_DATE_RANGE_TIME_THRESH_INBOX = 6 * $date.HOUR_MILLIS;

////////////////////////////////////////////////////////////////////////////////
// Block Purging Constants (IMAP only)
//
// These values are all intended for resource-constrained mobile devices.  A
// more powerful tablet-class or desktop-class app would probably want to crank
// the values way up.

/**
 * Every time we create this many new body blocks, queue a purge job for the
 * folder.
 *
 * Body sizes are most variable and should usually take up more space than their
 * owning header blocks, so it makes sense for this to be the proxy we use for
 * disk space usage/growth.
 */
exports.BLOCK_PURGE_EVERY_N_NEW_BODY_BLOCKS = 4;

/**
 * How much time must have elapsed since the given messages were last
 * synchronized before purging?  Our accuracy ranges are updated whenever we are
 * online and we attempt to display messages.  So before we purge messages, we
 * make sure that the accuracy range covering the messages was updated at least
 * this long ago before deciding to purge.
 */
exports.BLOCK_PURGE_ONLY_AFTER_UNSYNCED_MS = 14 * $date.DAY_MILLIS;

/**
 * What is the absolute maximum number of blocks we will store per folder for
 * each block type?  If we have more blocks than this, we will discard them
 * regardless of any time considerations.
 *
 * The hypothetical upper bound for disk uage per folder is:
 *  X 'number of blocks' * 2 'types of blocks' * 96k 'maximum block size'.
 *
 * So for the current value of 128 we are looking at 24 megabytes, which is
 * a lot.
 *
 * This is intended to protect people who have ridiculously high message
 * densities from time-based heuristics not discarding things fast enough.
 */
exports.BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT = 128;

////////////////////////////////////////////////////////////////////////////////
// General Sync Constants

/**
 * How frequently do we want to automatically synchronize our folder list?
 * Currently, we think that once a day is sufficient.  This is a lower bound,
 * we may sync less frequently than this.
 */
exports.SYNC_FOLDER_LIST_EVERY_MS = $date.DAY_MILLIS;

/**
 * How many messages should we send to the UI in the first go?
 */
exports.INITIAL_FILL_SIZE = 15;

/**
 * How many days in the past should we first look for messages.
 *
 * IMAP only.
 */
exports.INITIAL_SYNC_DAYS = 3;

/**
 * What should be multiple the current number of sync days by when we perform
 * a sync and don't find any messages?  There are upper bounds in
 * `FolderStorage.onSyncCompleted` that cap this and there's more comments
 * there.
 *
 * IMAP only.
 */
exports.TIME_SCALE_FACTOR_ON_NO_MESSAGES = 1.6;

/**
 * What is the furthest back in time we are willing to go?  This is an
 * arbitrary choice to avoid our logic going crazy, not to punish people with
 * comprehensive mail collections.
 *
 * IMAP only.
 */
exports.OLDEST_SYNC_DATE = (new Date(1990, 0, 1)).valueOf();

/**
 * If we issued a search for a date range and we are getting told about more
 * than the following number of messages, we will try and reduce the date
 * range proportionately (assuming a linear distribution) so that we sync
 * a smaller number of messages.  This will result in some wasted traffic
 * but better a small wasted amount (for UIDs) than a larger wasted amount
 * (to get the dates for all the messages.)
 *
 * IMAP only.
 */
exports.BISECT_DATE_AT_N_MESSAGES = 50;

/**
 * What's the maximum number of messages we should ever handle in a go and
 * where we should start failing by pretending like we haven't heard of the
 * excess messages?  This is a question of message time-density and not a
 * limitation on the number of messages in a folder.
 *
 * This could be eliminated by adjusting time ranges when we know the
 * density is high (from our block indices) or by re-issuing search results
 * when the server is telling us more than we can handle.
 *
 * IMAP only.
 */
exports.TOO_MANY_MESSAGES = 2000;


////////////////////////////////////////////////////////////////////////////////
// Size Estimate Constants

/**
 * The estimated size of a `HeaderInfo` structure.  We are using a constant
 * since there is not a lot of variability in what we are storing and this
 * is probably good enough.
 *
 * Our estimate is based on guesses based on presumed structured clone encoding
 * costs for each field using a reasonable upper bound for length.  Our
 * estimates are trying not to factor in compressability too much since our
 * block size targets are based on the uncompressed size.
 * - id: 4: integer less than 64k
 * - srvid: 40: 38 char uuid with {}'s, (these are uuid's on hotmail)
 * - suid: 13: 'xx/xx/xxxxx' (11)
 * - guid: 80: 66 character (unquoted) message-id from gmail, 48 from moco.
 *         This is unlikely to compress well and there could be more entropy
 *         out there, so guess high.
 * - author: 70: 32 for the e-mail address covers to 99%, another 32 for the
 *           display name which will usually be shorter than 32 but could
 *           involve encoded characters that bloat the utf8 persistence.
 * - date: 9: double that will be largely used)
 * - flags: 32: list which should normally top out at ['\Seen', '\Flagged'], but
 *              could end up with non-junk markers, etc. so plan for at least
 *              one extra.
 * - hasAttachments: 2: boolean
 * - subject: 80
 * - snippet: 100 (we target 100, it will come in under)
 */
exports.HEADER_EST_SIZE_IN_BYTES = 430;


////////////////////////////////////////////////////////////////////////////////
// Error / Retry Constants

/**
 * What is the maximum number of tries we should give an operation before
 * giving up on the operation as hopeless?  Note that in some suspicious
 * error cases, the try cont will be incremented by more than 1.
 *
 * This value is somewhat generous because we do assume that when we do
 * encounter a flakey connection, there is a high probability of the connection
 * being flakey in the short term.  The operations will not be excessively
 * penalized for this since IMAP connections have to do a lot of legwork to
 * establish the connection before we start the operation (CAPABILITY, LOGIN,
 * CAPABILITY).
 */
exports.MAX_OP_TRY_COUNT = 10;

/**
 * The value to increment the operation tryCount by if we receive an
 * unexpected error.
 */
exports.OP_UNKNOWN_ERROR_TRY_COUNT_INCREMENT = 5;

/**
 * If we need to defer an operation because the folder/resource was not
 * available, how long should we defer for?
 */
exports.DEFERRED_OP_DELAY_MS = 30 * 1000;

////////////////////////////////////////////////////////////////////////////////
// General defaults

/**
 * We use an enumerated set of sync values for UI localization reasons; time
 * is complex and we don't have/use a helper library for this.
 */
exports.CHECK_INTERVALS_ENUMS_TO_MS = {
  'manual': 0, // 0 disables; no infinite checking!
  '3min': 3 * 60 * 1000,
  '5min': 5 * 60 * 1000,
  '10min': 10 * 60 * 1000,
  '15min': 15 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '60min': 60 * 60 * 1000,
};

/**
 * Default to not automatically checking for e-mail for reasons to avoid
 * degrading the phone experience until we are more confident about our resource
 * usage, etc.
 */
exports.DEFAULT_CHECK_INTERVAL_ENUM = 'manual';

const DAY_MILLIS = 24 * 60 * 60 * 1000;

/**
 * Map the ActiveSync-limited list of sync ranges to milliseconds.  Do NOT
 * add additional values to this mapping unless you make sure that our UI
 * properly limits ActiveSync accounts to what the protocol supports.
 */
exports.SYNC_RANGE_ENUMS_TO_MS = {
  // This choice is being made for IMAP.
  'auto': 30 * DAY_MILLIS,
    '1d': 1 * DAY_MILLIS,
    '3d': 3 * DAY_MILLIS,
    '1w': 7 * DAY_MILLIS,
    '2w': 14 * DAY_MILLIS,
    '1m': 30 * DAY_MILLIS,
   'all': 30 * 365 * DAY_MILLIS,
};


////////////////////////////////////////////////////////////////////////////////
// Unit test support

/**
 * Testing support to adjust the value we use for the number of initial sync
 * days.  The tests are written with a value in mind (7), but 7 turns out to
 * be too high an initial value for actual use, but is fine for tests.
 */
exports.TEST_adjustSyncValues = function TEST_adjustSyncValues(syncValues) {
  if (syncValues.hasOwnProperty('fillSize'))
    exports.INITIAL_FILL_SIZE = syncValues.fillSize;
  if (syncValues.hasOwnProperty('days'))
    exports.INITIAL_SYNC_DAYS = syncValues.days;

  if (syncValues.hasOwnProperty('bisectThresh'))
    exports.BISECT_DATE_AT_N_MESSAGES = syncValues.bisectThresh;
  if (syncValues.hasOwnProperty('tooMany'))
    exports.TOO_MANY_MESSAGES = syncValues.tooMany;

  if (syncValues.hasOwnProperty('scaleFactor'))
    exports.TIME_SCALE_FACTOR_ON_NO_MESSAGES = syncValues.scaleFactor;

  if (syncValues.hasOwnProperty('refreshNonInbox'))
    exports.REFRESH_USABLE_DATA_TIME_THRESH_NON_INBOX =
      syncValues.refreshNonInbox;
  if (syncValues.hasOwnProperty('refreshInbox'))
    exports.REFRESH_USABLE_DATA_TIME_THRESH_INBOX =
      syncValues.refreshInbox;
  if (syncValues.hasOwnProperty('oldIsSafeForRefresh'))
    exports.REFRESH_USABLE_DATA_OLD_IS_SAFE_THRESH =
      syncValues.oldIsSafeForRefresh;
  if (syncValues.hasOwnProperty('refreshOld'))
    exports.REFRESH_USABLE_DATA_TIME_THRESH_OLD =
      syncValues.refreshOld;

  if (syncValues.hasOwnProperty('useRangeNonInbox'))
    exports.USE_KNOWN_DATE_RANGE_TIME_THRESH_NON_INBOX =
      syncValues.useRangeNonInbox;
  if (syncValues.hasOwnProperty('useRangeInbox'))
    exports.USE_KNOWN_DATE_RANGE_TIME_THRESH_INBOX =
      syncValues.useRangeInbox;

  if (syncValues.hasOwnProperty('HEADER_EST_SIZE_IN_BYTES'))
    exports.HEADER_EST_SIZE_IN_BYTES =
      syncValues.HEADER_EST_SIZE_IN_BYTES;

  if (syncValues.hasOwnProperty('BLOCK_PURGE_ONLY_AFTER_UNSYNCED_MS'))
    exports.BLOCK_PURGE_ONLY_AFTER_UNSYNCED_MS =
      syncValues.BLOCK_PURGE_ONLY_AFTER_UNSYNCED_MS;
  if (syncValues.hasOwnProperty('BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT'))
    exports.BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT =
      syncValues.BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT;

  if (syncValues.hasOwnProperty('MAX_OP_TRY_COUNT'))
    exports.MAX_OP_TRY_COUNT = syncValues.MAX_OP_TRY_COUNT;
  if (syncValues.hasOwnProperty('OP_UNKNOWN_ERROR_TRY_COUNT_INCREMENT'))
    exports.OP_UNKNOWN_ERROR_TRY_COUNT_INCREMENT =
      syncValues.OP_UNKNOWN_ERROR_TRY_COUNT_INCREMENT;
};

}); // end define
