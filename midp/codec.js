/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var DataType = {
  BOOLEAN: 0,
  CHAR: 1,
  BYTE: 2,
  WCHAR: 3,
  SHORT: 4,
  USHORT: 5,
  LONG: 6,
  ULONG: 7,
  FLOAT: 8,
  DOUBLE: 9,
  STRING: 10,
  WSTRING: 11,
  URI: 12,
  METHOD: 13,
  STRUCT: 14,
  LIST: 15,
  ARRAY: 16,
};

var DataEncoder = function() {
  this.data = [];
}

DataEncoder.START = 1;
DataEncoder.END = 2;

DataEncoder.prototype.putStart = function(tag, name) {
  this.data.push({
    type: DataEncoder.START,
    tag: tag,
    name: name,
  });
}

DataEncoder.prototype.putEnd = function(tag, name) {
  this.data.push({
    type: DataEncoder.END,
    tag: tag,
    name: name,
  })
}

DataEncoder.prototype.put = function(tag, name, value) {
  this.data.push({
    tag: tag,
    name: name,
    value: value,
  });
}

DataEncoder.prototype.putNoTag = function(name, value) {
  this.data.push({
    name: name,
    value: value,
  });
}

DataEncoder.prototype.getData = function() {
  return JSON.stringify(this.data);
}

var DataDecoder = function(data, offset, length) {
  this.data = JSON.parse(util.decodeUtf8(data.subarray(offset, offset + length)));
  this.current = [];
}

DataDecoder.prototype.find = function(tag, type) {
  var elem;
  var i = 0;
  while (elem = this.data[i++]) {
    if ((!type || elem.type == type) && elem.tag == tag) {
      this.data = this.data.slice(i);
      return elem;
    }

    if (elem.type == DataEncoder.END) {
      break;
    }
  }
}

DataDecoder.prototype.getStart = function(tag) {
  var elem = this.find(tag, DataEncoder.START);
  if (!elem) {
    return false;
  }

  this.current.push(elem);

  return true;
}

DataDecoder.prototype.getEnd = function(tag) {
  var elem = this.find(tag, DataEncoder.END);
  if (!elem) {
    return false;
  }

  // If this happens, a father has ended before a child
  if (elem.tag != this.current[this.current.length - 1].tag ||
      elem.name != this.current[this.current.length - 1].name) {
    return false;
  }

  this.current.pop();

  return true;
}

DataDecoder.prototype.getValue = function(tag) {
  var elem = this.find(tag);
  return elem ? elem.value : undefined;
}

DataDecoder.prototype.getNextValue = function() {
  var elem = this.data.shift();
  return elem ? elem.value : undefined;
}

DataDecoder.prototype.getName = function() {
  return this.data[0].name;
}

DataDecoder.prototype.getTag = function() {
  return this.data[0].tag;
}

DataDecoder.prototype.getType = function() {
  return this.data[0].type || -1;
}

Native["com/nokia/mid/s40/codec/DataEncoder.init.()V"] = function(addr) {
  setNative(this, new DataEncoder());
};

Native["com/nokia/mid/s40/codec/DataEncoder.putStart.(ILjava/lang/String;)V"] = function(addr, tag, name) {
  getNative(this).putStart(tag, J2ME.fromJavaString(name));
};

Native["com/nokia/mid/s40/codec/DataEncoder.put.(ILjava/lang/String;Ljava/lang/String;)V"] = function(addr, tag, name, value) {
  getNative(this).put(tag, J2ME.fromJavaString(name), J2ME.fromJavaString(value));
};

Native["com/nokia/mid/s40/codec/DataEncoder.put.(ILjava/lang/String;J)V"] = function(addr, tag, name, valueLow, valueHigh) {
  getNative(this).put(tag, J2ME.fromJavaString(name), J2ME.longToNumber(valueLow, valueHigh));
};

Native["com/nokia/mid/s40/codec/DataEncoder.put.(ILjava/lang/String;Z)V"] = function(addr, tag, name, value) {
  getNative(this).put(tag, J2ME.fromJavaString(name), value);
};

Native["com/nokia/mid/s40/codec/DataEncoder.put.(Ljava/lang/String;[BI)V"] = function(addr, name, data, length) {
  var array = Array.prototype.slice.call(data.subarray(0, length));
  array.constructor = Array;
  getNative(this).putNoTag(J2ME.fromJavaString(name), array);
};

Native["com/nokia/mid/s40/codec/DataEncoder.putEnd.(ILjava/lang/String;)V"] = function(addr, tag, name) {
  getNative(this).putEnd(tag, J2ME.fromJavaString(name));
};

Native["com/nokia/mid/s40/codec/DataEncoder.getData.()[B"] = function(addr) {
  var data = getNative(this).getData();

  var array = J2ME.newByteArray(data.length);
  for (var i = 0; i < data.length; i++) {
    array[i] = data.charCodeAt(i);
  }

  return array;
};

Native["com/nokia/mid/s40/codec/DataDecoder.init.([BII)V"] = function(addr, data, offset, length) {
  setNative(this, new DataDecoder(data, offset, length));
};

Native["com/nokia/mid/s40/codec/DataDecoder.getStart.(I)V"] = function(addr, tag) {
  if (!getNative(this).getStart(tag)) {
    throw $.newIOException("no start found " + tag);
  }
};

Native["com/nokia/mid/s40/codec/DataDecoder.getEnd.(I)V"] = function(addr, tag) {
  if (!getNative(this).getEnd(tag)) {
    throw $.newIOException("no end found " + tag);
  }
};

Native["com/nokia/mid/s40/codec/DataDecoder.getString.(I)Ljava/lang/String;"] = function(addr, tag) {
  var str = getNative(this).getValue(tag);
  if (str === undefined) {
    throw $.newIOException("tag (" + tag + ") invalid");
  }
  return J2ME.newString(str);
};

Native["com/nokia/mid/s40/codec/DataDecoder.getInteger.(I)J"] = function(addr, tag) {
  var num = getNative(this).getValue(tag);
  if (num === undefined) {
    throw $.newIOException("tag (" + tag + ") invalid");
  }
  return J2ME.returnLongValue(num);
};

Native["com/nokia/mid/s40/codec/DataDecoder.getBoolean.()Z"] = function(addr) {
  var val = getNative(this).getNextValue();
  if (val === undefined) {
    throw $.newIOException();
  }
  return val === 1 ? 1 : 0;
};

Native["com/nokia/mid/s40/codec/DataDecoder.getName.()Ljava/lang/String;"] = function(addr) {
  var name = getNative(this).getName();
  if (name === undefined) {
    throw $.newIOException();
  }
  return J2ME.newString(name);
};

Native["com/nokia/mid/s40/codec/DataDecoder.getType.()I"] = function(addr) {
  var tag = getNative(this).getTag();
  if (tag === undefined) {
    throw $.newIOException();
  }
  return tag;
};

Native["com/nokia/mid/s40/codec/DataDecoder.listHasMoreItems.()Z"] = function(addr) {
  return getNative(this).getType() != DataEncoder.END ? 1 : 0;
};
