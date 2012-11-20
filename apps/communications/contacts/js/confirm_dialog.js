'use strict';

var ConfirmDialog = (function() {

  var doc = (parent.location === window.location) ?
      document : parent.document;
  var screen = doc.getElementById('confirmation-message');
  var titleNode = screen.querySelector('h1');
  var messageNode = screen.querySelector('p');
  var action1Node = screen.querySelector('button:nth-of-type(1)');
  var action2Node = screen.querySelector('button:nth-of-type(2)');

  return {
    hide: function dialog_hide() {
      // Reset the 'confirmation-message' element and its children to their
      // initial values and hide it.
      titleNode.textContent = '';
      titleNode.classList.remove('hide');
      messageNode.textContent = '';
      messageNode.classList.remove('hide');
      action1Node.textContent = '';
      action1Node.classList.remove('danger');
      action1Node.classList.remove('full');
      action1Node.classList.remove('hide');
      action1Node.removeEventListener('click', action1Node.callback);
      action2Node.textContent = '';
      action2Node.classList.remove('danger');
      action2Node.classList.remove('full');
      action2Node.classList.remove('hide');
      action2Node.removeEventListener('click', action2Node.callback);
      screen.classList.add('hide');
    },

    /**
    * Method that shows the dialog
    * @param  {String} title the title of the dialog. null or empty for
    *                        no title.
    * @param  {String} msg message for the dialog.
    * @param  {Object} action1 {title, isDanger, callback} object.
    * @param  {Object} action2 {title, isDanger, callback} object.
    */
    show: function dialog_show(title, msg, action1, action2) {
      if (title) {
        titleNode.textContent = title;
      } else {
        titleNode.classList.add('hide');
      }
      if (msg) {
        messageNode.textContent = msg;
      } else {
        messageNode.classList.add('hide');
      }
      if (action1) {
        if (action1.title) {
          action1Node.textContent = action1.title;
        }
        if (action1.isDanger) {
          action1Node.classList.add('danger');
        }
        if (action1.callback) {
          action1Node.addEventListener('click', action1.callback);
          // To remove the listener on hide.
          action1Node.callback = action1.callback;
        }
        if (!action2) {
          action2Node.classList.add('hide');
          action1Node.classList.add('full');
        }
      }
      if (action2) {
        if (action2.title) {
          action2Node.textContent = action2.title;
        }
        if (action2.isDanger) {
          action2Node.classList.add('danger');
        }
        if (action2.callback) {
          action2Node.addEventListener('click', action2.callback);
          // To remove the listener on hide.
          action2Node.callback = action2.callback;
        }
        if (!action1) {
          action1Node.classList.add('hide');
          action2Node.classList.add('full');
        }
      }
      screen.classList.remove('hide');
    }
  };
}());
