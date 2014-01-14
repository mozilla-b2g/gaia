// Global includes
#include <node.h>

// Local includes
#include "sockit.h"

// So we don't spend half the time typing 'v8::'
using namespace v8;

// Initialize
void InitAll(Handle<Object> aExports) {
  Sockit::Init(aExports);
}

NODE_MODULE(sockit, InitAll)
