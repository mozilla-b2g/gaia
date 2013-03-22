'use strict';

var NewsletterManager = {
  load: function nlm_load() {
    loader.load('/shared/js/async_storage.js',
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
    loader.load('/ftu/js/basket-client.js', function basketLoaded() {
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
loader.load('/shared/js/l10n.js', function localized() {

  navigator.mozL10n.ready(function loadWhenIdle() {
    var idleObserver = {
      time: 5,
      onidle: function() {
        NewsletterManager.load();
        navigator.removeIdleObserver(idleObserver);
      }
    };
    navigator.addIdleObserver(idleObserver);
  });

});
