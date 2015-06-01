#ifndef __SOCKIT_H__
#define __SOCKIT_H__

#include <node.h>

class Sockit : public node::ObjectWrap {
public:
  static void Init(v8::Handle<v8::Object>);

private:
  Sockit();
  ~Sockit();

  static v8::Handle<v8::Value> New(const v8::Arguments&);

  static v8::Handle<v8::Value> Connect(const v8::Arguments&);

  static v8::Handle<v8::Value> Read(const v8::Arguments&);

  static v8::Handle<v8::Value> Write(const v8::Arguments&);

  int Write(const char *, const int);

  static v8::Handle<v8::Value> Close(const v8::Arguments&);

  static v8::Handle<v8::Value> SetPollTimeout(const v8::Arguments&);
  static v8::Handle<v8::Value> SetDebugLog(const v8::Arguments&);

  int mSocket;
  int mPollTimeout;

  bool mIsConnecting;
  bool mIsConnected;
};

#endif
