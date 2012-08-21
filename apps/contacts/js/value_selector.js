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
        {
          label: 'Dummy element',
          callback: function() {
            alert('Define an action here!');
          }
        }
      ]
    };

    body = document.body;

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
    if (typeof title === 'string') {
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
      var li = document.createElement('li'),
          label = document.createElement('label'),
          input = document.createElement('input'),
          span = document.createElement('span'),
          text = document.createTextNode(data.list[i].label);

      span.appendChild(text);
      span.addEventListener('click', data.list[i].callback, false);
      input.setAttribute('type', 'radio');
      input.setAttribute('name', 'option');
      label.appendChild(input);
      label.appendChild(span);
      li.appendChild(label);
      list.appendChild(li);
    }
  }

  setTitle = function(str) {
    data.title = str;
  }

  emptyList = function() {
    data.list = [];
  }

  addToList = function(label, callback) {
    data.list.push({
      label: label,
      callback: callback
    });
  }

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
