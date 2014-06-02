/**
 * The template function for generating an UI element for a keyboard object.
 *
 * @module keyboard_add_layouts/keyboard_template
 */
define(function(require) {
  'use strict';

  var ListView = require('modules/mvvm/list_view');

  return function kal_keyboardTemplate(keyboard, recycled, helper) {
    // This function is served as a parent template, we expected to get the
    // childTemplate and all generated list views.
    // XXX: we need a better way the recycle and reuse list view objects.
    var layoutTemplate = this.childTemplate;
    var listViews = this.listViews;

    var container, header, h2, ul, listView;
    if (recycled) {
      container = recycled;
      h2 = container.querySelector('h2');
      ul = container.querySelector('ul');
    } else {
      container = document.createElement('div');
      header = document.createElement('header');
      h2 = document.createElement('h2');
      ul = document.createElement('ul');
      header.appendChild(h2);
      container.appendChild(header);
      container.appendChild(ul);
    }

    // if we find a listView for the ul, reuse it, otherwise create one
    listView = listViews.some(function eachListView(list) {
      if (list.element === ul) {
        list.set(keyboard.layouts);
        list.enabled = true;
        return true;
      }
    });

    if (!listView) {
      listView = ListView(ul, keyboard.layouts, layoutTemplate);
      listView.enabled = true;
      listViews.push(listView);
    }

    helper.observeAndCall(keyboard, {
      name: function refreshName() {
        h2.textContent = keyboard.name;
      }
    });

    return container;
  };
});
