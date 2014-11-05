'use strict';

var MockMozNDEFRecord = function(dict) {
  this.tnf = dict ? dict.tnf : 'empty';
  this.type = dict && dict.type;
  this.id = dict && dict.id;
  this.payload = dict && dict.payload;
};

MockMozNDEFRecord.tnf = 'empty';
MockMozNDEFRecord.type = null;
MockMozNDEFRecord.id = null;
MockMozNDEFRecord.payload = null;
