/**
 * Composition stuff.
 **/

define('mailapi/composer',
  [
    'mailcomposer',
    './mailchew',
    './util',
    'exports'
  ],
  function(
    $mailcomposer,
    $mailchew,
    $imaputil,
    exports
  ) {

/**
 * Abstraction around the mailcomposer helper library that exists to consolidate
 * our hackish uses of it, as well as to deal with our need to create variations
 * of a message with and without the Bcc headers present.  This is also being
 * used as a vehicle to eventually support streams instead of generating a
 * single big buffer.
 *
 * Our API is currently synchronous for getting envelope data and asynchronous
 * for generating the body.  The asynchronous bit comes because we chose to
 * internalize our fetching of the contents of attachments from Blobs which is
 * an inherently asynchronous thing.
 */
function Composer(mode, wireRep, account, identity) {
  this.mode = mode;
  this.wireRep = wireRep;
  this.account = account;
  this.identity = identity;

  this._asyncPending = 0;
  this._deferredCalls = [];

  // - snapshot data we create for consistency
  // we create now so multiple MailComposer creations will
  // have the same values.
  this.sentDate = new Date();
  // we're copying nodemailer here; we might want to include some more...
  this.messageId =
    '<' + Date.now() + Math.random().toString(16).substr(1) + '@mozgaia>';

  this._mcomposer = null;
  this._mcomposerOpts = null;
  this._buildMailComposer();

  this._attachments = [];

  // - fetch attachments if sending
  if (mode === 'send' && wireRep.attachments) {
    wireRep.attachments.forEach(function(attachmentDef) {
      var reader = new FileReader();
      reader.onload = function onloaded() {
        this._attachments.push({
          filename: attachmentDef.name,
          contentType: attachmentDef.blob.type,
          contents: new Uint8Array(reader.result),
        });
        if (--this._asyncPending === 0)
          this._asyncLoadsCompleted();
      }.bind(this);
      try {
        reader.readAsArrayBuffer(attachmentDef.blob);
        this._asyncPending++;
      }
      catch (ex) {
        console.error('Problem attaching attachment:', ex, '\n', ex.stack);
      }
    }.bind(this));
  }
}
exports.Composer = Composer;
Composer.prototype = {
  _buildMailComposer: function() {
    var wireRep = this.wireRep, body = wireRep.body;
    var mcomposer = this._mcomposer = new $mailcomposer.MailComposer();

    var messageOpts = {
      from: $imaputil.formatAddresses([this.identity]),
      subject: wireRep.subject,
    };
    if (body.html) {
      messageOpts.html = $mailchew.mergeUserTextWithHTML(body.text, body.html);
    }
    else {
      messageOpts.body = body.text;
    }

    if (this.identity.replyTo)
      messageOpts.replyTo = this.identity.replyTo;
    if (wireRep.to && wireRep.to.length)
      messageOpts.to = $imaputil.formatAddresses(wireRep.to);
    if (wireRep.cc && wireRep.cc.length)
      messageOpts.cc = $imaputil.formatAddresses(wireRep.cc);
    if (wireRep.bcc && wireRep.bcc.length)
      messageOpts.bcc = $imaputil.formatAddresses(wireRep.bcc);
    mcomposer.setMessageOption(messageOpts);

    if (wireRep.customHeaders) {
      for (var iHead = 0; iHead < wireRep.customHeaders.length; iHead += 2){
        mcomposer.addHeader(wireRep.customHeaders[iHead],
                           wireRep.customHeaders[iHead+1]);
      }
    }
    mcomposer.addHeader('User-Agent', 'Mozilla Gaia Email Client 0.1alpha');
    mcomposer.addHeader('Date', this.sentDate.toUTCString());

    mcomposer.addHeader('Message-Id', this.messageId);
    if (wireRep.references)
      mcomposer.addHeader('References', wireRep.references);
  },

  /**
   * Build the body consistent with the requested options.  If this is our
   * first time building a body, we can use the existing _mcomposer.  If the
   * opts are the same as last time, we can reuse the built body.  If the opts
   * have changed, we need to create a new _mcomposer because it accumulates
   * state and then generate the body.
   */
  _ensureBodyWithOpts: function(opts) {
    // reuse the existing body if possible
    if (this._mcomposerOpts &&
        this._mcomposerOpts.includeBcc === opts.includeBcc) {
      return;
    }
    // if we already build a body, we need to create a new mcomposer
    if (this._mcomposerOpts !== null)
      this._buildMailComposer();
    // save the opts for next time
    this._mcomposerOpts = opts;
    // it's fine to directly clobber this in
    this._mcomposer.options.keepBcc = opts.includeBcc;

    for (var iAtt = 0; iAtt < this._attachments.length; iAtt++) {
      this._mcomposer.addAttachment(this._attachments[iAtt]);
    }

    // Render the message to its output buffer.
    var mcomposer = this._mcomposer;
    mcomposer._cacheOutput = true;
    process.immediate = true;
    mcomposer._processBufferedOutput = function() {
      // we are stopping the DKIM logic from firing.
    };
    mcomposer._composeMessage();
    process.immediate = false;

    // (the data is now in mcomposer._outputBuffer)
  },

  _asyncLoadsCompleted: function() {
    while (this._deferredCalls.length) {
      var toCall = this._deferredCalls.shift();
      toCall();
    }
  },

  getEnvelope: function() {
    return this._mcomposer.getEnvelope();
  },

  /**
   * Request that a body be produced as a single buffer with the given options.
   * Multiple calls to this method can be made and they may overlap.
   *
   * @args[
   *   @param[opts @dict[
   *     @key[includeBcc Boolean]{
   *       Should we include the BCC data in the headers?
   *     }
   *   ]]
   * ]
   */
  withMessageBuffer: function(opts, callback) {
    if (this._asyncPending) {
      this._deferredCalls.push(
        this.withMessageBuffer.bind(this, opts, callback));
      return;
    }

    this._ensureBodyWithOpts(opts);
    callback(this._mcomposer._outputBuffer);
  },
};

}); // end define
