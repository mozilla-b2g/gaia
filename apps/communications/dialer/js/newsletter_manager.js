'use strict';

var NewsletterManager = {
  load: function nlm_load() {
    LazyLoader.load('/shared/js/async_storage.js',
                function finishLoading() {
                  NewsletterManager.start();
                });
  },

  start: function nlm_start() {
    var self = this;
    window.asyncStorage.getItem('newsletter_email', function gotItem(item) {
      if (item) { // FTU saved the email when no connection available
        if (navigator.onLine) {
          self.sendNewsletter(item);
        } else {
          window.addEventListener('online', self.sendNewsletter(item));
        }
      }
    });
  },

  sendNewsletter: function nlm_sendNewsletter(emailAddress) {
    LazyLoader.load('/ftu/js/basket-client.js', function basketLoaded() {
      Basket.send(emailAddress, function itemSent(err, data) {
        if (data && data.status == 'ok') {
          window.asyncStorage.removeItem('newsletter_email');
          window.removeEventListener('online', sendNewsletter);
        }
      });
    });
  }
};


// starting when we get a chance
var idleObserver = {
  time: 5,
  onidle: function() {
    navigator.removeIdleObserver(idleObserver);

    LazyL10n.get(function localized() {
      NewsletterManager.load();
    });
  }
};
navigator.addIdleObserver(idleObserver);
