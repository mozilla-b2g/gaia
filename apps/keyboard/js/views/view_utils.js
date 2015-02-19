'use strict';

(function(exports) {

var ViewUtils = {
};

var scaleContext;

ViewUtils.getScale = function(text, textWidth) {
  if (!scaleContext) {
    scaleContext = document.createElement('canvas')
      .getContext('2d', { willReadFrequently: true });
    scaleContext.font = '2rem sans-serif';
  }

  var elementWidth = scaleContext.measureText(text).width;

  var s = textWidth / elementWidth;
  if (s >= 1) {
    return 1;    // 10pt font "Body Large"
  }

  if (s >= 0.8) {
    return 0.8;   // 8pt font "Body"
  }

  if (s >= 0.7) {
    return 0.7;   // 7pt font "Body Medium"
  }

  if (s >= 0.65) {
    return 0.65;  // 6.5pt font "Body Small"
  }

  if (s >= 0.6) {
    return 0.6;   // 6pt font "Body Mini"
  }

  return s;      // Something smaller than 6pt.
};

// Put the text in a span and make it fit in the container
ViewUtils.fitText = function(container, text, length, totalWidth) {
  container.textContent = '';
  if (!text) {
    return null;
  }

  var span = document.createElement('span');
  span.textContent = text;
  container.appendChild(span);

  var limit = 0.6;  // Dont use a scale smaller than this

  // container width is window width - 36 (for the dismiss button) and then
  // depending on the number of suggestions there are.
  var textWidth = (totalWidth - 36) / length | 0;
  textWidth -= 6; // 6 pixels margin on both sides
  var scale = ViewUtils.getScale(text, textWidth);

  // If the text does not fit within the scaling limit,
  // reduce the length of the text by replacing characters in
  // the middle with ...
  if (scale < limit) {
    var charactersReplaced = text.length % 2;
    while (scale < limit && charactersReplaced < text.length - 2) {
      charactersReplaced += 2;
      var halflen = (text.length - charactersReplaced) / 2;
      span.textContent = text.substring(0, halflen) +
        '…' +
        text.substring(text.length - halflen);
      scale = ViewUtils.getScale(text, textWidth);
    }
  }

  // The scaling and centering we do only works if the span
  // is display:block or inline-block
  span.style.display = 'inline-block';
  if (scale < 1) {
    span.style.width = (100 / scale) + '%';
    span.style.transformOrigin = 'left';
    span.style.transform = 'scale(' + scale + ')';
  } else {
    span.style.width = '100%';
  }

  return span;
};

exports.ViewUtils = ViewUtils;

}(window));
