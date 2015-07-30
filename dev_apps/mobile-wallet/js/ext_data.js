'use strict';

/* globals SEUtils */
/* exported PAYMENT_IMG_SRC, NONPAYMENT_IMG_SRC, PAYMENT_APPLET_FILTER,
            NONPAYMENT_APPLET_FILTER, CARD_UNKNOWN */

(function(exports) {

  const CARD_UNKNOWN = 'img/cards/unknown.png';

  const SAMPLE_NONPAYMENT_IMG = [
    'img/cards/other-1.png',
    'img/cards/other-2.png',
    'img/cards/other-3.png'
  ];

  const SAMPLE_PAYMENT_IMG = [
    'img/cards/payment-1.png',
    'img/cards/payment-2.png',
    'img/cards/payment-3.png'
  ];

  var _getSampleImg = function(imageArray) {
    var counter = 0;
    var imgMap = {};
    return function(id) {
      var imgSrc = imgMap[id];
      if(imgSrc) {
        return imgSrc;
      }

      counter = (imageArray.length - 1) === counter ? 0 : ++counter;
      if(id) {
        imgMap[id] = imageArray[counter];
      }

      return imageArray[counter];
    };
  };

  var PAYMENT_IMG_SRC = _getSampleImg(SAMPLE_PAYMENT_IMG);
  var NONPAYMENT_IMG_SRC = _getSampleImg(SAMPLE_NONPAYMENT_IMG);

  var PAYMENT_APPLET_FILTER = function(appletData) {
    var hexAid = SEUtils.byteToHexString(appletData.aid);
    var hexState = SEUtils.byteToHexString(appletData.state);
    // hex states for payment applets
    // 1F00 - personalised, not active on Contactless interface (CLF)
    // 1F01 - personalised, active on CLF
    // 0708 - not personalised, not possible to use in payment
    return hexAid.startsWith('A000000004') &&
           (hexState === '1F00' || hexState === '1F01');
  };

  var NONPAYMENT_APPLET_FILTER = function(appletData) {
    var hexAid = SEUtils.byteToHexString(appletData.aid);
    return hexAid.startsWith('D');
  };

  exports.CARD_UNKNOWN = CARD_UNKNOWN;
  exports.PAYMENT_IMG_SRC = PAYMENT_IMG_SRC;
  exports.NONPAYMENT_IMG_SRC = NONPAYMENT_IMG_SRC;
  exports.PAYMENT_APPLET_FILTER = PAYMENT_APPLET_FILTER;
  exports.NONPAYMENT_APPLET_FILTER = NONPAYMENT_APPLET_FILTER;

}((typeof exports === 'undefined') ? window : exports));
