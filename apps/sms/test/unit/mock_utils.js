'use strict';

/* global Utils, Promise */
/* exported MockUtils */

var MockUtils = {
  // we need that this function does real work, so it's copied from the real
  // Utils.js
  camelCase: Utils.camelCase,
  date: Utils.date,
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
  getSizeForL10n: Utils.getSizeForL10n,
  getPhoneDetails: Utils.getPhoneDetails,
  removeNonDialables: Utils.removeNonDialables,
  multiRecipientMatch: Utils.multiRecipientMatch,
  probablyMatches: Utils.probablyMatches,
  getDisplayObject: Utils.getDisplayObject,
  basicContact: Utils.basicContact,
  asyncLoadRevokeURL: Utils.asyncLoadRevokeURL,
  isEmailAddress: Utils.isEmailAddress,
  closeNotificationsForThread: () => Promise.resolve(),
  imageToDataUrl: Utils.imageToDataUrl,
  debounce: Utils.debounce,
  alert: Utils.alert,
  confirm: Utils.confirm,
  Promise: Utils.Promise
};
