# -*- coding: utf-8 -*-
import sys, re, json
from xml.parsers import expat

#
# Parse the TZ input file and build the tree.
#

text = open("../tz.json").read()
data = json.loads(text)

cities = {}
conflicts = {
    'CD': 'Africa/Kinshasa',
    'ML': 'Africa/Bamako',
    'AR': 'America/Argentina/Buenos_Aires', # This is weird in tz.json I guess
    'BR': 'America/Sao_Paulo',
    'CA': 'America/Toronto',
    'CL': 'America/Santiago',
    'GL': 'America/Godthab',
    'MX': 'America/Mexico_City',
    'US': 'America/New_York',
    'VI': 'America/Virgin',
    'AQ': 'Antarctica/South_Pole',
    'CN': 'Asia/Chongqing',                 # Beijing is not in our database?
    'CY': 'Asia/Nicosia',
    'ID': 'Asia/Jakarta',
    'IL': 'Asia/Jerusalem',
    'KZ': 'Asia/Almaty',
    'MN': 'Asia/Ulan_Bator',
    'MY': 'Asia/Kuala_Lumpur',
    'PS': 'Asia/Gaza',
    'TM': 'Asia/Ashgabat',
    'UZ': 'Asia/Tashkent',
    'VN': 'Asia/Saigon',
    'AU': 'Australia/Sydney',
    'ES': 'Europe/Madrid',
    'GB': 'Europe/London',
    'MD': 'Europe/Chisinau',
    'NO': 'Europe/Oslo',
    'PT': 'Europe/Lisbon',
    'RU': 'Europe/Moscow',
    'TR': 'Europe/Istanbul',
    'UA': 'Europe/Kiev',
    'AS': 'Pacific/Samoa',
    'EC': 'Pacific/Galapagos',
    'FM': 'Pacific/Ponape',
    'KI': 'Pacific/Kiritimati',
    'MH': 'Pacific/Kwajalein',
    'NZ': 'Pacific/Auckland',
    'PF': 'Pacific/Tahiti',
    'UM': 'Pacific/Midway'
}

for continent in data:
    for entry in data[continent]:
        cc = entry['cc'].encode('ascii')
        city = entry['city'].encode('ascii')
        if cc in cities:
            if not cc in conflicts:
                print(city)
            cities[cc] = conflicts[cc]
        else:
            cities[cc] = continent + '/' + city

#
# Parse the APN input file and build the tree.
#

apn_tz = {}

def start_element(name, attrs):
    global cc, apn_tz
    if name == "country":
        cc = attrs['code'].encode('ascii')
        if not re.match('[a-z]{2}', cc):
            print("invalid cc='" + cc + "'")
            sys.exit(-1)
    if name == "network-id":
        mcc = attrs['mcc'].encode('ascii')
        mnc = attrs['mnc'].encode('ascii')
        if not re.match('[0-9]{3}', mcc) or not re.match('[0-9]{1,3}', mnc):
            print("invalid mcc='" + mcc + "' or mnc='" + mnc + "'")
            sys.exit(-1)
        if not mcc in apn_tz:
            apn_tz[mcc] = {}
        apn_tz[mcc][mnc] = cities[cc.upper()]

def char_data(text):
    True

def end_element(name):
    True

p = expat.ParserCreate()
p.StartElementHandler = start_element
p.CharacterDataHandler = char_data
p.EndElementHandler = end_element
p.ParseFile(open('service_providers.xml', 'rb'))

#
# Sort/filter apn_tz
#

for mcc in apn_tz:
    tz_list = apn_tz[mcc]
    tmp = ''
    same_tz = True
    for mnc in tz_list:
        if (tmp == ''):
            tmp = tz_list[mnc]
        elif (tmp != tz_list[mnc]):
            same_tz = False
            break
    if same_tz:
        apn_tz[mcc] = tmp

print(json.dumps(apn_tz, sort_keys = True, indent = 2))

exit()
