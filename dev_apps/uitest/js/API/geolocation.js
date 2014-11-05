function Location(position)//location function is defining with parameter
{
  //Specifies the longitude estimate in decimal degrees.
  //The value range is [-180.00, +180.00].
  var latitude = position.coords.latitude;
  var longitude = position.coords.longitude;
  //latitude value is defining in label element where id is lati
  document.getElementById('lati').innerHTML = latitude;
  document.getElementById('longi').innerHTML = longitude;
}

document.getElementById('submit').addEventListener('click',
  function findLocation() {
    //checking browser compatibility
    if (navigator.geolocation)
    {
      //getCurrentPosition method retrieve
      //the current geographic location of the user
      navigator.geolocation.getCurrentPosition(Location);
    }
  }
);
