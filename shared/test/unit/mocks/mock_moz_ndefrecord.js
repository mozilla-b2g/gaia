'use strict';

var MockMozNDEFRecord = function(tnf, type, id, payload) {
  this.tnf = tnf;
  this.type = type;
  this.id = id;
  this.payload = payload;
};

MockMozNDEFRecord.tnf = 0x0;
MockMozNDEFRecord.type = null;
MockMozNDEFRecord.id = null;
MockMozNDEFRecord.payload = null;
