/* global LazyLoader, Basket, Promise */

'use strict';

var NewsletterManager = {
  start: function() {
    return new Promise(function (resolve, reject) {
      LazyLoader.load('/shared/js/basket_client.js', function basketLoaded() {
        Basket.getDataStore().then(function gotDS(store) {
          store.get(1).then(function(itemRetrieved) {
            if (typeof itemRetrieved === 'undefined' ||
                itemRetrieved.emailSent) {
              // either no item stored or it was already sent
              resolve();
            } else {
              // try to send the email
              sendWhenOnline(itemRetrieved.newsletter_email)
                .then(function () {
                  resolve();
                })
                .catch(function () {
                  reject();
                });
            }
          });
        }).catch(function promiseFailed(error) {
          var errMsg = 'Something failed: ' + error;
          console.error(errMsg);
          reject(new Error(errMsg));
        });
      });
    });
  },

  sendNewsletter: function(emailAddress) {
    return new Promise(function (resolve, reject) {
      LazyLoader.load('/shared/js/basket_client.js', function basketLoaded() {
        Basket.send(emailAddress, function itemSent(err, data) {
          if (err) {
            var errMsg = 'Error sending data: ' + err;
            console.error(errMsg);
            reject(new Error(errMsg));
          }

          if (data && data.status === 'ok') {
            // Once is sent, we update the DataStore
            Basket.getDataStore().then(function gotDS(store) {
              var newObj = {
                'emailSent': true
              };
              store.put(newObj, 1);
              resolve();
            }).catch(function error(err) {
              var errMsg = 'Error getting the datastore: ' + err;
              console.error(errMsg);
              reject(new Error(errMsg));
            });
          } else {
            reject(
              new Error('Error on server answer: ' + JSON.stringify(data))
            );
          }
        });
      });
    });
  }
};

function sendWhenOnline(email) {
  return new Promise(function (resolve, reject) {
    if (navigator.onLine) {
      // send it inmediately
      NewsletterManager.sendNewsletter(email).then(resolve).catch(reject);
    } else {
      // wait for connection
      window.addEventListener('online', function online() {
        window.removeEventListener('online', online);
        NewsletterManager.sendNewsletter(email);
      });
      reject();
    }
  });

}
