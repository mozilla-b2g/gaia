/*
How to:
  var prompt1 = new ValueSelector([
    {
      label: 'Dummy element',
    }
  ]);

  prompt1.addToList('Another button');
  prompt1.onchange =  function() {alert('Another action');}
  prompt1.show();
*/

function ValueSelector(list) {
  var data, el, select;
  var self = this;

  function init() {
    var strPopup, body, section;

    // Model. By having dummy data in the model,
    // it make it easier for othe developers to catch up to speed
    data = {
      list: [
        {
          label: 'Dummy element'
        }
      ]
    };

    body = document.body;
    el = body.querySelector('section.valueselector');
    if (el === null) {
      el = document.createElement('section');
      el.className = 'valueselector';
      strPopup = '<form>';
      strPopup += '  <select name="selector_name">';
      strPopup += '    <option>Dummy element</option>';
      strPopup += '  </select>';
      strPopup += '</form>';

      el.innerHTML += strPopup;
      body.appendChild(el);
    }

    select = el.querySelector('select');
    select.addEventListener('change', function() {
      if (typeof self.onchange === 'function') {
        window.setTimeout(function handle_onchange() {
          // Wait a few milisecs to give feedback to the user
          self.onchange(select.value);
        }, 200);
      }
    });

    // Empty dummy data
    emptyList();

    if (Array.isArray(list)) {
      data.list = list;
    }
  }

  this.show = function() {
    render();

    el.classList.add('visible');

    // And now focus it to force the system to pop up the options
    select.focus();
  };

  this.hide = function() {
    // Avoid consuming resources
    el.classList.remove('visible');
  };

  function render() {
    select.innerHTML = '';
    select.value = '';
    var totalOptions = data.list.length;

    select.setAttribute('size', totalOptions);

    for (var i = 0; i < totalOptions; i++) {
      var option = new Option(data.list[i].label, data.list[i].value);
      select.add(option);
    }
  }

  function emptyList() {
    data.list = [];
  }

  this.addToList = function(label, value) {
    data.list.push({
      label: label,
      value: value
    });
  };

  init();
}
