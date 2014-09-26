define(
  [
    'module',
    'exports'
  ],
  function(
    $module,
    exports
  ) {

////////////////////////////////////////////////////////////////////////////////
// Time
//
// == JS Dates
//
// We primarily deal in UTC timestamps.  When we need to talk dates with IMAP
// (see next section), we need these timestamps to line up with midnight for
// a given day.  We do not need to line up with weeks, months, or years,
// saving us a lot of complexity.
//
// Day algebra is straightforward because JS Date objects have no concept of
// leap seconds.  We don't need to worry that a leap second will cause adding
// a day to be less than or more than a day.  Hooray!
//
// == IMAP and Time
//
// The stock IMAP SEARCH command's SINCE and BEFORE predicates only operate on
// whole-dates (and ignore the non-date time parts).  Additionally, SINCE is
// inclusive and BEFORE is exclusive.
//
// We use JS millisecond timestamp values throughout, and it's important to us
// that our date logic is consistent with IMAP's time logic where relevant.
// All of our IMAP-exposed time-interval related logic operates on day
// granularities.  Our timestamp/date values are always normalized to midnight
// which happily works out with intuitive range operations.
//
// Observe the pretty ASCII art where as you move to the right you are moving
// forward in time.
//
//             ________________________________________
//      BEFORE)| midnight (0 millis) ... 11:59:59:999 |
// ON_OR_BEFORE]
//             [SINCE......................................
//              (AFTER.....................................
//
// Our date range comparisons (noting that larger timestamps are 'younger') are:
// SINCE analog:  (testDate >= comparisonDate)
//   testDate is as-recent-as or more-recent-than the comparisonDate.
// BEFORE analog: (testDate < comparisonDate)
//   testDate is less-recent-than the comparisonDate
//
// Because "who is the test date and who is the range value under discussion"
// can be unclear and the numerical direction of time is not always intuitive,
// I'm introducing simple BEFORE and SINCE helper functions to try and make
// the comparison logic ridiculously explicit as well as calling out where we
// are being consistent with IMAP.
//
// Not all of our time logic is consistent with IMAP!  Specifically, use of
// exclusive time bounds without secondary comparison keys means that ranges
// defined in this way cannot spread messages with the same timestamp over
// multiple ranges.  This allows for pathological data structure situations
// where there's too much data in a data block, etc.
// Our date ranges are defined by 'startTS' and 'endTS'.  Using math syntax, our
// IMAP-consistent time ranges end up as: [startTS, endTS).  It is always true
// that BEFORE(startTS, endTS) and SINCE(endTS, startTS) in these cases.
//
// As such, I've also created an ON_OR_BEFORE helper that allows equivalence and
// STRICTLY_AFTER that does not check equivalence to round out all possibilities
// while still being rather explicit.


/**
 * IMAP-consistent date comparison; read this as "Is `testDate` BEFORE
 * `comparisonDate`"?
 *
 * !BEFORE(a, b) === SINCE(a, b)
 */
var BEFORE = exports.BEFORE =
      function BEFORE(testDate, comparisonDate) {
  // testDate is numerically less than comparisonDate, so it is chronologically
  // before it.
  return testDate < comparisonDate;
};

var ON_OR_BEFORE = exports.ON_OR_BEFORE =
      function ON_OR_BEFORE(testDate, comparisonDate) {
  return testDate <= comparisonDate;
};

/**
 * IMAP-consistent date comparison; read this as "Is `testDate` SINCE
 * `comparisonDate`"?
 *
 * !SINCE(a, b) === BEFORE(a, b)
 */
var SINCE = exports.SINCE =
      function SINCE(testDate, comparisonDate) {
  // testDate is numerically greater-than-or-equal-to comparisonDate, so it
  // chronologically after/since it.
  return testDate >= comparisonDate;
};

var STRICTLY_AFTER = exports.STRICTLY_AFTER =
      function STRICTLY_AFTER(testDate, comparisonDate) {
  return testDate > comparisonDate;
};

var IN_BS_DATE_RANGE = exports.IN_BS_DATE_RANGE =
      function IN_BS_DATE_RANGE(testDate, startTS, endTS) {
  return testDate >= startTS && testDate < endTS;
};

var PASTWARDS = 1, FUTUREWARDS = -1;
/**
 * Check if `testDate` is "beyond" the comparison date given the `dir`.  If
 * the direction is pastwards, we will return true if testDate happened
 * chronologically before comparisonDate.  If the direction is futurewards,
 * we will return true if testDate happened chronologically after
 * comparisonDate.
 */
var TIME_DIR_AT_OR_BEYOND = exports.TIME_DIR_AT_OR_BEYOND =
      function TIME_DIR_AT_OR_BEYOND(dir, testDate, comparisonDate) {
  if (dir === PASTWARDS)
    return testDate <= comparisonDate;
  // we use null as a sentinel value for 'the future'/'now'
  else if (comparisonDate === null)
    return testDate >= NOW();
  else // FUTUREWARDS
    return testDate >= comparisonDate;
};
/**
 * Compute the delta of the `testDate` relative to the `comparisonDate` where
 * a positive value indicates `testDate` is beyond the `comparisonDate` in
 * the given direction and a negative value indicates it is before it.
 */
var TIME_DIR_DELTA = exports.TIME_DIR_DELTA =
      function TIME_DIR_DELTA(dir, testDate, comparisonDate) {
  if (dir === PASTWARDS)
    return testDate - comparisonDate;
  else // FUTUREWARDS
    return comparisonDate - testDate;
};
/**
 * Add `time` to the `baseDate` in the given direction.  So if the direction
 * is `PASTWARDS`, then we add the date, otherwise we subtract it.
 */
var TIME_DIR_ADD = exports.TIME_DIR_ADD =
      function TIME_DIR_ADD(dir, baseDate, time) {
  if (dir === PASTWARDS)
    return baseDate + time;
  else // FUTUREWARDS
    return baseDate - time;
};

//function DATE_RANGES_OVERLAP(A_startTS, A_endTS, B_startTS, B_endTS) {
//}

var HOUR_MILLIS = exports.HOUR_MILLIS = 60 * 60 * 1000;
var DAY_MILLIS = exports.DAY_MILLIS = 24 * 60 * 60 * 1000;

/**
 * Testing override that when present replaces use of Date.now().
 */
var TIME_WARPED_NOW = null;

/**
 * Pretend that 'now' is actually a fixed point in time for the benefit of
 * unit tests using canned message stores.
 */
exports.TEST_LetsDoTheTimewarpAgain = function(fakeNow) {
  if (fakeNow === null) {
    TIME_WARPED_NOW = null;
    return;
  }
  if (typeof(fakeNow) !== 'number')
    fakeNow = fakeNow.valueOf();
  TIME_WARPED_NOW = fakeNow;
};

var NOW = exports.NOW =
      function NOW() {
  return TIME_WARPED_NOW || Date.now();
};

/**
 * Make a timestamp some number of days in the past, quantized to midnight of
 * that day.  This results in rounding up; if it's noon right now and you
 * ask for 2 days ago, you really get 2.5 days worth of time.
 */
var makeDaysAgo = exports.makeDaysAgo =
      function makeDaysAgo(numDays, tzOffset) {
  var past = quantizeDate((TIME_WARPED_NOW || Date.now()) + tzOffset) -
               numDays * DAY_MILLIS;
  return past;
};
var makeDaysBefore = exports.makeDaysBefore =
      function makeDaysBefore(date, numDaysBefore, tzOffset) {
  if (date === null)
    return makeDaysAgo(numDaysBefore - 1, tzOffset);
  return quantizeDate(date) - numDaysBefore * DAY_MILLIS;
};
/**
 * Quantize a date to midnight on that day.
 */
var quantizeDate = exports.quantizeDate =
      function quantizeDate(date) {
  if (date === null)
    return null;
  if (typeof(date) === 'number')
    date = new Date(date);
  return date.setUTCHours(0, 0, 0, 0).valueOf();
};

/**
 * If a date is already lined up with midnight of its day, then return that,
 * otherwise round up to the midnight of the next day.
 */
var quantizeDateUp = exports.quantizeDateUp =
      function quantizeDateUp(date) {
  if (typeof(date) === 'number')
    date = new Date(date);
  var truncated = date.setUTCHours(0, 0, 0, 0).valueOf();
  if (date.valueOf()  === truncated)
    return truncated;
  return truncated + DAY_MILLIS;
};

}); // end define
