(function(window) {
  if (typeof(testSupport) === 'undefined') {
    testSupport = {};
  }

  function template(url) {
    url = TestUrlResolver.resolve(url);

    teardown(function() {
      var test = document.getElementById('test');
      if (test) {
        test.parentNode.removeChild(test);
      }
    });

    setup(function(done) {
      var test = document.getElementById('test');
      if (!test) {
        test = document.createElement('div');
        test.id = 'test';
        document.body.appendChild(test);
      }

      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function(event) {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            var wrapper = document.createElement('div');
            wrapper.innerHTML = xhr.responseText;
            test.appendChild(wrapper.firstChild);
            done();
          } else {
            done(new Error(
              'could not load template file "' + url + '"'
            ));
          }
        }
      };

      xhr.send(null);
    });
  }

  testSupport.template = template;

}(this));
