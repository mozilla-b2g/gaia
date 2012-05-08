(function(window) {
  var TestUrlResolver = (function() {

    let location = window.location,
        domainParts = window.location.host.split('.'),
        addSubdomain = false,
        prefix = null;

    if (domainParts.length === 3) {
      //running from gaiamobile.org subdomain
      addSubdomain = true;
    } else {
      //running from localhost
      addSubdomain = false;
    }

    return {
      PARSE_REGEX: /^(\/?)([\w\d-]+)\/(.*)/,

      resolve: function tur_testUrl(url) {
        if (addSubdomain) {
          let parsedUrl = this.PARSE_REGEX.exec(url);
          let domain = location.protocol + '//' + parsedUrl[2] + '.';
          domain += domainParts.slice(1).join('.') + '/';
          return domain + parsedUrl[3];
        } else {
          //we are on localhost just add /apps/
          return '/apps/' + url;
        }
      }
    };

  }());

  window.TestUrlResolver = TestUrlResolver;
}(this));
