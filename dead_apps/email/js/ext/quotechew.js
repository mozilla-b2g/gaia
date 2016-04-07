/**
 * Process text/plain message bodies for quoting / signatures.
 *
 * We have two main goals in our processing:
 *
 * 1) Improve display by being able to automatically collapse excessively quoted
 * blocks and large/redundant signature blocks and hide them entirely from snippet
 * generation.
 *
 * 2) Allow us to reply to messages and provide automatically limited quoting.
 * Specifically, we want to provide one message's worth of context when replying
 * to a message.  We also want to avoid messages in a thread indefinitely
 * growing in size because all users keep replying and leaving default quoting
 * intact.
 *
 * The quotechew representation is a flat array consisting of (flattened) pairs
 * of an encoded content type integer and a string that is the content whose
 * nature is described by that block.
 *
 * NOTE: This representation was okay, but arguably a compromise between:
 * - premature optimization storage concerns
 * - wide eyes looking at a future where we could be more clever about quoting
 *   than we ended up being able to be
 * - wanting to be able to efficiently render the quoted text into the DOM
 *   without having complicated render code or having to worry about security
 *   issues.
 *
 * Going forward, a more DOM-y representation that could allow the UI to
 * more uniformly treat text/plain and text/html for display purposes could be
 * nice.  In particular, I think it would be great to be able to have quotes
 * tagged as such and things like boilerplate be indicated both at the top-level
 * and inside quotes.  This would be great for smart-collapsing of quotes and
 * things no one cares about.
 **/

define(
  [
    'exports'
  ],
  function(
    exports
  ) {

////////////////////////////////////////////////////////////////////////////////
// Content Type Encoding
//
// We encode content type values as integers in an attempt to have the serialized
// form not be super huge and be pretty quick to check without generating garbage
// objects.
//
// The low-order nibble encodes the type for styling purposes; everything above
// that nibble is per-type and may encode integer values or use hot bits to
// indicate type.

/**
 * Actual content of the message written by the user.
 */
var CT_AUTHORED_CONTENT = 0x1;
/**
 * Niceties like greetings/thanking someone/etc.  These are things that we want to
 * show when displaying the message, but that arguably are of lower importance and
 * might want to be elided for snippet purposes, etc.
 */
var CT_AUTHORED_NICETIES = 0x11;
/**
 * The signature of the message author; might contain useful information in it.
 */
var CT_SIGNATURE = 0x2;

/**
 * The line that says "Blah wrote:" that precedes a quote.  It's not part of the
 * user content, but it's also not part of the quote.
 */
var CT_LEADIN_TO_QUOTE = 0x3;

var CT_QUOTED_TYPE = 0x4;

/**
 * A quoted reply; eligible for collapsing.  Depth of quoting will also be
 * encoded in the actual integer value.
 */
var CT_QUOTED_REPLY = 0x14;
/**
 * A quoted forwarded message; we would guess that the user has not previously seen
 * the message and the quote wants to be displayed.
 */
var CT_QUOTED_FORWARD = 0x24;
/**
 * Quoted content that has not been pruned.  Aspirational!
 */
var CT_QUOTED_IN_ENTIRETY = 0x40;
/**
 * The quote has been subjected to some level of manual intervention. Aspirational!
 */
var CT_QUOTED_GARDENED = 0x80;

var CT_QUOTE_DEPTH_MASK = 0xff00;

/**
 * Legal-ish boilerplate about how it's only for the recipient, etc. etc.
 * Generally going to be long and boring.
 */
var CT_BOILERPLATE_DISCLAIMER = 0x5;
/**
 * Boilerplate about the message coming from a mailing list, info about the
 * mailing list.
 */
var CT_BOILERPLATE_LIST_INFO = 0x6;
/**
 * Product branding boilerplate that may or may not indicate that the composing
 * device was a mobile device (which is useful).
 */
var CT_BOILERPLATE_PRODUCT = 0x7;
/**
 * Advertising automatically inserted by the mailing list or free e-mailing service,
 * etc.  This is assumed to be boring.
 */
var CT_BOILERPLATE_ADS = 0x8;

var CHARCODE_GT = ('>').charCodeAt(0),
    CHARCODE_SPACE = (' ').charCodeAt(0),
    CHARCODE_NBSP = ('\xa0').charCodeAt(0),
    CHARCODE_NEWLINE = ('\n').charCodeAt(0);

var RE_ORIG_MESAGE_DELIM = /^-{5} Original Message -{5}$/;

var RE_ALL_WS = /^\s+$/;

var RE_SECTION_DELIM = /^[_-]{6,}$/;

var RE_LIST_BOILER = /mailing list$/;

/**
 * Non-localized hard-coded heuristic to help us detect whether a line is the
 * lead-in to a quote block.  This is only checked against the last content line
 * preceding a quote block.  This only results in styling guidance, so if it's
 * too aggresive or insufficiently aggressive, the worst that happens is the
 * line will be dark gray instead of black.  (For now!  Moohoohahahahahaha.)
 */
var RE_WROTE_LINE = /wrote/;

/**
 * Hacky reply helper to check if the last line in a content block contains the
 * words wrote.  In a nutshell:
 * - The current quoting logic can only detect a quoting lead-in in non-quoted
 *   text and I'm not crazy enough to enhance this at this time.  (The current
 *   mechanism is already complex and assumes it's not dealing with '>'
 *   characters.  An enhanced mechanism could operate on a normalized
 *   representation where the quoting has been normalized to no longer include
 *   the > characters.  That would be a sortof multi-pass AST/tree-transformer.
 *   Future work.)
 * - The reply logic performs normalization on output, but without knowing about
 *   lead-ins, it makes the wrong normalization call for these wrote lines,
 *   inserting wasted whitespace.  This regex is an attempt to retroactively do
 *   the cool thing the former bullet proposes.  And it does indeed work out
 *   because of our aggressive newline normalization logic.
 * - Obviously this is not localized at all, but neither is the above.
 *
 * To keep the regex cost-effective and doing what we want, we anchor it to the
 * end of the string and ensure there are no newline characters before wrote.
 * (And we check for wrote without any other constraints because that's what the
 * above does.)
 *
 * Again, since this only controls whether a newline is inserted or not, it's
 * really not the end of the world.
 */
var RE_REPLY_LAST_LINE_IN_BLOCK_CONTAINS_WROTE = /wrote[^\n]+$/;

var RE_SIGNATURE_LINE = /^-- $/;

/**
 * The maximum number of lines that can be in a boilerplate chunk.  We expect
 * disclaimer boilerplate to be what drives this.
 */
var MAX_BOILERPLATE_LINES = 20;

/**
 * Catch various common well-known product branding lines:
 * - "Sent from my iPhone/iPad/mobile device".  Apple, others.
 * - "Sent from my Android ...".  Common prefix for wildly varying Android
 *     strings.
 * - "Sent from my ...".  And there are others that don't match the above but
 *     that match the prefix.
 * - "Sent from Mobile"
 */
var RE_PRODUCT_BOILER = /^(?:Sent from (?:Mobile|my .+))$/;

var RE_LEGAL_BOILER_START = /^(?:This message|Este mensaje)/;

/**
 * String.indexOf helper that will return the provided default value when -1
 * would otherwise be returned.
 */
function indexOfDefault(string, search, startIndex, defVal) {
  var idx = string.indexOf(search, startIndex);
  if (idx === -1)
    return defVal;
  return idx;
}

var NEWLINE = '\n', RE_NEWLINE = /\n/g;

/**
 * Count the number of newlines in the string in the [startIndex, endIndex)
 * characterized region.  (Using mathy syntax there: startIndex is inclusive,
 * endIndex is exclusive.)
 */
function countNewlinesInRegion(string, startIndex, endIndex) {
  var idx = startIndex - 1, count = 0;
  for (;;) {
    idx = string.indexOf(NEWLINE, idx + 1);
    if (idx === -1 || idx >= endIndex)
      return count;
    count++;
  }
  return null;
}

/**
 * Process the contents of a text body for quoting purposes.
 *
 * Key behaviors:
 *
 * - Whitespace is trimmed at the boundaries of regions.  Our CSS styling will
 *   take care of making sure there is appropriate whitespace.  This is an
 *   intentional normalization that should cover both people who fail to put
 *   whitespace in their messages (jerks) and people who put whitespace in.
 *
 * - Newlines are maintained inside of blocks.
 *
 * - We look backwards for boilerplate blocks once we encounter the first quote
 *   block or the end of the message.  We keep incrementally looking backwards
 *   until we reach something that we don't think is boilerplate.
 */
exports.quoteProcessTextBody = function quoteProcessTextBody(fullBodyText) {
  // Our serialized representation of the body, incrementally built.  Consists
  // of pairwise integer codes and content string blocks.
  var contentRep = [];
  // The current content line being parsed by our parsing loop, does NOT include
  // the trailing newline.
  var line;

  /**
   * Count the number of '>' quoting characters in the line, mutating `line` to
   * not include the quoting characters.  Some clients will place a single space
   * between each '>' at higher depths, and we support that.  But any more spaces
   * than that and we decide we've reached the end of the quote marker.
   */
  function countQuoteDepthAndNormalize() {
    // We know that the first character is a '>' already.
    var count = 1;
    var lastStartOffset = 1, spaceOk = true;

    for (var i = 1; i < line.length; i++) {
      var c = line.charCodeAt(i);
      if (c === CHARCODE_GT) {
        count++;
        lastStartOffset++;
        spaceOk = true;
      }
      else if (c === CHARCODE_SPACE) {
        if (!spaceOk)
          break;
        lastStartOffset++;
        spaceOk = false;
      }
      else {
        break;
      }
    }
    if (lastStartOffset)
      line = line.substring(lastStartOffset);
    return count;
  }

  /**
   * Scan backwards line-by-line through a chunk of content (AKA non-quoted)
   * text looking for boilerplate chunks.  We can stop once we determine we're
   * not in boilerplate.
   *
   * Note: The choice to not run us against quoted blocks was an intentional
   * simplification at the original time of implementation, presumably because
   * knowing something was a quote was sufficient and realistically all our
   * styling could hope to handle.  Also, the ontological commitment to a flat
   * document representation.  In retrospect, I think it could make sense to
   * use a tree that marks up each layer as quote/content/boilerplate/etc. in a
   * more DOM-like fashion.
   *
   * - Product blurbs must be the first non-whitespace line seen to be detected;
   *   they do not have to be delimited by an ASCII line.
   *
   * - Legal boilerplate must be delimited by an ASCII line.
   */
  function lookBackwardsForBoilerplate(chunk) {
    var idxLineStart, idxLineEnd, line,
        idxRegionEnd = chunk.length,
        scanLinesLeft = MAX_BOILERPLATE_LINES,
        sawNonWhitespaceLine = false,
        lastContentLine = null,
        lastBoilerplateStart = null,
        sawProduct = false,
        insertAt = contentRep.length;

    function pushBoilerplate(contentType, merge) {
      var boilerChunk = chunk.substring(idxLineStart, idxRegionEnd);
      var idxChunkEnd = idxLineStart - 1;
      // We used to do a trimRight here, but that would eat spaces in addition
      // to newlines.  This was undesirable for both roundtripping purposes and
      // mainly because the "-- " signature marker has a significant space
      // character on the end there.
      while (chunk.charCodeAt(idxChunkEnd - 1) === CHARCODE_NEWLINE) {
        idxChunkEnd--;
      }
      var newChunk = chunk.substring(0, idxChunkEnd);
      var ate = countNewlinesInRegion(chunk, newChunk.length, idxLineStart - 1);
      chunk = newChunk;
      idxRegionEnd = chunk.length;

      if (!merge) {
        contentRep.splice(insertAt, 0,
                          ((ate&0xff) << 8) | contentType,
                          boilerChunk);
      }
      else {
        // nb: this merge does not properly reuse the previous existing 'ate'
        // value; if we start doing more complex merges, the hardcoded '\n'
        // below will need to be computed.
        contentRep[insertAt] = ((ate&0xff) << 8) | (contentRep[insertAt]&0xff);
        contentRep[insertAt + 1] = boilerChunk + '\n' +
                                     contentRep[insertAt + 1];
      }

      sawNonWhitespaceLine = false;
      scanLinesLeft = MAX_BOILERPLATE_LINES;
      lastContentLine = null;
      lastBoilerplateStart = idxLineStart;
    }

    for (idxLineStart = chunk.lastIndexOf('\n') + 1,
           idxLineEnd = chunk.length;
         idxLineEnd > 0 && scanLinesLeft;
         idxLineEnd = idxLineStart - 1,
           idxLineStart = chunk.lastIndexOf('\n', idxLineEnd - 1) + 1,
           scanLinesLeft--) {

      // (do not include the newline character)
      line = chunk.substring(idxLineStart, idxLineEnd);

      // - Skip whitespace lines.
      if (!line.length ||
          (line.length === 1 && line.charCodeAt(0) === CHARCODE_NBSP))
        continue;

      // - Explicit signature demarcation
      if (RE_SIGNATURE_LINE.test(line)) {
        // Check if this is just tagging something we decided was boilerplate in
        // a proper signature wrapper.  If so, then execute a boilerplate merge.
        if (idxLineEnd + 1 === lastBoilerplateStart) {
          pushBoilerplate(null, true);
        }
        else {
          pushBoilerplate(CT_SIGNATURE);
        }
        continue;
      }

      // - Section delimiter; try and classify what lives in this section
      if (RE_SECTION_DELIM.test(line)) {
        if (lastContentLine) {
          // - Look for a legal disclaimer sequentially following the line.
          if (RE_LEGAL_BOILER_START.test(lastContentLine)) {
            pushBoilerplate(CT_BOILERPLATE_DISCLAIMER);
            continue;
          }
          // - Look for mailing list
          if (RE_LIST_BOILER.test(lastContentLine)) {
            pushBoilerplate(CT_BOILERPLATE_LIST_INFO);
            continue;
          }
        }
        // The section was not boilerplate, so thus ends the reign of
        // boilerplate.  Bail.
        return chunk;
      }
      // - A line with content!
      if (!sawNonWhitespaceLine) {
        // - Product boilerplate (must be first/only non-whitespace line)
        if (!sawProduct && RE_PRODUCT_BOILER.test(line)) {
          pushBoilerplate(CT_BOILERPLATE_PRODUCT);
          sawProduct = true;
          continue;
        }
        sawNonWhitespaceLine = true;
      }
      lastContentLine = line;
    }

    return chunk;
  }

  /**
   * Interpret the current content region starting at (from the loop)
   * idxRegionStart as a user-authored content-region which may have one or more
   * segments of boilerplate on the end that should be chopped off and marked as
   * such.
   *
   * We are called by the main parsing loop and assume that all the shared state
   * variables that we depend on have been properly maintained and we will,
   * in-turn, mutate them.
   */
  function pushContent(considerForBoilerplate, upToPoint, forcePostLine) {
    if (idxRegionStart === null) {
      if (atePreLines) {
        // decrement atePreLines if we are not the first chunk because then we get
        // an implicit/free newline.
        if (contentRep.length)
          atePreLines--;
        contentRep.push((atePreLines&0xff) << 8 | CT_AUTHORED_CONTENT);
        contentRep.push('');
      }
    }
    else {
      if (upToPoint === undefined)
        upToPoint = idxLineStart;

      var chunk = fullBodyText.substring(idxRegionStart,
                                         idxLastNonWhitespaceLineEnd);
      var atePostLines = forcePostLine ? 1 : 0;
      if (idxLastNonWhitespaceLineEnd + 1 !== upToPoint) {
        // We want to count the number of newlines after the newline that
        // belongs to the last non-meaningful-whitespace line up to the
        // effective point.  If we saw a lead-in, the effective point is
        // preceding the lead-in line's newline.  Otherwise it is the start point
        // of the current line.
        atePostLines += countNewlinesInRegion(fullBodyText,
                                              idxLastNonWhitespaceLineEnd + 1,
                                              upToPoint);
      }
      contentRep.push(((atePreLines&0xff) << 8) | ((atePostLines&0xff) << 16) |
                      CT_AUTHORED_CONTENT);
      var iChunk = contentRep.push(chunk) - 1;

      if (considerForBoilerplate) {
        var newChunk = lookBackwardsForBoilerplate(chunk);
        if (chunk.length !== newChunk.length) {
          // Propagate any atePost lines.
          if (atePostLines) {
            var iLastMeta = contentRep.length - 2;
            // We can blindly write post-lines since boilerplate currently
            // doesn't infer any post-newlines on its own.
            contentRep[iLastMeta] = ((atePostLines&0xff) << 16) |
                                    contentRep[iLastMeta];
            contentRep[iChunk - 1] = ((atePreLines&0xff) << 8) |
                                     CT_AUTHORED_CONTENT;
          }

          // If we completely processed the chunk into boilerplate, then we can
          // remove it after propagating any pre-eat amount.
          if (!newChunk.length) {
            if (atePreLines) {
              var bpAte = (contentRep[iChunk + 1] >> 8)&0xff;
              bpAte += atePreLines;
              contentRep[iChunk + 1] = ((bpAte&0xff) << 8) |
                                       (contentRep[iChunk + 1]&0xffff00ff);
            }
            contentRep.splice(iChunk - 1, 2);
          }
          else {
            contentRep[iChunk] = newChunk;
          }
        }
      }
    }

    atePreLines = 0;
    idxRegionStart = null;
    lastNonWhitespaceLine = null;
    idxLastNonWhitespaceLineEnd = null;
    idxPrevLastNonWhitespaceLineEnd = null;
  }

  /**
   * Interpret the current content region starting at (from the loop)
   * idxRegionStart as a quoted block.
   *
   * We are called by the main parsing loop and assume that all the shared state
   * variables that we depend on have been properly maintained and we will,
   * in-turn, mutate them.
   */
  function pushQuote(newQuoteDepth) {
    var atePostLines = 0;
    // Discard empty lines at the end.  We already skipped adding blank lines, so
    // no need to do the front side.
    while (quoteRunLines.length &&
           !quoteRunLines[quoteRunLines.length - 1]) {
      quoteRunLines.pop();
      atePostLines++;
    }
    contentRep.push(((atePostLines&0xff) << 24) |
                    ((ateQuoteLines&0xff) << 16) |
                    ((inQuoteDepth - 1) << 8) |
                    CT_QUOTED_REPLY);
    contentRep.push(quoteRunLines.join('\n'));
    inQuoteDepth = newQuoteDepth;
    if (inQuoteDepth)
      quoteRunLines = [];
    else
      quoteRunLines = null;

    ateQuoteLines = 0;
    generatedQuoteBlock = true;
  }

  // == On indices and newlines
  // Our line ends always point at the newline for the line; for the last line
  // in the body, there may be no newline, but that doesn't matter since substring
  // is fine with us asking for more than it has.


  // ==== It's the big parsing loop!
  // Each pass of the for-loop tries to look at one line of the message at a
  // time.  (This is sane because text/plain messages are line-centric.)
  //
  // The main goal of the loop is to keep processing lines of a single content
  // type until it finds content of a different type and then "push"/flush what
  // it accumulated.  Then it can start processing that content type until it
  // finds a different content type.
  //
  // This mainly means noticing when we change quoting levels, and if we're
  // entering a deeper level of quoting, separating off any quoting lead-in (ex:
  // "Alive wrote:").

  var idxLineStart, idxLineEnd, bodyLength = fullBodyText.length,
      // null means we are looking for a non-whitespace line.
      idxRegionStart = null,
      lastNonWhitespaceLine = null,
      // The index of the last non-purely whitespace line. (Its \n)
      idxLastNonWhitespaceLineEnd = null,
      // value of idxLastNonWhitespaceLineEnd prior to its current value
      idxPrevLastNonWhitespaceLineEnd = null,
      // Our current quote depth.  0 if we're not in quoting right now.
      inQuoteDepth = 0,
      quoteRunLines = null,
      // XXX very sketchy mechanism that inhibits boilerplate detection if we
      // have ever generated a quoted block.  This seems like it absolutely
      // must be broken and the intent was for it to be some type of short-term
      // memory effect that ended up being a permanent memory effect.
      generatedQuoteBlock = false,
      atePreLines = 0, ateQuoteLines = 0;
  for (idxLineStart = 0,
         idxLineEnd = indexOfDefault(fullBodyText, '\n', idxLineStart,
                                     fullBodyText.length);
       idxLineStart < bodyLength;
       idxLineStart = idxLineEnd + 1,
         idxLineEnd = indexOfDefault(fullBodyText, '\n', idxLineStart,
                                     fullBodyText.length)) {

    line = fullBodyText.substring(idxLineStart, idxLineEnd);

    // - Do not process purely whitespace lines.
    // Because our content runs are treated as regions, ignoring whitespace
    // lines simply means that we don't start or end content blocks on blank
    // lines.  Blank lines in the middle of a content block are maintained
    // because our slice will include them.
    if (!line.length ||
        (line.length === 1
         && line.charCodeAt(0) === CHARCODE_NBSP)) {
      if (inQuoteDepth)
        pushQuote(0);
      if (idxRegionStart === null)
        atePreLines++;
      continue;
    }

    if (line.charCodeAt(0) === CHARCODE_GT) {
      var lineDepth = countQuoteDepthAndNormalize();
      // We are transitioning into a quote state...
      if (!inQuoteDepth) {
        // - Check for a "Blah wrote:" content line
        if (lastNonWhitespaceLine &&
            RE_WROTE_LINE.test(lastNonWhitespaceLine)) {

          // But surprise!  This could be a non-format-flowed message where the
          // true lead-in line started on the previous line and the "wrote" bit
          // that triggered us spills over.

          // Let's start with just the line we've got...
          // (count the newlines up to the lead-in's newline)
          var upToPoint = idxLastNonWhitespaceLineEnd;

          // Now let's see if the preceding line had content.  We can infer this
          // by whether we find a newline between the prevLast and last points.
          // No newline means there's content on that preceding line.  (There
          // could also be more content on the line(s) prior to that that flow
          // into this, but that's not particularly likely unless something is
          // going wrong with our heuristic.  At which point it's good for us
          // to mitigate the damage.)
          if (idxPrevLastNonWhitespaceLineEnd !== null) {
            var considerIndex = idxPrevLastNonWhitespaceLineEnd + 1;
            while (considerIndex < idxLastNonWhitespaceLineEnd) {
              if (fullBodyText[considerIndex++] === '\n') {
                break;
              }
            }

            if (considerIndex === idxLastNonWhitespaceLineEnd) {
              // We didn't encounter a newline.  So now we need to rewind the
              // point to be at the start of the PrevLast line.
              upToPoint =
                fullBodyText.lastIndexOf(
                  '\n', idxPrevLastNonWhitespaceLineEnd - 1);
              lastNonWhitespaceLine =
                fullBodyText.substring(upToPoint + 1,
                                       idxLastNonWhitespaceLineEnd)
                .replace(/\s*\n\s*/, ' ');
              // Note, we really should be scanning further to elide whitespace,
              // but this is largely a hack to mitigate worse-case snippet
              // generating behaviour in the face of bottom-posting where the
              // quoting lines are the first things observed.
              idxPrevLastNonWhitespaceLineEnd = upToPoint - 1;
              if (idxPrevLastNonWhitespaceLineEnd <= idxRegionStart) {
                idxRegionStart = null;
              }
            }
          }

          idxLastNonWhitespaceLineEnd = idxPrevLastNonWhitespaceLineEnd;
          // Nuke the content region if the lead-in was the start of the region;
          // this can be inferred by there being no prior content line.
          if (idxLastNonWhitespaceLineEnd === null)
            idxRegionStart = null;

          var leadin = lastNonWhitespaceLine;
          pushContent(!generatedQuoteBlock, upToPoint);
          var leadinNewlines = 0;
          if (upToPoint + 1 !== idxLineStart)
            leadinNewlines = countNewlinesInRegion(fullBodyText,
                                                   upToPoint + 1, idxLineStart);
          contentRep.push((leadinNewlines << 8) | CT_LEADIN_TO_QUOTE);
          contentRep.push(leadin);
        }
        else {
          pushContent(!generatedQuoteBlock);
        }
        quoteRunLines = [];
        inQuoteDepth = lineDepth;
      }
      // There is a change in quote depth
      else if (lineDepth !== inQuoteDepth) {
        pushQuote(lineDepth);
      }

      // Eat whitespace lines until we get a non-whitespace (quoted) line.
      if (quoteRunLines.length || line.length) {
        quoteRunLines.push(line);
      } else {
        ateQuoteLines++;
      }
    } else { // We're leaving a quoted region!
      if (inQuoteDepth) {
        pushQuote(0);
        idxLastNonWhitespaceLineEnd = null;
      }
      if (idxRegionStart === null)
        idxRegionStart = idxLineStart;

      lastNonWhitespaceLine = line;
      idxPrevLastNonWhitespaceLineEnd = idxLastNonWhitespaceLineEnd;
      idxLastNonWhitespaceLineEnd = idxLineEnd;
    }
  }
  if (inQuoteDepth) {
    pushQuote(0);
  }
  else {
    // There is no implicit newline for the final block, so force it if we had
    // a newline.
    pushContent(true, fullBodyText.length,
                (fullBodyText.charCodeAt(fullBodyText.length - 1) ===
                  CHARCODE_NEWLINE));
  }

  return contentRep;
};

/**
 * The maximum number of characters to shrink the snippet to try and find a
 * whitespace boundary.  If it would take more characters than this, we just
 * do a hard truncation and hope things work out visually.
 */
var MAX_WORD_SHRINK = 8;

var RE_NORMALIZE_WHITESPACE = /\s+/g;

/**
 * Derive the snippet for a message from its processed body representation.  We
 * take the snippet from the first non-empty content block, normalizing
 * all whitespace to a single space character for each instance, then truncate
 * with a minor attempt to align on word boundaries.
 */
exports.generateSnippet = function generateSnippet(rep, desiredLength) {
  for (var i = 0; i < rep.length; i += 2) {
    var etype = rep[i]&0xf, block = rep[i + 1];
    switch (etype) {
      case CT_AUTHORED_CONTENT:
        if (!block.length)
          break;
        // - truncate
        // (no need to truncate if short)
        if (block.length < desiredLength)
          return block.trim().replace(RE_NORMALIZE_WHITESPACE, ' ');
        // try and truncate on a whitespace boundary
        var idxPrevSpace = block.lastIndexOf(' ', desiredLength);
        if (desiredLength - idxPrevSpace < MAX_WORD_SHRINK)
          return block.substring(0, idxPrevSpace).trim()
                      .replace(RE_NORMALIZE_WHITESPACE, ' ');
        return block.substring(0, desiredLength).trim()
                    .replace(RE_NORMALIZE_WHITESPACE, ' ');
    }
  }

  return '';
};

/**
 * What is the deepest quoting level that we should repeat?  Our goal is not to be
 * the arbiter of style, but to provide a way to bound message growth in the face
 * of reply styles where humans do not manually edit quotes.
 *
 * We accept depth levels up to 5 mainly because a quick perusal of mozilla lists
 * shows cases where 5 levels of nesting were used to provide useful context.
 */
var MAX_QUOTE_REPEAT_DEPTH = 5;
// we include a few more than we need for forwarded text regeneration
var replyQuotePrefixStrings = [
  '> ', '>> ', '>>> ', '>>>> ', '>>>>> ', '>>>>>> ', '>>>>>>> ', '>>>>>>>> ',
  '>>>>>>>>> ',
];
var replyQuotePrefixStringsNoSpace = [
  '>', '>>', '>>>', '>>>>', '>>>>>', '>>>>>>', '>>>>>>>', '>>>>>>>>',
  '>>>>>>>>>',
];
var replyQuoteNewlineReplaceStrings = [
  '\n> ', '\n>> ', '\n>>> ', '\n>>>> ', '\n>>>>> ', '\n>>>>>> ', '\n>>>>>>> ',
  '\n>>>>>>>> ',
];
var replyQuoteNewlineReplaceStringsNoSpace = [
  '\n>', '\n>>', '\n>>>', '\n>>>>', '\n>>>>>', '\n>>>>>>', '\n>>>>>>>',
  '\n>>>>>>>>',
];
var replyQuoteBlankLine = [
  '\n', '>\n', '>>\n', '>>>\n', '>>>>\n', '>>>>>\n', '>>>>>>\n', '>>>>>>>\n',
  '>>>>>>>>\n',
];
var replyPrefix = '> ', replyNewlineReplace = '\n> ';

function expandQuotedPrefix(s, depth) {
  if (s.charCodeAt(0) === CHARCODE_NEWLINE)
    return replyQuotePrefixStringsNoSpace[depth];
  return replyQuotePrefixStrings[depth];
}

/**
 * Expand a quoted block so that it has the right number of greater than signs
 * and inserted whitespace where appropriate.  (Blank lines don't want
 * whitespace injected.)
 */
function expandQuoted(s, depth) {
  var ws = replyQuoteNewlineReplaceStrings[depth],
      nows = replyQuoteNewlineReplaceStringsNoSpace[depth];
  return s.replace(RE_NEWLINE, function(m, idx) {
    if (s.charCodeAt(idx+1) === CHARCODE_NEWLINE)
      return nows;
    else
      return ws;
  });
}

/**
 * Generate a text message reply given an already quote-processed body.  We do
 * not simply '>'-prefix everything because
 * 1. We don't store the raw message text because it's faster for us to not
 *    quote-process everything every time we display a message
 * 2. We want to strip some stuff out of the reply.
 * 3. It is not our goal to provide a verbatim quoting.  (However, it is our
 *    goal in the forwarding case.  Which is why forwarding makes use of the
 *    counts of newlines we ate to try and reconstruct whitespace and the
 *    message verbatim.)
 */
exports.generateReplyText = function generateReplyText(rep) {
  var strBits = [];
  // For the insertion of delimiting whitespace newlines between blocks, we want
  // to continue the quoting
  var lastContentDepth = null;
  // Lead-ins do not want delimiting newlines between them and their quoted
  // content.
  var suppressWhitespaceBlankLine = false;
  for (var i = 0; i < rep.length; i += 2) {
    var etype = rep[i]&0xf, block = rep[i + 1];
    switch (etype) {
      default:
      case CT_AUTHORED_CONTENT:
      case CT_SIGNATURE:
      case CT_LEADIN_TO_QUOTE: // (only first-level!)
        // Ignore content blocks with nothing in them.  (These may exist for
        // the benefit of the forwarding logic which wants them for whitespace
        // consistency.)
        if (block.length) {
          if (lastContentDepth !== null) {
            // Blocks lack trailing newlines, so we need to flush the newline if
            // there was a preceding one.
            strBits.push(NEWLINE);
            // Add appropriate delimiting whitespace
            if (!suppressWhitespaceBlankLine) {
              strBits.push(replyQuoteBlankLine[lastContentDepth]);
            }
          }
          strBits.push(expandQuotedPrefix(block, 0));
          strBits.push(expandQuoted(block, 0));
          lastContentDepth = 1;
          suppressWhitespaceBlankLine = (etype === CT_LEADIN_TO_QUOTE);
        }
        break;
      case CT_QUOTED_TYPE:
        var depth = ((rep[i] >> 8)&0xff) + 1;
        // If this quoting level is too deep, just pretend like it does not
        // exist.
        if (depth < MAX_QUOTE_REPEAT_DEPTH) {
          if (lastContentDepth !== null) {
            // Blocks lack trailing newlines, so we need to flush the newline if
            // there was a preceding one.
            strBits.push(NEWLINE);
            // Add appropriate delimiting whitespace
            if (!suppressWhitespaceBlankLine) {
              strBits.push(replyQuoteBlankLine[lastContentDepth]);
            }
          }
          strBits.push(expandQuotedPrefix(block, depth));
          strBits.push(expandQuoted(block, depth));
          lastContentDepth = depth;
          // Don't suppress a whitespace blank line unless we seem to include
          // a quote lead-in at the end of our block.  See the regex's content
          // block for more details on this.
          suppressWhitespaceBlankLine =
            RE_REPLY_LAST_LINE_IN_BLOCK_CONTAINS_WROTE.test(block);
        }
        break;
      // -- eat boilerplate!
      // No one needs to read boilerplate in a reply; the point is to
      // provide context, not the whole message.  (Forward the message if
      // you want the whole thing!)
      case CT_BOILERPLATE_DISCLAIMER:
      case CT_BOILERPLATE_LIST_INFO:
      case CT_BOILERPLATE_PRODUCT:
      case CT_BOILERPLATE_ADS:
        break;
    }
  }

  return strBits.join('');
};

/**
 * Regenerate the text of a message for forwarding.  'Original Message' is not
 * prepended and information about the message's header is not prepended.  That
 * is done in `generateForwardMessage`.
 *
 * We attempt to generate a message as close to the original message as
 * possible, but it doesn't have to be 100%.
 */
exports.generateForwardBodyText = function generateForwardBodyText(rep) {
  var strBits = [], nl;

  for (var i = 0; i < rep.length; i += 2) {
    if (i) {
      strBits.push(NEWLINE);
    }

    var etype = rep[i]&0xf, block = rep[i + 1];
    switch (etype) {
      // - injected with restored whitespace
      default:
      case CT_AUTHORED_CONTENT:
        // pre-newlines
        for (nl = (rep[i] >> 8)&0xff; nl; nl--) {
          strBits.push(NEWLINE);
        }
        strBits.push(block);
        // post new-lines
        for (nl = (rep[i] >> 16)&0xff; nl; nl--) {
          strBits.push(NEWLINE);
        }
        break;
      case CT_LEADIN_TO_QUOTE:
        strBits.push(block);
        for (nl = (rep[i] >> 8)&0xff; nl; nl--) {
          strBits.push(NEWLINE);
        }
        break;
      // - injected verbatim,
      case CT_SIGNATURE:
      case CT_BOILERPLATE_DISCLAIMER:
      case CT_BOILERPLATE_LIST_INFO:
      case CT_BOILERPLATE_PRODUCT:
      case CT_BOILERPLATE_ADS:
        for (nl = (rep[i] >> 8)&0xff; nl; nl--) {
          strBits.push(NEWLINE);
        }
        strBits.push(block);
        for (nl = (rep[i] >> 16)&0xff; nl; nl--) {
          strBits.push(NEWLINE);
        }
        break;
      // - quote character reconstruction
      // this is not guaranteed to round-trip since we assume the non-whitespace
      // variant...
      case CT_QUOTED_TYPE:
        var depth = Math.min((rep[i] >> 8)&0xff, 8);
        for (nl = (rep[i] >> 16)&0xff; nl; nl--) {
          strBits.push(replyQuotePrefixStringsNoSpace[depth]);
          strBits.push(NEWLINE);
        }
        strBits.push(expandQuotedPrefix(block, depth));
        strBits.push(expandQuoted(block, depth));
        for (nl = (rep[i] >> 24)&0xff; nl; nl--) {
          strBits.push(NEWLINE);
          strBits.push(replyQuotePrefixStringsNoSpace[depth]);
        }
        break;
    }
  }

  return strBits.join('');
};
}); // end define
