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

/*global Utils, Template, MimeMapper, MozActivity */

(function(exports) {
  'use strict';

  // thumbnails should be 80*80px (plus border) but can be extended up to 120px,
  // either horizontally or vertically
  var MIN_THUMBNAIL_WIDTH_HEIGHT = 80;  // min =  80px
  var MAX_THUMBNAIL_WIDTH_HEIGHT = 120; // max = 120px

  // do not create thumbnails for too big attachments
  // (see bug 805114 for a similar issue in Gallery)
  var MAX_THUMBNAIL_GENERATION_SIZE = 1.5 * 1024 * 1024; // 1.5MB


  function Attachment(blob, options) {
    options = options || {};
    this.blob = blob;
    this.name = blob.name || options.name ||
      navigator.mozL10n.get('unnamed-attachment');
    this.isDraft = !!options.isDraft;
  }

  Attachment.prototype = {
    get size() {
      return this.blob.size;
    },

    get sizeForL10n() { // blob size with unit (KB or MB)
      var sizeKB = this.blob.size / 1024;
      var sizeMB = sizeKB / 1024;
      if (sizeKB < 1000) {
        return {
          l10nId: 'attachmentSize',
          l10nArgs: { n: sizeKB.toFixed(1) }
        };
      } else {
        return {
          l10nId: 'attachmentSizeMB',
          l10nArgs: { n: sizeMB.toFixed(1) }
        };
      }
    },

    get type() {
      return Utils.typeFromMimeType(this.blob.type);
    },

    getThumbnail: function(callback) {
      if (typeof(callback) !== 'function') {
        return;
      }

      // The thumbnail format matches the blob format.
      var type = this.blob.type;

      // The container size is set to 80*80px by default (plus border);
      // as soon as the image width and height are known, the container can be
      // extended up to 120px, either horizontally or vertically.
      var img = new Image();
      img.src = window.URL.createObjectURL(this.blob);
      img.onload = function onBlobLoaded() {
        window.URL.revokeObjectURL(img.src);

        // compute thumbnail size
        var min = MIN_THUMBNAIL_WIDTH_HEIGHT;
        var max = MAX_THUMBNAIL_WIDTH_HEIGHT;
        var width, height;
        if (img.width < img.height) {
          width = min;
          height = Math.min(img.height / img.width * min, max);
        } else {
          width = Math.min(img.width / img.height * min, max);
          height = min;
        }

        // turn this thumbnail into a dataURL
        var canvas = document.createElement('canvas');
        var ratio = Math.max(img.width / width, img.height / height);
        canvas.width = Math.round(img.width / ratio);
        canvas.height = Math.round(img.height / ratio);
        var context = canvas.getContext('2d');
        context.drawImage(img, 0, 0, width, height);
        var data = canvas.toDataURL(type);

        callback({
          width: width,
          height: height,
          data: data
        });
      };
      img.onerror = function onBlobError() {
        callback({
          width: MIN_THUMBNAIL_WIDTH_HEIGHT,
          height: MIN_THUMBNAIL_WIDTH_HEIGHT,
          error: true
        });
      };
    },

    getAttachmentSrc: function(thumbnail, tmplID) {
      // interpolate the #attachment-[no]preview-tmpl template
      thumbnail = thumbnail || {};
      var sizeL10n = this.sizeForL10n;
      return Template(tmplID).interpolate({
        type: this.type,
        errorClass: thumbnail.error ? 'corrupted' : '',
        imgData: thumbnail.data,
        fileName: this.name.slice(this.name.lastIndexOf('/') + 1),
        sizeL10nId: sizeL10n.l10nId,
        sizeL10nArgs: JSON.stringify(sizeL10n.l10nArgs)
      });
    },

    render: function(readyCallback) {
      /**
       * A <div> container suits most of the cases where we want to display an
       * MMS attachment (= icon + file name + file size). However, drafts are a
       * specific case because they are inside an editable area.
       *
       * A <div contenteditable="false"> container would be fine for drafts but
       * Gecko does not support it at the moment, see bug 685445:
       * https://bugzilla.mozilla.org/show_bug.cgi?id=685445
       *
       * By using an <iframe> for drafts, we make sure that the attachment block
       * is deletable but not editable; outside of the Compose area, a <div>
       * container is still fine -- and it's *way* faster.
       */
      var container = document.createElement(this.isDraft ? 'iframe' : 'div');

      // display the attachment in the iframe/div container
      var setAttachmentContainerSrc = (function(thumbnail) {
        thumbnail = thumbnail || {
          width: MIN_THUMBNAIL_WIDTH_HEIGHT,
          height: MIN_THUMBNAIL_WIDTH_HEIGHT,
          data: '',
          error: false
        };

        var hasPreview = (thumbnail.data && !thumbnail.error);
        if (hasPreview) {
          var borderWidth = 1; // px
          container.style.width = (thumbnail.width + 2 * borderWidth) + 'px';
          container.style.height = (thumbnail.height + 2 * borderWidth) + 'px';
        }

        var previewClass = hasPreview ? 'preview' : 'nopreview';
        var tmplID = 'attachment-' + previewClass + '-tmpl';
        container.classList.add(previewClass);

        if (this.isDraft) { // <iframe>
          // The attachment's iFrame requires access to the parent document's
          // context so that URIs for Blobs created in the parent may resolve as
          // expected.
          container.setAttribute('sandbox', 'allow-same-origin');

          var tmplSrc = Template('attachment-draft-tmpl').interpolate({
            previewClass: previewClass,
            baseURL: location.protocol + '//' + location.host + '/',
            attachmentHTML: this.getAttachmentSrc(thumbnail, tmplID)
          }, { safe: ['attachmentHTML'] });

          // append the source when it's appended to the dom and loaded
          container.addEventListener('load', function onload() {
            this.removeEventListener('load', onload);
            this.contentDocument.documentElement.innerHTML = tmplSrc;
          });

          // Attach click listeners and fire the callback when rendering is
          // complete: we can't bind `readyCallback' to the `load' event
          // listener because it would break our unit tests.
          container.addEventListener('load', iframeLoad);

          container.src = 'about:blank';
        } else { // <div>
          container.innerHTML = this.getAttachmentSrc(thumbnail, tmplID);
        }

        if (readyCallback) {
          readyCallback();
        }
      }).bind(this);

      container.className = 'attachment-container';
      container.dataset.attachmentType = this.type;

      // We special case audio to display an image of an audio attachment video
      // currently falls through this path too, we should revisit this with
      // Bug 869244 - [MMS] 'Thumbnail'/'Poster' in video attachment is needed.
      if (this.type === 'img' && this.size < MAX_THUMBNAIL_GENERATION_SIZE) {
        // TODO: store this thumbnail data (indexedDB)
        // Bug 876467 - [MMS] generate, store, and reuse image thumbnails
        this.getThumbnail(setAttachmentContainerSrc);
      } else {
        // Display the default attachment placeholder for the current type: img,
        // audio, video, other.  We have to be asynchronous to keep the
        // behaviour consistent with the thumbnail case.
        setTimeout(setAttachmentContainerSrc);
      }

      // Remember: the <iframe> content is created asynchrounously.
      return container;
    },

    view: function(options) {
      // Make sure media is openable and savable even if:
      //   - Blob mimetype is unsupported but file extension is valid.
      //   - File extenion is missing or invalid but mimetype is supported.

      var mimetype =
        MimeMapper.guessTypeFromFileProperties(this.name, this.blob.type);
      var filename = MimeMapper.ensureFilenameMatchesType(this.name, mimetype);
      var activity = new MozActivity({
        name: 'open',
        data: {
          type: mimetype,
          filename: filename,
          blob: this.blob,
          allowSave: options && options.allowSave
        }
      });
      activity.onerror = function() {
        var _ = navigator.mozL10n.get;
        console.error('error with open activity', this.error.name);
        if (this.error.name === 'ActivityCanceled') {
          return;
        }
        alert(_('attachmentOpenError'));
      };
    }
  };

  function iframeLoad(event) {
    // Bubble click events from inside the iframe.
    var iframe = event.target;
    var clickOnFrame = iframe.click.bind(iframe);

    iframe.removeEventListener('load', iframeLoad);
    navigator.mozL10n.translate(iframe.contentDocument.body);
    iframe.contentDocument.addEventListener('click', clickOnFrame);
    iframe.contentDocument.addEventListener('contextmenu', clickOnFrame);
  }

  exports.Attachment = Attachment;
}(this));
