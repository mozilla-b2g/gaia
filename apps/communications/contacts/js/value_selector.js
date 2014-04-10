/* globals _ */
/* exported ValueSelector */
/*
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

'use strict';

function ValueSelector(title, list) {
  var init, show, hide, render, setTitle, emptyList, addToList,
      data, el;

  init = function() {
    var strPopup, body, btnCancel, cancelStr;

    // Model. By having dummy data in the model,
    // it make it easier for othe developers to catch up to speed
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

    body = document.body;
    cancelStr = _('cancel');

    el = document.createElement('section');
    el.setAttribute('class', 'valueselector');
    el.setAttribute('role', 'region');

    strPopup = '<div role="dialog">';
    strPopup += '  <div class="center">';
    strPopup += '    <h3>No Title</h3>';
    strPopup += '    <ul>';
    strPopup += '      <li>';
    strPopup += '        <label class="pack-radio">';
    strPopup += '          <input type="radio" name="option">';
    strPopup += '          <span>Dummy element</span>';
    strPopup += '        </label>';
    strPopup += '      </li>';
    strPopup += '    </ul>';
    strPopup += '  </div>';
    strPopup += '  <menu>';
    strPopup += '    <button>' + cancelStr + '</button>';
    strPopup += '  </menu>';
    strPopup += '</div>';

    el.innerHTML += strPopup;
    body.appendChild(el);

    btnCancel = el.querySelector('button');
    btnCancel.addEventListener('click', function() {
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
    el.classList.add('visible');
  };

  hide = function() {
    el.classList.remove('visible');
    emptyList();
  };

  render = function() {
    var title = el.querySelector('h3'),
        list = el.querySelector('ul');

    title.textContent = data.title;

    list.innerHTML = '';
    for (var i = 0; i < data.list.length; i++) {
      var li = document.createElement('li'),
          label = document.createElement('label'),
          input = document.createElement('input'),
          span = document.createElement('span'),
          text = document.createTextNode(data.list[i].label);

      li.id = 'item' + i;
      input.setAttribute('type', 'radio');
      input.setAttribute('name', 'option');
      label.classList.add('pack-radio');
      label.appendChild(input);
      span.appendChild(text);
      label.appendChild(span);

      var callback = data.list[i].callback;
      if (callback) {
        li.addEventListener('click', callback, false);
      }

      li.appendChild(label);
      list.appendChild(li);
    }
  };

  setTitle = function(str) {
    data.title = str;
  };

  emptyList = function() {
    data.list = [];
  };

  addToList = function(label, value, callback) {
    data.list.push({
      label: label,
      value: value,
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
