define(['l10n!'], function(mozL10n) {
  var tmpl = {
    pluginBuilder: './tmpl_builder',

    toDom: function(text) {
        var temp = document.createElement('div');
        temp.innerHTML = text;
        var node = temp.children[0];
        mozL10n.translateFragment(node);
        return node;
    },

    load: function(id, require, onload, config) {
      require(['text!' + id], function(text) {
        var node = tmpl.toDom(text);
        onload(node);
      });
    }
  };

  return tmpl;
});
