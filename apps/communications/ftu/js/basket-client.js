'use strict';

// Simple Javascript client for Mozilla Basket newsletters

var Basket = {

  basketUrl: 'http://basket.mozilla.org/news/subscribe/',
  newsletterId: 'firefox-os',
  callback: null,
  xhr: null,

  responseHandler: function() {
    if (this.xhr.readyState === 4) {
      if (this.xhr.status === 200) {
        if (typeof this.callback === 'function') {
          this.callback(null, JSON.parse(this.xhr.responseText));
        }
      } else {
        if (typeof this.callback === 'function') {
          this.callback(JSON.parse(this.xhr.responseText));
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
  send: function(email, callback) {
    this.callback = callback;
    this.xhr = new XMLHttpRequest({mozSystem: true});
    this.xhr.onreadystatechange = this.responseHandler.bind(this);
    this.xhr.open('POST', this.basketUrl, true);
    this.xhr.send('email=' + email + '&newsletters=' + this.newsletterId);
  }
};

