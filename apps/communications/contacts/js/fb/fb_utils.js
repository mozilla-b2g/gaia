'use strict';

var fb = window.fb || {};

if (!fb.utils) {
  fb.utils = {};

  fb.utils.getContactData = function(cid) {
    var outReq = new fb.utils.Request();

    var req = navigator.mozContacts.find({
      filterBy: ['id'],
      filterValue: cid,
      filterOp: 'equals'
    });

    req.onsuccess = function(e) {
      if (e.target.result && e.target.result.length > 0) {
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
  };

  // Returns the mozContact associated to a UID in FB
  fb.utils.getMozContact = function(uid) {
    var outReq = new fb.utils.Request();

    var filter = {
      filterBy: ['category'],
      filterValue: uid,
      filterOp: 'contains'
    };

    var req = navigator.mozContacts.find(filter);

    req.onsuccess = function(e) {
      if (e.target.result && e.target.result.length > 0) {
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
  };


  // Runs a query against Facebook FQL. Callback is a string!!
  fb.utils.runQuery = function(query, callback, access_token) {
    var queryService = 'https://graph.facebook.com/fql?q=';
    queryService += encodeURIComponent(query);

    var params = [fb.ACC_T + '=' + access_token,
                    'format=json', 'callback' + '=' + callback];

    var queryParams = params.join('&');

    var jsonp = document.createElement('script');
    jsonp.src = queryService + '&' + queryParams;

    document.body.appendChild(jsonp);
  };


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
    };
}
