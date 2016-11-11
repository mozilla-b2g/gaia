#!/usr/bin/python
import json

data = []
for line in open("cities1000.txt", "r").readlines():
    fields = line.split('\t');
    # lat, long, city, country code, timezone
    data.append([fields[4], fields[5], fields[1], fields[8], fields[17]])

print(json.dumps(data))
