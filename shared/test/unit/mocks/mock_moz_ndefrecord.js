'use strict';

var MockMozNDEFRecord = function(dict) {
  this.tnf = dict ? dict.tnf : 0;
  this.type = dict && dict.type;
  this.id = dict && dict.id;
  this.payload = dict && dict.payload;
};

MockMozNDEFRecord.tnf = 0x0;
MockMozNDEFRecord.type = null;
MockMozNDEFRecord.id = null;
MockMozNDEFRecord.payload = null;
