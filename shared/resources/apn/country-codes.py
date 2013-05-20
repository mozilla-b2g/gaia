# -*- coding: utf-8 -*-
import sys, re, json
from xml.parsers import expat

list = {}

def start_element(name, attrs):
    global cc, list
    if name == "country":
        cc = attrs['code'].encode('ascii')
        if not re.match('[a-z]{2}', cc):
            print("invalid cc='" + cc + "'")
            sys.exit(-1)
    if name == "network-id":
        mcc = attrs['mcc'].encode('ascii')
        mnc = attrs['mnc'].encode('ascii')
        mnc = ("00" + mnc)[-3:]
        if not re.match('[0-9]{3}', mcc) or not re.match('[0-9]{3}', mnc):
            print("invalid mcc='" + mcc + "' or mnc='" + mnc + "'")
            sys.exit(-1)
        code = mcc + mnc
        if code in list and list[code] != cc:
            # Auto-resolve some minor conflicts with the Channel Islands (Guernsey, Isle of Man, Jersey)
            if list[code] == "gg" and (cc == "im" or cc == "je"):
                True
            elif list[code] == "im" and cc == "je":
                cc = "im"
            else:
                print("country mismatch, code=" + code + ", previous country=" + list[code] + ", country=" + cc)
                sys.exit(-1)
        list[code] = cc

def char_data(text):
    True

def end_element(name):
    True

# Parse the XML input file and build the trie.
p = expat.ParserCreate()
p.StartElementHandler = start_element
p.CharacterDataHandler = char_data
p.EndElementHandler = end_element
p.ParseFile(open('service_providers.xml', 'rb'))

print(json.dumps(list))

exit()
