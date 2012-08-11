requireApp('dialer/js/settings_listener.js');

suite('SettingsListener', function() {
  test('#observe', function(done) {
    // strings
    var correctAnswers =
      ('This is Gaia settings listener and mozSettings unit test.').split(' ');
    // number
    correctAnswers.push(Math.random());
    correctAnswers.push('12345');
    correctAnswers.push(12345);
    // Booleans
    correctAnswers.push(true);
    correctAnswers.push(false);

    var count = 0;
    var answers = [];
    var timer;

    var settingKey = 'gaia.unit.test.key.' +
      Math.random().toString(36).substr(2);

    var setter = function(value) {
      var settingObj = {};
      settingObj[settingKey] = value;

      navigator.mozSettings.getLock().set(settingObj);
    };

    /*
     * We have to know the exact number of times the callback gets called.
     * So we will wait for at most 150ms for each call, and run done()
     * if we didn't hear from the callback for more than that.
     */
    var callback = function(value) {
      answers.push(value);
      count++;

      // run setter() to set next value
      if (count < correctAnswers.length)
        setter(correctAnswers[count]);

      clearTimeout(timer);
      var timer = setTimeout(function() {
        done(function() {
          assert.deepEqual(answers, correctAnswers,
                           'We did not receive exact numbers of callback.');
        });
      }, 150);
    };

    /* Start the test */
    SettingsListener.observe(settingKey, correctAnswers[0], callback);
  });
});
