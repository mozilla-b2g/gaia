/*global Utils, WBMP, TextEncoder */

(function() {
'use strict';

// characters not allowed in smil filenames
var unsafeFilenamePattern = /[^a-zA-Z0-9_#.()?&%-]/g;

// This encoder is aimed for encoding the string by 'utf-8'.
var encoder = new TextEncoder('UTF-8');

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
  var name = '';
  if (slide.blob) {
    blobType = Utils.typeFromMimeType(slide.blob.type);
    if (blobType) {
      var tagName = tagNameFromBlobType(blobType);
      var region = 'region="Image"';
      // For attachment type 'ref' the region is not set
      if (tagName === 'ref') {
        region = '';
      }
      name = slide.name.substr(slide.name.lastIndexOf('/') + 1);
      // just to be safe, remove any non-standard characters from the filename
      name = name.replace(unsafeFilenamePattern, '#');
      name = SMIL_generateUniqueLocation(data, name);
      media = '<' + tagName + ' src="' + name + '" ' + region + '/>';
      data.attachments.push({
        id: '<' + name + '>',
        location: name,
        content: slide.blob
      });
    }
  }
  if (slide.text) {
    // Set text region.
    id = 'text_' + slideIndex + '.txt';
    text = '<text src="' + id + '" region="Text"/>';

    // The text of the content blob should always be encoded by 'utf-8'.
    data.attachments.push({
      id: '<' + id + '>',
      location: id,
      content: new Blob([encoder.encode(slide.text)], {type: 'text/plain'})
    });
  }
  data.parts.push('<par dur="' + DURATION + 'ms">' + media + text + '</par>');
  return data;
}

// Return a proper tag name depending on the blob type
function tagNameFromBlobType(blobType) {
  var out;

  switch(blobType) {
    case 'vcard':
      out = 'ref';
    break;

    default:
      out = blobType;
  }

  return out;
}

function SMIL_generateUniqueLocation(data, location) {
  var extension, name, result;

  // Need to add reference spec here
  var FILENAME_LIMIT = 40;

  // if the location is already being used by the attachment
  function SMIL_uniqueLocationMatches(attachment) {
    return attachment.location === result;
  }

  // Check if a file extension exists
  // Cache index of last non-extension portion of the filename
  var index = location.lastIndexOf('.');
  if (index === -1) {
    name = location;
    // Set to empty string so we can check length and append it to things
    extension = '';
  } else {
    // Cache potential file extension
    extension = location.slice(index);
    name = location.slice(0, index);
  }

  // First truncate below the limit to make de-duplicating worthwhile
  if (name.length + extension.length > FILENAME_LIMIT) {
    name = name.slice(0, FILENAME_LIMIT - extension.length);
  }
  result = name + extension;

  var duplicateIndex = 2;
  // If result is identical to any other attached files
  // add a duplicate marker and recheck the length
  while (data.attachments.some(SMIL_uniqueLocationMatches)) {
    var truncIndex = 0;
    // Construct a de-deuplicated name with the extention and
    // update duplicate index in case de-duplicated name is already chosen
    result = name + '_' + duplicateIndex++ + extension;
    // Truncate until the name (no longer needs to be de-duplicated)
    // and extension are below the limit
    while (result.length > FILENAME_LIMIT) {
      duplicateIndex = 2;
      name = name.slice(0, --truncIndex);
      result = name + extension;
    }
  }
  return result;
}

window.SMIL = {

  // SMIL.parse - takes a message from the DOM API's and converts to a
  // simple array format:

  // message.smil = valid SMIL string, or falsey
  // message.attachments = []
  // message.attachments[].content = blob
  // message.attachments[].location = src attr in smil

  // Promise.resolve(parsedArray):
  // parsedArray = []
  // parsedArray[].text = 'plain text'
  // parsedArray[].name = name of key
  // parsedArray[].blob = data blob

  parse: function SMIL_parse(message) {
    var smil = message.smil;
    var attachments = message.attachments;
    var slides = [];
    var attachmentsNotFound = false;
    var smilMismatched = false;
    var doc;
    var parTags;

    function readTextBlob(blob) {
      // short circuit on null blobs
      if (!blob) {
        return Promise.resolve('');
      }

      var defer = Utils.Promise.defer();

      var textReader = new FileReader();
      textReader.onload = function(event) {
        defer.resolve(event.target.result);
      };
      textReader.onerror = function(event) {
        console.error('Error reading text blob');
        defer.resolve('');
      };

      // The text blob must be encoded as 'utf-8' by Gecko.
      textReader.readAsText(blob, 'UTF-8');

      return defer.promise;
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

    function convertWbmpToPng(slide) {
      var defer = Utils.Promise.defer();

      var reader;
      slide.name = slide.name.slice(0, -5) + '.png';
      reader = new FileReader();
      reader.onload = function(event) {
        WBMP.decode(event.target.result, function callback(blob) {
          slide.blob = blob;
          defer.resolve();
        });
      };
      reader.onerror = function(event) {
        console.error('Error reading text blob');
        defer.resolve();
      };
      reader.readAsArrayBuffer(slide.blob);

      return defer.promise;
    }

    // handle mms messages without smil
    // Display the attachments of the mms message in order
    function SMIL_parseWithoutSMIL(attachment, idx) {
      var blob = attachment.content;
      if (!blob) {
        return Promise.resolve();
      }

      var result;

      var type = Utils.typeFromMimeType(blob.type);

      // handle text blobs (plain text blob only) by reading them and
      // converting to text on the last slide
      if (type === 'text' && blob.type === 'text/plain') {
        result = readTextBlob(blob).then((text) => {
          slides[idx] = {
            text: text
          };
        });

      // make sure the type was something we want, otherwise ignore it
      } else if (type) {
        var slide = { name: attachment.location, blob: attachment.content };
        if (slide.name && slide.name.slice(-5) === '.wbmp') {
          result = convertWbmpToPng(slide);
        }
        slides[idx] = slide;
      }

      return result || Promise.resolve();
    }

    function SMIL_parseHandleParTag(par, index) {
      // stop parsing as soon as we fail to find one attachment
      if (attachmentsNotFound) {
        return;
      }

      var mediaElements = par.querySelectorAll('img, video, audio, ref');
      var textElement = par.querySelector('text');
      var attachment, src;

      var promises = Array.from(mediaElements).map((element) => {
        var result;

        var slide = {};
        src = element.getAttribute('src');
        attachment = findAttachment(src);
        if (attachment) {
          // every media attachment starts its own slide in our format
          slide = { name: attachment.location, blob: attachment.content };
          slides.push(slide);
          if (slide.name && slide.name.slice(-5) === '.wbmp') {
            result = convertWbmpToPng(slide);
          }
        } else {
          attachmentsNotFound = true;
        }

        return result || Promise.resolve();
      });

      if (textElement) {
        src = textElement.getAttribute('src');
        attachment = findAttachment(src);

        if (attachment) {

          // check for text on the last slide
          var slide = slides[slides.length - 1];

          // if the last slide doesn't exist, or the last slide has text
          // already, we create a new slide to store the text
          if (!slide || typeof slide.text !== 'undefined') {
            slide = {};
            slides.push(slide);
          }
          // Init slide text to avoid text replaced by later blob
          slide.text = '';

          // read the text blob, and store it in the "slide" this function
          // will hold onto
          promises.push(
            readTextBlob(attachment.content).then(
              (text) => slide.text = text
            )
          );
        } else {
          attachmentsNotFound = true;
        }
      }

      return Promise.all(promises);
    }

    var result;

    // handle MMS messages with SMIL
    if (smil) {
      doc = (new DOMParser()).parseFromString(smil, 'application/xml');
      parTags = doc.documentElement.getElementsByTagName('par');

      // Check if attachments are all listed in smil.
      var elements = Array.reduce(
        parTags, (count, par) => count + par.childElementCount, 0
      );

      if (elements !== attachments.length) {
        smilMismatched = true;
      } else {
        result = Promise.all(Array.from(parTags).map(SMIL_parseHandleParTag));
      }
    }

    // handle MMS attachments without SMIL / malformed SMIL
    if (!smil || attachmentsNotFound || !slides.length || smilMismatched) {
      // reset slides in the attachments not found case
      slides = Array(attachments.length);
      result = Promise.all(attachments.map(SMIL_parseWithoutSMIL));
    }

    return (result || Promise.resolve()).then(() => slides);
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
