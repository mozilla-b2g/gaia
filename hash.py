#!/usr/bin/env python

import hashlib
import sys

for file_name in sys.argv[1:]:
        handle = open(file_name)
        hexName = hashlib.sha1(handle.read()).hexdigest()
        handle.close()
