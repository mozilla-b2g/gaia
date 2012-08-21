(function(window) {

  var Cal = Calendar.Template.create({
    item: [
      '<li id="calendar-{_id}">',
        '<label>',
          '<span class="name">{name}</span>',
          '<input ',
            'value="{_id}" ',
            'type="checkbox" ',
            '{localDisplayed|bool=checked} />',
          '<span></span>',
        '</label>',
      '</li>'
    ].join('')
  });

  Calendar.ns('Templates').Calendar = Cal;

}(this));

