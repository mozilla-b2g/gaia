{
  'variables': {
    'gpp': '<!(type g++ | grep "is" > /dev/null && echo "yep" || echo "no")',
    'installed_node_version': '<!(node -v | cut -c4,5)'
  },
  'targets': [{
    'target_name': 'sockit',
    'sources': ['src/node-0.<(installed_node_version)/addon.c',
                'src/node-0.<(installed_node_version)/sockit.cc'],
    'conditions': [[
      '"<@(gpp)"=="no"',
      { 'sources!': ['src/node-0.<(installed_node_version)/addon.c',
                     'src/node-0.<(installed_node_version)/sockit.cc'] }
    ]]
  }]
}
