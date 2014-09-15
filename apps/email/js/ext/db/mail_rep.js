/**
 * Centralize the creation of our header and body object representations.
 *
 * We provide constructor functions which take input objects that should
 * basically look like the output object, but the function enforces
 * consistency and provides the ability to assert about the state of the
 * representation at the call-site.  We discussed making sure to check
 * representations when we are inserting records into our database, but we
 * might also want to opt to do it at creation time too so we can explode
 * slightly closer to the source of the problem.
 *
 * This module will also provide representation checking functions to make
 * sure all the data structures are well-formed/have no obvious problems.
 *
 * @module mailapi/db/mail_rep
 **/

define(function() {

/*
 * @typedef[HeaderInfo @dict[
 *   @key[id]{
 *     An id allocated by the back-end that names the message within the folder.
 *     We use this instead of the server-issued UID because if we used the UID
 *     for this purpose then we would still need to issue our own temporary
 *     speculative id's for offline operations and would need to implement
 *     renaming and it all gets complicated.
 *   }
 *   @key[srvid]{
 *     The server-issued UID for the folder, or 0 if the folder is an offline
 *     header.
 *   }
 *   @key[suid]{
 *     Basically "account id/folder id/message id", although technically the
 *     folder id includes the account id.
 *   }
 *   @key[guid String]{
 *     This is the message-id header value of the message.
 *   }
 *   @key[author NameAddressPair]
 *   @key[to #:optional @listof[NameAddressPair]]
 *   @key[cc #:optional @listof[NameAddressPair]]
 *   @key[bcc #:optional @listof[NameAddressPair]]
 *   @key[replyTo #:optional String]{
 *     The contents of the reply-to header.
 *   }
 *   @key[date DateMS]
 *   @key[flags @listof[String]]
 *   @key[hasAttachments Boolean]
 *   @key[subject @oneof [String null]]
 *   @key[snippet @oneof[
 *     @case[null]{
 *       We haven't tried to generate a snippet yet.
 *     }
 *     @case['']{
 *       We tried to generate a snippet, but got nothing useful.  Note that we
 *       may try and generate a snippet from a partial body fetch; this does not
 *       indicate that we should avoid computing a better snippet.  Whenever the
 *       snippet is falsey and we have retrieved more body data, we should
 *       always try and derive a snippet.
 *     }
 *     @case[String]{
 *       A non-empty string means we managed to produce some snippet data.  It
 *        is still appropriate to regenerate the snippet if more body data is
 *        fetched since our snippet may be a fallback where we chose quoted text
 *        instead of authored text, etc.
 *     }
 *   ]]
 * ]]
 */
function makeHeaderInfo(raw) {
  // All messages absolutely need the following; the caller needs to make up
  // values if they're missing.
  if (!raw.author)
    throw new Error('No author?!');
  if (!raw.date)
    throw new Error('No date?!');
  // We also want/require a valid id, but we check that at persistence time
  // since POP3 assigns the id/suid slightly later on.  We check the suid at
  // that point too.  (Checked in FolderStorage.addMessageHeader.)

  return {
    id: raw.id,
    srvid: raw.srvid || null,
    suid: raw.suid || null,
    guid: raw.guid || null,
    author: raw.author,
    to: raw.to || null,
    cc: raw.cc || null,
    bcc: raw.bcc || null,
    replyTo: raw.replyTo || null,
    date: raw.date,
    flags: raw.flags || [],
    hasAttachments: raw.hasAttachments || false,
    // These can be empty strings which are falsey, so no ||
    subject: (raw.subject != null) ? raw.subject : null,
    snippet: (raw.snippet != null) ? raw.snippet : null
  };
}

/*
 * @typedef[BodyInfo @dict[
 *   @key[date DateMS]{
 *     Redundantly stored date info for block splitting purposes.  We pretty
 *     much need this no matter what because our ordering is on the tuples of
 *     dates and UIDs, so we could have trouble efficiently locating our header
 *     from the body without this.
 *   }
 *   @key[size Number]
 *   @key[to @listof[NameAddressPair]]
 *   @key[cc @listof[NameAddressPair]]
 *   @key[bcc @listof[NameAddressPair]]
 *   @key[replyTo NameAddressPair]
 *   @key[attaching #:optional AttachmentInfo]{
 *     Because of memory limitations, we need to encode and attach attachments
 *     in small pieces.  An attachment in the process of being attached is
 *     stored here until fully processed.  Its 'file' field contains a list of
 *     Blobs.
 *   }
 *   @key[attachments @listof[AttachmentInfo]]{
 *     Proper attachments for explicit downloading.
 *   }
 *   @key[relatedParts @oneof[null @listof[AttachmentInfo]]]{
 *     Attachments for inline display in the contents of the (hopefully)
 *     multipart/related message.
 *   }
 *   @key[references @oneof[null @listof[String]]]{
 *     The contents of the references header as a list of de-quoted ('<' and
 *     '>' removed) message-id's.  If there was no header, this is null.
 *   }
 *   @key[bodyReps @listof[BodyPartInfo]]
 * ]]{
 *   Information on the message body that is only for full message display.
 *   The to/cc/bcc information may get moved up to the header in the future,
 *   but our driving UI doesn't need it right now.
 * }
 */
function makeBodyInfo(raw) {
  if (!raw.date)
    throw new Error('No date?!');
  if (!raw.attachments || !raw.bodyReps)
    throw new Error('No attachments / bodyReps?!');

  return {
    date: raw.date,
    size: raw.size || 0,
    attachments: raw.attachments,
    relatedParts: raw.relatedParts || null,
    references: raw.references || null,
    bodyReps: raw.bodyReps
  };
}

/*
 * @typedef[BodyPartInfo @dict[
 *   @key[type @oneof['plain' 'html']]{
 *     The type of body; this is actually the MIME sub-type.
 *   }
 *   @key[part String]{
 *     IMAP part number.
 *   }
 *   @key[sizeEstimate Number]
 *   @key[amountDownloaded Number]
 *   @key[isDownloaded Boolean]
 *   @key[_partInfo #:optional RawIMAPPartInfo]
 *   @key[content]{
 *     The representation for 'plain' values is a `quotechew.js` processed
 *     body representation which is pair-wise list where the first item in each
 *     pair is a packed integer identifier and the second is a string containing
 *     the text for that block.
 *
 *     The body representation for 'html' values is an already sanitized and
 *     already quote-normalized String representation that could be directly
 *     fed into innerHTML safely if you were so inclined.  See `htmlchew.js`
 *     for more on that process.
 *   }
 * ]]
 */
function makeBodyPart(raw) {
  // We don't persist body types to our representation that we don't understand.
  if (raw.type !== 'plain' &&
      raw.type !== 'html')
    throw new Error('Bad body type: ' + raw.type);
  // 0 is an okay body size, but not giving us a guess is not!
  if (raw.sizeEstimate === undefined)
    throw new Error('Need size estimate!');

  return {
    type: raw.type,
    part: raw.part || null,
    sizeEstimate: raw.sizeEstimate,
    amountDownloaded: raw.amountDownloaded || 0,
    isDownloaded: raw.isDownloaded || false,
    _partInfo: raw._partInfo || null,
    content: raw.content || ''
  };
}


/*
 * @typedef[AttachmentInfo @dict[
 *   @key[name String]{
 *     The filename of the attachment, if any.
 *   }
 *   @key[contentId String]{
 *     The content-id of the attachment if this is a related part for inline
 *     display.
 *   }
 *   @key[type String]{
 *     The (full) mime-type of the attachment.
 *   }
 *   @key[part String]{
 *     The IMAP part number for fetching the attachment.
 *   }
 *   @key[encoding String]{
 *     The encoding of the attachment so we know how to decode it.  For
 *     ActiveSync, the server takes care of this for us so there is no encoding
 *     from our perspective.  (Although the attachment may get base64 encoded
 *     for transport in the inline case, but that's a protocol thing and has
 *     nothing to do with the message itself.)
 *   }
 *   @key[sizeEstimate Number]{
 *     Estimated file size in bytes.  Gets updated to be the correct size on
 *     attachment download.
 *   }
 *   @key[file @oneof[
 *     @case[null]{
 *       The attachment has not been downloaded, the file size is an estimate.
 *     }
 *     @case[@list["device storage type" "file path"]{
 *       The DeviceStorage type (ex: pictures) and the path to the file within
 *       device storage.
 *     }
 *     @case[HTMLBlob]{
 *       The Blob that contains the attachment.  It can be thought of as a
 *       handle/name to access the attachment.  IndexedDB in Gecko stores the
 *       blobs as (quota-tracked) files on the file-system rather than inline
 *       with the record, so the attachments don't need to count against our
 *       block size since they are not part of the direct I/O burden for the
 *       block.
 *     }
 *     @case[@listof[HTMLBlob]]{
 *       For draft messages, a list of one or more pre-base64-encoded attachment
 *       pieces that were sliced up in chunks due to Gecko's inability to stream
 *       Blobs to disk off the main thread.
 *     }
 *   ]]
 *   @key[charset @oneof[undefined String]]{
 *     The character set, for example "ISO-8859-1".  If not specified, as is
 *     likely for binary attachments, this should be null.
 *   }
 *   @key[textFormat @oneof[undefined String]]{
 *     The text format, for example, "flowed" for format=flowed.  If not
 *     specified, as is likely for binary attachments, this should be null.
 *   }
 * ]]
 */
function makeAttachmentPart(raw) {
  // Something is very wrong if there is no size estimate.
  if (raw.sizeEstimate === undefined)
    throw new Error('Need size estimate!');

  return {
    // XXX ActiveSync may leave this null, although it's conceivable the
    // server might do normalization to save us.  This needs a better treatment.
    // IMAP generates a made-up name for us if there isn't one.
    name: (raw.name != null) ? raw.name : null,
    contentId: raw.contentId || null,
    type: raw.type || 'application/octet-stream',
    part: raw.part || null,
    encoding: raw.encoding || null,
    sizeEstimate: raw.sizeEstimate,
    file: raw.file || null,
    charset: raw.charset || null,
    textFormat: raw.textFormat || null
  };
}

return {
  makeHeaderInfo: makeHeaderInfo,
  makeBodyInfo: makeBodyInfo,
  makeBodyPart: makeBodyPart,
  makeAttachmentPart: makeAttachmentPart
};

}); // end define
