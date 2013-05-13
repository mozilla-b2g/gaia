/** Creates an Attachment object
 * @param {String} type of attachment (image, video, etc).
 * @param {String} uri Location or datauri of image to show.
 * @param {Number} size Size of attachment in bytes.
 * @return {Attachment} new attachment object.
 *
 * The render method creates an iframe to represent the
 * attachment in the message composition area. An iframe
 * is used because Gecko will still try to put the
 * cursor into elements with [contentEditable=false].
 * Instead of a bunch of JavaScript to manage where the
 * caret is and what to delete on backspace, the
 * contentEditable region treats the iframe as a simple
 * block. Win.
 *
 * It uses the main sms.css stylesheet so that styles
 * can be defined in that.
 */

'use strict';

function Attachment(type, uri, size) {
  this.type = type;
  this.uri = uri;
  this.size = size;
}

Attachment.prototype = {
  render: function() {
    var _ = navigator.mozL10n.get;
    var el = document.createElement('iframe');
    // The attachment's iFrame requires access to the parent document's context
    // so that URIs for Blobs created in the parent may resolve as expected.
    el.setAttribute('sandbox', 'allow-same-origin');
    var src = 'data:text/html,';
    // We want kilobytes so we divide by 1024, with one fractional digit
    var size = Math.floor(this.size / 102.4) / 10;
    var sizeString = _('attachmentSize', {n: size});
    src += Utils.Template('attachment-tmpl').interpolate({
      uri: this.uri,
      size: sizeString
    });
    el.src = src;
    el.className = 'attachment';
    return el;
  }
};
