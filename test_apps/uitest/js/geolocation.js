function Location(position)//location function is defining with parameter
{
  var latitude = position.coords.latitude; //Specifies the longitude estimate in decimal degrees. The value range is [-180.00, +180.00].
  var longitude = position.coords.longitude;
  document.getElementById("lati").innerHTML = latitude; //latitude value is defining in label element where id is lati
  document.getElementById("longi").innerHTML = longitude;
}

document.getElementById("submit").addEventListener('click', function findLocation() {
  if (navigator.geolocation)//checking browser compatibility
  {
    navigator.geolocation.getCurrentPosition(Location);//getCurrentPosition method retrieve the current geographic location of the user
  }
});
