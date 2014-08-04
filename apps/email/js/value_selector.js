/*
!! Warning !!
  This value selector uses the form layout as specified in
  shared/style/value_selector/index.html. If that changes, or its associated
  styles change, then this file or value_selector.html or vsl/index.html may
  need to be adjusted.

How to:
  var prompt1 = new ValueSelector('Dummy title 1', [
    {
      label: 'Dummy element',
      callback: function() {
        alert('Define an action here!');
      }
    }
  ]);

  prompt1.addToList('Another button', 'depth0',
                    true, function(){alert('Another action');});
  prompt1.show();
*/
/*jshint browser: true */
/*global alert, define */
define(function(require) {
'use strict';

var FOLDER_DEPTH_CLASSES = require('folder_depth_classes'),
    formNode = require('tmpl!cards/value_selector.html'),
    itemTemplateNode = require('tmpl!cards/vsl/item.html');

// Used for empty click handlers.
function noop() {}

function ValueSelector(title, list) {
  var init, show, hide, render, setTitle, emptyList, addToList,
      data;

  init = function() {
    data = {
      title: 'No Title',
      list: [
        {
          label: 'Dummy element',
          callback: function() {
            alert('Define an action here!');
          }
        }
      ]
    };

    document.body.appendChild(formNode);

    var btnCancel = formNode.querySelector('button');
    btnCancel.addEventListener('click', function(event) {
      event.stopPropagation();
      event.preventDefault();
      hide();
    });

    // Empty dummy data
    emptyList();

    // Apply optional actions while initializing
    if (typeof title === 'string') {
      setTitle(title);
    }

    if (Array.isArray(list)) {
      data.list = list;
    }
  };

  show = function() {
    render();
    formNode.classList.remove('collapsed');
  };

  hide = function() {
    formNode.classList.add('collapsed');
    emptyList();
  };

  render = function() {
    var title = formNode.querySelector('h1'),
        list = formNode.querySelector('ol');

    title.textContent = data.title;

    list.innerHTML = '';
    data.list.forEach(function(listItem) {
      var node = itemTemplateNode.cloneNode(true);

      node.querySelector('span').textContent = listItem.label;

      // Here we apply the folder-card's depth indentation to represent label.
      var depthIdx = listItem.depth;
      depthIdx = Math.min(FOLDER_DEPTH_CLASSES.length - 1, depthIdx);
      node.classList.add(FOLDER_DEPTH_CLASSES[depthIdx]);

      // If not selectable use an empty click handler. Because of event
      // fuzzing, we want to have something registered, otherwise an
      // adjacent list item may receive the click.
      var callback = listItem.selectable ? listItem.callback : noop;
      node.addEventListener('click', callback, false);

      list.appendChild(node);
    });
  };

  setTitle = function(str) {
    data.title = str;
  };

  emptyList = function() {
    data.list = [];
  };

  addToList = function(label, depth, selectable, callback) {
    data.list.push({
      label: label,
      depth: depth,
      selectable: selectable,
      callback: callback
    });
  };

  init();

  return{
    init: init,
    show: show,
    hide: hide,
    setTitle: setTitle,
    addToList: addToList,
    List: list
  };
}

return ValueSelector;

});
