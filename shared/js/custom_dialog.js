//XXX: Waiting for the window.showModalDialog support in B2G

'use strict';

var CustomDialog = (function() {

  var screen = null;
  var dialog = null;
  var header = null;
  var message = null;
  var yes = null;
  var no = null;

  return {
    hide: function dialog_hide() {
      if (screen === null)
        return;

      document.body.removeChild(screen);
      screen = null;
      dialog = null;
      header = null;
      message = null;
      yes = null;
      no = null;
    },

    /**
    * Method that shows the dialog
    * @param  {String} title the title of the dialog. null or empty for
    *                  no title. or you can give a object with more options
    *                  like {icon: path or empty string, title: String}.
    * @param  {String} msg message for the dialog. give a object like the
    *                  title to enable more options:
    *                  {icon: path or empty string, message: String}.
    * @param  {Object} cancel {title, callback} object when confirm.
    * @param  {Object} confirm {title, callback} object when cancel.
    */
    show: function dialog_show(title, msg, cancel, confirm) {
      if (screen === null) {
        screen = document.createElement('form');
        screen.setAttribute('role', 'dialog');
        screen.setAttribute('data-type', 'confirm');
        screen.id = 'dialog-screen';

        dialog = document.createElement('section');
        screen.appendChild(dialog);

        // Create a reusable function to decorate elements with all
        // possible options, instead of scattering similar code about
        // everywhere.
        //
        // It's also possible to be extended with more usable decorating
        // options and elements.
        //
        // 'title'|'message' -> Object|String -> dialog -> the element
        // -> the decorated element
        var decorateWithOptions = function cd_decorateWithOptions(type, options,
                                                                  elm, dialog) {
          if ('string' === typeof options) {
            elm.textContent = options;
            return elm;
          }

          var text = options[type];
          var icon = options.icon;
          elm.textContent = text;

          if (icon && '' !== icon) {
            var iconImg = new Image();
            iconImg.src = icon;
            iconImg.classList.add('custom-dialog-' + type + '-icon');

            // Icons usually insert as the first element.
            elm.insertBefore(iconImg, elm.firstChild);
          }
          // More decorating options goes here.

          return elm;
        };

        header = document.createElement('h1');
        header.id = 'dialog-title';
        if (title && title != '') {
          header = decorateWithOptions('title', title, header, dialog);
        }
        dialog.appendChild(header);

        message = document.createElement('p');
        message.id = 'dialog-message';
        message = decorateWithOptions('message', msg, message, dialog);
        dialog.appendChild(message);

        var menu = document.createElement('menu');
        menu.dataset['items'] = 1;

        no = document.createElement('button');

        // The default type of the button element is "Submit",
        // and form submit in system app would make system app reload.
        no.type = 'button';

        var noText = document.createTextNode(cancel.title);
        no.appendChild(noText);
        no.id = 'dialog-no';
        no.addEventListener('click', clickHandler);
        menu.appendChild(no);

        if (confirm) {
          menu.dataset['items'] = 2;
          yes = document.createElement('button');

          // The default type of button element is "Submit",
          // and form submit in system app would make system app reload.
          yes.type = 'button';

          var yesText = document.createTextNode(confirm.title);
          yes.appendChild(yesText);
          yes.id = 'dialog-yes';

          //confirm can be with class "danger" or "recommend"
          //the default is "danger"
          yes.className = confirm.recommend ? 'recommend' : 'danger';

          yes.addEventListener('click', clickHandler);
          menu.appendChild(yes);
        }
        else { // 1 button, should be full.
          no.classList.add('full');
        }

        screen.appendChild(menu);

        document.body.appendChild(screen);
      }

      // Make the screen visible
      screen.classList.add('visible');

      // This is the event listener function for the buttons
      function clickHandler(evt) {

        // Hide the dialog
        screen.classList.remove('visible');

        // Call the appropriate callback, if it is defined
        if (evt.target === yes && confirm.callback) {
          confirm.callback();
        } else if (evt.target === no && cancel.callback) {
          cancel.callback();
        }
      }
    }
  };
}());

