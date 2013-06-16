var IcecastStationSearch = function(){

}

IcecastStationSearch.prototype = {
  search: function(search, done){
    if (search === null){
      done([]);
      return;
    }
    var searchUrl = 'http://dir.xiph.org/search?search=';
    searchUrl += search.replace(/ /g, '+');
    this.GET(searchUrl, function(html){
      var lines = html.split('\n');
      lines = lines.filter(function(line){
        return line.indexOf('trackPageview') !== -1;
      });
      var items = lines.map(this.parseLine.bind(this));
      items = items.filter(function(item){
        return item !== null;
      });
      done(items);
    }.bind(this));
  },
  parseLine: function(line){

    var match_m3u = line.match(/href="([^.]*.)m3u"/g);
    if (!match_m3u)
      return null;
    var m3u = match_m3u[0];
    m3u = m3u.substring(6, m3u.length-1);

    var match_title = line.match(/title="([^"]*")/g);
    if (!match_title)
      return null;
    var title = match_title[0];
    title = title.substring(18, title.length-2);

    var item = {
      m3u: m3u,
      title: title
    };
    return item;
  },
  getM3UUrl: function(m3u, done){
    var url = 'http://dir.xiph.org' + m3u;
    this.GET(url, function(links){
      var link = links.split('\n')[0];
      done(link);
    });
  },
  GET: function(url, done){
    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
      if (xhr.status === 200 && xhr.readyState === 4) {
        done(xhr.response);
      }
    }
    xhr.onerror = function (e) {
      console.warn('XHR @' + url + ' failed: ' + e.target.status);
    };
    xhr.send();
  }
}
