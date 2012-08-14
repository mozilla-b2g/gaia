var fb = window.fb || {};

if(!fb.utils) {
  fb.utils = {};

  fb.utils.getContactData = function(cid) {
    var outReq = new fb.utils.Request();

    var req = navigator.mozContacts.find({filterBy: ['id'],
                                                filterValue: cid,
                                                filterOp: 'equals'});

    req.onsuccess = function (e) {
      if(e.target.result && e.target.result.length > 0) {
        outReq.done(e.target.result[0]);
      }
      else {
        outReq.done(null);
      }
    }

    req.onerror = function(e) {
      outReq.failed(e.target.error);
    }

    return outReq;
  }

   /**
     *   Request auxiliary object to support asynchronous calls
     *
     */
     fb.utils.Request = function() {
      this.done = function(result) {
        this.result = result;
        if (typeof this.onsuccess === 'function') {
          this.onsuccess();
        }
      }

      this.failed = function(error) {
        this.error = error;
        if (typeof this.onerror === 'function') {
          this.onerror();
        }
      }
    }
}
