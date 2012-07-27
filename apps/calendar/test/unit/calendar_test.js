requireApp('calendar/js/calendar.js');

suite('calendar', function() {

  test('#ns', function() {
    var ns = Calendar.ns('Provider.Calendar');
    assert.equal(Calendar.Provider.Calendar, ns);
  });

});
