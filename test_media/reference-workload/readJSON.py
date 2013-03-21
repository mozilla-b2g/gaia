#!/usr/bin/python
#
# This script parses json files, and extracts a value from a provided key
# The value is printed to stdout

import json
import os
import sys

json_data=open(sys.argv[1])
data = json.load(json_data)
json_data.close()

keyString = sys.argv[2]
keys = keyString.split('/')

result = data
matchedKey = ""
for key in keys:
  if key.endswith("*"):
    matchKey =  key.rstrip("*")
    for eachKey, eachValue in data.items():
      if eachKey.startswith(matchKey):
        result = result[eachKey]
        matchedKey = eachKey
        break
  else:
    result = result[key]

if matchedKey == "":
  print result
else:
  print matchedKey + "/" + str(result)
