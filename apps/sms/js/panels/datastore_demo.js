/* global MessagesDatastore */

/* exported DatastoreDemoPanel */

'use strict';

(function(exports) {
  var DatastoreDemoPanel = {
    afterEnter: function() {
     /* MessagesDatastore.get(1).then(function(message) {
        alert(message.type + ': ' + message.body || message.smil);
      }).catch(function(e) {
        alert('Error (get): ' + e.message || e);
      });
*/
   
      MessagesDatastore.getLength().then(function(length) {
        alert('Length: ' + length);
      }).catch(function(e) {
        alert('Error (getLength): ' + e.message || e);
      });

      MessagesDatastore.on('onRead', function(message) {
        alert('OnRead!!!!!! Message id is: ' + message.id);
      });

      var button = document.createElement('button'),
          input = document.createElement('input');

      button.textContent = 'Mark as read';
      button.style.zIndex = '999';
      button.style.position = 'absolute';
      button.style.left = '0';
      button.style.top = '10rem';

      input.type = 'text';
      input.style.zIndex = '999';
      input.style.position = 'absolute';
      input.style.left = '0';
      input.style.top = '20rem';

      var listButton = document.createElement('button');

      listButton.textContent = 'Get list';
      listButton.style.zIndex = '999';
      listButton.style.position = 'absolute';
      listButton.style.left = '0';
      listButton.style.top = '15rem';

      document.getElementById('main-wrapper').appendChild(button);
      document.getElementById('main-wrapper').appendChild(listButton);
      document.getElementById('main-wrapper').appendChild(input);

      button.addEventListener('click', function() {
        MessagesDatastore.markAsRead(+input.value).then(function() {
          alert('Marked as read: yes!');
        }).catch(function(e) {
          alert('Error (markAsRead): ' + e.message || e);
        });
      });

      listButton.addEventListener('click', function() {
        MessagesDatastore.list().then(function(list) {
          list.forEach(function(message) {
            input.value = input.value + message.id + ', ';
          });
        }).catch(function(e) {
          alert('Error (list): ' + e.message || e);
        });
      });


    }
  };

  exports.DatastoreDemoPanel = DatastoreDemoPanel;
})(window);
