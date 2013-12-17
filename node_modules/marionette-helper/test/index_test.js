suite('MarionetteHelper', function() {
  var subject;

  var client = createClient();
  marionette.plugin('helper', require('../index'));

  setup(function(done) {
    subject = client.helper;
    client.setSearchTimeout(2000);
    setTimeout(function() {
      client.executeScript(function() {
        // start with a clean slate
        document.body.innerHTML = '';
      });
      done();
    }, 2500); // In the stead of using the BootWatcher.
  });

  test('#wait', function() {
    var before = new Date().getTime();
    subject.wait(1000);
    var after = new Date().getTime();
    assert.ok(after - before >= 1000);
  });

  test('#waitFor', function(done) {
    var i = 0;
    subject.waitFor(function() {
      i++;
      return i > 4;
    }, function() {
      assert.strictEqual(i, 5);
      done();
    }, 50, 200);
  });

  test('#waitForElement, element added to DOM', function() {
    var myRandomID = 'YAAAAAAYRandomWow' + Date.now();
    client.executeScript(function(myRandomID) {
      setTimeout(function() {
        var el = document.createElement('div');
        el.id = myRandomID;
        el.innerHTML = 'Hello Test!';
        document.body.appendChild(el);
      }, 500);
    }, [myRandomID]);
    subject.waitForElement('#' + myRandomID);
  });

  test('#waitForElement, element displayed with CSS', function() {
    var myRandomID = 'YAAAAAAYRandomWow' + Date.now();
    client.executeScript(function(myRandomID) {
      var el = document.createElement('div');
      el.id = myRandomID;
      el.innerHTML = 'Hello Test!';
      el.style.display = 'none';
      document.body.appendChild(el);
      setTimeout(function() {
        el.style.display = 'block';
      }, 500);
    }, [myRandomID]);
    subject.waitForElement('#' + myRandomID);
  });

  test('#waitForElementToDisappear DOM with an Element', function() {
    var myRandomID = 'YAAAAAAYRandomWow' + Date.now();
    client.executeScript(function(myRandomID) {
      var el = document.createElement('div');
      el.id = myRandomID;
      el.innerHTML = 'Hello Test!';
      document.body.appendChild(el);
      setTimeout(function() {
        document.body.removeChild(el);
      }, 500);
    }, [myRandomID]);
    var el = client.findElement('#' + myRandomID);
    subject.waitForElementToDisappear(el);
  });

  test('#waitForElementToDisappear DOM with a string', function() {
    var myRandomID = 'YAAAAAAYRandomWow' + Date.now();
    client.executeScript(function(myRandomID) {
      var el = document.createElement('div');
      el.id = myRandomID;
      el.innerHTML = 'Hello Test!';
      document.body.appendChild(el);
      setTimeout(function() {
        document.body.removeChild(el);
      }, 500);
    }, [myRandomID]);
    var el = client.findElement('#' + myRandomID);
    subject.waitForElementToDisappear('#' + myRandomID);
  });

  test('#waitForElementToDisappear CSS with an Element', function() {
    var myRandomID = 'YAAAAAAYRandomWow' + Date.now();
    client.executeScript(function(myRandomID) {
      var el = document.createElement('div');
      el.id = myRandomID;
      el.innerHTML = 'Hello Test!';
      document.body.appendChild(el);
      setTimeout(function() {
        el.style.display = 'none';
      }, 500);
    }, [myRandomID]);
    var el = client.findElement('#' + myRandomID);
    subject.waitForElementToDisappear(el);
  });

  test('#waitForElementToDisappear DOM with a string', function() {
    var myRandomID = 'YAAAAAAYRandomWow' + Date.now();
    client.executeScript(function(myRandomID) {
      var el = document.createElement('div');
      el.id = myRandomID;
      el.innerHTML = 'Hello Test!';
      document.body.appendChild(el);
      setTimeout(function() {
        el.style.display = 'none';
      }, 500);
    }, [myRandomID]);
    var el = client.findElement('#' + myRandomID);
    subject.waitForElementToDisappear('#' + myRandomID);
  });

  suite.skip('#waitForAlert', function() {
    setup(function() {
      console.log('Will alert!');
      client.executeScript(function() {
        alert('lololololololol');
      });
    });

    test('should wait for substring sync', function() {
      subject.waitForAlert('lol');
    });

    test('should wait for substring async', function(done) {
      subject.waitForAlert('lol', done);
    });

    test('should wait for RegExp sync', function() {
      subject.waitForAlert(/(lo)*l/);
    });

    test('should wait for RegExp async', function(done) {
      subject.waitForAlert(/(lo)*l/, done);
    });
  });
});
