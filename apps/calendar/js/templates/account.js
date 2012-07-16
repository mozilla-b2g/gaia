(function(window) {

  var Account = Calendar.Template.create({
    accountItem: [
      '<li class="{name}">',
        '<a data-provider="{name}" href="/create-account/{name}">{name}</a>',
      '</li>'
    ].join('')
  });

  Calendar.ns('Templates').Account = Account;

}(this));
