/*
How to:
  var action = new ActionMenu('Dummy title 1', [
    {
      label: 'Dummy element',
      callback: function() {
        alert('Define an action here!');
      }
    }
  ]);

  action.addAction('Another action', function(){alert('Another action');});
  action.show();
*/

function ActionMenu(title, list) {
  var init, show, hide, render, setTitle, addAction,
      data, el;

  init = function() {
    var strPopup, body, section, btnCancel;

    data = {};

    body = document.body;

    el = document.createElement('section');
    el.setAttribute('role', 'dialog');

    strPopup = '<menu class="actions">';
    strPopup += '  <h3>No Title</h3>';
    strPopup += '  <ul>';
    strPopup += '  </ul>';
    strPopup += '</menu>';

    el.innerHTML += strPopup;
    body.appendChild(el);

    // Apply optional actions while initializing
    if (typeof title === 'string') {
      setTitle(title);
    }

    if (Object.prototype.toString.call(list) == '[object Array]') {
      data.list = list;
    }
  }

  show = function() {
    el.classList.remove('hide');
    el.querySelector('menu').classList.add('visible');
    render();
  }

  hide = function() {
    document.body.removeChild(el);
  }

  render = function() {
    var title = el.querySelector('h3'),
        list = el.querySelector('ul');

    title.innerHTML = data.title;

    list.innerHTML = '';
    for (var i = 0; i < data.list.length; i++) {
      var li = document.createElement('li'),
          button = document.createElement('button'),
          text = document.createTextNode(data.list[i].label);

      button.appendChild(text);
      if (data.list[i].callback) {
        var theCallback = data.list[i].callback;
        button.addEventListener('click', theCallback);
      }
      li.appendChild(button);
      list.appendChild(li);
    }

    // Always add the last element, the cancel action
    var li = document.createElement('li'),
        button = document.createElement('button');
        text = document.createTextNode(_('cancel'));
    button.appendChild(text);
    button.addEventListener('click', function hideActions() {
      hide();
    });
    li.appendChild(button);
    list.appendChild(li);

  }

  setTitle = function(str) {
    data.title = str;
  }

  addAction = function(label, callback) {
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
    addAction: addAction,
    List: list
  };
}
