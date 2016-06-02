/**
 * Searchfilters provide for local searching by checking each message against
 * one or more tests.  This is similar to Thunderbird's non-global search
 * mechanism.  Although searching in this fashion could be posed as a
 * decorated slice, the point of local search is fast local search, so we
 * don't want to use real synchronized slices.  Instead, we interact directly
 * with a `FolderStorage` to retrieve known headers in an iterative fashion.  We
 * expose this data as a slice and therefore are capable of listening for
 * changes from the server.  We do end up in a possible situation where we have
 * stale local information that we display to the user, but presumably that's
 * an okay thing.
 *
 * The main fancy/unusual thing we do is that all search predicates contribute
 * to a match representation that allows us to know which predicates in an 'or'
 * configuration actually fired and can provide us with the relevant snippets.
 * In order to be a little bit future proof, wherever we provide a matching
 * snippet, we actually provide an object of the following type.  (We could
 * provide a list of the objects, but the reality is that our UI right now
 * doesn't have the space to display more than one match per filter, so it
 * would just complicate things and generate bloat to do more work than
 * providing one match, especially because we provide a boolean match, not a
 * weighted score.
 *
 * @typedef[FilterMatchItem @dict[
 *   @key[text String]{
 *     The string we think is appropriate for display purposes.  For short
 *     things, this might be the entire strings.  For longer things like a
 *     message subject or the message body, this will be a snippet.
 *   }
 *   @key[offset Number]{
 *     If this is a snippet, the offset of the `text` within the greater whole,
 *     which may be zero.  In the event this is not a snippet, the value will
 *     be zero, but you can't use that to disambiguate; use the length of the
 *     `text` for that.
 *   }
 *   @key[matchRuns @listof[@dict[
 *     @key[start]{
 *       An offset relative to the snippet provided in `text` that identifies
 *       the index of the first JS character deemed to be matching.  If you
 *       want to generate highlights from the raw body, you need to add this
 *       offset to the offset of the `FilterMatchItem`.
 *     }
 *     @key[length]{
 *       The length in JS characters of what we deem to be the match.  In the
 *       even there is some horrible multi-JS-character stuff, assume we are
 *       doing the right thing.  If we are not, patch us, not your code.
 *     }
 *   ]]]{
 *     A list of the offsets within the snippet where matches occurred.  We
 *     do this so that in the future if we support any type of stemming or the
 *     like, the front-end doesn't find itself needing to duplicate the logic.
 *     We provide offsets and lengths rather than pre-splitting the strings so
 *     that a complicated UI could merge search results from searches for
 *     different phrases without having to do a ton of reverse engineering.
 *   }
 *   @key[path #:optional Array]{
 *     Identifies the piece in an aggregate where the match occurred by
 *     providing a traversal path to get to the origin of the string.  For
 *     example, if the display name of the 3rd recipient, the path would be
 *     [2 'name'].  If the e-mail address matched, the path would be
 *     [2 'address'].
 *
 *     This is intended to allow the match information to allow the integration
 *     of the matched data in their context.  For example, the recipients list
 *     in the message reader could be re-ordered so that matching addresses
 *     show up first (especially if some are elided), and are not duplicated in
 *     their original position in the list.
 *   }
 * ]
 *
 * We implement filters for the following:
 * - Author
 * - Recipients
 * - Subject
 * - Body, allows ignoring quoted bits
 **/

define(
  [
    'logic',
    './util',
    './allback',
    './syncbase',
    './date',
    './htmlchew',
    'module',
    'exports'
  ],
  function(
    logic,
    $util,
    allback,
    $syncbase,
    $date,
    htmlchew,
    $module,
    exports
  ) {
var BEFORE = $date.BEFORE,
    ON_OR_BEFORE = $date.ON_OR_BEFORE,
    SINCE = $date.SINCE,
    STRICTLY_AFTER = $date.STRICTLY_AFTER;
var bsearchMaybeExists = $util.bsearchMaybeExists,
    bsearchForInsert = $util.bsearchForInsert;

/**
 * cmpHeaderYoungToOld with matched-header unwrapping
 */
function cmpMatchHeadersYoungToOld(aMatch, bMatch) {
  var a = aMatch.header, b = bMatch.header;
  var delta = b.date - a.date;
  if (delta)
    return delta;
  // favor larger UIDs because they are newer-ish.
  return b.id - a.id;

}

/**
 * This internal function checks if a string or a regexp matches an input
 * and if it does, it returns a 'return value' as RegExp.exec does.  Note that
 * the 'index' of the returned value will be relative to the provided
 * `fromIndex` as if the string had been sliced using fromIndex.
 */
function matchRegexpOrString(phrase, input, fromIndex) {
  if (!input) {
    return null;
  }

  if (phrase instanceof RegExp) {
    return phrase.exec(fromIndex ? input.slice(fromIndex) : input);
  }

  var idx = input.indexOf(phrase, fromIndex);
  if (idx == -1) {
    return null;
  }

  var ret = [ phrase ];
  ret.index = idx - fromIndex;
  return ret;
}

/**
 * Match a single phrase against the author's display name or e-mail address.
 * Match results are stored in the 'author' attribute of the match object as a
 * `FilterMatchItem`.
 *
 * We will favor matches on the display name over the e-mail address.
 */
function AuthorFilter(phrase) {
  this.phrase = phrase;
}
exports.AuthorFilter = AuthorFilter;
AuthorFilter.prototype = {
  needsBody: false,

  testMessage: function(header, body, match) {
    var author = header.author, phrase = this.phrase, ret;
    if ((ret = matchRegexpOrString(phrase, author.name, 0))) {
      match.author = {
        text: author.name,
        offset: 0,
        matchRuns: [{ start: ret.index, length: ret[0].length }],
        path: null,
      };
      return true;
    }
    if ((ret = matchRegexpOrString(phrase, author.address, 0))) {
      match.author = {
        text: author.address,
        offset: 0,
        matchRuns: [{ start: ret.index, length: ret[0].length }],
        path: null,
      };
      return true;
    }
    match.author = null;
    return false;
  },
};

/**
 * Checks any combination of the recipients lists.  Match results are stored
 * as a list of `FilterMatchItem` instances in the 'recipients' attribute with
 * 'to' matches before 'cc' matches before 'bcc' matches.
 *
 * We will stop trying to match after the configured number of matches.  If your
 * UI doesn't have the room for a lot of matches, just pass 1.
 *
 * For a given recipient, if both the display name and e-mail address both
 * match, we will still only report the display name.
 */
function RecipientFilter(phrase, stopAfterNMatches,
                         checkTo, checkCc, checkBcc) {
  this.phrase = phrase;
  this.stopAfter = stopAfterNMatches;
  this.checkTo = checkTo;
  this.checkCc = checkCc;
  this.checkBcc = checkBcc;
}
exports.RecipientFilter = RecipientFilter;
RecipientFilter.prototype = {
  needsBody: true,

  testMessage: function(header, body, match) {
    var phrase = this.phrase, stopAfter = this.stopAfter;
    var matches = [];
    function checkRecipList(list) {
      var ret;
      for (var i = 0; i < list.length; i++) {
        var recip = list[i];
        if ((ret = matchRegexpOrString(phrase, recip.name, 0))) {
          matches.push({
            text: recip.name,
            offset: 0,
            matchRuns: [{ start: ret.index, length: ret[0].length }],
            path: null,
          });
          if (matches.length < stopAfter)
            continue;
          return;
        }
        if ((ret = matchRegexpOrString(phrase, recip.address, 0))) {
          matches.push({
            text: recip.address,
            offset: 0,
            matchRuns: [{ start: ret.index, length: ret[0].length }],
            path: null,
          });
          if (matches.length >= stopAfter)
            return;
        }
      }
    }

    if (this.checkTo && header.to)
      checkRecipList(header.to);
    if (this.checkCc && header.cc && matches.length < stopAfter)
      checkRecipList(header.cc);
    if (this.checkBcc && header.bcc && matches.length < stopAfter)
      checkRecipList(header.bcc);

    if (matches.length) {
      match.recipients = matches;
      return true;
    }
    else {
      match.recipients = null;
      return false;
    }
  },

};

/**
 * Assists in generating a `FilterMatchItem` for a substring that is part of a
 * much longer string where we expect we need to reduce things down to a
 * snippet.
 *
 * Context generating is whitespace-aware and tries to avoid leaving partial
 * words.  In the event our truncation would leave us without any context
 * whatsoever, we will leave partial words.  This is also important for us not
 * being rude to CJK languages (although the number used for contextBefore may
 * be too high for CJK, we may want to have them 'cost' more.)
 *
 * We don't pursue any whitespace normalization here because we want our offsets
 * to line up properly with the real data, but also because we can depend on
 * HTML to help us out and normalize everything anyways.
 */
function snippetMatchHelper(str, start, length, contextBefore, contextAfter,
                            path) {
  if (contextBefore > start)
    contextBefore = start;
  var offset = str.indexOf(' ', start - contextBefore);
  // Just fragment the preceding word if there was no match whatsoever or the
  // whitespace match happened preceding our word or anywhere after it.
  if (offset === -1 || offset >= (start - 1)) {
    offset = start - contextBefore;
  }
  else {
    // do not start on the space character
    offset++;
  }

  var endIdx;
  if (start + length + contextAfter >= str.length) {
    endIdx = str.length;
  }
  else {
    endIdx = str.lastIndexOf(' ', start + length + contextAfter - 1);
    if (endIdx <= start + length) {
      endIdx = start + length + contextAfter;
    }
  }
  var snippet = str.substring(offset, endIdx);

  return {
    text: snippet,
    offset: offset,
    matchRuns: [{ start: start - offset, length: length }],
    path: path
  };
}

/**
 * Searches the subject for a phrase.  Provides snippeting functionality in case
 * of non-trivial subject lengths.   Multiple matches are supported, but
 * subsequent matches will never overlap with previous strings.  (So if you
 * search for 'bob', and the subject is 'bobobob', you will get 2 matches, not
 * 3.)
 *
 * For details on snippet generation, see `snippetMatchHelper`.
 */
function SubjectFilter(phrase, stopAfterNMatches, contextBefore, contextAfter) {
  this.phrase = phrase;
  this.stopAfter = stopAfterNMatches;
  this.contextBefore = contextBefore;
  this.contextAfter = contextAfter;
}
exports.SubjectFilter = SubjectFilter;
SubjectFilter.prototype = {
  needsBody: false,
  testMessage: function(header, body, match) {
    var subject = header.subject;
    // Empty subjects can't match *anything*; no empty regexes allowed, etc.
    if (!subject)
      return false;
    var phrase = this.phrase,
        slen = subject.length,
        stopAfter = this.stopAfter,
        contextBefore = this.contextBefore, contextAfter = this.contextAfter,
        matches = [],
        idx = 0;

    while (idx < slen && matches.length < stopAfter) {
      var ret = matchRegexpOrString(phrase, subject, idx);
      if (!ret)
        break;

      matches.push(snippetMatchHelper(subject, idx + ret.index, ret[0].length,
                                      contextBefore, contextAfter, null));
      idx += ret.index + ret[0].length;
    }

    if (matches.length) {
      match.subject = matches;
      return true;
    }
    else {
      match.subject = null;
      return false;
    }
  },
};

// stable value from quotechew.js; full export regime not currently required.
var CT_AUTHORED_CONTENT = 0x1;
// HTML DOM constants
var ELEMENT_NODE = 1, TEXT_NODE = 3;

/**
 * Searches the body of the message, it can ignore quoted stuff or not.
 * Provides snippeting functionality.  Multiple matches are supported, but
 * subsequent matches will never overlap with previous strings.  (So if you
 * search for 'bob', and the subject is 'bobobob', you will get 2 matches, not
 * 3.)
 *
 * For details on snippet generation, see `snippetMatchHelper`.
 */
function BodyFilter(phrase, matchQuotes, stopAfterNMatches,
                    contextBefore, contextAfter) {
  this.phrase = phrase;
  this.stopAfter = stopAfterNMatches;
  this.contextBefore = contextBefore;
  this.contextAfter = contextAfter;
  this.matchQuotes = matchQuotes;
}
exports.BodyFilter = BodyFilter;
BodyFilter.prototype = {
  needsBody: true,
  testMessage: function(header, body, match) {
    var phrase = this.phrase,
        stopAfter = this.stopAfter,
        contextBefore = this.contextBefore, contextAfter = this.contextAfter,
        matches = [],
        matchQuotes = this.matchQuotes,
        idx, ret;

    for (var iBodyRep = 0; iBodyRep < body.bodyReps.length; iBodyRep++) {
      var bodyType = body.bodyReps[iBodyRep].type,
          bodyRep = body.bodyReps[iBodyRep].content;

      if (bodyType === 'plain') {
        for (var iRep = 0; iRep < bodyRep.length && matches.length < stopAfter;
             iRep += 2) {
          var etype = bodyRep[iRep]&0xf, block = bodyRep[iRep + 1],
              repPath = null;

          // Ignore blocks that are not message-author authored unless we are
          // told to match quotes.
          if (!matchQuotes && etype !== CT_AUTHORED_CONTENT)
            continue;

          for (idx = 0; idx < block.length && matches.length < stopAfter;) {
            ret = matchRegexpOrString(phrase, block, idx);
            if (!ret) {
              break;
            }
            if (repPath === null) {
              repPath = [iBodyRep, iRep];
            }
            matches.push(snippetMatchHelper(
              block, idx + ret.index, ret[0].length,
              contextBefore, contextAfter,
              repPath));
            idx += ret.index + ret[0].length;
          }
        }
      }
      else if (bodyType === 'html') {
        var searchableText = htmlchew.generateSearchableTextVersion(
          bodyRep, this.matchQuotes);
        for (idx = 0; idx < bodyRep.length && matches.length < stopAfter;) {
          ret = matchRegexpOrString(phrase, searchableText, idx);
          if (!ret) {
            break;
          }
          // note: because we heavily discard DOM structure, we are unable to
          // generate a useful path.  The good news is we don't use the path
          // anywhere at this time, so it's not particularly a big deal.
          matches.push(snippetMatchHelper(
            searchableText, idx + ret.index, ret[0].length,
            contextBefore, contextAfter, null));
          idx += ret.index + ret[0].length;
        }
      }
    }

    if (matches.length) {
      match.body = matches;
      return true;
    }
    else {
      match.body = null;
      return false;
    }
  },
};

/**
 * Filters messages using the 'OR' of all specified filters.  We don't need
 * 'AND' right now, but we are not opposed to its inclusion.
 */
function MessageFilterer(filters) {
  this.filters = filters;
  this.bodiesNeeded = false;

  /**
   * How many headers have we tried to match against?  This is for unit tests.
   */
  this.messagesChecked = 0;


  for (var i = 0; i < filters.length; i++) {
    var filter = filters[i];
    if (filter.needsBody)
      this.bodiesNeeded = true;
  }
}
exports.MessageFilterer = MessageFilterer;
MessageFilterer.prototype = {
  /**
   * Check if the message matches the filter.  If it does not, false is
   * returned.  If it does match, a match object is returned whose attributes
   * are defined by the filterers in use.
   */
  testMessage: function(header, body) {
    this.messagesChecked++;

    //console.log('sf: testMessage(', header.suid, header.author.address,
    //            header.subject, 'body?', !!body, ')');
    var matched = false, matchObj = {};
    var filters = this.filters;
    try {
      for (var i = 0; i < filters.length; i++) {
        var filter = filters[i];
        if (filter.testMessage(header, body, matchObj))
          matched = true;
      }
    }
    catch (ex) {
      console.error('filter exception', ex, '\n', ex.stack);
    }
    //console.log('   =>', matched, JSON.stringify(matchObj));
    if (matched)
      return matchObj;
    else
      return false;
  },
};

var CONTEXT_CHARS_BEFORE = 16;
var CONTEXT_CHARS_AFTER = 40;

/**
 *
 */
function SearchSlice(bridgeHandle, storage, phrase, whatToSearch) {
console.log('sf: creating SearchSlice:', phrase);
  this._bridgeHandle = bridgeHandle;
  bridgeHandle.__listener = this;
  // this mechanism never allows triggering synchronization.
  bridgeHandle.userCanGrowDownwards = false;

  this._storage = storage;
  logic.defineScope(this, 'SearchSlice');

  // XXX: This helps test_search_slice do its job, in a world where
  // we no longer have loggers associated with specific instances.
  SearchSlice._TEST_latestInstance = this;

  // These correspond to the range of headers that we have searched to generate
  // the current set of matched headers.  Our matches will always be fully
  // contained by this range.
  //
  // This range can and will shrink when reqNoteRanges is called.  Currently we
  // shrink to the first/last remaining matches.  Strictly speaking, this is too
  // aggressive.  The optimal shrink constraint would be to pick the message
  // adjacent to the first matches we are discarding so that growing by one
  // message would immediately re-find the message.  However it would be even
  // MORE efficient to just maintain a compact list of messages that have
  // matched that we never forget, so we'll just do that when we're feeling all
  // fancy in the future.
  this.startTS = null;
  this.startUID = null;
  this.endTS = null;
  this.endUID = null;

  var filters = [];

  if (phrase) {
    if (!(phrase instanceof RegExp)) {
      phrase = new RegExp(phrase.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
                                         '\\$&'),
                          'i');
    }

    if (whatToSearch.author)
      filters.push(new AuthorFilter(phrase));
    if (whatToSearch.recipients)
      filters.push(new RecipientFilter(phrase, 1, true, true, true));
    if (whatToSearch.subject)
      filters.push(new SubjectFilter(
                     phrase, 1, CONTEXT_CHARS_BEFORE, CONTEXT_CHARS_AFTER));
    if (whatToSearch.body) {
      filters.push(new BodyFilter(
                     phrase, whatToSearch.body === 'yes-quotes',
                     1, CONTEXT_CHARS_BEFORE, CONTEXT_CHARS_AFTER));
      // A latch for use to make sure that _gotMessages' checkHandle calls are
      // sequential even when _gotMessages is invoked with no headers and
      // !moreMessagesComing.
      //
      // (getBody calls are inherently ordered, but if we have no headers, then
      // the function call that decides whether we fetch more messages needs
      // some way to wait for the body loads to occur.  Previously we used
      // storage.runAfterDeferredCalls, but that's now removed because it was a
      // footgun and its semantics were slightly broken to boot.)
      //
      // TODO: In the future, refactor this logic into a more reusable
      // iterator/stream mechanism so that this class doesn't have to deal with
      // it.
      //
      // The usage pattern is this:
      // - Whenever we have any bodies to fetch, we create a latch and assign it
      //   here.
      // - Whenever we don't have any bodies to fetch, we use a .then() on the
      //   current value of the latch, if there is one.
      // - We clear this in _gotMessages' checkHandle in the case we are calling
      //   reqGrow.  This avoids the latch hanging around with potential GC
      //   implications and provides a nice invariant.
      this._pendingBodyLoadLatch = null;
    }
  }

  this.filterer = new MessageFilterer(filters);

  this._bound_gotOlderMessages = this._gotMessages.bind(this, 1);
  this._bound_gotNewerMessages = this._gotMessages.bind(this, -1);


  this.desiredHeaders = $syncbase.INITIAL_FILL_SIZE;
  this.reset();
}
exports.SearchSlice = SearchSlice;
SearchSlice.prototype = {
  /**
   * We are a filtering search slice.  To reduce confusion, we still call this
   * search.
   */
  type: 'search',

  set atTop(val) {
    this._bridgeHandle.atTop = val;
  },
  get atBottom() {
    return this._bridgeHandle.atBottom;
  },
  set atBottom(val) {
    this._bridgeHandle.atBottom = val;
  },
  set headerCount(val) {
    if (this._bridgeHandle)
      this._bridgeHandle.headerCount = val;
    return val;
  },

  /**
   * How many messages should we pretend exist when we haven't yet searched all
   * of the folder?
   *
   * As a lazy search, we have no idea how many messages actually match a user's
   * search.  We now assume a virtual scroll list that sizes itself based on
   * knowing how many headers there are using headerCount and thus no longer
   * really cares about atBottom (at least until we start automatically
   * synchronizing new messages.)
   *
   * 1 is a pretty good value for this since it only takes 1 lied-about message
   * to trigger us.  Also, the UI will show the "I'm still loading stuff!"
   * fake message until we find something...
   *
   * TODO: Either stop lying or come up with a better rationale for this.  All
   * we really want is for the UI to remember to ask us for more stuff, and all
   * the UI probably wants is to show some type of search-specific string that
   * says "Hey, I'm searching here!  Give it a minute!".  Not doing this right
   * now because that results in all kinds of scope creep and such.
   */
  IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM: 1,

  reset: function() {
    // misnomer but simplifies cutting/pasting/etc.  Really an array of
    // { header: header, matches: matchObj }
    this.headers = [];
    this.headerCount = 0;
    // Track when we are still performing the initial database scan so that we
    // can ignore dynamic additions/modifications.  The initial database scan
    // is currently not clever enough to deal with concurrent manipulation, so
    // we just ignore all such events.  This has an extremely low probability
    // of resulting in false negatives.
    this._loading = true;
    this.startTS = null;
    this.startUID = null;
    this.endTS = null;
    this.endUID = null;
    // Fetch as many headers as we want in our results; we probably will have
    // less than a 100% hit-rate, but there isn't much savings from getting the
    // extra headers now, so punt on those.
    this._storage.getMessagesInImapDateRange(
      0, null, this.desiredHeaders, this.desiredHeaders,
      this._gotMessages.bind(this, 1));
  },

  _gotMessages: function(dir, headers, moreMessagesComing) {
    if (!this._bridgeHandle) {
      return;
    }
    // conditionally indent messages that are non-notable callbacks since we
    // have more messages coming.  sanity measure for asuth for now.
    var logPrefix = moreMessagesComing ? 'sf: ' : 'sf:';
    console.log(logPrefix, 'gotMessages', headers.length, 'more coming?',
                moreMessagesComing);
    // update the range of what we have seen and searched
    if (headers.length) {
      if (dir === -1) { // (more recent)
        this.endTS = headers[0].date;
        this.endUID = headers[0].id;
      }
      else { // (older)
        var lastHeader = headers[headers.length - 1];
        this.startTS = lastHeader.date;
        this.startUID = lastHeader.id;
        if (this.endTS === null) {
          this.endTS = headers[0].date;
          this.endUID = headers[0].id;
        }
      }
    }

    /**
     * Called once we have all the data needed to actually check for matches.
     * Specifically, we may have had to fetch the bodies.
     *
     * @param {MailHeader[]} headers
     * @param {Object} [resolvedGetBodyCalls]
     *   The results of an allback.latch() resolved by getBody calls.  The
     *   keys are the headers' suid's and the values are the gotBody argument
     *   callback list, which will look like [MailBody, header/message suid].
     */
    var checkHandle = function checkHandle(headers, resolvedGetBodyCalls) {
      if (!this._bridgeHandle) {
        return;
      }

      // run a filter on these
      var matchPairs = [];
      for (i = 0; i < headers.length; i++) {
        var header = headers[i],
            body = resolvedGetBodyCalls ? resolvedGetBodyCalls[header.id][0] :
                                          null;
        this._headersChecked++;
        var matchObj = this.filterer.testMessage(header, body);
        if (matchObj)
          matchPairs.push({ header: header, matches: matchObj });
      }

      var atTop = this.atTop = this._storage.headerIsYoungestKnown(
                    this.endTS, this.endUID);
      var atBottom = this.atBottom = this._storage.headerIsOldestKnown(
                       this.startTS, this.startUID);
      var canGetMore = (dir === -1) ? !atTop : !atBottom;
      var willHave = this.headers.length + matchPairs.length,
          wantMore = !moreMessagesComing &&
                     (willHave < this.desiredHeaders) &&
                     canGetMore;
      if (matchPairs.length) {
        console.log(logPrefix, 'willHave', willHave, 'of', this.desiredHeaders,
                    'want more?', wantMore);
        var insertAt = dir === -1 ? 0 : this.headers.length;
        logic(this, 'headersAppended', { insertAt: insertAt,
                                         matchPairs: matchPairs });

        this.headers.splice.apply(this.headers,
                                  [insertAt, 0].concat(matchPairs));
        this.headerCount = this.headers.length +
          (atBottom ? 0 : this.IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM);

        this._bridgeHandle.sendSplice(
          insertAt, 0, matchPairs, true,
          moreMessagesComing || wantMore);

        if (wantMore) {
          console.log(logPrefix, 'requesting more because want more');
          this.reqGrow(dir, false, true);
        }
        else if (!moreMessagesComing) {
          console.log(logPrefix, 'stopping (already reported), no want more.',
                      'can get more?', canGetMore);
          this._loading = false;
          this.desiredHeaders = this.headers.length;
        }
      }
      // XXX this branch is largely the same as in the prior case except for
      // specialization because the sendSplice call obviates the need to call
      // sendStatus.  Consider consolidation.
      else if (!moreMessagesComing) {
        // Update our headerCount, potentially reducing our headerCount by 1!
        this.headerCount = this.headers.length +
          (atBottom ? 0 : this.IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM);

        // If there aren't more messages coming, we either need to get more
        // messages (if there are any left in the folder that we haven't seen)
        // or signal completion.  We can use our growth function directly since
        // there are no state invariants that will get confused.
        if (wantMore) {
          console.log(logPrefix,
                      'requesting more because no matches but want more');
          this._pendingBodyLoadLatch = null;
          this.reqGrow(dir, false, true);
        }
        else {
          console.log(logPrefix, 'stopping, no matches, no want more.',
                      'can get more?', canGetMore);
          this._bridgeHandle.sendStatus('synced', true, false);
          // We can now process dynamic additions/modifications
          this._loading = false;
          this.desiredHeaders = this.headers.length;
        }
      }
      // (otherwise we need to wait for the additional messages to show before
      //  doing anything conclusive)
    }.bind(this);

    if (this.filterer.bodiesNeeded) {
      // To batch our updates to the UI, just get all the bodies then advance
      // to the next stage of processing.

      // See the docs in the constructor on _pendingBodyLoadLatch.
      if (headers.length) {
        var latch = this._pendingBodyLoadLatch = allback.latch();
        for (var i = 0; i < headers.length; i++) {
          var header = headers[i];
          this._storage.getMessageBody(
            header.suid, header.date, latch.defer(header.id));
        }
        latch.then(checkHandle.bind(null, headers));
      } else {
        // note that we are explicitly binding things so the existing result
        // from _pendingBodyLoadLatch will be positionally extra and unused.
        var deferredCheck = checkHandle.bind(null, headers, null);
        if (this._pendingBodyLoadLatch) {
          this._pendingBodyLoadLatch.then(deferredCheck);
        } else {
          deferredCheck();
        }
      }
    }
    else {
      checkHandle(headers, null);
    }
  },

  refresh: function() {
    // no one should actually call this.  If they do, we absolutely don't want
    // to do anything since we may span a sufficiently large time-range that it
    // would be insane for our current/baseline IMAP support.  Eventually, on
    // QRESYNC-capable IMAP and things like ActiveSync/POP3 where sync is
    // simple it would make sense to pass this through.
  },

  /**
   * We are hearing about a new header (possibly with body), or have transformed
   * an onHeaderModified notification into onHeaderAdded since there's a
   * possibility the header may now match the search filter.
   *
   * It is super important to keep in mind that / be aware of:
   * - We only get called about headers that are inside the range we already
   *   cover or if FolderStorage thinks the slice should grow because of being
   *   latched to the top or something like that.
   * - We maintain the start/end ranges based on the input to the filtering step
   *   and not the filtered results.  So we always want to apply the start/end
   *   update logic.
   */
  onHeaderAdded: function(header, body) {
    if (!this._bridgeHandle || this._loading) {
      return;
    }

    // COPY-N-PASTE: logic from MailSlice.onHeaderAdded
    if (this.startTS === null ||
        BEFORE(header.date, this.startTS)) {
      this.startTS = header.date;
      this.startUID = header.id;
    }
    else if (header.date === this.startTS &&
             header.id < this.startUID) {
      this.startUID = header.id;
    }
    if (this.endTS === null ||
        STRICTLY_AFTER(header.date, this.endTS)) {
      this.endTS = header.date;
      this.endUID = header.id;
    }
    else if (header.date === this.endTS &&
             header.id > this.endUID) {
      this.endUID = header.id;
    }
    // END COPY-N-PASTE

    var matchObj = this.filterer.testMessage(header, body);
    if (!matchObj) {
      // In the range-extending case, addMessageHeader may help us out by
      // boosting our desiredHeaders.  It does this assuming we will then
      // include the header like a normal slice, so we need to correct for this
      // be capping ourselves back to desiredHeaders again
      this.desiredHeaders = this.headers.length;
      return;
    }

    var wrappedHeader = { header: header, matches: matchObj };
    var idx = bsearchForInsert(this.headers, wrappedHeader,
                               cmpMatchHeadersYoungToOld);

    // We don't need to do headers.length checking here because the caller
    // checks this for us sufficiently.  (The inclusion of the logic in
    // MailSlice.onHeaderAdded relates to slices directly fed by the sync
    // process which may be somewhat moot but definite is not something that
    // happens to us, a search slice.)
    //
    // For sanity, we should make sure desiredHeaders doesn't get out-of-wack,
    // though.
    this.desiredHeaders = this.headers.length;

    logic(this, 'headerAdded', { index: idx, header: wrappedHeader });
    this.headers.splice(idx, 0, wrappedHeader);
    this.headerCount = this.headers.length +
      (this.atBottom ? 0 : this.IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM);
    this._bridgeHandle.sendSplice(idx, 0, [wrappedHeader], false, false);
  },

  /**
   * As a shortcut on many levels, we only allow messages to transition from not
   * matching to matching.  This is logically consistent since we don't support
   * filtering on the user-mutable aspects of a message (flags / folder / etc.),
   * but can end up downloading more pieces of a message's body which can result
   * in a message starting to match.
   *
   * This is also a correctness shortcut since we rely on body-hints to be
   * provided by synchronization logic.  They will be provided when the body is
   * being updated since we always update the header at the same time, but will
   * not be provided in the case of flag-only changes.  Obviously it would suck
   * if the flagged state of a message changed and then we dropped the message
   * from the match list because we had no body against which to match.  There
   * are things we could do to track body-matchingness indepenently of the flags
   * but it's simplest to just only allow the 1-way transition for now.
   */
  onHeaderModified: function(header, body) {
    if (!this._bridgeHandle || this._loading) {
      return;
    }


    var wrappedHeader = { header: header, matches: null };
    var idx = bsearchMaybeExists(this.headers, wrappedHeader,
                                 cmpMatchHeadersYoungToOld);
    if (idx !== null) {
      // Update the header in the match and send it out.
      var existingMatch = this.headers[idx];
      existingMatch.header = header;
      logic(this, 'headerModified', { index: idx,
                                      existingMatch: existingMatch });
      this._bridgeHandle.sendUpdate([idx, existingMatch]);
      return;
    }

    // No transition is possible if we don't care about bodies or don't have one
    if (!this.filterer.bodiesNeeded || !body) {
      return;
    }

    // Okay, let the add logic see if it fits.
    this.onHeaderAdded(header, body);
  },

  onHeaderRemoved: function(header) {
    if (!this._bridgeHandle) {
      return;
    }
    // NB: We must always apply this logic since our range characterizes what we
    // have searched/filtered, not what's inside us.  Unfortunately, when this
    // does happen, we will drastically decrease our scope to the mesages
    // we have matched.  What we really need for maximum correctness is to be
    // able to know the message namers on either side of the header being
    // deleted.  This could be interrogated by us or provided by the caller.
    //
    // (This would not necessitate additional block loads since if the header is
    // at either end of its containing block, then the namer for the thing on
    // the other side is known from the message namer defining the adjacent
    // block.)
    //
    // So, TODO: Do not drastically decrease range / lose 'latch to new'
    // semantics when the messages bounding our search get deleted.
    //
    // COPY-N-PASTE-N-MODIFY: logic from MailSlice.onHeaderRemoved
    if (header.date === this.endTS && header.id === this.endUID) {
      if (!this.headers.length) {
        this.endTS = null;
        this.endUID = null;
      }
      else {
        this.endTS = this.headers[0].header.date;
        this.endUID = this.headers[0].header.id;
      }
    }
    if (header.date === this.startTS && header.id === this.startUID) {
      if (!this.headers.length) {
        this.startTS = null;
        this.startUID = null;
      }
      else {
        var lastHeader = this.headers[this.headers.length - 1];
        this.startTS = lastHeader.header.date;
        this.startUID = lastHeader.header.id;
      }
    }
    // END COPY-N-PASTE

    var wrappedHeader = { header: header, matches: null };
    var idx = bsearchMaybeExists(this.headers, wrappedHeader,
                                 cmpMatchHeadersYoungToOld);
    if (idx !== null) {
      logic(this, 'headerRemoved', { index: idx, header: wrappedHeader });
      this.headers.splice(idx, 1);
      this.headerCount = this.headers.length +
        (this.atBottom ? 0 : this.IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM);
      this._bridgeHandle.sendSplice(idx, 1, [], false, false);
    }
  },

  reqNoteRanges: function(firstIndex, firstSuid, lastIndex, lastSuid) {
    // when shrinking our range, we could try and be clever and use the values
    // of the first thing we are updating to adjust our range, but it's safest/
    // easiest right now to just use what we are left with.

    // THIS CODE IS COPIED FROM `MailSlice`'s reqNoteRanges implementation

    var i;
    // - Fixup indices if required
    if (firstIndex >= this.headers.length ||
        this.headers[firstIndex].suid !== firstSuid) {
      firstIndex = 0; // default to not splicing if it's gone
      for (i = 0; i < this.headers.length; i++) {
        if (this.headers[i].suid === firstSuid) {
          firstIndex = i;
          break;
        }
      }
    }
    if (lastIndex >= this.headers.length ||
        this.headers[lastIndex].suid !== lastSuid) {
      for (i = this.headers.length - 1; i >= 0; i--) {
        if (this.headers[i].suid === lastSuid) {
          lastIndex = i;
          break;
        }
      }
    }

    // - Perform splices as required
    // (high before low to avoid index changes)
    if (lastIndex + 1 < this.headers.length) {
      this.atBottom = false;
      this.userCanGrowDownwards = false;
      var delCount = this.headers.length - lastIndex  - 1;
      this.desiredHeaders -= delCount;

      this.headers.splice(lastIndex + 1, this.headers.length - lastIndex - 1);
      // (we are definitely not atBottom, so lie, lie, lie!)
      this.headerCount = this.headers.length +
        this.IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM;

      this._bridgeHandle.sendSplice(
        lastIndex + 1, delCount, [],
        // This is expected; more coming if there's a low-end splice
        true, firstIndex > 0);

      var lastHeader = this.headers[lastIndex].header;
      this.startTS = lastHeader.date;
      this.startUID = lastHeader.id;
    }
    if (firstIndex > 0) {
      this.atTop = false;
      this.desiredHeaders -= firstIndex;

      this.headers.splice(0, firstIndex);
      this.headerCount = this.headers.length +
        (this.atBottom ? 0 : this.IMAGINARY_MESSAGE_COUNT_WHEN_NOT_AT_BOTTOM);

      this._bridgeHandle.sendSplice(0, firstIndex, [], true, false);

      var firstHeader = this.headers[0].header;
      this.endTS = firstHeader.date;
      this.endUID = firstHeader.id;
    }
  },

  reqGrow: function(dirMagnitude, userRequestsGrowth, autoDoNotDesireMore) {
    // If the caller is impatient and calling reqGrow on us before we are done,
    // ignore them.  (Otherwise invariants will be violated, etc. etc.)  This
    // is okay from an event perspective since we will definitely generate a
    // completion notification, so the only way this could break the caller is
    // if they maintained a counter of complete notifications to wait for.  But
    // they cannot/must not do that since you can only ever get one of these!
    // (And the race/confusion is inherently self-solving for naive code.)
    if (!autoDoNotDesireMore && this._loading) {
      return;
    }

    // Stop processing dynamic additions/modifications while this is happening.
    this._loading = true;
    var count;
    if (dirMagnitude < 0) {
      if (dirMagnitude === -1) {
        count = $syncbase.INITIAL_FILL_SIZE;
      }
      else {
        count = -dirMagnitude;
      }
      if (!autoDoNotDesireMore) {
        this.desiredHeaders += count;
      }
      this._storage.getMessagesAfterMessage(this.endTS, this.endUID,
                                            count,
                                            this._gotMessages.bind(this, -1));
    }
    else {
      if (dirMagnitude <= 1) {
        count = $syncbase.INITIAL_FILL_SIZE;
      }
      else {
        count = dirMagnitude;
      }
      if (!autoDoNotDesireMore) {
        this.desiredHeaders += count;
      }
      this._storage.getMessagesBeforeMessage(this.startTS, this.startUID,
                                             count,
                                             this._gotMessages.bind(this, 1));
    }
  },

  die: function() {
    this._storage.dyingSlice(this);
    this._bridgeHandle = null;
  },
};

}); // end define
