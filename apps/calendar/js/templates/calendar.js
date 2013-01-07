(function(window) {

  var Cal = Calendar.Template.create({
    item: [
      '<li id="calendar-{_id}">',
        '<div class="calendar-id-{_id} calendar-color"></div>',
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

