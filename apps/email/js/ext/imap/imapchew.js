/**
 *
 **/

define(
  [
    'mimefuncs',
    '../db/mail_rep',
    '../mailchew',
    'mimeparser',
    'exports'
  ],
  function(
    mimefuncs,
    mailRep,
    $mailchew,
    MimeParser,
    exports
  ) {

function parseRfc2231CharsetEncoding(s) {
  // charset'lang'url-encoded-ish
  var match = /^([^']*)'([^']*)'(.+)$/.exec(s);
  if (match) {
    // we can convert the dumb encoding into quoted printable.
    return mimefuncs.mimeWordsDecode(
      '=?' + (match[1] || 'us-ascii') + '?Q?' +
        match[3].replace(/%/g, '=') + '?=');
  }
  return null;
}


// Given an array or string, strip any surrounding angle brackets.
function stripArrows(s) {
  if (Array.isArray(s)) {
    return s.map(stripArrows);
  } else if (s && s[0] === '<') {
    return s.slice(1, -1);
  } else {
    return s;
  }
}

function firstHeader(msg, headerName) {
  return msg.headers[headerName] && msg.headers[headerName][0] || null;
}

/**
 * Process the headers and bodystructure of a message to build preliminary state
 * and determine what body parts to fetch.  The list of body parts will be used
 * to issue another fetch request, and those results will be passed to
 * `chewBodyParts`.
 *
 * For now, our stop-gap heuristics for content bodies are:
 * - pick text/plain in multipart/alternative
 * - recurse into other multipart types looking for an alterntive that has
 *    text.
 * - do not recurse into message/rfc822
 * - ignore/fail-out messages that lack a text part, skipping to the next
 *    task.  (This should not happen once we support HTML, as there are cases
 *    where there are attachments without any body part.)
 * - Append text body parts together; there is no benefit in separating a
 *    mailing list footer from its content.
 *
 * For attachments, our heuristics are:
 * - only like them if they have filenames.  We will find this as "name" on
 *    the "content-type" or "filename" on the "content-disposition", quite
 *    possibly on both even.
 * - ignore crypto signatures, even though they are named.  S/MIME gives us
 *    "smime.p7s" as an application/pkcs7-signature under a multipart/signed
 *    (that the server tells us is "signed").  PGP in MIME mode gives us
 *    application/pgp-signature "signature.asc" under a multipart/signed.
 *
 * The next step in the plan is to get an HTML sanitizer exposed so we can
 *  support text/html.  That will also imply grabbing multipart/related
 *  attachments.
 *
 * @typedef[ChewRep @dict[
 *   @key[bodyReps @listof[ImapJsPart]]
 *   @key[attachments @listof[AttachmentInfo]]
 *   @key[relatedParts @listof[RelatedPartInfo]]
 * ]]
 * @return[ChewRep]
 */
function chewStructure(msg) {
  var attachments = [], bodyReps = [], unnamedPartCounter = 0,
      relatedParts = [];

  /**
   * Sizes are the size of the encoded string, not the decoded value.
   */
  function estimatePartSizeInBytes(partInfo) {
    var encoding = partInfo.encoding.toLowerCase();
    // Base64 encodes 3 bytes in 4 characters with padding that always
    // causes the encoding to take 4 characters.  The max encoded line length
    // (ignoring CRLF) is 76 bytes, with 72 bytes also fairly common.
    // As such, a 78=19*4+2 character line encodes 57=19*3 payload bytes and
    // we can use that as a rough estimate.
    if (encoding === 'base64') {
      return Math.floor(partInfo.size * 57 / 78);
    }
    // Quoted printable is hard to predict since only certain things need
    // to be encoded.  It could be perfectly efficient if the source text
    // has a bunch of newlines built-in.
    else if (encoding === 'quoted-printable') {
      // Let's just provide an upper-bound of perfectly efficient.
      return partInfo.size;
    }
    // No clue; upper bound.
    return partInfo.size;
  }

  function chewNode(partInfo, parentMultipartSubtype) {
    var i, filename, disposition;
    var type = partInfo.type.split('/')[0];
    var subtype = partInfo.type.split('/')[1];

    if (type === 'multipart') {
      switch (subtype) {
        // For alternative, scan from the back to find the first part we like.
        // XXX I believe in Thunderbird we observed some ridiculous misuse of
        // alternative that we'll probably want to handle.
      case 'alternative':
        for (i = partInfo.childNodes.length - 1; i >= 0; i--) {
          var subPartInfo = partInfo.childNodes[i];
          var childType = subPartInfo.type.split('/')[0];
          var childSubtype = subPartInfo.type.split('/')[1];

          switch(childType) {
          case 'text':
            // fall out for subtype checking
            break;
          case 'multipart':
            // this is probably HTML with attachments, let's give it a try
            if (chewNode(subPartInfo)) {
              return true;
            }
            break;
          default:
            // no good, keep going
            continue;
          }

          switch (childSubtype) {
          case 'html':
          case 'plain':
            // (returns true if successfully handled)
            if (chewNode(subPartInfo), subtype) {
              return true;
            }
          }
        }
        // (If we are here, we failed to find a valid choice.)
        return false;
        // multipart that we should recurse into
      case 'mixed':
      case 'signed':
      case 'related':
        for (i = 0; i < partInfo.childNodes.length; i++) {
          chewNode(partInfo.childNodes[i], subtype);
        }
        return true;

      default:
        console.warn('Ignoring multipart type:', subtype);
        return false;
      }
    }
    // Otherwise, this is a leaf node:
    else {
      // Detect named parts; they could be attachments.
      // filename via content-type 'name' parameter
      if (partInfo.parameters && partInfo.parameters.name) {
        filename = mimefuncs.mimeWordsDecode(partInfo.parameters.name);
      }
      // filename via content-type 'name' with charset/lang info
      else if (partInfo.parameters && partInfo.parameters['name*']) {
        filename = parseRfc2231CharsetEncoding(partInfo.parameters['name*']);
      }
      // rfc 2231 stuff:
      // filename via content-disposition filename without charset/lang info
      else if (partInfo.dispositionParameters &&
               partInfo.dispositionParameters.filename) {
        filename = mimefuncs.mimeWordsDecode(
          partInfo.dispositionParameters.filename);
      }
      // filename via content-disposition filename with charset/lang info
      else if (partInfo.dispositionParameters &&
               partInfo.dispositionParameters['filename*']) {
        filename = parseRfc2231CharsetEncoding(
          partInfo.dispositionParameters['filename*']);
      }
      else {
        filename = null;
      }

      // Determining disposition:

      // First, check whether an explict one exists
      if (partInfo.disposition) {
        // If it exists, keep it the same, except in the case of inline
        // disposition without a content id.
        if (partInfo.disposition.toLowerCase() == 'inline') {
          // Displaying text-parts inline is not a problem for us, but we need a
          // content id for other embedded content.  (Currently only images are
          // supported, but that is enforced in a subsequent check.)
          if (type === 'text' || partInfo.id) {
            disposition = 'inline';
          } else {
            disposition = 'attachment';
          }
        }
        else if (partInfo.disposition.toLowerCase() == 'attachment') {
          disposition = 'attachment';
        }
        // This case should never trigger, but it's here for safety's sake
        else {
          disposition = 'inline';
        }
        // Inline image attachments that belong to a multipart/related
        // may lack a disposition but have a content-id.
        // XXX Ensure 100% correctness in the future by fixing up
        // mis-guesses during sanitization as part of
        // https://bugzil.la/1024685
      } else if (parentMultipartSubtype === 'related' && partInfo.id &&
                 type === 'image') {
        disposition = "inline";
      } else if (filename || type !== 'text') {
        disposition = 'attachment';
      } else {
        disposition = 'inline';
      }

      // Some clients want us to display things inline that we simply can't
      // display (historically and currently, PDF) or that our usage profile
      // does not want to automatically download (in the future, PDF, because
      // they can get big.)
      if (type !== 'text' && type !== 'image') {
        disposition = 'attachment';
      }

      // - But we don't care if they are signatures...
      if ((type === 'application') &&
          (subtype === 'pgp-signature' || subtype === 'pkcs7-signature')) {
        return true;
      }

     var makePart = function(partInfo, filename) {
        return mailRep.makeAttachmentPart({
          name: filename || 'unnamed-' + (++unnamedPartCounter),
          contentId: partInfo.id ? stripArrows(partInfo.id) : null,
          type: partInfo.type.toLowerCase(),
          part: partInfo.part,
          encoding: partInfo.encoding && partInfo.encoding.toLowerCase(),
          sizeEstimate: estimatePartSizeInBytes(partInfo),
          file: null
        });
      }

      var makeTextPart = function(partInfo) {
        return mailRep.makeBodyPart({
          type: subtype,
          part: partInfo.part || '1',
          sizeEstimate: partInfo.size,
          amountDownloaded: 0,
          // its important to know that sizeEstimate and amountDownloaded
          // do _not_ determine if the bodyRep is fully downloaded; the
          // estimated amount is not reliable
          // Zero-byte bodies are assumed to be accurate and we treat the file
          // as already downloaded.
          isDownloaded: partInfo.size === 0,
          // full internal IMAP representation
          // it would also be entirely appropriate to move
          // the information on the bodyRep directly?
          _partInfo: partInfo.size ? {
            partID: partInfo.part,
            type: type,
            subtype: subtype,
            params: valuesOnly(partInfo.parameters),
            encoding: partInfo.encoding && partInfo.encoding.toLowerCase()
          } : null,
          content: ''
        });
      }

      if (disposition === 'attachment') {
        attachments.push(makePart(partInfo, filename));
        return true;
      }

      // - We must be an inline part or structure
      switch (type) {
        // - related image
      case 'image':
        relatedParts.push(makePart(partInfo, filename));
        return true;
        break;
        // - content
      case 'text':
        if (subtype === 'plain' || subtype === 'html') {
          bodyReps.push(makeTextPart(partInfo));
          return true;
        }
        break;
      }
      return false;
    }
  }

  chewNode(msg.bodystructure);

  return {
    bodyReps: bodyReps,
    attachments: attachments,
    relatedParts: relatedParts
  };
};

/**
 * Transform a browserbox representation of an item that has a value
 * (i.e. { value: foo }) into a pure value, recursively.
 *
 *   [{ value: 1 } ] -> [1]
 *   { value: 1 } -> 1
 *   undefined -> null
 */
function valuesOnly(item) {
  if (Array.isArray(item)) {
    return item.map(valuesOnly);
  } else if (item && typeof item === 'object') {
    if ('value' in item) {
      return item.value;
    } else {
      var result = {};
      for (var key in item) {
        result[key] = valuesOnly(item[key]);
      }
      return result;
    }
  } else if (item && typeof item === 'object') {
    return item;
  } else if (item !== undefined) {
    return item;
  } else {
    return null;
  }
}

exports.chewHeaderAndBodyStructure = function(msg, folderId, newMsgId) {
  // begin by splitting up the raw imap message
  var parts = chewStructure(msg);

  msg.date = msg.internaldate && parseImapDateTime(msg.internaldate);
  msg.headers = {};

  for (var key in msg) {
    // We test the key using a regex here because the key name isn't
    // normalized to a form we can rely on. The browserbox docs in
    // particular indicate that the full key name may be dependent on
    // the ordering of the fields as returned by the mail server (i.e.
    // the key name includes every header requested). One thing we can
    // rely on instead: grabbing the right key based upon just this
    // regex.
    if (/header\.fields/.test(key)) {
      var headerParser = new MimeParser();
      headerParser.write(msg[key] + '\r\n');
      headerParser.end();
      msg.headers = headerParser.node.headers;
      break;
    }
  }

  var fromArray = valuesOnly(firstHeader(msg, 'from'));
  var references = valuesOnly(firstHeader(msg, 'references'));

  return {
    header: mailRep.makeHeaderInfo({
      // the FolderStorage issued id for this message (which differs from the
      // IMAP-server-issued UID so we can do speculative offline operations like
      // moves).
      id: newMsgId,
      srvid: msg.uid,
      // The sufficiently unique id is a concatenation of the UID onto the
      // folder id.
      suid: folderId + '/' + newMsgId,
      // The message-id header value; as GUID as get for now; on gmail we can
      // use their unique value, or if we could convince dovecot to tell us.
      guid: stripArrows(valuesOnly(firstHeader(msg, 'message-id'))),
      // mimeparser models from as an array; we do not.
      author: fromArray && fromArray[0] ||
        // we require a sender e-mail; let's choose an illegal default as
        // a stopgap so we don't die.
        { address: 'missing-address@example.com' },
      to: valuesOnly(firstHeader(msg, 'to')),
      cc: valuesOnly(firstHeader(msg, 'cc')),
      bcc: valuesOnly(firstHeader(msg, 'bcc')),
      replyTo: valuesOnly(firstHeader(msg, 'reply-to')),
      date: msg.date,
      flags: msg.flags || [],
      hasAttachments: parts.attachments.length > 0,
      subject: valuesOnly(firstHeader(msg, 'subject')),

      // we lazily fetch the snippet later on
      snippet: null
    }),
    bodyInfo: mailRep.makeBodyInfo({
      date: msg.date,
      size: 0,
      attachments: parts.attachments,
      relatedParts: parts.relatedParts,
      references: references ? stripArrows(references.split(/\s+/)) : null,
      bodyReps: parts.bodyReps
    })
  };
};

/**
 * Fill a given body rep with the content from fetching
 * part or the entire body of the message...
 *
 *    var body = ...;
 *    var header = ...;
 *    var content = (some fetched content)..
 *
 *    $imapchew.updateMessageWithFetch(
 *      header,
 *      bodyInfo,
 *      {
 *        bodyRepIndex: 0,
 *        text: '',
 *        buffer: Uint8Array|Null,
 *        bytesFetched: n,
 *        bytesRequested: n
 *      }
 *    );
 *
 *    // what just happend?
 *    // 1. the body.bodyReps[n].content is now the value of content.
 *    //
 *    // 2. we update .amountDownloaded with the second argument
 *    //    (number of bytes downloaded).
 *    //
 *    // 3. if snippet has not bee set on the header we create the snippet
 *    //    and set its value.
 *
 */
exports.updateMessageWithFetch = function(header, body, req, res) {
  var bodyRep = body.bodyReps[req.bodyRepIndex];

  // check if the request was unbounded or we got back less bytes then we
  // requested in which case the download of this bodyRep is complete.
  if (!req.bytes || res.bytesFetched < req.bytes[1]) {
    bodyRep.isDownloaded = true;

    // clear private space for maintaining parser state.
    bodyRep._partInfo = null;
  }

  if (!bodyRep.isDownloaded && res.buffer) {
    bodyRep._partInfo.pendingBuffer = res.buffer;
  }

  bodyRep.amountDownloaded += res.bytesFetched;

  var data = $mailchew.processMessageContent(
    res.text, bodyRep.type, bodyRep.isDownloaded, req.createSnippet);

  if (req.createSnippet) {
    header.snippet = data.snippet;
  }
  if (bodyRep.isDownloaded)
    bodyRep.content = data.content;
};

/**
 * Selects a desirable snippet body rep if the given header has no snippet.
 */
exports.selectSnippetBodyRep = function(header, body) {
  if (header.snippet)
    return -1;

  var bodyReps = body.bodyReps;
  var len = bodyReps.length;

  for (var i = 0; i < len; i++) {
    if (exports.canBodyRepFillSnippet(bodyReps[i])) {
      return i;
    }
  }

  return -1;
};

/**
 * Determines if a given body rep can be converted into a snippet. Useful for
 * determining which body rep to use when downloading partial bodies.
 *
 *
 *    var bodyInfo;
 *    $imapchew.canBodyRepFillSnippet(bodyInfo.bodyReps[0]) // true/false
 *
 */
exports.canBodyRepFillSnippet = function(bodyRep) {
  return (
    bodyRep &&
    bodyRep.type === 'plain' ||
    bodyRep.type === 'html'
  );
};


/**
 * Calculates and returns the correct estimate for the number of
 * bytes to download before we can display the body. For IMAP, that
 * includes the bodyReps and related parts. (POP3 is different.)
 */
exports.calculateBytesToDownloadForImapBodyDisplay = function(body) {
  var bytesLeft = 0;
  body.bodyReps.forEach(function(rep) {
    if (!rep.isDownloaded) {
      bytesLeft += rep.sizeEstimate - rep.amountDownloaded;
    }
  });
  body.relatedParts.forEach(function(part) {
    if (!part.file) {
      bytesLeft += part.sizeEstimate;
    }
  });
  return bytesLeft;
}

// parseImapDateTime and formatImapDateTime functions from node-imap;
// MIT licensed, (c) Brian White.

// ( ?\d|\d{2}) = day number; technically it's either "SP DIGIT" or "2DIGIT"
// but there's no harm in us accepting a single digit without whitespace;
// it's conceivable the caller might have trimmed whitespace.
//
// The timezone can, as unfortunately demonstrated by net-c.com/netc.fr, be
// omitted.  So we allow it to be optional and assume its value was zero if
// omitted.
var reDateTime =
      /^( ?\d|\d{2})-(.{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2})(?: ([+-]\d{4}))?$/;
var HOUR_MILLIS = 60 * 60 * 1000;
var MINUTE_MILLIS = 60 * 1000;
var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

/**
* Parses IMAP "date-time" instances into UTC timestamps whose quotes have
* already been stripped.
*
* http://tools.ietf.org/html/rfc3501#page-84
*
* date-day = 1*2DIGIT
* ; Day of month
* date-day-fixed = (SP DIGIT) / 2DIGIT
* ; Fixed-format version of date-day
* date-month = "Jan" / "Feb" / "Mar" / "Apr" / "May" / "Jun" /
* "Jul" / "Aug" / "Sep" / "Oct" / "Nov" / "Dec"
* date-year = 4DIGIT
* time = 2DIGIT ":" 2DIGIT ":" 2DIGIT
* ; Hours minutes seconds
* zone = ("+" / "-") 4DIGIT
* date-time = DQUOTE date-day-fixed "-" date-month "-" date-year
* SP time SP zone DQUOTE
*/
var parseImapDateTime = exports.parseImapDateTime = function(dstr) {
  var match = reDateTime.exec(dstr);
  if (!match)
    throw new Error('Not a good IMAP date-time: ' + dstr);
  var day = parseInt(match[1], 10),
      zeroMonth = MONTHS.indexOf(match[2]),
      year = parseInt(match[3], 10),
      hours = parseInt(match[4], 10),
      minutes = parseInt(match[5], 10),
      seconds = parseInt(match[6], 10),
      // figure the timestamp before the zone stuff. We don't
      timestamp = Date.UTC(year, zeroMonth, day, hours, minutes, seconds),
      // to reduce string garbage creation, we use one string. (we have to
      // play math games no matter what, anyways.)
      zoneDelta = match[7] ? parseInt(match[7], 10) : 0,
      zoneHourDelta = Math.floor(zoneDelta / 100),
      // (the negative sign sticks around through the mod operation)
      zoneMinuteDelta = zoneDelta % 100;

  // ex: GMT-0700 means 7 hours behind, so we need to add 7 hours, aka
  // subtract negative 7 hours.
  timestamp -= zoneHourDelta * HOUR_MILLIS + zoneMinuteDelta * MINUTE_MILLIS;

  return timestamp;
};

exports.formatImapDateTime = function(date) {
   var s;
   s = ((date.getDate() < 10) ? ' ' : '') + date.getDate() + '-' +
     MONTHS[date.getMonth()] + '-' +
     date.getFullYear() + ' ' +
     ('0'+date.getHours()).slice(-2) + ':' +
     ('0'+date.getMinutes()).slice(-2) + ':' +
     ('0'+date.getSeconds()).slice(-2) +
     ((date.getTimezoneOffset() > 0) ? ' -' : ' +' ) +
     ('0'+(Math.abs(date.getTimezoneOffset()) / 60)).slice(-2) +
     ('0'+(Math.abs(date.getTimezoneOffset()) % 60)).slice(-2);
   return s;
};


}); // end define
