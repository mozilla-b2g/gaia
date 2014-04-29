/* global utils */
'use strict';
var contacts = window.contacts || {};

contacts.ValueSelector = (function() {
  var data,
      dom,
      contactValueSelector,
      itemTemplate,
      listContainer,
      btnCancel;

  var init = function vs_init(currentDom) {
    dom = currentDom || document;
    contactValueSelector = dom.querySelector('#contact-valueselector');
    itemTemplate = dom.querySelector('#itemdata-template-\\#i\\#');
    listContainer = dom.querySelector('#itemdata-list');

    btnCancel = dom.querySelector('#cancel-select-button');
    btnCancel.addEventListener('click', function() {
      hide();
    });

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
  };

  var show = function vs_show() {
    render();
    itemTemplate.style.display = 'none';
    contactValueSelector.classList.add('visible');
  };

  var hide = function vs_hide() {
    itemTemplate.style.display = 'block';
    contactValueSelector.classList.remove('visible');
    emptyList();
    for (var i = listContainer.childNodes.length - 1; i >= 0; i--) {
      listContainer.removeChild(listContainer.childNodes[i]);
    }
  };

  var render = function vs_render() {

    for (var i = 0; i < data.list.length; i++) {
      var itemField = {
        label: data.list[i].label,
        i: i
      };

      var template = utils.templates.render(itemTemplate, itemField);

      // Set callback function on each li element.
      var callback = data.list[i].callback;
      if (callback) {
        template.addEventListener('click', callback, false);
      }
      listContainer.appendChild(template);
    }
  };

  var emptyList = function emptyList() {
    data.list = [];
  };

  var addToList = function addToList(label, value, callback) {
    data.list.push({
      label: label,
      value: value,
      callback: callback
    });
  };

  return{
    'init': init,
    'show': show,
    'hide': hide,
    'addToList': addToList
  };
})();
