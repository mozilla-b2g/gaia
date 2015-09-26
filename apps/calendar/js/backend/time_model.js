// this module is used only to keep the required data from the frontend
// timeController; so far it only implements the data needed by dayObserver
define(function(require, exports, module) {
'use strict';

var Responder = require('common/responder');
var isSameDate = require('common/calc').isSameDate;
var mixIn = require('common/object').mixIn;

exports = module.exports = new Responder();

exports.month = null;

exports.update = function(data) {
  var { month } = exports;
  if (!month || !isSameDate(month, data.month)) {
    exports.emit('monthChange', data.month, month);
  }
  mixIn(exports, data);
};

});
