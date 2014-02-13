'use strict';

// Simple Javascript client for Mozilla Basket newsletters

var Basket = {

  basketUrl: 'https://basket.mozilla.org/news/subscribe/',
  newsletterId: 'firefox-os',
  callback: null,
  xhr: null,
  itemId: 'newsletter_email',

  responseHandler: function b_responseHandler() {
    if (this.xhr.readyState === 4) {
      if (this.xhr.status === 200) {
        if (typeof this.callback === 'function') {
          this.callback(null, JSON.parse(this.xhr.responseText));
        }
      } else {
        if (typeof this.callback === 'function') {
          if (this.xhr.responseText) {
            this.callback(JSON.parse(this.xhr.responseText));
          } else {
            this.callback('Unknown error');
          }
        }
      }
    }
  },

  /**
   * Send data to Mozilla Basket.
   *
   * @param {String} [email] email we want to add to the newsletter.
   *
   * @param {Function} [callback] first argument is error, second
   *                            is result of operation or null
   *                            in the error case.
   */
  send: function b_send(email, callback) {
    var params = 'email=' + encodeURIComponent(email) +
                 '&newsletters=' + this.newsletterId;
    this.callback = callback;
    this.xhr = new XMLHttpRequest({mozSystem: true});
    this.xhr.onreadystatechange = this.responseHandler.bind(this);
    this.xhr.open('POST', this.basketUrl, true);
    this.xhr.setRequestHeader('Content-type',
                              'application/x-www-form-urlencoded');
    this.xhr.setRequestHeader('Content-length', params.length);
    this.xhr.setRequestHeader('Connection', 'close');
    this.xhr.send(params);
  },

  store: function b_store(email, callback) {
    window.asyncStorage.setItem(this.itemId, email, function stored() {
      if (callback) {
        callback();
      }
    });
  }

};

