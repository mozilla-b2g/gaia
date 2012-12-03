(function(window) {

  var Cal = Calendar.Template.create({
    item: function() {
      return '<li id="calendar-' + this.h('_id') + '">' +
          '<div class="calendar-id-' + this.h('_id') + ' calendar-color"></div>' +
          '<label>' +
            '<span class="name">' + this.h('name') + '</span>' +
            '<input ' +
              'value="' + this.h('_id') + '" ' +
              'type="checkbox" ' +
              this.bool('localDisplayed', 'checked') + ' />' +
            '<span></span>' +
          '</label>' +
        '</li>';
    }
  });

  Calendar.ns('Templates').Calendar = Cal;

}(this));

