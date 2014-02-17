'use strict';

/* global Utils */
/* exported MockUtils */

var MockUtils = {
  // we need that this function does real work, so it's copied from the real
  // Utils.js
  camelCase: Utils.camelCase,
  date: Utils.date,
  getFontSize: function() {
    return 12;
  },
  getDayDate: Utils.getDayDate,
  getHeaderDate: Utils.getHeaderDate,
  getFormattedHour: Utils.getFormattedHour,
  // real code needed here to map types
  typeFromMimeType: Utils.typeFromMimeType,
  escapeRegex: Utils.escapeRegex,
  params: Utils.params,
  getContactDisplayInfo: Utils.getContactDisplayInfo,
  getContactDetails: Utils.getContactDetails,
  getResizedImgBlob: Utils.getResizedImgBlob,
  getCarrierTag: Utils.getCarrierTag,
  removeNonDialables: Utils.removeNonDialables,
  probablyMatches: Utils.probablyMatches,
  getDisplayObject: Utils.getDisplayObject,
  basicContact: Utils.basicContact,
  asyncLoadRevokeURL: Utils.asyncLoadRevokeURL
};
