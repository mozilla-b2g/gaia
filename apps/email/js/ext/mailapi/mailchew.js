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

define('mailapi/mailchew',
  [
    'exports',
    './util',
    './quotechew',
    './htmlchew'
  ],
  function(
    exports,
    $util,
    $quotechew,
    $htmlchew
  ) {

const RE_RE = /^[Rr][Ee]: /;

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
  if (RE_RE.test(origSubject))
      return origSubject;
  return 'Re: ' + origSubject;
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
  cc: 'CC',
};

exports.setLocalizedStrings = function(strings) {
  l10n_wroteString = strings.wrote;
  l10n_originalMessageString = strings.originalMessage;

  l10n_forward_header_labels = strings.forwardHeaderLabels;
};

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
  var useName = authorPair.name || authorPair.address;

  var textMsg = '\n\n' +
                l10n_wroteString.replace('{name}', useName) + ':\n',
      htmlMsg = null;

  for (var i = 0; i < reps.length; i += 2) {
    var repType = reps[i], rep = reps[i + 1];

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
    else {
      if (!htmlMsg) {
        htmlMsg = '';
        // slice off the trailing newline of textMsg
        textMsg = textMsg.slice(0, -1);
      }
      // rep has already been sanitized and therefore all HTML tags are balanced
      // and so there should be no rude surprises from this simplistic looking
      // HTML creation.  The message-id of the message never got sanitized,
      // however, so it needs to be escaped.
      htmlMsg += '<blockquote cite="mid:' + $htmlchew.escapeAttrValue(refGuid) +
                 '" type="cite">' +
                 rep +
                 '</blockquote>';
    }
  }

  // Thunderbird's default is to put the signature after the quote, so us too.
  // (It also has complete control over all of this, but not us too.)
  if (identity.signature) {
    // Thunderbird wraps its signature in a:
    // <pre class="moz-signature" cols="72"> construct and so we do too.
    if (htmlMsg)
      htmlMsg += $htmlchew.wrapTextIntoSafeHTMLString(
                   identity.signature, 'pre', false,
                   ['class', 'moz-signature', 'cols', '72']);
    else
      textMsg += '\n\n-- \n' + identity.signature + '\n';
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
exports.generateForwardMessage = function generateForwardMessage(
                                   author, date, subject, bodyInfo, identity) {
  var textMsg = '\n\n', htmlMsg = null;

  if (identity.signature)
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
  if (bodyInfo.replyTo)
    textMsg += l10n_forward_header_labels['replyTo'] + ': ' +
                 $util.formatAddresses([bodyInfo.replyTo]) + '\n';
  // : organization
  // : to
  if (bodyInfo.to)
    textMsg += l10n_forward_header_labels['to'] + ': ' +
                 $util.formatAddresses(bodyInfo.to) + '\n';
  // : cc
  if (bodyInfo.cc)
    textMsg += l10n_forward_header_labels['cc'] + ': ' +
                 $util.formatAddresses(bodyInfo.cc) + '\n';
  // (bcc should never be forwarded)
  // : newsgroups
  // : followup-to
  // : references (only for newsgroups)

  textMsg += '\n';

  var reps = bodyInfo.bodyReps;
  for (var i = 0; i < reps.length; i += 2) {
    var repType = reps[i], rep = reps[i + 1];

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
    else {
      if (!htmlMsg)
        htmlMsg = '';
      htmlMsg += rep;
    }
  }

  return {
    text: textMsg,
    html: htmlMsg
  };
};

const HTML_WRAP_TOP =
  '<html><body><body bgcolor="#FFFFFF" text="#000000">';
const HTML_WRAP_BOTTOM =
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

}); // end define
