/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {

function getTypeFromMimeType(mime) {
  var index = mime.indexOf('/');
  var mainPart = mime.slice(0, index);
  switch (mainPart) {
    case 'image':
      return 'img';
    case 'video':
    case 'audio':
    case 'text':
      return mainPart;
    default:
      return null;
  }
}

var SMIL = window.SMIL = {

  // SMIL.parse - takes a message from the DOM API's and converts to a
  // simple array format:

  // message.smil = valid SMIL string, or falsey
  // message.attachments = []
  // message.attachments[].content = blob
  // message.attachments[].location = src attr in smil

  // callback(parsedArray):
  // parsedArray = []
  // parsedArray[].text = 'plain text'
  // parsedArray[].name = name of key
  // parsedArray[].blob = data blob

  parse: function SMIL_parse(message, callback) {
    var smil = message.smil;
    var attachments = message.attachments;
    var slides = [];
    var activeReaders = 0;
    var workingText = [];
    var doc;
    var parTags;

    function readTextBlob(blob, callback) {
      var textReader = new FileReader();
      textReader.onload = function(event) {
        activeReaders--;
        callback(event, event.target.result);
      };
      activeReaders++;
      textReader.readAsText(blob);
    }

    function exitPoint() {
      if (!activeReaders) {
        callback(slides);
      }
    }

    function findAttachment(name) {
      var index = 0;
      var length = attachments.length;

      for (; index < length; index++) {
        if (attachments[index].location === name) {
          return attachments[index];
        }
      }
      return {content: null};
    }

    // handle mms messages without smil
    // aggregate all text attachments into last slide
    function smil_parse_attachment_no_smil(attachment) {
      var textIndex = workingText.length;
      var blob = attachment.content;
      if (!blob) {
        return;
      }
      var type = getTypeFromMimeType(blob.type);

      // handle text blobs by reading them and converting to text on the
      // last slide
      if (type === 'text') {
        workingText.push('');
        readTextBlob(blob, function smil_parse_attachment_read(event, text) {
          workingText[textIndex] = text;

          // when the last reader finishs, we will join the text together
          if (!activeReaders) {
            var text = workingText.join(' ');
            if (slides.length) {
              slides[slides.length - 1].text = text;
            } else {
              slides.push({
                text: text
              });
            }
            exitPoint();
          }
        });

      // make sure the type was something we want, otherwise ignore it
      } else if (type) {
        slides.push({
          name: attachment.location,
          blob: attachment.content
        });
      }
    }

    function smil_parse_handle_par_tag(par, index) {
      var mediaElement = par.querySelector('img, video, audio');
      var textElement = par.querySelector('text');
      var slide = {};
      var textLocation;

      slides.push(slide);
      if (mediaElement) {
        // some MMS use 'cid:' as a prefix, remove it
        slide.name = mediaElement.getAttribute('src').replace(/^cid:/, '');
        slide.blob = findAttachment(slide.name).content;
      }
      if (textElement) {
        textLocation = textElement.getAttribute('src').replace(/^cid:/, '');
        readTextBlob(findAttachment(textLocation).content,
          function smil_parse_smil_attachment_read(event, text) {
            slide.text = text;
            exitPoint();
          }
        );
      }
    }

    // handle MMS messages with SMIL
    if (smil) {
      doc = (new DOMParser()).parseFromString(smil, 'application/xml');
      parTags = doc.documentElement.getElementsByTagName('par');
      Array.prototype.forEach.call(parTags, smil_parse_handle_par_tag);
    } else {
      attachments.forEach(smil_parse_attachment_no_smil);
    }
    exitPoint();
  },
  generate: function SMIL_generate(slides) {
    var attachments = [];
    const HEADER = '<head><layout>' +
                 '<root-layout width="320px" height="480px"/>' +
                 '<region id="Image" left="0px" top="0px"' +
                 ' width="320px" height="320px" fit="meet"/>' +
                 '<region id="Text" left="0px" top="320px"' +
                 ' width="320px" height="160px" fit="meet"/>' +
                 '</layout></head>';
    var parts = slides.map(function(slide, slideIndex) {
      // default duration to 5 seconds per slide
      const DURATION = 5000;

      var id;
      var blobType;
      // each slide can have a piece of media and/or text
      var media = '';
      var text = '';
      if (slide.blob) {
        blobType = getTypeFromMimeType(slide.blob.type);
        if (blobType) {
          id = slide.name;
          media = '<' + blobType + ' src="' + id + '"/>';
          attachments.push({
            id: '<' + id + '>',
            location: id,
            content: slide.blob
          });
        }
      }
      if (slide.text) {
        // Set text region.
        id = 'text_' + slideIndex;
        text = '<text src="' + id + '.txt" region="Text"/>';
        attachments.push({
          id: '<' + id + '>',
          location: id + '.txt',
          content: new Blob([slide.text], {type: 'text/plain'})
        });
      }
      return '<par dur="' + DURATION + 'ms">' + media + text + '</par>';
    });
    return {
      smil: '<smil>' + HEADER + '<body>' + parts.join('') + '</body></smil>',
      attachments: attachments
    };
  }
};

})();
