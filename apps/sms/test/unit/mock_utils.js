'use strict';

var MockUtils = {
  // we need that this function does real work, so it's copied from the real
  // Utils.js
  camelCase: Utils.camelCase,
  date: Utils.date,
  startTimeHeaderScheduler: function() {},
  Template: Utils.Template,
  getFontSize: function() {
    return 12;
  },
  getDayDate: Utils.getDayDate,
  getFormattedHour: Utils.getFormattedHour,
  updateTimeHeaders: function() {},
  // real code needed here to map types
  typeFromMimeType: Utils.typeFromMimeType,
  escapeHTML: Utils.escapeHTML
};
