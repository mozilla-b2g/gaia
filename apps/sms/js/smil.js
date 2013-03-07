/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SMIL = {
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
    if (!smil) {
      attachments.forEach(function(attachment, index) {
        var textIndex = workingText.length;
        var blob = attachment.content;
        if (!blob) {
          return;
        }
        var type = blob.type.split('/')[0];

        // handle text blobs by reading them and converting to text on the
        // last slide
        if (type === 'text') {
          workingText[textIndex] = '';
          readTextBlob(blob, function(event, text) {
            workingText[textIndex] = text;
            if (!activeReaders) {
              if (!slides.length) {
                slides.push({
                  text: workingText.join(' ')
                });
              } else {
                slides[slides.length - 1].text = workingText.join(' ');
              }
              exitPoint();
            }
          });
        } else {
          slides.push({
            name: attachment.location,
            blob: attachment.content
          });
        }
      });
    // handle MMS messages with SMIL
    } else {
      doc = (new DOMParser()).parseFromString(smil, 'application/xml');
      parTags = doc.documentElement.getElementsByTagName('par');
      Array.prototype.forEach.call(parTags, function(par, index) {
        var mediaElement = par.querySelector('img, video, audio');
        var textElement = par.querySelector('text');
        var slide = slides[index] = {};
        var textLocation;
        if (mediaElement) {
          // some MMS use 'cid:' as a prefix, remove it
          slide.name = mediaElement.getAttribute('src').replace(/^cid:/, '');
          slide.blob = findAttachment(slide.name).content;
        }
        if (textElement) {
          textLocation = textElement.getAttribute('src').replace(/^cid:/, '');
          readTextBlob(findAttachment(textLocation).content,
            function(event, text) {
              slide.text = text;
              exitPoint();
            }
          );
        }
      });
    }
    exitPoint();
  },
  generate: function SMIL_generate(slides) {
    var attachments = [];
    var header = '<head><layout>' +
                 '<root-layout width="320px" height="480px"/>' +
                 '<region id="Image" left="0px" top="0px"' +
                 ' width="320px" height="320px" fit="meet"/>' +
                 '<region id="Text" left="0px" top="320px"' +
                 ' width="320px" height="160px" fit="meet"/>' +
                 '</layout></head>';
    var parts = slides.map(function(slide, slideIndex) {
      var id;
      var blobType;
      // default duration to 5 seconds per slide
      var duration = 5000;
      // each slide can have a peice of media and/or text
      var media = '';
      var text = '';
      if (slide.blob) {
        blobType = slide.blob.type.split('/')[0];
        if (blobType === 'image') {
          blobType = 'img';
        }
        id = slide.name;
        media = '<' + blobType + ' src="' + id + '"/>';
        attachments.push({
          id: '<' + id + '>',
          location: id,
          content: slide.blob
        });
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
      return '<par dur="' + duration + 'ms">' + media + text + '</par>';
    });
    return {
      smil: '<smil>' + header + '<body>' + parts.join('') + '</body></smil>',
      attachments: attachments
    };
  }
};
