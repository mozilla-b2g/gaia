#! /bin/bash -vex

if [ ! -d profile-debug ];
then
  DEBUG=1 DESKTOP=0 DESKTOP_SHIMS=1 NOFTU=1 make
fi

if [ ! -d b2g ];
then
  make b2g
fi

python tests/python/gaia-unit-tests/setup.py install
python tests/python/gaia-unit-tests/gaia_unit_test/main.py --binary b2g/b2g-bin --profile profile-debug
