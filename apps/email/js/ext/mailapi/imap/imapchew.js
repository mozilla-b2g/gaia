/**
 *
 **/

define('mailapi/imap/imapchew',
  [
    '../quotechew',
    '../htmlchew',
    'exports'
  ],
  function(
    $quotechew,
    $htmlchew,
    exports
  ) {

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
 *    possibly on both even.  For imap.js, "name" shows up in the "params"
 *    dict, and filename shows up in the "disposition" dict.
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
 *   @key[msg ImapJsMsg]
 *   @key[bodyParts @listof[ImapJsPart]]
 *   @key[attachments @listof[AttachmentInfo]]
 *   @key[header HeaderInfo]
 *   @key[bodyInfo BodyInfo]
 * ]]
 * @return[ChewRep]
 */
exports.chewHeaderAndBodyStructure = function chewStructure(msg) {
  // imap.js builds a bodystructure tree using lists.  All nodes get wrapped
  //  in a list so they are element zero.  Children (which get wrapped in
  //  their own list) follow.
  //
  // Examples:
  //   text/plain =>
  //     [{text/plain}]
  //   multipart/alternative with plaintext and HTML =>
  //     [{alternative} [{text/plain}] [{text/html}]]
  //   multipart/mixed text w/attachment =>
  //     [{mixed} [{text/plain}] [{application/pdf}]]
  var attachments = [], bodyParts = [], unnamedPartCounter = 0,
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

  function chewLeaf(branch) {
    var partInfo = branch[0], i,
        filename, disposition;

    // - Detect named parts; they could be attachments
    if (partInfo.params && partInfo.params.name)
      filename = partInfo.params.name;
    else if (partInfo.disposition && partInfo.disposition.params &&
             partInfo.disposition.params.filename)
      filename = partInfo.disposition.params.filename;
    else
      filename = null;

    // - Start from explicit disposition, make attachment if non-displayable
    if (partInfo.disposition)
      disposition = partInfo.disposition.type.toLowerCase();
    // UNTUNED-HEURISTIC (need test cases)
    // Parts with content ID's explicitly want to be referenced by the message
    // and so are inline.  (Although we might do well to check if they actually
    // are referenced.  This heuristic could be very wrong.)
    else if (partInfo.id)
      disposition = 'inline';
    else if (filename || partInfo.type !== 'text')
      disposition = 'attachment';
    else
      disposition = 'inline';

    // Some clients want us to display things inline that we simply can't
    // display (historically and currently, PDF) or that our usage profile
    // does not want to automatically download (in the future, PDF, because
    // they can get big.)
    if (partInfo.type !== 'text' &&
        partInfo.type !== 'image')
      disposition = 'attachment';

    // - But we don't care if they are signatures...
    if ((partInfo.type === 'application') &&
        (partInfo.subtype === 'pgp-signature' ||
         partInfo.subtype === 'pkcs7-signature'))
      return true;

    function stripArrows(s) {
      if (s[0] === '<')
        return s.slice(1, -1);
      return s;
    }

    function makePart(partInfo, filename) {
      return {
        name: filename || 'unnamed-' + (++unnamedPartCounter),
        contentId: partInfo.id ? stripArrows(partInfo.id) : null,
        type: (partInfo.type + '/' + partInfo.subtype).toLowerCase(),
        part: partInfo.partID,
        encoding: partInfo.encoding && partInfo.encoding.toLowerCase(),
        sizeEstimate: estimatePartSizeInBytes(partInfo),
        file: null,
        /*
        charset: (partInfo.params && partInfo.params.charset &&
                  partInfo.params.charset.toLowerCase()) || undefined,
        textFormat: (partInfo.params && partInfo.params.format &&
                     partInfo.params.format.toLowerCase()) || undefined
         */
      };
    }

    if (disposition === 'attachment') {
      attachments.push(makePart(partInfo, filename));
      return true;
    }

    // - We must be an inline part or structure
    switch (partInfo.type) {
      // - related image
      case 'image':
        relatedParts.push(makePart(partInfo, filename));
        return true;
        break;
      // - content
      case 'text':
        if (partInfo.subtype === 'plain' ||
            partInfo.subtype === 'html') {
          bodyParts.push(partInfo);
          return true;
        }
        break;
    }
    return false;
  }

  function chewMultipart(branch) {
    var partInfo = branch[0], i;

    // - We must be an inline part or structure
    // I have no idea why the multipart is the 'type' rather than the subtype?
    switch (partInfo.subtype) {
      // - for alternative, scan from the back to find the first part we like
      // XXX I believe in Thunderbird we observed some ridiculous misuse of
      // alternative that we'll probably want to handle.
      case 'alternative':
        for (i = branch.length - 1; i >= 1; i--) {
          var subPartInfo = branch[i][0];

          switch(subPartInfo.type) {
            case 'text':
              // fall out for subtype checking
              break;
            case 'multipart':
              // this is probably HTML with attachments, let's give it a try
              if (chewMultipart(branch[i]))
                return true;
              break;
            default:
              // no good, keep going
              continue;
          }

          switch (subPartInfo.subtype) {
            case 'html':
            case 'plain':
              // (returns true if successfully handled)
              if (chewLeaf(branch[i]))
                return true;
          }
        }
        // (If we are here, we failed to find a valid choice.)
        return false;
      // - multipart that we should recurse into
      case 'mixed':
      case 'signed':
      case 'related':
        for (i = 1; i < branch.length; i++) {
          if (branch[i].length > 1)
            chewMultipart(branch[i]);
          else
            chewLeaf(branch[i]);
        }
        return true;

      default:
        console.warn('Ignoring multipart type:', partInfo.subtype);
        return false;
    }
  }

  if (msg.structure.length > 1)
    chewMultipart(msg.structure);
  else
    chewLeaf(msg.structure);

  return {
    msg: msg,
    bodyParts: bodyParts,
    attachments: attachments,
    relatedParts: relatedParts,
    header: null,
    bodyInfo: null,
  };
};

const DESIRED_SNIPPET_LENGTH = 100;

/**
 * Call once the body parts requested by `chewHeaderAndBodyStructure` have been
 * fetched in order to finish processing of the message to produce the header
 * and body data-structures for the message.
 *
 * This method is currently synchronous because quote-chewing and HTML
 * sanitization can be performed synchronously.  This may need to become
 * asynchronous if we still end up with this happening on the same thread as the
 * UI so we can time slice of something like that.
 *
 * @args[
 *   @param[rep ChewRep]
 *   @param[bodyPartContents @listof[String]]{
 *     The fetched body parts matching the list of requested parts in
 *     `rep.bodyParts`.
 *   }
 * ]
 * @return[success Boolean]{
 *   True if we were able to process the message and have updated `rep.header`
 *   and `rep.bodyInfo` with populated objects.
 * }
 */
exports.chewBodyParts = function chewBodyParts(rep, bodyPartContents,
                                               folderId, newMsgId) {
  var snippet = null, bodyReps = [];

  // Mailing lists can result in a text/html body part followed by a text/plain
  // body part.  Can't rule out multiple HTML parts at this point either, so we
  // just process everything independently and have the UI do likewise.
  for (var i = 0; i < rep.bodyParts.length; i++) {
    var partInfo = rep.bodyParts[i],
        contents = bodyPartContents[i];

    // HTML parts currently can be synchronously sanitized...
    switch (partInfo.subtype) {
      case 'plain':
        var bodyRep = $quotechew.quoteProcessTextBody(contents);
        if (!snippet)
          snippet = $quotechew.generateSnippet(bodyRep,
                                               DESIRED_SNIPPET_LENGTH);
        bodyReps.push('plain', bodyRep);
        break;

      case 'html':
        var htmlNode = $htmlchew.sanitizeAndNormalizeHtml(contents);
        if (!snippet)
          snippet = $htmlchew.generateSnippet(htmlNode, DESIRED_SNIPPET_LENGTH);
        bodyReps.push('html', htmlNode.innerHTML);
        break;
    }
  }


  rep.header = {
    // the FolderStorage issued id for this message (which differs from the
    // IMAP-server-issued UID so we can do speculative offline operations like
    // moves).
    id: newMsgId,
    srvid: rep.msg.id,
    // The sufficiently unique id is a concatenation of the UID onto the
    // folder id.
    suid: folderId + '/' + newMsgId,
    // The message-id header value; as GUID as get for now; on gmail we can
    // use their unique value, or if we could convince dovecot to tell us, etc.
    guid: rep.msg.msg.meta.messageId,
    // mailparser models from as an array; we do not.
    author: rep.msg.msg.from[0] || null,
    date: rep.msg.date,
    flags: rep.msg.flags,
    hasAttachments: rep.attachments.length > 0,
    subject: rep.msg.msg.subject || null,
    snippet: snippet,
  };


  rep.bodyInfo = {
    date: rep.msg.date,
    size: 0,
    to: ('to' in rep.msg.msg) ? rep.msg.msg.to : null,
    cc: ('cc' in rep.msg.msg) ? rep.msg.msg.cc : null,
    bcc: ('bcc' in rep.msg.msg) ? rep.msg.msg.bcc : null,
    replyTo: ('reply-to' in rep.msg.msg.parsedHeaders) ?
               rep.msg.msg.parsedHeaders['reply-to'] : null,
    attachments: rep.attachments,
    relatedParts: rep.relatedParts,
    references: rep.msg.msg.meta.references,
    bodyReps: bodyReps,
  };

  return true;
};

}); // end define
