var composeEmail = document.querySelector('#compose-email');
if (composeEmail) {
  composeEmail.onclick = function() {
    var createEmail = new MozActivity({
      name: 'new', // Possibly compose-mail in future versions
      data: {
        type: 'mail',
        url: 'mailto:example@example.org'
      }
    });
  };
}
