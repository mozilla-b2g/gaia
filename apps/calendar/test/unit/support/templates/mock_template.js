Calendar.ns('Templates').MockTemplate = (function() {

  var Template = Calendar.Template.create({
    provider: '<div class="{name}"></div>',
    account: '<div>account</div>'
  });

  return Template;

}());
