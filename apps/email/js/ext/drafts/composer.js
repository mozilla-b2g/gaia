define(
  [
    'mailbuild',
    '../mailchew',
    '../util',
    'exports'
  ],
  function(
    MimeNode,
    $mailchew,
    $imaputil,
    exports
  ) {

var formatAddresses = $imaputil.formatAddresses;

// MimeNode doesn't have a `removeHeader` method, but it's so helpful.
// Upstream this when possible.
MimeNode.prototype.removeHeader = function(key) {
  for (var i = 0, len = this._headers.length; i < len; i++) {
    if (this._headers[i].key === key) {
      this._headers.splice(i, 1);
      break;
    }
  }
};

/**
 * Abstraction around the mailbuild helper library and our efforts to avoid
 * filling up the device's memory and crashing when we send large messages.  We
 * produce a Blob that is made up of some combination of strings and Blobs.
 *
 * ## Composer Endpoints ##
 *
 * There are 3 main endpoints for our data:
 *
 * 1) SMTP transmission.  SMTP does not require us to know the size of what we
 * are sending up front.  It usually does NOT want the BCC header included in
 * the message.
 *
 * 2) IMAP APPEND.  APPEND needs to know the size of the message we are
 * appending up front.  It DOES want the BCC header included for archival
 * purposes, so this needs to be a different body.
 *
 * 3) ActiveSync sending.  There are actually two paths here; ActiveSync <= 12.x
 * does a more traditional POST of just the MIME data.  ActiveSync >= 14.0
 * generates a WBXML command, but it's basically just a wrapper around the MIME
 * data.  Because we use XHR's to communicate with the server, the size
 * effectively needs to be known ahead of time.
 *
 * ## The Data ##
 *
 * The actual data that goes into our message is either finite-ish (headers),
 * variable in size but arguably manageable (the contents of the message), or
 * potentially very large in size (attachments).  Besides being potentially
 * huge, attachments are also notable because they are immutable once attached.
 * Also, they arguably need to be redundantly stored once attached.  That is,
 * if a user attaches an image from DeviceStorage and then later deletes it
 * before the message is sent, you can make a convincing case that the
 * attachment should still be sent with the message.  Previously, this would
 * happen as a side-effect of IndexedDB's need to duplicate the contents of
 * Blobs passed into it so it could persist them and manage its life-cycle.
 *
 * @param newRecords
 *   The HeaderInfo and BodyInfo for the most recent saved copy of the draft.
 *   Used to construct the outgoing message.
 * @param account
 * @param identity
 */
function Composer(newRecords, account, identity) {
  var header = this.header = newRecords.header;
  var body = this.body = newRecords.body;
  this.account = account;
  this.identity = identity;
  this.sentDate = new Date(this.header.date);
  this._smartWakeLock = null;

  // Snapshot data we create for consistency.
  // We're copying nodemailer here; we might want to include some more.
  this.messageId =
    '<' + Date.now() + Math.random().toString(16).substr(1) + '@mozgaia>';

  var messageNode;

  // text/plain and text/html
  var textContent = body.bodyReps[0].content[1];
  if (body.bodyReps.length === 2) {
    var htmlContent = body.bodyReps[1].content;
    messageNode = new MimeNode('text/html');
    messageNode.setContent(
      $mailchew.mergeUserTextWithHTML(textContent, htmlContent));
  } else {
    messageNode = new MimeNode('text/plain');
    messageNode.setContent(textContent);
  }

  var root;
  if (body.attachments.length) {
    root = this._rootNode = new MimeNode('multipart/mixed');
    root.appendChild(messageNode);
  } else {
    root = this._rootNode = messageNode;
  }

  root.setHeader('From', formatAddresses([this.identity]));
  root.setHeader('Subject', header.subject);

  if (this.identity.replyTo) {
    root.setHeader('Reply-To', this.identity.replyTo);
  }
  if (header.to && header.to.length) {
    root.setHeader('To', formatAddresses(header.to));
  }
  if (header.cc && header.cc.length) {
    root.setHeader('Cc', formatAddresses(header.cc));
  }
  // Note: We include the BCC header here, even though we also do some
  // BCC trickery below, so that the getEnvelope() function includes
  // the proper "to" addresses in the envelope.
  if (header.bcc && header.bcc.length) {
    root.setHeader('Bcc', formatAddresses(header.bcc));
  }

  root.setHeader('User-Agent', 'GaiaMail/0.2');
  root.setHeader('Date', this.sentDate.toUTCString());
  root.setHeader('Message-Id', this.messageId);
  if (body.references) {
    root.setHeader('References', body.references);
  }

  // Set the transfer-encoding to quoted-printable so that mailbuild
  // doesn't attempt to insert linebreaks in HTML mail.
  root.setHeader('Content-Transfer-Encoding', 'quoted-printable');

  // Mailbuild doesn't currently support blobs. As a workaround,
  // insert a unique placeholder separator, which we will replace with
  // the real contents of the blobs during the sending process.
  this._blobReplacements = [];
  this._uniqueBlobBoundary = '{{blob!' + Math.random() + Date.now() + '}}';

  body.attachments.forEach(function(attachment) {
    try {
      var attachmentNode = new MimeNode(attachment.type,
                                        { filename: attachment.name });
      attachmentNode.setContent(this._uniqueBlobBoundary);
      root.appendChild(attachmentNode);
      this._blobReplacements.push(new Blob(attachment.file));
    } catch (ex) {
      console.error('Problem attaching attachment:', ex, '\n', ex.stack);
    }
  }.bind(this));
}

exports.Composer = Composer;
Composer.prototype = {

  /**
   * Return the currently-built envelope, in a format compatible with
   * the SMTP library.
   *
   * @return {Object}
   *   { from: "me@example.com", to: [] }
   */
  getEnvelope: function() {
    return this._rootNode.getEnvelope();
  },

  /**
   * Request that a body be produced as a single Blob with the given options.
   * Multiple calls to this method may overlap concurrently.
   *
   * @param {object} opts
   *   { includeBcc: true } if the BCC header should be included.
   * @param {function(blob)} callback
   */
  withMessageBlob: function(opts, callback) {

    // Another horrible workaround: Mailbuild _never_ includes the
    // 'Bcc' header in the generated output, and there isn't a simple
    // monkeypatch that could address that behavior. Instead, insert a
    // temporary header in place of BCC, and rename that header in the
    // final output. Alternately, we could maintain a forked version
    // of mailbuild, but we would need to be very careful not to
    // inadvertently clobber our changes during updates.
    var TEMP_BCC = 'Bcc-Temp';
    var TEMP_BCC_REGEX = /^Bcc-Temp: /m;

    var hasBcc = opts.includeBcc && this.header.bcc && this.header.bcc.length;
    if (hasBcc) {
      this._rootNode.setHeader(TEMP_BCC, formatAddresses(this.header.bcc));
    } else {
      this._rootNode.removeHeader(TEMP_BCC);
    }

    var str = this._rootNode.build();

    if (hasBcc) {
      str = str.replace(TEMP_BCC_REGEX, 'Bcc: ');
    }

    // Ensure that the message always ends with a trailing CRLF for
    // SMTP transmission (currently, our SMTP sending logic assumes
    // that this will always be the case):
    if (str.slice(-2) !== '\r\n') {
      str += '\r\n';
    }

    // Split the message into an array, delimited by our unique blob
    // boundary, interleaving the attachment blobs. Note that we must
    // search for the base64-encoded blob boundary, as at this point
    // it has been encoded for transport.
    var splits = str.split(btoa(this._uniqueBlobBoundary) + '\r\n');
    this._blobReplacements.forEach(function(blob, i) {
      // blob 0 => index 1
      // blob 1 => index 3
      // blob 2 => index 5 ...
      splits.splice((i * 2) + 1, 0, blob);
    });

    // Build a super-blob from any subparts.
    callback(new Blob(splits, {
      type: this._rootNode.getHeader('content-type')
    }));
  },

  /**
   * Call setSmartWakeLock to assign a SmartWakeLock instance.
   * Accounts will call renewSmartWakeLock() during the sending
   * process, so that the wake lock can continually be renewed during
   * the sending process. This prevents the lock from expiring.
   *
   * @param {SmartWakeLock} wakeLock
   */
  setSmartWakeLock: function(wakeLock) {
    this._smartWakeLock = wakeLock;
  },

  /**
   * Renew the SmartWakeLock associated with this composer, if one has
   * been set. Provide an optional reason, which will be logged.
   *
   * @param {String} reason
   */
  renewSmartWakeLock: function(reason) {
    if (this._smartWakeLock) {
      this._smartWakeLock.renew(reason);
    }
  }
};

}); // end define
