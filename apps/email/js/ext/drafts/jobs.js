/**
 * Draft jobs: save/delete drafts, attach/remove attachments.  These gets mixed
 * into the specific JobDriver implementations.
 **/

define(function(require, exports) {

var mailRep = require('../db/mail_rep');
var draftRep = require('../drafts/draft_rep');
var base64 = require('safe-base64');
var asyncFetchBlobAsUint8Array =
      require('../async_blob_fetcher').asyncFetchBlobAsUint8Array;

var draftsMixins = exports.draftsMixins = {};

////////////////////////////////////////////////////////////////////////////////
// attachBlobToDraft

/**
 * How big a chunk of an attachment should we encode in a single read?  Because
 * we want our base64-encoded lines to be 76 bytes long (before newlines) and
 * there's a 4/3 expansion factor, we want to read a multiple of 57 bytes.
 *
 * I initially chose the largest value just under 1MiB.  This appeared too
 * chunky on the ZTE open, so I'm halving to just under 512KiB.  Calculated via
 * Math.floor(512 * 1024 / 57) = 9198.  The encoded size of this ends up to be
 * 9198 * 78 which is ~700 KiB.  So together that's ~1.2 megs if we don't
 * generate a ton of garbage by creating a lot of intermediary strings.
 *
 * This seems reasonable given goals of not requiring the GC to run after every
 * block and not having us tie up the CPU too long during our encoding.
 */
draftsMixins.BLOB_BASE64_BATCH_CONVERT_SIZE = 9198 * 57;

/**
 * Incrementally convert an attachment into its base64 encoded attachment form
 * which we save in chunks to IndexedDB to avoid using too much memory now or
 * during the sending process.
 *
 * - Retrieve the body the draft is persisted to,
 * - Repeat until the attachment is fully attached:
 *   - take a chunk of the source attachment
 *   - base64 encode it into a Blob by creating a Uint8Array and manually
 *     encoding into that.  (We need to put a \r\n after every 76 bytes, and
 *     doing that using window.btoa is going to create a lot of garbage. And
 *     addressing that is no longer premature optimization.)
 *   - update the body with that Blob
 *   - trigger a save of the account so that IndexedDB writes the account to
 *     disk.
 *   - force the body block to be discarded from the cache and then re-get the
 *     body.  We won't be saving any memory until the Blob has been written to
 *     disk and we have forgotten all references to the in-memory Blob we wrote
 *     to the database.  (The Blob does not magically get turned into a
 *     reference to the database.)
 * - Be done.  Note that we leave the "small" Blobs independent; we do not
 *   create a super Blob.
 *
 * ## Logging ##
 *
 * We log at:
 * - The start of the process.
 * - For each block.
 * - The end of the process.
 */
draftsMixins.local_do_attachBlobToDraft = function(op, callback) {
  var localDraftsFolder = this.account.getFirstFolderWithType('localdrafts');
  if (!localDraftsFolder) {
    callback('moot');
    return;
  }
  var self = this;
  this._accessFolderForMutation(
    localDraftsFolder.id, /* needConn*/ false,
    function(nullFolderConn, folderStorage) {
      var wholeBlob = op.attachmentDef.blob;

      // - Retrieve the message
      var header, body;
      console.log('attachBlobToDraft: retrieving message');
      folderStorage.getMessage(
        op.existingNamer.suid, op.existingNamer.date, {}, gotMessage);
      function gotMessage(records) {
        header = records.header;
        body = records.body;

        if (!header || !body) {
          // No header/body suggests either some major invariant is busted or
          // one or more UIs issued attach commands after the draft was mooted.
          callback('failure-give-up');
          return;
        }

        body.attaching = mailRep.makeAttachmentPart({
          name: op.attachmentDef.name,
          type: wholeBlob.type,
          sizeEstimate: wholeBlob.size,
          // this is where we put the Blob segments...
          file: [],
        });

        convertNextChunk(body);
      }

      var blobOffset = 0;
      function convertNextChunk(refreshedBody) {
        body = refreshedBody;
        var nextOffset =
              Math.min(wholeBlob.size,
                       blobOffset + self.BLOB_BASE64_BATCH_CONVERT_SIZE);
        console.log('attachBlobToDraft: fetching', blobOffset, 'to',
                    nextOffset, 'of', wholeBlob.size);
        var slicedBlob = wholeBlob.slice(blobOffset, nextOffset);
        blobOffset = nextOffset;

        asyncFetchBlobAsUint8Array(slicedBlob, gotChunk);
      }

      function gotChunk(err, binaryDataU8) {
        console.log('attachBlobToDraft: fetched');
        // The Blob really should not be disappear out from under us, but it
        // could happen.
        if (err) {
          callback('failure-give-up');
          return;
        }

        var lastChunk = (blobOffset >= wholeBlob.size);
        var encodedU8 = base64.mimeStyleBase64Encode(binaryDataU8);
        body.attaching.file.push(new Blob([encodedU8],
                                          { type: wholeBlob.type }));

        var eventDetails;
        if (lastChunk) {
          var attachmentIndex = body.attachments.length;
          body.attachments.push(body.attaching);
          delete body.attaching; // bad news for shapes, but drafts are rare.

          eventDetails = {
            changeDetails: {
              attachments: [attachmentIndex]
            }
          };
        }
        else {
          // Do not generate an event for intermediary states; there is nothing
          // to observe.
          eventDetails = null;
        }

        console.log('attachBlobToDraft: flushing');
        folderStorage.updateMessageBody(
          header, body, { flushBecause: 'blobs' }, eventDetails,
          lastChunk ? bodyUpdatedAllDone : convertNextChunk);
        body = null;
      }

      function bodyUpdatedAllDone(newBodyInfo) {
        console.log('attachBlobToDraft: blob fully attached');
        callback(null);
      }
    },
    /* no conn => no deathback required */ null,
    'attachBlobToDraft');
};
draftsMixins.do_attachBlobToDraft = function(op, callback) {
  // there is no server component for this
  callback(null);
};
draftsMixins.check_attachBlobToDraft = function(op, callback) {
  callback(null, 'moot');
};
draftsMixins.local_undo_attachBlobToDraft = function(op, callback) {
  callback(null);
};
draftsMixins.undo_attachBlobToDraft = function(op, callback) {
  callback(null);
};

////////////////////////////////////////////////////////////////////////////////
// detachAttachmentFromDraft

draftsMixins.local_do_detachAttachmentFromDraft = function(op, callback) {
  var localDraftsFolder = this.account.getFirstFolderWithType('localdrafts');
  if (!localDraftsFolder) {
    callback('moot');
    return;
  }
  var self = this;
  this._accessFolderForMutation(
    localDraftsFolder.id, /* needConn*/ false,
    function(nullFolderConn, folderStorage) {
      // - Retrieve the message
      var header, body;
      console.log('detachAttachmentFromDraft: retrieving message');
      folderStorage.getMessage(
        op.existingNamer.suid, op.existingNamer.date, {}, gotMessage);
      function gotMessage(records) {
        header = records.header;
        body = records.body;

        if (!header || !body) {
          // No header/body suggests either some major invariant is busted or
          // one or more UIs issued attach commands after the draft was mooted.
          callback('failure-give-up');
          return;
        }

        // Just forget about the attachment.  Splice handles insane indices.
        body.attachments.splice(op.attachmentIndex, 1);

        console.log('detachAttachmentFromDraft: flushing');
        folderStorage.updateMessageBody(
          header, body,
          { flushBecause: 'blobs' },
          {
            changeDetails: {
              detachedAttachments: [op.attachmentIndex]
            }
          },
          bodyUpdatedAllDone);
      }

      function bodyUpdatedAllDone(newBodyInfo) {
        console.log('detachAttachmentFromDraft: blob fully detached');
        callback(null);
      }
    },
    /* no conn => no deathback required */ null,
    'detachAttachmentFromDraft');
};

draftsMixins.do_detachAttachmentFromDraft = function(op, callback) {
  // there is no server component for this at this time.
  callback(null);
};

draftsMixins.check_detachAttachmentFromDraft = function(op, callback) {
  callback(null);
};

draftsMixins.local_undo_detachAttachmentFromDraft = function(op, callback) {
  callback(null);
};

draftsMixins.undo_detachAttachmentFromDraft = function(op, callback) {
  callback(null);
};


////////////////////////////////////////////////////////////////////////////////
// saveDraft

/**
 * Save a draft; if there already was a draft, it gets replaced.  The new
 * draft gets a new date and id/SUID so it is logically distinct.  However,
 * we will propagate attachment and on-server information between drafts.
 */
draftsMixins.local_do_saveDraft = function(op, callback) {
  var localDraftsFolder = this.account.getFirstFolderWithType('localdrafts');
  if (!localDraftsFolder) {
    callback('moot');
    return;
  }
  var self = this;
  this._accessFolderForMutation(
    localDraftsFolder.id, /* needConn*/ false,
    function(nullFolderConn, folderStorage) {
      // there's always a header add and a body add
      var waitingForDbMods = 2;
      function gotMessage(oldRecords) {
        var newRecords = draftRep.mergeDraftStates(
          oldRecords.header, oldRecords.body,
          op.draftRep,
          op.newDraftInfo,
          self.account.universe);

        // If there already was a draft saved, delete it.
        // Note that ordering of the removal and the addition doesn't really
        // matter here because of our use of transactions.
        if (op.existingNamer) {
          waitingForDbMods++;
          folderStorage.deleteMessageHeaderAndBody(
            op.existingNamer.suid, op.existingNamer.date, dbModCompleted);
        }

        folderStorage.addMessageHeader(newRecords.header, newRecords.body,
                                       dbModCompleted);
        folderStorage.addMessageBody(newRecords.header, newRecords.body,
                                     dbModCompleted);
        function dbModCompleted() {
          if (--waitingForDbMods === 0) {
            callback(
              /* no error */ null,
              /* result */ newRecords,
              /* save account */ true);
          }
        }
      }

      if (op.existingNamer) {
        folderStorage.getMessage(
          op.existingNamer.suid, op.existingNamer.date, null, gotMessage);
      }
      else {
        gotMessage({ header: null, body: null });
      }
    },
    /* no conn => no deathback required */ null,
    'saveDraft');
};

/**
 * FUTURE WORK: Save a draft to the server; this is inherently IMAP only.
 * Tracked on: https://bugzilla.mozilla.org/show_bug.cgi?id=799822
 *
 * It is very possible that we will save local drafts faster / more frequently
 * than we can update our server state.  It only makes sense to upload the
 * latest draft state to the server.  Because we delete our old local drafts,
 * it's obvious when we should skip out on updating the server draft for
 * something.
 *
 * Because IMAP drafts have to replace the prior drafts, we use our old 'srvid'
 * to know what message to delete as well as what message to pull attachments
 * from when we're in a mode where we upload attachments to drafts and CATENATE
 * is available.
 */
draftsMixins.do_saveDraft = function(op, callback) {
  callback(null);
};
draftsMixins.check_saveDraft = function(op, callback) {
  callback(null, 'moot');
};
draftsMixins.local_undo_saveDraft = function(op, callback) {
  callback(null);
};
draftsMixins.undo_saveDraft = function(op, callback) {
  callback(null);
};

////////////////////////////////////////////////////////////////////////////////
// deleteDraft

draftsMixins.local_do_deleteDraft = function(op, callback) {
  var localDraftsFolder = this.account.getFirstFolderWithType('localdrafts');
  if (!localDraftsFolder) {
    callback('moot');
    return;
  }
  var self = this;
  this._accessFolderForMutation(
    localDraftsFolder.id, /* needConn*/ false,
    function(nullFolderConn, folderStorage) {
      folderStorage.deleteMessageHeaderAndBody(
        op.messageNamer.suid, op.messageNamer.date,
        function() {
          callback(null, null, /* save account */ true);
        });
    },
    /* no conn => no deathback required */ null,
    'deleteDraft');
};

draftsMixins.do_deleteDraft = function(op, callback) {
  // there is no server component for this
  callback(null);
};
draftsMixins.check_deleteDraft = function(op, callback) {
  callback(null, 'moot');
};
draftsMixins.local_undo_deleteDraft = function(op, callback) {
  callback(null);
};
draftsMixins.undo_deleteDraft = function(op, callback) {
  callback(null);
};

////////////////////////////////////////////////////////////////////////////////

}); // end define
