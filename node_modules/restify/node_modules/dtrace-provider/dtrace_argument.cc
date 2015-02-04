#include "dtrace_provider.h"
#include <v8.h>

#include <node.h>

namespace node {

  using namespace v8;

  // Integer Argument

#ifdef __x86_64__
# define INTMETHOD ToInteger()
#else
# define INTMETHOD ToInt32()
#endif

  void * DTraceIntegerArgument::ArgumentValue(Handle<Value> value) {
    if (value->IsUndefined())
      return 0;
    else
      return (void *)(long) value->INTMETHOD->Value();
  }

  void DTraceIntegerArgument::FreeArgument(void *arg) {
  }

  const char * DTraceIntegerArgument::Type() {
    return "int";
  }

  // String Argument

  void * DTraceStringArgument::ArgumentValue(Handle<Value> value) {
    if (value->IsUndefined())
      return (void *) strdup("undefined");

    String::AsciiValue str(value->ToString());
    return (void *) strdup(*str);
  }

  void DTraceStringArgument::FreeArgument(void *arg) {
    free(arg);
  }

  const char * DTraceStringArgument::Type() {
    return "char *";
  }

  // JSON Argument

  DTraceJsonArgument::DTraceJsonArgument() {
    HandleScope scope;
    Handle<Context> context = Context::GetCurrent();
    Handle<Object> global = context->Global();
    Handle<Object> l_JSON = global->Get(String::New("JSON"))->ToObject();
    Handle<Function> l_JSON_stringify
      = Handle<Function>::Cast(l_JSON->Get(String::New("stringify")));
    JSON = Persistent<Object>::New(l_JSON);
    JSON_stringify = Persistent<Function>::New(l_JSON_stringify);
  }

  DTraceJsonArgument::~DTraceJsonArgument() {
    JSON.Dispose();
    JSON_stringify.Dispose();
  }

  void * DTraceJsonArgument::ArgumentValue(Handle<Value> value) {
    HandleScope scope;

    if (value->IsUndefined())
      return (void *) strdup("undefined");

    Handle<Value> args[1];
    args[0] = value;
    Handle<Value> j = JSON_stringify->Call(JSON, 1, args);

    if (*j == NULL)
      return (void *) strdup("{ \"error\": \"stringify failed\" }");

    String::AsciiValue json(j->ToString());
    return (void *) strdup(*json);
  }

  void DTraceJsonArgument::FreeArgument(void *arg) {
    free(arg);
  }

  const char * DTraceJsonArgument::Type() {
    return "char *";
  }

} // namespace node
