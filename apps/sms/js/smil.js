/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */


(function() {
'use strict';

var runsafefilename = /[^a-zA-Z0-9.]/g;

// For utilizing sending/receiving DOM API, we need to handle 2 basic object
// first: SMIL document and attachment. SMIL document is used for
// representing the layout of the mms message, and attachment contains media
// source and text. In mms message layout, one message could be split into
// one or more slides. One slide could contain at most one media with/without
// a text string. For example:

/*
Layout of a mms message with 3 slides
===================
 ---------
 | img 1 |
 ---------   <- Slide 1
 string 1

 ===================
 ---------
 | img 2 |
 ---------   <- Slide 2


 ===================
 -----------
 | video 1 |
 ----------- <- Slide 3
 string 2

 ===================

*/

// In this case, all the media files(img1/img2/video1) and text string
// (string1/string2) will be converted into 5 attachments, and SMIL should
// illustrate that this mms message contains 3 slides and the attachment's
// name/layout... in each slide. Here we provide parse and generate utils
// for developers to focus on the necessary information in slides.


// this is a reduce function applied to the array of slides passed to
// SMIL.generate - data will have an attachments and slides array
// slide will be a single "slide", which can have text and an attachment
// See the description of these formats in the comment before
function SMIL_generateSlides(data, slide, slideIndex) {
  // default duration to 5 seconds per slide
  const DURATION = 5000;

  var id;
  var blobType;
  // each slide can have a piece of media and/or text
  var media = '';
  var text = '';
  if (slide.blob) {
    blobType = Utils.typeFromMimeType(slide.blob.type);
    if (blobType) {
      // just to be safe, remove any non-standard characters from the filenam
      id = slide.name.replace(runsafefilename, '');
      id = SMIL_generateUniqueLocation(data, id);
      media = '<' + blobType + ' src="' + id + '" region="Image"/>';
      data.attachments.push({
        id: '<' + id + '>',
        location: id,
        content: slide.blob
      });
    }
  }
  if (slide.text) {
    // Set text region.
    id = 'text_' + slideIndex + '.txt';
    text = '<text src="' + id + '" region="Text"/>';
    data.attachments.push({
      id: '<' + id + '>',
      location: id,
      content: new Blob([slide.text], {type: 'text/plain'})
    });
  }
  data.parts.push('<par dur="' + DURATION + 'ms">' + media + text + '</par>');
  return data;
}

function SMIL_generateUniqueLocation(data, location) {
  function SMIL_uniqueLocationMatches(attachment) {
    return attachment.location === location;
  }
  var index;
  while (data.attachments.some(SMIL_uniqueLocationMatches)) {
    index = location.lastIndexOf('.');
    if (index === -1) {
      index = location.length;
    }
    location = location.slice(0, index) + '_' + location.slice(index);
  }
  return location;
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
    var attachmentsNotFound = false;
    var workingText = [];
    var doc;
    var parTags;

    function readTextBlob(blob, callback) {

      // short circuit on null blobs
      if (!blob) {
        return callback('');
      }

      var textReader = new FileReader();
      textReader.onload = function(event) {
        activeReaders--;
        callback(event, event.target.result);
      };
      textReader.onerror = function(event) {
        console.error('Error reading text blob');
        activeReaders--;
        callback(event, '');
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

      // strip the cid: prefix from some MMS encoders
      name = name.replace(/^cid:/, '');

      for (; index < length; index++) {
        if (attachments[index].location === name ||
            attachments[index].id === '<' + name + '>') {
          return attachments[index];
        }
      }
      return null;
    }

    // handle mms messages without smil
    // aggregate all text attachments into last slide
    function SMIL_parseWithoutSMIL(attachment) {
      var textIndex = workingText.length;
      var blob = attachment.content;
      if (!blob) {
        return;
      }
      var type = Utils.typeFromMimeType(blob.type);

      // handle text blobs by reading them and converting to text on the
      // last slide
      if (type === 'text') {
        workingText.push('');
        readTextBlob(blob, function SMIL_parseAttachmentRead(event, text) {
          workingText[textIndex] = text;

          // when the last reader finishs, we will join the text together
          if (!activeReaders) {
            text = workingText.join(' ');
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

    function SMIL_parseHandleParTag(par, index) {
      // stop parsing as soon as we fail to find one attachment
      if (attachmentsNotFound) {
        return;
      }

      var mediaElement = par.querySelector('img, video, audio');
      var textElement = par.querySelector('text');
      var slide = {};
      var attachment;
      var src;

      slides.push(slide);
      if (mediaElement) {
        src = mediaElement.getAttribute('src');
        attachment = findAttachment(src);
        if (attachment) {
          slide.name = attachment.location;
          slide.blob = attachment.content;
        } else {
          attachmentsNotFound = true;
        }
      }
      if (textElement) {
        src = textElement.getAttribute('src');
        attachment = findAttachment(src);
        if (attachment) {
          readTextBlob(attachment.content,
            function SMIL_parseSMILAttachmentRead(event, text) {
              slide.text = text;
              exitPoint();
            }
          );
        } else {
          attachmentsNotFound = true;
        }
      }
    }

    // handle MMS messages with SMIL
    if (smil) {
      doc = (new DOMParser()).parseFromString(smil, 'application/xml');
      parTags = doc.documentElement.getElementsByTagName('par');
      Array.prototype.forEach.call(parTags, SMIL_parseHandleParTag);
    }

    // handle MMS attachments without SMIL / malformed SMIL
    if (!smil || attachmentsNotFound || !slides.length) {
      // reset slides in the attachments not found case
      slides = [];
      attachments.forEach(SMIL_parseWithoutSMIL);
    }
    exitPoint();
  },

  // SMIL.generate - takes a array with slides and return smil string and
  // attachment array.
  generate: function SMIL_generate(slides) {
    const HEADER = '<head><layout>' +
                 '<root-layout width="320px" height="480px"/>' +
                 '<region id="Image" left="0px" top="0px"' +
                 ' width="320px" height="320px" fit="meet"/>' +
                 '<region id="Text" left="0px" top="320px"' +
                 ' width="320px" height="160px" fit="meet"/>' +
                 '</layout></head>';

    // generate html from each slide while storing the actual attachment
    // in the attachments array.
    var data = slides.reduce(SMIL_generateSlides, {
      attachments: [],
      parts: []
    });

    // join the html parts together
    data.smil = '<smil>' + HEADER + '<body>' +
                data.parts.join('') +
                '</body></smil>';

    // the API doesn't care about 'parts', clean it up
    delete data.parts;

    return data;
  }
};

})();
