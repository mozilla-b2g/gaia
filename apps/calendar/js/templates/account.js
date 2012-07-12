(function(window) {
  if (typeof(Calendar.Templates) === 'undefined') {
    Calendar.Templates = {};
  }

  var Account = Calendar.Template.create({
    accountItem: [
      '<li class="{name}">',
        '<a data-provider="{name}" href="create-account/{name}">{name}</a>',
      '</li>'
    ].join('')
  });

  Calendar.Templates.Account = Account;

}(this));
