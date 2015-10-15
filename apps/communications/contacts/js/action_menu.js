/* exported ActionMenu */
'use strict';

function ActionMenu(title) {
  var data;
  var contactActionMenu;
  var listContainer;
  var btnCancel;
  var titleId = title;

  function init() {
    contactActionMenu = document.getElementById('action-menu');
    // Prevent submit in the form
    contactActionMenu.addEventListener('submit', function(evt) {
      evt.preventDefault();
    });

    if (titleId) {
      contactActionMenu.querySelector('#org-title').setAttribute(
        'data-l10n-id', titleId);
    }
    listContainer = document.getElementById('value-menu');

    data = {
      list: []
    };
  }

  this.show = function() {
    render(this);
    contactActionMenu.classList.remove('hide');
  };

  this.hide = function() {
    contactActionMenu.classList.add('hide');
    emptyList();
    listContainer.innerHTML = '';
  };

  function render(self) {
    for (var i = 0, l = data.list.length; i < l; i++) {
      var button = document.createElement('button');
      navigator.mozL10n.setAttributes(button,
                                      data.list[i].labelL10n.id,
                                      data.list[i].labelL10n.args);

      // Set callback function on each button element.
      var callback = data.list[i].callback;
      if (callback) {
        button.addEventListener('click', callback, false);
      }

      listContainer.appendChild(button);
    }

    btnCancel = document.createElement('button');
    btnCancel.setAttribute('data-l10n-id', 'cancel');

    btnCancel.addEventListener('click', function() {
      self.hide();
    });

    listContainer.appendChild(btnCancel);
  }

  function emptyList() {
    data.list = [];
  }

  this.addToList = function (labelL10n, callback) {
    var self = this;
    data.list.push({
      labelL10n: labelL10n,
      callback: function() {
        callback();
        self.hide();
      }
    });
  };

  init();
}
