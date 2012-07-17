(function(window) {

  var Account = Calendar.Template.create({
    provider: [
      '<li class="{name}">',
        '<a data-provider="{name}" href="/create-account/{name}">',
          '{name}',
        '</a>',
      '</li>'
    ].join(''),

    account: [
      '<li id="account-{id}">',
        '<a class="remove" href="/remove-account/{id}">X</a>',
        '<a href="/update-account/{id}">',
          '<span class="preset">{preset}</span>',
          '<span class="user">{user}</span>',
        '</a>',
      '</li>'
    ].join('')

  });

  Calendar.ns('Templates').Account = Account;

}(this));
