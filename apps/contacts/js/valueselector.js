/*
How to:
  var prompt1 = new Valueselector('Dummy title 1', [
    {'Dummy element1': function() {
        alert('Define an action here!1');
      }
    }
  ]);

  prompt1.addToList('Another button', function(){alert('Another action');});
  prompt1.show();
*/

function ValueSelector(title, list) {
  var init, show, hide, render, setTitle, emptyList, addToList,
      data, el;

  init = function() {
    var strPopup, body, section, btnCancel;

    // Model. By having dummy data in the model,
    // it make it easier for othe developers to catch up to speed
    data = {
      title: 'No Title',
      list: [
        {'Dummy element': function() {
            alert('Define an action here!');
          }
        }
      ]
    };

    body = document.querySelector('body');

    el = document.createElement('section');
    el.setAttribute('class', 'valueselector');
    el.setAttribute('role', 'region');

    strPopup = '<div role="dialog">';
    strPopup += '  <div class="center">';
    strPopup += '    <h3>No Title</h3>';
    strPopup += '    <ul>';
    strPopup += '      <li>';
    strPopup += '        <label>';
    strPopup += '          <input type="radio" name="option">';
    strPopup += '          <span>Dummy element</span>';
    strPopup += '        </label>';
    strPopup += '      </li>';
    strPopup += '    </ul>';
    strPopup += '  </div>';
    strPopup += '  <menu>';
    strPopup += '    <button>' + _('cancel') + '</button>';
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
    if (Object.prototype.toString.call(title) == '[object String]') {
      setTitle(title);
    }

    if (Object.prototype.toString.call(list) == '[object Array]') {
      data.list = list;
    }
  }

  show = function() {
    render();
    el.classList.add('visible');
  }

  hide = function() {
    el.classList.remove('visible');
  }

  render = function() {
    var title = el.querySelector('h3'),
        list = el.querySelector('ul');

    title.innerHTML = data.title;

    list.innerHTML = '';
    for (var i = 0; i < data.list.length; i++) {
      for (var key in data.list[i]) {
        var li = document.createElement('li'),
            label = document.createElement('label'),
            input = document.createElement('input'),
            span = document.createElement('span'),
            text = document.createTextNode(key);

        span.appendChild(text);
        span.addEventListener('click', data.list[i][key], false);
        input.setAttribute('type', 'radio');
        input.setAttribute('name', 'option');
        label.appendChild(input);
        label.appendChild(span);
        li.appendChild(label);
        list.appendChild(li);
      }
    }
  }

  setTitle = function(str) {
    data.title = str;
  },

  emptyList = function() {
    data.list = [];
  }

  addToList = function(label, fnc) {
    var item = {};
    item[label] = fnc;
    data.list.push(item);
  }

  init();

  return{
    init: init,
    show: show,
    hide: hide,
    setTitle: setTitle,
    addToList: addToList
  };
}
