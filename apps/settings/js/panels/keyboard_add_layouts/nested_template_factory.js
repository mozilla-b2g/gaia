/**
 * This is a factory method that returns a template function that is able to
 * render nested lists. The constructor takes two template functions. One for
 * the first level item and one for the second level item. The created inner
 * list views is exposed via the listViews property.
 *
 * @module keyboard_add_layouts/nested_template_factory
 */
define(function(require) {
  'use strict';

  return function ctor_nestedTemplate(parentTemplate, childTemplate) {
    var listViews = [];
    var template = parentTemplate.bind({
      listViews: listViews,
      childTemplate: childTemplate
    });

    // Expose the list views.
    Object.defineProperty(template, 'listViews', {
      configurable: false,
      get: function() {
        return listViews;
      }
    });

    return template;
  };
});
