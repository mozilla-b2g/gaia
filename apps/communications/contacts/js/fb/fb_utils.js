'use strict';

var fb = window.fb || {};

if (!fb.utils) {
  fb.utils = {};

  var TIMEOUT_QUERY = 15000;

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

  fb.utils.getAllFbContacts = function() {
    var outReq = new fb.utils.Request();

    window.setTimeout(function get_all_fb_contacts() {
      var filter = {
      filterValue: fb.CATEGORY,
      filterOp: 'contains',
      filterBy: ['category']
      };

      var req = navigator.mozContacts.find(filter);

      req.onsuccess = function(e) {
        outReq.done(e.target.result);
      }

      req.onerror = function(e) {
        outReq.failed(e.target.error);
      }
    }, 0);

    return outReq;
  }


  fb.utils.getNumFbContacts = function() {
    var outReq = new fb.utils.Request();

    window.setTimeout(function get_num_fb_contacts() {
      var req = fb.utils.getAllFbContacts();

      req.onsuccess = function() {
        outReq.done(req.result.length);
      }

      req.onerror = function() {
        outReq.failed(req.error);
      }
    }, 0);

    return outReq;
  }

  // Runs a query against Facebook FQL. Callback is a string!!
  fb.utils.runQuery = function(query, callback, access_token) {
    var queryService = 'https://graph.facebook.com/fql?q=';
    queryService += encodeURIComponent(query);

    var params = [fb.ACC_T + '=' + access_token,
                    'format=json'];

    var queryParams = params.join('&');

    var remote = queryService + '&' + queryParams;

    var xhr = new XMLHttpRequest({mozSystem: true});

    xhr.open('GET', remote, true);
    xhr.responseType = 'json';

    xhr.timeout = TIMEOUT_QUERY;

    xhr.onload = function(e) {
      if (xhr.status === 200 || xhr.status === 0) {
        if (callback && typeof callback.success === 'function')
          callback.success(xhr.response);
      }
      else {
        window.console.error('FB: Error executing query. Status: ', xhr.status);
        if (callback && typeof callback.error === 'function')
          callback.error();
      }
    }

    xhr.ontimeout = function(e) {
      window.console.error('FB: Timeout!!! while executing query', query);
      if (callback && typeof callback.timeout === 'function')
        callback.timeout();
    }

    xhr.onerror = function(e) {
      window.console.error('FB: Error while executing query', e);
      if (callback && typeof callback.error === 'function')
        callback.error();
    }

    xhr.send();
  };


   /**
     *   Request auxiliary object to support asynchronous calls
     *
     */
     fb.utils.Request = function() {
      this.done = function(result) {
        this.result = result;
        if (typeof this.onsuccess === 'function') {
          var ev = {};
          ev.target = this;
          this.onsuccess(ev);
        }
      }

      this.failed = function(error) {
        this.error = error;
        if (typeof this.onerror === 'function') {
          var ev = {};
          ev.target = this;
          this.onerror(ev);
        }
      }
    };
}
