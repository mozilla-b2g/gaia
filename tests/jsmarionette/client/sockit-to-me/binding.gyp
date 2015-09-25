{
  'variables': {
    'gpp': '<!(type g++ | grep "is" > /dev/null && echo "yep" || echo "no")'
  },
  'targets': [{
    'target_name': 'sockit',
    'sources': ['src/addon.c',
                'src/sockit.cc'],
    'conditions': [[
      '"<@(gpp)"=="no"',
      { 'sources!': ['src/addon.c',
                     'src/sockit.cc'] }
    ]]
  }]
}
