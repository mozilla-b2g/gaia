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
 * Mechanism for periodic log hierarchy traversal and transmission of the
 *  serialized data, forgetting about the logging entries after transmitted.  We
 *  additionally may perform interesting-ness analysis and only transmit data
 *  or send an out-of-band notification if something interesting has happened,
 *  such as an error being reported.
 *
 * Log transmission and reconstruction is slightly more complicated than just
 *  serializing a hierarchy because the lifetime of the loggers is expected to
 *  be much longer than our log transmission interval.
 **/

define(
  [
    './log',
    './microtime',
    'exports'
  ],
  function(
    $log,
    $microtime,
    exports
  ) {

var EMPTY = [];

function LogReaper(rootLogger) {
  this._rootLogger = rootLogger;
  this._lastTimestamp = null;
  this._lastSeq = null;
}
exports.LogReaper = LogReaper;
LogReaper.prototype = {
  /**
   * Process a logger, producing a time slice representation.
   *
   * Our strategy is roughly to manually traverse the logger hiearchy and:
   * - Ignore loggers with no entries/events and no notably active children that
   *    were already alive at the last reaping and have not died, not mentioning
   *    them at all in the output fragment.  This can also be thought of as:
   * - Emit loggers that have been born.
   * - Emit loggers that have died.
   * - Emit loggers with entries/events.
   * - Emit loggers whose children have had notable activity so that the
   *    hierarchy can be known.
   * - Emit loggers that have experienced a semantic ident change.
   *
   * Potential future optimizations:
   */
  reapHierLogTimeSlice: function() {
    var rootLogger = this._rootLogger,
        startSeq, startTimestamp;
    if (this._lastTimestamp === null) {
      startSeq = 0;
      startTimestamp = rootLogger._born;
    }
    else {
      startSeq = this._lastSeq + 1;
      startTimestamp = this._lastTimestamp;
    }
    var endSeq = $log.getCurrentSeq(),
        endTimestamp = this._lastTimestamp = $microtime.now();

    function traverseLogger(logger) {
      var empty = true;
      // speculatively start populating an output representation
      var outrep = logger.toJSON();
      outrep.events = null;
      outrep.kids = null;

      // - check born/death
      // actually, being born doesn't generate an event, so ignore.
      //if (logger._born >= startTimestamp)
      //  empty = false;
      if (logger._died !== null)
        empty = false;

      // - check events
      var outEvents = null;
      for (var eventKey in logger._eventMap) {
        var eventVal = logger._eventMap[eventKey];
        if (eventVal) {
          empty = false;
          if (outEvents === null)
            outrep.events = outEvents = {};
          outEvents[eventKey] = eventVal;
          logger._eventMap[eventKey] = 0;
        }
      }

      // - check and reap entries
      if (outrep.entries.length) {
        empty = false;
        // (we keep/use outrep.entries, and zero the logger's entries)
        logger._entries = [];
      }
      else {
        // Avoid subsequent mutation of the list mutating our representation
        //  and without creating gratuitous garbage by using a shared empty
        //  list for such cases.
        outrep.entries = EMPTY;
      }

      // - check and reap children
      if (logger._kids && logger._kids.length) {
        for (var iKid = 0; iKid < logger._kids.length; iKid++) {
          var kidLogger = logger._kids[iKid];
          var kidrep = traverseLogger(kidLogger);
          if (kidrep) {
            if (!outrep.kids)
              outrep.kids = [];
            outrep.kids.push(kidrep);
            empty = false;
          }
          // reap (and adjust iteration)
          if (kidLogger._died !== null)
            logger._kids.splice(iKid--, 1);
        }
      }

      return (empty ? null : outrep);
    }

    return {
      begin: startTimestamp,
      end: endTimestamp,
      logFrag: traverseLogger(rootLogger),
    };
  },
};

}); // end define
