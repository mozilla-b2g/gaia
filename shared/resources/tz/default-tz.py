import sys, json

text = open("../tz.json").read()
data = json.loads(text)

list = {}
conflicts = {
    'GB': 'London',
    'RU': 'Moscow',
    'UA': 'Kiev',
    'MD': 'Tiraspol',
    'AU': 'Sydney',
    'ES': 'Madrid',
    'CD': 'Kinshasa',
    'ML': 'Timbuktu',
    'KZ': 'Almaty',
    'TM': 'Ashkhabad',
    'CN': 'Chungking',    # Beijing is not in our database?
    'PS': 'Gaza',
    'MN': 'Ulan_Bator',
    'TR': 'Istanbul',
    'ID': 'Jakarta',
    'MY': 'Kuala_Lumpur',
    'CY': 'Nicosia',
    'VN': 'Saigon',
    'UZ': 'Tashkent',
    'IL': 'Tel_Aviv',
    'AQ': 'South_Pole',
    'PT': 'Lisbon',
    'NO': 'Oslo',
    'NZ': 'Auckland',
    'KI': 'Kiritimati',
    'FM': 'Ponape',
    'MH': 'Kwajalein',
    'PF': 'Tahiti',
    'UM': 'Midway',
    'AS': 'Samoa',
    'US': 'New_York',
    'AR': 'Argentina/Buenos_Aires',   # This is weird in tz.json I guess
    'BR': 'Brasilia',
    'CA': 'Toronto',
    'MX': 'Mexico_City',
    'GL': 'Godthab',
    'EC': 'Galapagos',
    'CL': 'Santiago',
    'VI': 'Virgin'
}

for continent in data:
    for entry in data[continent]:
        cc = entry['cc'].encode('ascii')
        city = entry['city'].encode('ascii')
        if cc in list:
            if not cc in conflicts:
                print(city)
            city = conflicts[cc]
        list[cc] = city

for continent in data:
    for entry in data[continent]:
        cc = entry['cc'].encode('ascii')
        city = entry['city'].encode('ascii')
        if list[cc] == city:
            entry['default'] = True

print(json.dumps(data))
