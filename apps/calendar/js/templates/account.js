(function(window) {
  if (typeof(Calendar.Templates) === 'undefined') {
    Calendar.Templates = {};
  }

  var Account = Calendar.Template.create({
    account: '<ol class="accounts">{value|s}</ol>',
    accountItem: [
      '<li class="{name}">',
        '<a href="#{name}">{name}</a>',
      '</li>'
    ].join('')
  });

  Calendar.Templates.Account = Account;

}(this));
