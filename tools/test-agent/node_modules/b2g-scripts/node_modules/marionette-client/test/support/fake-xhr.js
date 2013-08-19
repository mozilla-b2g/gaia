(function(window) {

  function FakeXhr() {
    this.openArgs = null;
    this.sendArgs = null;
    this.headers = {};
    this.responseHeaders = {};
  }

  FakeXhr.prototype = {
    open: function() {
      this.openArgs = arguments;
    },

    getResponseHeader: function(key) {
      return this.responseHeaders[key];
    },

    setRequestHeader: function(key, value) {
      this.headers[key] = value;
    },

    send: function() {
      this.sendArgs = arguments;
    },

    respond: function(data, code) {
      this.readyState = 4;
      this.responseHeaders['content-type'] = 'application/json';
      this.responseText = JSON.stringify(data);
      this.status = code || 200;
      this.onreadystatechange();
    }
  };

  window.FakeXhr = FakeXhr;

}(this));
