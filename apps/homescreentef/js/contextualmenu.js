/*
 *  Module: Contextual menu
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telef—nica I+D S.A.U.
 *
 *  LICENSE: Apache 2.0
 *
 *  @author Cristian Rodriguez
 *
 */
var contextualMenu = (function(doc) {
  'use strict';

  var screen = null;

  function onClick(evt, callback) {
    callback(evt.target.id);
  }

  // Listening for back event for hidding the contextual menu
  window.addEventListener('keyup', function(e) {
    // We have to listen for HOME or BACK event
    if (e.keyCode === e.DOM_VK_ESCAPE || e.keyCode === e.DOM_VK_HOME) {
      contextualMenu.hide();
    }
  }, true);

  return {
    show: function(data, callback) {
      screen = doc.createElement('section');
      screen.id = 'menu-screen';

      // Prevent scroll
      screen.addEventListener('touchmove', function(e) {
        e.preventDefault();
        e.stopPropagation();
      });

      var dialog = doc.createElement('section');
      screen.appendChild(dialog);

      var title = doc.createElement('header');
      var h1 = doc.createElement('h1');
      h1.textContent = owdAppManager.getName(data.origin);
      title.appendChild(h1);
      dialog.appendChild(title);

      var options = data.options;
      var len = options.length;
      for (var o = 0; o < len; ++o) {
        var option = options[o];
        var button = doc.createElement('button');
        button.appendChild(doc.createTextNode(option.label));
        button.id = option.id;
        button.addEventListener('click', function click(evt) {
          button.removeEventListener('click', click);
          onClick(evt, callback);
        });
        dialog.appendChild(button);
      }

      // Clicking on screen we hide the contextual menu
      screen.addEventListener('click', function click(evt) {
        screen.removeEventListener('click', click);
        contextualMenu.hide();
      });

      doc.body.appendChild(screen);
    },

    hide: function() {
      if (screen !== null) {
        doc.body.removeChild(screen);
        screen = null;
      }
    }
  };

}(document));
