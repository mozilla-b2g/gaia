window.addEventListener('DOMContentLoaded', function() {

  var buttons = [
    'short',
    'medium',
    'long'
  ];

  var headerText = {
    'short': 'Header Title',
    'medium': 'Long Header Title',
    'long': 'Very Very Very Very Long Header Title'
  };

  var longestText = headerText.long;

  var headers = document.querySelectorAll('header > h1');

  buttons.forEach(function(button) {
    document.getElementById(button).onclick = function() {
      for (var i = 0; i < headers.length; i++) {
        headers[i].textContent = headerText[this.id];
      }
    };
  });

  document.getElementById('subtract').onclick = function() {
    var text = headers[0].textContent.substr(1);
    for (var i = 0; i < headers.length; i++) {
      headers[i].textContent = text;
    }
  };

  document.getElementById('add').onclick = function() {
    var index = longestText.lastIndexOf(headers[0].textContent);
    if (index === 0 && headers[0].textContent !== "") {
      return;
    }
    var text = longestText.substr(index - 1);
    for (var i = 0; i < headers.length; i++) {
      headers[i].textContent = text;
    }
  };

});
