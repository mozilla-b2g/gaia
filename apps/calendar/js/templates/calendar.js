(function(window) {

  var Cal = Calendar.Template.create({
    item: [
      '<li id="calendar-{_id}" data-id="{_id}">',
        '<label>',
          '<span class="name">{name}</span>',
          '<input ',
            'type="checkbox" ',
            // this is temp until toggle actually works
            'disabled="disabled" ',
            '{localDisplayed|bool=checked} />',
          '<span></span>',
        '</label>',
      '</li>'
    ].join('')
  });

  Calendar.ns('Templates').Calendar = Cal;

}(this));

