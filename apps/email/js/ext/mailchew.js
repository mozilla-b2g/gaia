/**
 * Message processing logic that deals with message representations at a higher
 * level than just text/plain processing (`quotechew.js`) or text/html
 * (`htmlchew.js`) parsing.  We are particularly concerned with replying to
 * messages and forwarding messages, and use the aforementioned libs to do the
 * gruntwork.
 *
 * For replying and forwarding, we synthesize messages so that there is always
 * a text part that is the area where the user can enter text which may be
 * followed by a read-only editable HTML block.  If replying to a text/plain
 * message, the quoted text is placed in the text area.  If replying to a
 * message with any text/html parts, we generate an HTML block for all parts.
 **/

define(
  [
    'exports',
    'logic',
    './util',
    './mailchew-strings',
    './quotechew',
    './htmlchew'
  ],
  function(
    exports,
    logic,
    $util,
    $mailchewStrings,
    $quotechew,
    $htmlchew
  ) {

var DESIRED_SNIPPET_LENGTH = 100;

var scope = logic.scope('MailChew');

/**
 * Generate the default compose body for a new e-mail
 * @param  {MailSenderIdentity} identity The current composer identity
 * @return {String} The text to be inserted into the body
 */
exports.generateBaseComposeBody = function generateBaseComposeBody(identity) {
  if (identity.signatureEnabled &&
      identity.signature &&
      identity.signature.length > 0) {

    var body = '\n\n--\n' + identity.signature;
    return body;
  } else {
    return '';
  }
};


var RE_RE = /^[Rr][Ee]:/;

/**
 * Generate the reply subject for a message given the prior subject.  This is
 * simply prepending "Re: " to the message if it does not already have an
 * "Re:" equivalent.
 *
 * Note, some clients/gateways (ex: I think the google groups web client? at
 * least whatever has a user-agent of G2/1.0) will structure mailing list
 * replies so they look like "[list] Re: blah" rather than the "Re: [list] blah"
 * that Thunderbird would produce.  Thunderbird (and other clients) pretend like
 * that inner "Re:" does not exist, and so do we.
 *
 * We _always_ use the exact string "Re: " when prepending and do not localize.
 * This is done primarily for consistency with Thunderbird, but it also is
 * friendly to other e-mail applications out there.
 *
 * Thunderbird does support recognizing a
 * mail/chrome/messenger-region/region.properties property,
 * "mailnews.localizedRe" for letting locales specify other strings used by
 * clients that do attempt to localize "Re:".  Thunderbird also supports a
 * weird "Re(###):" or "Re[###]:" idiom; see
 * http://mxr.mozilla.org/comm-central/ident?i=NS_MsgStripRE for more details.
 */
exports.generateReplySubject = function generateReplySubject(origSubject) {
  var re = 'Re: ';
  if (origSubject) {
    if (RE_RE.test(origSubject))
      return origSubject;

    return re + origSubject;
  }
  return re;
};

var FWD_FWD = /^[Ff][Ww][Dd]:/;

/**
 * Generate the forward subject for a message given the prior subject.  This is
 * simply prepending "Fwd: " to the message if it does not already have an
 * "Fwd:" equivalent.
 */
exports.generateForwardSubject = function generateForwardSubject(origSubject) {
  var fwd = 'Fwd: ';
  if (origSubject) {
    if (FWD_FWD.test(origSubject))
      return origSubject;

    return fwd + origSubject;
  }
  return fwd;
};


var l10n_wroteString = '{name} wrote',
    l10n_originalMessageString = 'Original Message';

/*
 * L10n strings for forward headers.  In Thunderbird, these come from
 * mime.properties:
 * http://mxr.mozilla.org/comm-central/source/mail/locales/en-US/chrome/messenger/mime.properties
 *
 * The libmime logic that injects them is mime_insert_normal_headers:
 * http://mxr.mozilla.org/comm-central/source/mailnews/mime/src/mimedrft.cpp#791
 *
 * Our dictionary maps from the lowercased header name to the human-readable
 * string.
 *
 * XXX actually do the l10n hookup for this
 */
var l10n_forward_header_labels = {
  subject: 'Subject',
  date: 'Date',
  from: 'From',
  replyTo: 'Reply-To',
  to: 'To',
  cc: 'CC'
};

exports.setLocalizedStrings = function(strings) {
  l10n_wroteString = strings.wrote;
  l10n_originalMessageString = strings.originalMessage;

  l10n_forward_header_labels = strings.forwardHeaderLabels;
};

// Grab the localized strings, if not available, listen for the event that
// sets them.
if ($mailchewStrings.strings) {
  exports.setLocalizedStrings($mailchewStrings.strings);
}
$mailchewStrings.events.on('strings', function(strings) {
  exports.setLocalizedStrings(strings);
});

/**
 * Generate the reply body representation given info about the message we are
 * replying to.
 *
 * This does not include potentially required work such as propagating embedded
 * attachments or de-sanitizing links/embedded images/external images.
 */
exports.generateReplyBody = function generateReplyMessage(reps, authorPair,
                                                          msgDate,
                                                          identity, refGuid) {
  var useName = authorPair.name ? authorPair.name.trim() : authorPair.address;

  var textMsg = '\n\n' +
                l10n_wroteString.replace('{name}', useName) + ':\n',
      htmlMsg = null;

  for (var i = 0; i < reps.length; i++) {
    var repType = reps[i].type, rep = reps[i].content;

    if (repType === 'plain') {
      var replyText = $quotechew.generateReplyText(rep);
      // If we've gone HTML, this needs to get concatenated onto the HTML.
      if (htmlMsg) {
        htmlMsg += $htmlchew.wrapTextIntoSafeHTMLString(replyText) + '\n';
      }
      // We haven't gone HTML yet, so this can all still be text.
      else {
        textMsg += replyText;
      }
    }
    else if (repType === 'html') {
      if (!htmlMsg) {
        htmlMsg = '';
        // slice off the trailing newline of textMsg
        if (textMsg.slice(-1) === '\n') {
          textMsg = textMsg.slice(0, -1);
        }
      }
      // rep has already been sanitized and therefore all HTML tags are balanced
      // and so there should be no rude surprises from this simplistic looking
      // HTML creation.  The message-id of the message never got sanitized,
      // however, so it needs to be escaped.  Also, in some cases (Activesync),
      // we won't have the message-id so we can't cite it.
      htmlMsg += '<blockquote ';
      if (refGuid) {
        htmlMsg += 'cite="mid:' + $htmlchew.escapeAttrValue(refGuid) + '" ';
      }
      htmlMsg += 'type="cite">' + rep + '</blockquote>';
    }
  }

  // Thunderbird's default is to put the signature after the quote, so us too.
  // (It also has complete control over all of this, but not us too.)
  if (identity.signature && identity.signatureEnabled) {
    // Thunderbird wraps its signature in a:
    // <pre class="moz-signature" cols="72"> construct and so we do too.
    if (htmlMsg)
      htmlMsg += $htmlchew.wrapTextIntoSafeHTMLString(
                   identity.signature, 'pre', false,
                   ['class', 'moz-signature', 'cols', '72']);
    else
      textMsg += '\n\n-- \n' + identity.signature;
  }

  return {
    text: textMsg,
    html: htmlMsg
  };
};

/**
 * Generate the body of an inline forward message.  XXX we need to generate
 * the header summary which needs some localized strings.
 */
exports.generateForwardMessage =
  function(author, date, subject, headerInfo, bodyInfo, identity) {
  var textMsg = '\n\n', htmlMsg = null;

  if (identity.signature && identity.signatureEnabled)
    textMsg += '-- \n' + identity.signature + '\n\n';

  textMsg += '-------- ' + l10n_originalMessageString + ' --------\n';
  // XXX l10n! l10n! l10n!

  // Add the headers in the same order libmime adds them in
  // mime_insert_normal_headers so that any automated attempt to re-derive
  // the headers has a little bit of a chance (since the strings are
  // localized.)

  // : subject
  textMsg += l10n_forward_header_labels['subject'] + ': ' + subject + '\n';

  // We do not track or remotely care about the 'resent' headers
  // : resent-comments
  // : resent-date
  // : resent-from
  // : resent-to
  // : resent-cc
  // : date
  textMsg += l10n_forward_header_labels['date'] + ': ' + new Date(date) + '\n';
  // : from
  textMsg += l10n_forward_header_labels['from'] + ': ' +
               $util.formatAddresses([author]) + '\n';
  // : reply-to
  if (headerInfo.replyTo)
    textMsg += l10n_forward_header_labels['replyTo'] + ': ' +
                 $util.formatAddresses([headerInfo.replyTo]) + '\n';
  // : organization
  // : to
  if (headerInfo.to)
    textMsg += l10n_forward_header_labels['to'] + ': ' +
                 $util.formatAddresses(headerInfo.to) + '\n';
  // : cc
  if (headerInfo.cc)
    textMsg += l10n_forward_header_labels['cc'] + ': ' +
                 $util.formatAddresses(headerInfo.cc) + '\n';
  // (bcc should never be forwarded)
  // : newsgroups
  // : followup-to
  // : references (only for newsgroups)

  textMsg += '\n';

  var reps = bodyInfo.bodyReps;
  for (var i = 0; i < reps.length; i++) {
    var repType = reps[i].type, rep = reps[i].content;

    if (repType === 'plain') {
      var forwardText = $quotechew.generateForwardBodyText(rep);
      // If we've gone HTML, this needs to get concatenated onto the HTML.
      if (htmlMsg) {
        htmlMsg += $htmlchew.wrapTextIntoSafeHTMLString(forwardText) + '\n';
      }
      // We haven't gone HTML yet, so this can all still be text.
      else {
        textMsg += forwardText;
      }
    }
    else if (repType === 'html') {
      if (!htmlMsg) {
        htmlMsg = '';
        // slice off the trailing newline of textMsg
        if (textMsg.slice(-1) === '\n') {
          textMsg = textMsg.slice(0, -1);
        }
      }
      htmlMsg += rep;
    }
  }

  return {
    text: textMsg,
    html: htmlMsg
  };
};

var HTML_WRAP_TOP =
  '<html><body><body bgcolor="#FFFFFF" text="#000000">';
var HTML_WRAP_BOTTOM =
  '</body></html>';

/**
 * Combine the user's plaintext composition with the read-only HTML we provided
 * them into a final HTML representation.
 */
exports.mergeUserTextWithHTML = function mergeReplyTextWithHTML(text, html) {
  return HTML_WRAP_TOP +
         $htmlchew.wrapTextIntoSafeHTMLString(text, 'div') +
         html +
         HTML_WRAP_BOTTOM;
};

/**
 * Generate the snippet and parsed body from the message body's content.
 */
exports.processMessageContent = function processMessageContent(
    content, type, isDownloaded, generateSnippet) {

  // Strip any trailing newline.
  if (content.slice(-1) === '\n') {
    content = content.slice(0, -1);
  }

  var parsedContent, snippet;
  switch (type) {
    case 'plain':
      try {
        parsedContent = $quotechew.quoteProcessTextBody(content);
      }
      catch (ex) {
        logic(scope, 'textChewError', { ex: ex });
        // An empty content rep is better than nothing.
        parsedContent = [];
      }

      if (generateSnippet) {
        try {
          snippet = $quotechew.generateSnippet(
            parsedContent, DESIRED_SNIPPET_LENGTH
          );
        }
        catch (ex) {
          logic(scope, 'textSnippetError', { ex: ex });
          snippet = '';
        }
      }
      break;
    case 'html':
      if (generateSnippet) {
        try {
          snippet = $htmlchew.generateSnippet(content);
        }
        catch (ex) {
          logic(scope, 'htmlSnippetError', { ex: ex });
          snippet = '';
        }
      }
      if (isDownloaded) {
        try {
          parsedContent = $htmlchew.sanitizeAndNormalizeHtml(content);
        }
        catch (ex) {
          logic(scope, 'htmlParseError', { ex: ex });
          parsedContent = '';
        }
      }
      break;
  }

  return { content: parsedContent, snippet: snippet };
};

}); // end define
