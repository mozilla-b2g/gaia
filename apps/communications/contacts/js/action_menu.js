/* globals _ */
/* exported ActionMenu */
'use strict';

function ActionMenu(list) {
    var data,
      contactActionMenu,
      listContainer,
      btnCancel;

  function init() {
    contactActionMenu = document.querySelector('#action-menu');
    listContainer = document.getElementById('value-menu');

    data = {
      title: 'No Title',
      list: [
        {
          label: 'Dummy element',
          callback: function() {
            //nothig to do
          }
        }
      ]
    };

    // Empty dummy data
    emptyList();
  }

  this.show = function() {
    render();
    contactActionMenu.classList.remove('hide');
  };

  this.hide = function() {
    contactActionMenu.classList.add('hide');
    emptyList();
    for (var i = listContainer.childNodes.length - 1; i >= 0; i--) {
      listContainer.removeChild(listContainer.childNodes[i]);
    }
  };

  function render() {
    for (var i = 0; i < data.list.length; i++) {
      var button = document.createElement('button');
      button.textContent = data.list[i].label;

      // Set callback function on each li element.
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

  this.addToList = function (label, value, callback) {
    data.list.push({
      label: label,
      value: value,
      callback: callback
    });
  };

  init();
}