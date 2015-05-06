/* exported STKHelper */
'use strict';

/**
 * stk_helper.js: SIM Toolkit utilities.
 */
var STKHelper = {

  getIconCanvas: function(mozStkIcon) {
    if (!mozStkIcon || !mozStkIcon.pixels ||
        !mozStkIcon.width || !mozStkIcon.height) {
      return null;
    }

    if (mozStkIcon.pixels.length < (mozStkIcon.width * mozStkIcon.height)) {
      console.error('Not enough pixels for the required dimension: ' +
        mozStkIcon.width + 'x' + mozStkIcon.height);
      return null;
    }

    if (!mozStkIcon.codingScheme) {
      mozStkIcon.codingScheme = 'basic';
    }

    var canvas = document.createElement('canvas');
    canvas.setAttribute('width', mozStkIcon.width);
    canvas.setAttribute('height', mozStkIcon.height);
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var imageData = ctx.createImageData(mozStkIcon.width, mozStkIcon.height);
    var pixel = 0, pos = 0;
    var data = imageData.data;
    for (var y = 0; y < mozStkIcon.height; y++) {
      for (var x = 0; x < mozStkIcon.width; x++) {
        data[pos++] = (mozStkIcon.pixels[pixel] & 0xFF000000) >>> 24; // Red
        data[pos++] = (mozStkIcon.pixels[pixel] & 0xFF0000) >>> 16;   // Green
        data[pos++] = (mozStkIcon.pixels[pixel] & 0xFF00) >>> 8;      // Blue
        data[pos++] = (mozStkIcon.pixels[pixel] & 0xFF);              // Alpha

        pixel++;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    return canvas;
  },

  // Helper to retrieve text from MozStkTextMessage
  getMessageText: function(stkMessage, defaultMsgL10nId, defaultMsgL10nArgs) {
    if (this.isIconSelfExplanatory(stkMessage)) {
      return '';
    }
    // stk Message could be a specific string
    var text;
    if (stkMessage === 'string' || stkMessage instanceof String) {
      text = stkMessage;
    } else {
      text = stkMessage ? stkMessage.text : '';
    }

    if (!text && defaultMsgL10nId) {
      var _ = navigator.mozL10n.get;
      text = _(defaultMsgL10nId, defaultMsgL10nArgs);
    }

    return text;
  },

  isIconSelfExplanatory: function(stkMessage) {
    return (stkMessage && stkMessage.icons && stkMessage.iconSelfExplanatory);
  },

  getFirstIconRawData: function(stkItem) {
    return stkItem.icons && stkItem.icons.length > 0 ? stkItem.icons[0] : null;
  }
};
