var MockSimContactsImporter = function(n) {
  this.number = n || 0;
};

MockSimContactsImporter.prototype = {
  set onread(cb) {
    this.readCb = cb;
  },
  set onimported(cb) {

  },
  set onfinish(cb) {
    this.finishCb = cb;
  },
  start: function() {
    this.readCb(this.number);
    this.finishCb();
  }
};
