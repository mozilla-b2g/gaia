/* globals _ */
/* exported ActionMenu */
'use strict';

function ActionMenu(list) {
  var data;
  var contactActionMenu;
  var listContainer;
  var btnCancel;

  function init() {
    contactActionMenu = document.getElementById('action-menu');
    listContainer = document.getElementById('value-menu');

    data = {
      list: []
    };
  }

  this.show = function() {
    render();
    contactActionMenu.classList.remove('hide');
  };

  this.hide = function() {
    contactActionMenu.classList.add('hide');
    emptyList();
    listContainer.innerHTML = '';
  };

  function render() {
    for (var i = 0, l = data.list.length; i < l; i++) {
      var button = document.createElement('button');
      button.textContent = data.list[i].label;

      // Set callback function on each button element.
      var callback = data.list[i].callback;
      if (callback) {
        button.addEventListener('click', callback, false);
      }

      listContainer.appendChild(button);
    }

    btnCancel = document.createElement('button');
    btnCancel.textContent = _('cancel');

    btnCancel.addEventListener('click', function() {
      this.hide();
    });

    listContainer.appendChild(btnCancel);
  }

  function emptyList() {
    data.list = [];
  }

  this.addToList = function (label, callback) {
    data.list.push({
      label: label,
      callback: callback
    });
  };

  init();
}
