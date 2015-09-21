var search = document.querySelector('#search');
if (search) {
  search.onclick = function() {
    var search_area = document.querySelector('#search_area');
    console.log('Search:' + search_area.value);
    var searching = new MozActivity({
      name: 'search',
      data: {
        type: 'text/plain',
        keyword: search_area.value
      }
    });
  };
}
