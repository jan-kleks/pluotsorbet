declare var ASM;

var buffer = ASM.buffer;

var i32: Int32Array = ASM.HEAP32;
var u32: Uint32Array = ASM.HEAPU32;
var f32: Float32Array = ASM.HEAPF32;
var ref = J2ME.ArrayUtilities.makeDenseArray(buffer.byteLength >> 2, null);

var aliasedI32 = J2ME.IntegerUtilities.i32;
var aliasedF32 = J2ME.IntegerUtilities.f32;
var aliasedF64 = J2ME.IntegerUtilities.f64;

module J2ME {

  import assert = Debug.assert;
  import Bytecodes = Bytecode.Bytecodes;
  import toHEX = IntegerUtilities.toHEX;

  function toName(o) {
    if (o instanceof MethodInfo) {
      return o.implKey;
    }
    function getArrayInfo(o) {
      var s = [];
      var x = [];
      for (var i = 0; i < Math.min(o.length, 20); i++) {
        s.push(o[i]);
        x.push(String.fromCharCode(o[i]));
      }
      return fromUTF8(o.klass.classInfo.utf8Name) + ", length: " + o.length + " [" + s.join(", ") + " ...] " + " " + x.join("");
    }
    function getObjectInfo(o) {
      if (o.length !== undefined) {
        return getArrayInfo(o);
      }
      return fromUTF8(o.klass.classInfo.utf8Name) + (o._address ? " " + toHEX(o._address) : "");
    }
    if (o && o.klass === Klasses.java.lang.Class) {
      return "[" + getObjectInfo(o) + "] " + o.runtimeKlass.templateKlass.classInfo.getClassNameSlow();
    }
    if (o && o.klass === Klasses.java.lang.String) {
      return "[" + getObjectInfo(o) + "] \"" + fromJavaString(o) + "\"";
    }
    return o ? ("[" + getObjectInfo(o) + "]") : "null";
  }

  /**
   * The number of opcodes executed thus far.
   */
  export var bytecodeCount = 0;

  /**
   * The number of times the interpreter method was called thus far.
   */
  export var interpreterCount = 0;

  export var onStackReplacementCount = 0;

  /*
   *             +--------------------------------+
   *             | Parameter 0                    |
   *             +--------------------------------+
   *             |              ...               |
   *             +--------------------------------+
   *             | Parameter (P-1)                |
   *             +--------------------------------+
   *             | Non-Parameter Local 0          |
   *             +--------------------------------+
   *             |              ...               |
   *             +--------------------------------+
   *             | Non-Parameter Local (L-1)      |
   *   FP  --->  +--------------------------------+
   *             | Caller Return Address          |
   *             +--------------------------------+
   *             | Caller FP                      |
   *             +--------------------------------+
   *             | Callee Method Info             |
   *             +--------------------------------+
   *             | Stack slot 0                   |
   *             +--------------------------------+
   *             |              ...               |
   *             +--------------------------------+
   *             | Stack slot (S-1)               |
   *   SP  --->  +--------------------------------+
   */

  enum FrameLayout {
    CalleeMethodInfoOffset      = 2,
    CallerFPOffset              = 1,
    CallerRAOffset              = 0,
    CallerSaveSize              = 3
  }

  export class FrameView {
    public fp: number;
    public sp: number;
    public pc: number;
    constructor() {

    }

    set(fp: number, sp: number, pc: number) {
      this.fp = fp;
      this.sp = sp;
      this.pc = pc;

      if (!release) {
        var callee = ref[this.fp + FrameLayout.CalleeMethodInfoOffset];
        assert(
          callee === null ||
          callee instanceof MethodInfo,
          "Callee @" + (this.fp + FrameLayout.CalleeMethodInfoOffset) + " is not a MethodInfo, " + toName(callee)
        );
      }
    }

    setParameter(kind: Kind, i: number, v: any) {
      switch (kind) {
        case Kind.Reference:
          ref[this.fp + this.parameterOffset + i] = v;
          break;
        case Kind.Int:
          i32[this.fp + this.parameterOffset + i] = v;
          break;
        default:
          release || assert(false);
      }
    }

    setParameterO4(v: Object, i: number) {
      // traceWriter.writeLn("Set Parameter: " + i + ", from: " + toHEX(fp + this.parameterOffset + i));
      ref[this.fp + this.parameterOffset + i] = v;
    }

    get methodInfo(): MethodInfo {
      return ref[this.fp + FrameLayout.CalleeMethodInfoOffset];
    }

    set methodInfo(methodInfo: MethodInfo) {
      ref[this.fp + FrameLayout.CalleeMethodInfoOffset] = methodInfo;
    }

    get parameterOffset() {
      return this.methodInfo ? -this.methodInfo.codeAttribute.max_locals : 0;
    }

    get stackOffset(): number {
      return FrameLayout.CallerSaveSize;
    }

    traceStack(writer: IndentingWriter) {
      var fp = this.fp;
      var sp = this.sp;
      var pc = this.pc;
      while (this.fp > FrameLayout.CallerSaveSize) {
        writer.writeLn((this.methodInfo ? this.methodInfo.implKey : "null") + ", FP: " + this.fp + ", SP: " + this.sp + ", PC: " + this.pc);
        this.set(i32[this.fp + FrameLayout.CallerFPOffset],
                 this.fp + this.parameterOffset,
                 i32[this.fp + FrameLayout.CallerRAOffset]);

      }
      this.fp = fp;
      this.sp = sp;
      this.pc = pc;
    }

    trace(writer: IndentingWriter, fieldInfo: FieldInfo) {
      function toNumber(v) {
        if (v < 0) {
          return String(v);
        } else if (v === 0) {
          return " 0";
        } else {
          return "+" + v;
        }
      }

      var details = " ";
      if (fieldInfo) {
        details += "FieldInfo: " + fromUTF8(fieldInfo.utf8Name) + ", kind: " + Kind[fieldInfo.kind] + ", byteOffset: " + fieldInfo.byteOffset;
      }
      writer.writeLn("Frame: " + this.methodInfo.implKey + ", FP: " + this.fp + ", SP: " + this.sp + ", PC: " + this.pc + ", BC: " + Bytecodes[this.methodInfo.codeAttribute.code[this.pc]] + details);
      for (var i = Math.max(0, this.fp + this.parameterOffset); i < this.sp; i++) {
        var prefix = "    ";
        if (i >= this.fp + this.stackOffset) {
          prefix = "S" + (i - (this.fp + this.stackOffset)) + ": ";
        } else if (i === this.fp + FrameLayout.CalleeMethodInfoOffset) {
          prefix = "MI: ";
        } else if (i === this.fp + FrameLayout.CallerFPOffset) {
          prefix = "CF: ";
        } else if (i === this.fp + FrameLayout.CallerRAOffset) {
          prefix = "RA: ";
        } else if (i >= this.fp + this.parameterOffset) {
          prefix = "L" + (i - (this.fp + this.parameterOffset)) + ": ";
        }
        writer.writeLn(" " + prefix + " " + toNumber(i - this.fp).padLeft(' ', 3) + " " + String(i).padLeft(' ', 4) + " " + toHEX(i << 2)  + ": " +
          String(i32[i]).padLeft(' ', 10) + " " +
          toName(ref[i]));
      }
    }
  }

  export var interpreterCounter = new Metrics.Counter(true);

  export class Thread {

    /**
     * Thread base pointer.
     */
    tp: number;

    /**
     * Stack base pointer.
     */
    bp: number

    /**
     * Current frame pointer.
     */
    fp: number

    /**
     * Current stack pointer.
     */
    sp: number

    /**
     * Current program counter.
     */
    pc: number

    /**
     * Context associated with this thread.
     */
    ctx: Context;

    view: FrameView;

    constructor(ctx: Context) {
      this.tp = ASM._gcMalloc(1024 * 128);
      this.bp = this.tp;
      this.fp = this.bp;
      this.sp = this.fp;
      this.pc = -1;
      this.view = new FrameView();
      this.ctx = ctx;
    }

    set(fp: number, sp: number, pc: number) {
      this.fp = fp;
      this.sp = sp;
      this.pc = pc;
    }

    get frame(): FrameView {
      this.view.set(this.fp, this.sp, this.pc);
      return this.view;
    }

    pushFrame(methodInfo: MethodInfo) {
      var fp = this.fp;
      if (methodInfo) {
        this.fp = this.sp + methodInfo.codeAttribute.max_locals;
      } else {
        this.fp = this.sp;
      }
      this.sp = this.fp;
      i32[this.sp++] = this.pc;    // Caller RA
      i32[this.sp++] = fp;         // Caller FP
      ref[this.sp++] = methodInfo; // Callee
      this.pc = 0;
    }

    popFrame(methodInfo: MethodInfo): MethodInfo {
      var mi = ref[this.fp + FrameLayout.CalleeMethodInfoOffset];
      release || assert(mi === methodInfo);
      this.pc = i32[this.fp + FrameLayout.CallerRAOffset];
      var maxLocals = mi ? mi.codeAttribute.max_locals : 0;
      this.sp = this.fp - maxLocals;
      this.fp = i32[this.fp + FrameLayout.CallerFPOffset];
      return ref[this.fp + FrameLayout.CalleeMethodInfoOffset]
    }

    run() {
      return interpret(this);
    }

    tryCatch(e: java.lang.Exception) {
      release || traceWriter && traceWriter.writeLn("tryCatch: " + toName(e));
      var pc = -1;
      var classInfo;
      var mi = ref[this.fp + FrameLayout.CalleeMethodInfoOffset];
      while (mi) {
        release || traceWriter && traceWriter.writeLn(mi.implKey);
        for (var i = 0; i < mi.exception_table_length; i++) {
          var exceptionEntryView = mi.getExceptionEntryViewByIndex(i);
          if (this.pc >= exceptionEntryView.start_pc && this.pc < exceptionEntryView.end_pc) {
            if (exceptionEntryView.catch_type === 0) {
              pc = exceptionEntryView.handler_pc;
              break;
            } else {
              classInfo = resolveClass(exceptionEntryView.catch_type, mi.classInfo);
              if (isAssignableTo(e.klass, classInfo.klass)) {
                pc = exceptionEntryView.handler_pc;
                break;
              }
            }
          }
        }
        if (pc >= 0) {
          this.pc = pc;
          this.sp = this.fp + FrameLayout.CallerSaveSize;
          ref[this.sp++] = e;
          return;
        }
        mi = this.popFrame(mi);
      }
      release || traceWriter && traceWriter.writeLn("Cannot catch: " + toName(e));
      throw e;
    }
  }

  export function prepareInterpretedMethod(methodInfo: MethodInfo): Function {
    var method = function fastInterpreterFrameAdapter() {
      var thread = $.ctx.nativeThread;
      var fp = thread.fp;
      release || traceWriter && traceWriter.writeLn(">> Interpreter Enter");
      thread.pushFrame(null);
      thread.pushFrame(methodInfo);
      var frame = thread.frame;
      var kinds = methodInfo.signatureKinds;
      var index = 0;
      if (!methodInfo.isStatic) {
        frame.setParameter(Kind.Reference, index++, this);
      }
      for (var i = 1; i < kinds.length; i++) {
        frame.setParameter(kinds[i], index++, arguments[i - 1]);
      }
      var v = interpret(thread);
      release || assert(fp === thread.fp);
      release || traceWriter && traceWriter.writeLn("<< Interpreter Exit");
      return v;
    };
    (<any>method).methodInfo = methodInfo;
    return method;
  }

  function resolveClass(index: number, classInfo: ClassInfo): ClassInfo {
    var classInfo = classInfo.constantPool.resolveClass(index);
    linkKlass(classInfo);
    return classInfo;
  }

  export function interpret(thread: Thread) {
    var frame = thread.frame;

    var mi = frame.methodInfo;
    var maxLocals = mi.codeAttribute.max_locals;
    var ci = mi.classInfo;
    var cp = ci.constantPool;

    var code = mi ? mi.codeAttribute.code : null;

    var fp = thread.fp;
    var lp = fp - maxLocals;
    var sp = thread.sp;
    var pc = thread.pc;

    var tag: TAGS;
    var type, size;
    var value, index, array, object, result, constant, offset, buffer, tag: TAGS, targetPC, returnValue, kind;
    var ia = 0, ib = 0; // Integer Operands
    var ll = 0, lh = 0; // Long Low / High
    var fa = 0, fb = 0; // Float / Double Operands

    var classInfo: ClassInfo;
    var fieldInfo: FieldInfo;

    function saveThreadState() {
      thread.fp = fp;
      thread.sp = sp;
      thread.pc = pc;
    }

    function saveThreadStateBefore() {
      thread.fp = fp;
      thread.sp = sp;
      thread.pc = opPC;
    }

    function loadThreadState() {
      fp = thread.fp;
      lp = fp - maxLocals;
      sp = thread.sp;
      pc = thread.pc;
    }

    /** @inline */
    function popKind(kind: Kind) {
      switch(kind) {
        case Kind.Reference:
          return ref[--sp];
        case Kind.Int:
        case Kind.Byte:
        case Kind.Char:
        case Kind.Short:
        case Kind.Boolean:
          return i32[--sp];
        case Kind.Float:
          return f32[--sp];
        case Kind.Long:
          var h = i32[--sp];
          var l = i32[--sp];
          tempReturn0 = h;
          return l;
        case Kind.Double:
          sp--;
          return f32[--sp]; // REDUX:
        case Kind.Void:
          return;
        default:
          release || assert(false, "Cannot Pop Kind: " + Kind[kind]);
      }
    }

    var values = new Array(8);

    function popArguments(mi: MethodInfo) {
      var signatureKinds = mi.signatureKinds;
      var args = [];
      for (var i = signatureKinds.length - 1; i > 0; i--) {
        var kind = signatureKinds[i];
        var value = popKind(kind);
        if (isTwoSlot(kind)) {
          args.unshift(tempReturn0);
        }
        args.unshift(value);
      }
      return args;
    }

    /** @inline */
    function pushKind(kind: Kind, l: any, h: any) {
      switch (kind) {
        case Kind.Reference:
          ref[sp++] = l;
          return;
        case Kind.Int:
        case Kind.Byte:
        case Kind.Char:
        case Kind.Short:
        case Kind.Boolean:
          i32[sp++] = l;
          break;
        case Kind.Float:
          f32[sp++] = l;
          break;
        case Kind.Long:
          i32[sp++] = l;
          i32[sp++] = h;
          break;
        case Kind.Double:
          f32[sp++] = l;
          sp++;
          break;
        case Kind.Void:
          break;
        default:
          release || assert(false, "Cannot Push Kind: " + Kind[kind]);
      }
    }

    function pushKindFromAddress(kind: Kind, address: number) {
      switch (kind) {
        case Kind.Reference:
          ref[sp++] = ref[address >> 2];
          return;
        case Kind.Int:
        case Kind.Byte:
        case Kind.Char:
        case Kind.Short:
        case Kind.Boolean:
        case Kind.Float:
          release || traceWriter && traceWriter.writeLn("REAING: " + i32[address >> 2] + " @ " + toHEX(address));
          i32[sp++] = i32[address >> 2];
          return;
        case Kind.Long:
        case Kind.Double:
          i32[sp++] = i32[address     >> 2];
          i32[sp++] = i32[address + 4 >> 2];
          return;
        default:
          release || assert(false, "Cannot Push Kind: " + Kind[kind]);
      }
    }

    function popKindIntoAddress(kind: Kind, address: number) {
      switch (kind) {
        case Kind.Reference:
          ref[address >> 2] = ref[--sp];
          return;
        case Kind.Int:
        case Kind.Byte:
        case Kind.Char:
        case Kind.Short:
        case Kind.Boolean:
        case Kind.Float:
          i32[address >> 2] = i32[--sp];
          release || traceWriter && traceWriter.writeLn("WRITING: " + i32[address >> 2] + " @ " + toHEX(address));
          break;
        case Kind.Long:
        case Kind.Double:
          i32[address + 4 >> 2] = i32[--sp];
          i32[address     >> 2] = i32[--sp];
          break;
        default:
          release || assert(false, "Cannot Pop Kind: " + Kind[kind]);
      }
    }

    function classInitAndUnwindCheck(classInfo: ClassInfo, pc: number) {
      saveThreadState();
      classInitCheck(classInfo);
      loadThreadState();
      //if (U) {
      //  $.ctx.current().pc = pc;
      //  return;
      //}
    }

    // HEAD

    while (true) {

      // saveThreadState();
      // thread.frame.trace(traceWriter, null);

      release || assert(code === mi.codeAttribute.code, "Bad Code.");
      release || assert(ci === mi.classInfo, "Bad Class Info.");
      release || assert(cp === ci.constantPool, "Bad Constant Pool.");
      release || assert(lp === fp - mi.codeAttribute.max_locals, "Bad lp.");

      fieldInfo = null;
      var opPC = pc;
      var op = code[pc++];
      // interpreterCounter.count(Bytecodes[op]);

      release || bytecodeCount++;
      if (!release && traceWriter) {
        traceWriter.writeLn(mi.implKey + ": PC: " + opPC + ", FP: " + fp + ", " + Bytecodes[op]);
        frame.set(fp, sp, opPC); frame.trace(traceWriter, fieldInfo);
      }

      try {
        switch (op) {
          case Bytecodes.NOP:
            continue;
          case Bytecodes.ACONST_NULL:
            ref[sp++] = null;
            continue;
          case Bytecodes.ICONST_M1:
          case Bytecodes.ICONST_0:
          case Bytecodes.ICONST_1:
          case Bytecodes.ICONST_2:
          case Bytecodes.ICONST_3:
          case Bytecodes.ICONST_4:
          case Bytecodes.ICONST_5:
            i32[sp++] = op - Bytecodes.ICONST_0;
            continue;
          case Bytecodes.FCONST_0:
          case Bytecodes.FCONST_1:
          case Bytecodes.FCONST_2:
            f32[sp++] = op - Bytecodes.FCONST_0;
            continue;
          case Bytecodes.DCONST_0:
            i32[sp++] = 0;
            i32[sp++] = 0;
            continue;
          case Bytecodes.DCONST_1:
            i32[sp++] = 0;
            i32[sp++] = 1072693248;
            continue;
          case Bytecodes.LCONST_0:
          case Bytecodes.LCONST_1:
            i32[sp++] = op - Bytecodes.LCONST_0;
            i32[sp++] = 0;
            continue;
          case Bytecodes.BIPUSH:
            i32[sp++] = code[pc++] << 24 >> 24;
            continue;
          case Bytecodes.SIPUSH:
            i32[sp++] = (code[pc++] << 8 | code[pc++]) << 16 >> 16;
            continue;
          case Bytecodes.LDC:
          case Bytecodes.LDC_W:
            index = (op === Bytecodes.LDC) ? code[pc++] : code[pc++] << 8 | code[pc++];
            offset = cp.entries[index];
            buffer = cp.buffer;
            tag = buffer[offset++];
            if (tag === TAGS.CONSTANT_Integer || tag === TAGS.CONSTANT_Float) {
              i32[sp++] = buffer[offset++] << 24 | buffer[offset++] << 16 | buffer[offset++] << 8 | buffer[offset++];
            } else if (tag === TAGS.CONSTANT_String) {
              ref[sp++] = constant = ci.constantPool.resolve(index, tag, false);;
            } else {
              release || assert(false, TAGS[tag]);
            }
            continue;
          case Bytecodes.LDC2_W:
            index = code[pc++] << 8 | code[pc++];
            offset = cp.entries[index];
            buffer = cp.buffer;
            tag = buffer[offset++];
            if (tag === TAGS.CONSTANT_Long || tag === TAGS.CONSTANT_Double) {
              i32[sp + 1] = buffer[offset++] << 24 | buffer[offset++] << 16 | buffer[offset++] << 8 | buffer[offset++];
              i32[sp    ] = buffer[offset++] << 24 | buffer[offset++] << 16 | buffer[offset++] << 8 | buffer[offset++];
              sp += 2;
            } else {
              release || assert(false, TAGS[tag]);
            }
            continue;
          case Bytecodes.ILOAD:
          case Bytecodes.FLOAD:
            i32[sp++] = i32[lp + code[pc++]];
            continue;
          case Bytecodes.ALOAD:
            ref[sp++] = ref[lp + code[pc++]];
            continue;
          case Bytecodes.LLOAD:
          case Bytecodes.DLOAD:
            offset = lp + code[pc++];
            i32[sp++] = i32[offset];
            i32[sp++] = i32[offset + 1];
            continue;
          case Bytecodes.ILOAD_0:
          case Bytecodes.ILOAD_1:
          case Bytecodes.ILOAD_2:
          case Bytecodes.ILOAD_3:
            i32[sp++] = i32[lp + op - Bytecodes.ILOAD_0];
            continue;
          case Bytecodes.FLOAD_0:
          case Bytecodes.FLOAD_1:
          case Bytecodes.FLOAD_2:
          case Bytecodes.FLOAD_3:
            i32[sp++] = i32[lp + op - Bytecodes.FLOAD_0];
            continue;
          case Bytecodes.ALOAD_0:
            ref[sp++] = ref[lp];
            continue;
          case Bytecodes.ALOAD_1:
          case Bytecodes.ALOAD_2:
          case Bytecodes.ALOAD_3:
            ref[sp++] = ref[lp + op - Bytecodes.ALOAD_0];
            continue;
          case Bytecodes.LLOAD_0:
          case Bytecodes.LLOAD_1:
          case Bytecodes.LLOAD_2:
          case Bytecodes.LLOAD_3:
            offset = lp + op - Bytecodes.LLOAD_0;
            i32[sp++] = i32[offset];
            i32[sp++] = i32[offset + 1];
            continue;
          case Bytecodes.DLOAD_0:
          case Bytecodes.DLOAD_1:
          case Bytecodes.DLOAD_2:
          case Bytecodes.DLOAD_3:
            offset = lp + op - Bytecodes.DLOAD_0;
            i32[sp++] = i32[offset];
            i32[sp++] = i32[offset + 1];
            continue;
          case Bytecodes.IALOAD:
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            i32[sp++] = array[index];
            continue;
          case Bytecodes.BALOAD:
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            i32[sp++] = array[index];
            continue;
          case Bytecodes.CALOAD:
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            i32[sp++] = array[index];
            continue;
          case Bytecodes.SALOAD:
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            i32[sp++] = array[index];
            continue;
          case Bytecodes.FALOAD:
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            f32[sp++] = array[index];
            continue;
          case Bytecodes.AALOAD:
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            ref[sp++] = array[index];
            continue;
          case Bytecodes.DALOAD:
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            aliasedF64[0] = array[index];
            i32[sp++] = aliasedI32[0];
            i32[sp++] = aliasedI32[1];
            continue;
          case Bytecodes.ISTORE:
          case Bytecodes.FSTORE:
            i32[lp + code[pc++]] = i32[--sp];
            continue;
          case Bytecodes.ASTORE:
            ref[lp + code[pc++]] = ref[--sp];
            continue;
          case Bytecodes.LSTORE:
          case Bytecodes.DSTORE:
            offset = lp + code[pc++];
            i32[offset + 1] = i32[--sp];
            i32[offset]     = i32[--sp];
            continue;
          case Bytecodes.ISTORE_0:
          case Bytecodes.ISTORE_1:
          case Bytecodes.ISTORE_2:
          case Bytecodes.ISTORE_3:
            i32[lp + op - Bytecodes.ISTORE_0] = i32[--sp];
            continue;
          case Bytecodes.FSTORE_0:
          case Bytecodes.FSTORE_1:
          case Bytecodes.FSTORE_2:
          case Bytecodes.FSTORE_3:
            i32[lp + op - Bytecodes.FSTORE_0] = i32[--sp];
            continue;
          case Bytecodes.ASTORE_0:
          case Bytecodes.ASTORE_1:
          case Bytecodes.ASTORE_2:
          case Bytecodes.ASTORE_3:
            ref[lp + op - Bytecodes.ASTORE_0] = ref[--sp];
            continue;
          case Bytecodes.LSTORE_0:
          case Bytecodes.LSTORE_1:
          case Bytecodes.LSTORE_2:
          case Bytecodes.LSTORE_3:
            offset = lp + op - Bytecodes.LSTORE_0;
            i32[offset + 1] = i32[--sp];
            i32[offset]     = i32[--sp];
            continue;
          case Bytecodes.DSTORE_0:
          case Bytecodes.DSTORE_1:
          case Bytecodes.DSTORE_2:
          case Bytecodes.DSTORE_3:
            offset = lp + op - Bytecodes.DSTORE_0;
            i32[offset + 1] = i32[--sp];
            i32[offset]     = i32[--sp];
            continue;
          case Bytecodes.IASTORE:
            value = i32[--sp];
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            array[index] = value;
            continue;
          case Bytecodes.FASTORE:
            value = f32[--sp];
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
              throwArrayIndexOutOfBoundsException
            }
            array[index] = value;
            continue;
          case Bytecodes.BASTORE:
            value = i32[--sp];
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            array[index] = value;
            continue;
          case Bytecodes.CASTORE:
            value = i32[--sp];
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            array[index] = value;
            continue;
          case Bytecodes.SASTORE:
            value = i32[--sp];
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            array[index] = value;
            continue;
          case Bytecodes.LASTORE:
            lh = i32[--sp];
            ll = i32[--sp];
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            array.value[index * 2    ] = ll;
            array.value[index * 2 + 1] = lh;
            continue;
          case Bytecodes.LALOAD:
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            i32[sp++] = array.value[index * 2    ];
            i32[sp++] = array.value[index * 2 + 1];
            continue;
          case Bytecodes.DASTORE:
            aliasedI32[1] = i32[--sp];
            aliasedI32[0] = i32[--sp];
            value = aliasedF64[0];
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            array[index] = value;
            continue;
          case Bytecodes.AASTORE:
            value = ref[--sp];
            index = i32[--sp];
            array = ref[--sp];
            if ((index >>> 0) >= (array.length >>> 0)) {
              throwArrayIndexOutOfBoundsException(index);
            }
            checkArrayStore(array, value);
            array[index] = value;
            break;
          case Bytecodes.POP:
            --sp;
            continue;
          case Bytecodes.POP2:
            sp -= 2;
            continue;
          case Bytecodes.DUP:
            i32[sp] = i32[sp - 1];          ref[sp] = ref[sp - 1];
            sp++;
            continue;
          case Bytecodes.DUP2:
            i32[sp    ] = i32[sp - 2];      ref[sp    ] = ref[sp - 2];
            i32[sp + 1] = i32[sp - 1];      ref[sp + 1] = ref[sp - 1];
            sp += 2;
            break;
          case Bytecodes.DUP_X1:
            i32[sp    ] = i32[sp - 1];      ref[sp    ] = ref[sp - 1];
            i32[sp - 1] = i32[sp - 2];      ref[sp - 1] = ref[sp - 2];
            i32[sp - 2] = i32[sp];          ref[sp - 2] = ref[sp];
            sp++;
            continue;
          case Bytecodes.DUP_X2:
            i32[sp    ] = i32[sp - 1];      ref[sp    ] = ref[sp - 1];
            i32[sp - 1] = i32[sp - 2];      ref[sp - 1] = ref[sp - 2];
            i32[sp - 2] = i32[sp - 3];      ref[sp - 2] = ref[sp - 3];
            i32[sp - 3] = i32[sp];          ref[sp - 3] = ref[sp];
            sp++;
            continue;
          //        case Bytecodes.DUP_X2:
          //          a = stack.pop();
          //          b = stack.pop();
          //          c = stack.pop();
          //          stack.push(a);
          //          stack.push(c);
          //          stack.push(b);
          //          stack.push(a);
          //          break;
          //        case Bytecodes.DUP2_X1:
          //          a = stack.pop();
          //          b = stack.pop();
          //          c = stack.pop();
          //          stack.push(b);
          //          stack.push(a);
          //          stack.push(c);
          //          stack.push(b);
          //          stack.push(a);
          //          break;
          //        case Bytecodes.DUP2_X2:
          //          a = stack.pop();
          //          b = stack.pop();
          //          c = stack.pop();
          //          var d = stack.pop();
          //          stack.push(b);
          //          stack.push(a);
          //          stack.push(d);
          //          stack.push(c);
          //          stack.push(b);
          //          stack.push(a);
          //          break;
          //        case Bytecodes.SWAP:
          //          a = stack.pop();
          //          b = stack.pop();
          //          stack.push(a);
          //          stack.push(b);
          //          break;
          case Bytecodes.IINC:
            index = code[pc++];
            value = code[pc++] << 24 >> 24;
            i32[lp + index] = i32[lp + index] + value | 0;
            continue;
          //        case Bytecodes.IINC_GOTO:
          //          index = frame.read8();
          //          value = frame.read8Signed();
          //          frame.local[index] += frame.local[index];
          //          frame.pc ++;
          //          frame.pc = frame.readTargetPC();
          //          break;
          case Bytecodes.IADD:
            i32[sp - 2] = (i32[sp - 2] + i32[sp - 1]) | 0; sp--;
            continue;
          case Bytecodes.LADD:
            ASM._lAdd(sp - 4 << 2, sp - 4 << 2, sp - 2 << 2); sp -= 2;
            continue;
          //        case Bytecodes.FADD:
          //          stack.push(Math.fround(stack.pop() + stack.pop()));
          //          break;
          case Bytecodes.DADD:
            aliasedI32[0] = i32[sp - 4];
            aliasedI32[1] = i32[sp - 3]; ia = aliasedF64[0];
            aliasedI32[0] = i32[sp - 2];
            aliasedI32[1] = i32[sp - 1]; ib = aliasedF64[0];
            aliasedF64[0] = ia + ib;
            i32[sp - 4] = aliasedI32[0];
            i32[sp - 3] = aliasedI32[1];
            sp -= 2;
            continue;
          case Bytecodes.ISUB:
            i32[sp - 2] = (i32[sp - 2] - i32[sp - 1]) | 0; sp--;
            continue;
          case Bytecodes.LSUB:
            ASM._lSub(sp - 4 << 2, sp - 4 << 2, sp - 2 << 2); sp -= 2;
            continue;
          //        case Bytecodes.FSUB:
          //          stack.push(Math.fround(-stack.pop() + stack.pop()));
          //          break;
          case Bytecodes.DSUB:
            aliasedI32[0] = i32[sp - 4];
            aliasedI32[1] = i32[sp - 3]; ia = aliasedF64[0];
            aliasedI32[0] = i32[sp - 2];
            aliasedI32[1] = i32[sp - 1]; ib = aliasedF64[0];
            aliasedF64[0] = ia - ib;
            i32[sp - 4] = aliasedI32[0];
            i32[sp - 3] = aliasedI32[1];
            sp -= 2;
            continue;
          case Bytecodes.IMUL:
            i32[sp - 2] = Math.imul(i32[sp - 2], i32[sp - 1]) | 0; sp--;
            continue;
          case Bytecodes.LMUL:
            ASM._lMul(sp - 4 << 2, sp - 4 << 2, sp - 2 << 2); sp -= 2;
            continue;
          //        case Bytecodes.FMUL:
          //          stack.push(Math.fround(stack.pop() * stack.pop()));
          //          break;
          case Bytecodes.DMUL:
            aliasedI32[0] = i32[sp - 4];
            aliasedI32[1] = i32[sp - 3]; ia = aliasedF64[0];
            aliasedI32[0] = i32[sp - 2];
            aliasedI32[1] = i32[sp - 1]; ib = aliasedF64[0];
            aliasedF64[0] = ia * ib;
            i32[sp - 4] = aliasedI32[0];
            i32[sp - 3] = aliasedI32[1];
            sp -= 2;
            continue;
          case Bytecodes.IDIV:
            if (i32[sp - 1] === 0) {
              throwArithmeticException();
            }
            ia = i32[sp - 2];
            ib = i32[sp - 1];
            i32[sp - 2] = (ia === Constants.INT_MIN && ib === -1) ? ia : ((ia / ib) | 0); sp--;
            continue;
          case Bytecodes.LDIV:
            if (i32[sp - 2] === 0 && i32[sp - 1] === 0) {
              throwArithmeticException();
            }
            ASM._lDiv(sp - 4 << 2, sp - 4 << 2, sp - 2 << 2); sp -= 2;
            continue;
          case Bytecodes.FDIV:
            fb = f32[--sp];
            fa = f32[--sp];
            f32[sp++] = Math.fround(fa / fb);
            break;
          case Bytecodes.DDIV:
            aliasedI32[0] = i32[sp - 4];
            aliasedI32[1] = i32[sp - 3]; ia = aliasedF64[0];
            aliasedI32[0] = i32[sp - 2];
            aliasedI32[1] = i32[sp - 1]; ib = aliasedF64[0];
            aliasedF64[0] = ia / ib;
            i32[sp - 4] = aliasedI32[0];
            i32[sp - 3] = aliasedI32[1];
            sp -= 2;
            break;
          case Bytecodes.IREM:
            if (i32[sp - 1] === 0) {
              throwArithmeticException();
            }
            i32[sp - 2] = (i32[sp - 2] % i32[sp - 1]) | 0; sp--;
            break;
          case Bytecodes.LREM:
            if (i32[sp - 2] === 0 && i32[sp - 1] === 0) {
              throwArithmeticException();
            }
            ASM._lRem(sp - 4 << 2, sp - 4 << 2, sp - 2 << 2); sp -= 2;
            continue;
          case Bytecodes.FREM:
            fb = f32[--sp];
            fa = f32[--sp];
            f32[sp++] = Math.fround(fa % fb);
            break;
          case Bytecodes.DREM:
            aliasedI32[0] = i32[sp - 4];
            aliasedI32[1] = i32[sp - 3]; ia = aliasedF64[0];
            aliasedI32[0] = i32[sp - 2];
            aliasedI32[1] = i32[sp - 1]; ib = aliasedF64[0];
            aliasedF64[0] = ia % ib;
            i32[sp - 4] = aliasedI32[0];
            i32[sp - 3] = aliasedI32[1];
            sp -= 2;
            continue;
          case Bytecodes.INEG:
            i32[sp - 1] = -i32[sp - 1] | 0;
            continue;
          case Bytecodes.LNEG:
            ASM._lNeg(sp - 2 << 2, sp - 2 << 2);
            continue;
          //        case Bytecodes.FNEG:
          //          stack.push(-stack.pop());
          //          break;
          case Bytecodes.DNEG:
            aliasedI32[0] = i32[sp - 2];
            aliasedI32[1] = i32[sp - 1];
            aliasedF64[0] = -aliasedF64[0];
            i32[sp - 2] = aliasedI32[0];
            i32[sp - 1] = aliasedI32[1];
            continue;
          case Bytecodes.ISHL:
            ib = i32[--sp];
            ia = i32[--sp];
            i32[sp++] = ia << ib;
            continue;
          case Bytecodes.LSHL:
            ASM._lShl(sp - 3 << 2, sp - 3 << 2, i32[sp - 1]); sp -= 1;
            continue;
          case Bytecodes.ISHR:
            ib = i32[--sp];
            ia = i32[--sp];
            i32[sp++] = ia >> ib;
            continue;
          case Bytecodes.LSHR:
            ASM._lShr(sp - 3 << 2, sp - 3 << 2, i32[sp - 1]); sp -= 1;
            continue;
          case Bytecodes.IUSHR:
            ib = i32[--sp];
            ia = i32[--sp];
            i32[sp++] = ia >>> ib;
            continue;
          case Bytecodes.LUSHR:
            ASM._lUshr(sp - 3 << 2, sp - 3 << 2, i32[sp - 1]); sp -= 1;
            continue;
          case Bytecodes.IAND:
            i32[sp - 2] &= i32[--sp];
            continue;
          case Bytecodes.LAND:
            i32[sp - 4] &= i32[sp - 2];
            i32[sp - 3] &= i32[sp - 1]; sp -= 2;
            break;
          case Bytecodes.IOR:
            i32[sp - 2] |= i32[--sp];
            continue;
          case Bytecodes.LOR:
            i32[sp - 4] |= i32[sp - 2];
            i32[sp - 3] |= i32[sp - 1]; sp -= 2;
            continue;
          case Bytecodes.IXOR:
            i32[sp - 2] ^= i32[--sp];
            continue;
          case Bytecodes.LXOR:
            i32[sp - 4] ^= i32[sp - 2];
            i32[sp - 3] ^= i32[sp - 1]; sp -= 2;
            continue;
          case Bytecodes.LCMP:
            ASM._lCmp(sp - 4 << 2, sp - 4 << 2, sp - 2 << 2); sp -= 3;
            continue;
          case Bytecodes.FCMPL:
          case Bytecodes.FCMPG:
            fb = f32[--sp];
            fa = f32[--sp];
            if (isNaN(fa) || isNaN(fb)) {
              i32[sp++] = op === Bytecodes.FCMPL ? -1 : 1;
            } else if (fa > fb) {
              i32[sp++] = 1;
            } else if (fa < fb) {
              i32[sp++] = -1;
            } else {
              i32[sp++] = 0;
            }
            continue;
          case Bytecodes.DCMPL:
          case Bytecodes.DCMPG:
            aliasedI32[0] = i32[sp - 2];
            aliasedI32[1] = i32[sp - 1];
            fb = aliasedF64[0];
            aliasedI32[0] = i32[sp - 4];
            aliasedI32[1] = i32[sp - 3];
            fa = aliasedF64[0];
            sp -= 4;
            if (isNaN(fa) || isNaN(fb)) {
              i32[sp++] = op === Bytecodes.DCMPL ? -1 : 1;
            } else if (fa > fb) {
              i32[sp++] = 1;
            } else if (fa < fb) {
              i32[sp++] = -1;
            } else {
              i32[sp++] = 0;
            }
            continue;
          case Bytecodes.IFEQ:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (i32[--sp] === 0) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IFNE:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (i32[--sp] !== 0) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IFLT:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (i32[--sp] < 0) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IFGE:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (i32[--sp] >= 0) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IFGT:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (i32[--sp] > 0) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IFLE:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (i32[--sp] <= 0) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IF_ICMPEQ:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (i32[--sp] === i32[--sp]) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IF_ICMPNE:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (i32[--sp] !== i32[--sp]) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IF_ICMPLT:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (i32[--sp] > i32[--sp]) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IF_ICMPGE:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (i32[--sp] <= i32[--sp]) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IF_ICMPGT:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (i32[--sp] < i32[--sp]) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IF_ICMPLE:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (i32[--sp] >= i32[--sp]) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IF_ACMPEQ:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (ref[--sp] === ref[--sp]) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IF_ACMPNE:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (ref[--sp] !== ref[--sp]) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IFNULL:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (!ref[--sp]) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.IFNONNULL:
            targetPC = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            if (ref[--sp]) {
              pc = targetPC;
            }
            continue;
          case Bytecodes.GOTO:
            pc = opPC + (code[pc++] << 8 | code[pc ++]) << 16 >> 16;
            continue;
          //        case Bytecodes.GOTO_W:
          //          frame.pc = frame.read32Signed() - 1;
          //          break;
          //        case Bytecodes.JSR:
          //          pc = frame.read16();
          //          stack.push(frame.pc);
          //          frame.pc = pc;
          //          break;
          //        case Bytecodes.JSR_W:
          //          pc = frame.read32();
          //          stack.push(frame.pc);
          //          frame.pc = pc;
          //          break;
          //        case Bytecodes.RET:
          //          frame.pc = frame.local[frame.read8()];
          //          break;
          case Bytecodes.I2L:
            i32[sp] = i32[sp - 1] < 0 ? -1 : 0; sp++;
            continue;
          case Bytecodes.I2F:
            aliasedF32[0] = i32[--sp];
            i32[sp ++] = aliasedI32[0];
            continue;
          case Bytecodes.I2D:
            aliasedF64[0] = i32[--sp];
            i32[sp ++] = aliasedI32[0];
            i32[sp ++] = aliasedI32[1];
            continue;
          case Bytecodes.L2I:
            sp--;
            continue;
          //        case Bytecodes.L2F:
          //          stack.push(Math.fround(stack.pop2().toNumber()));
          //          break;
          //        case Bytecodes.L2D:
          //          stack.push2(stack.pop2().toNumber());
          //          break;
          //        case Bytecodes.F2I:
          //          stack.push(util.double2int(stack.pop()));
          //          break;
          //        case Bytecodes.F2L:
          //          stack.push2(Long.fromNumber(stack.pop()));
          //          break;
          case Bytecodes.F2D:
            aliasedF64[0] = f32[--sp];
            i32[sp ++] = aliasedI32[0];
            i32[sp ++] = aliasedI32[1];
            break;
          case Bytecodes.D2I:
            aliasedI32[0] = i32[sp - 2];
            aliasedI32[1] = i32[sp - 1];
            fa = aliasedF64[0];
            if (fa > Constants.INT_MAX) {
              i32[sp - 2] = Constants.INT_MAX;
            } else if (fa < Constants.INT_MIN) {
              i32[sp - 2] = Constants.INT_MIN;
            } else {
              i32[sp - 2] = fa | 0;
            }
            sp --;
            break;
          //        case Bytecodes.D2L:
          //          stack.push2(util.double2long(stack.pop2()));
          //          break;
          //        case Bytecodes.D2F:
          //          stack.push(Math.fround(stack.pop2()));
          //          break;
          case Bytecodes.I2B:
            i32[sp - 1] = (i32[sp - 1] << 24) >> 24;
            continue;
          case Bytecodes.I2C:
            i32[sp - 1] &= 0xffff;
            continue;
          case Bytecodes.I2S:
            i32[sp - 1] = (i32[sp - 1] << 16) >> 16;;
            continue;
          case Bytecodes.TABLESWITCH:
            pc = (pc + 3) & ~0x03; // Consume Padding
            offset = code[pc++] << 24 | code[pc++] << 16 | code[pc++] << 8 | code[pc++];
            ia = code[pc++] << 24 | code[pc++] << 16 | code[pc++] << 8 | code[pc++];
            ib = code[pc++] << 24 | code[pc++] << 16 | code[pc++] << 8 | code[pc++];
            value = i32[--sp];
            if (value >= ia && value <= ib) {
              pc += (value - ia) << 2;
              offset = code[pc++] << 24 | code[pc++] << 16 | code[pc++] << 8 | code[pc++];
            }
            pc = opPC + offset;
            break;
          case Bytecodes.LOOKUPSWITCH:
            pc = (pc + 3) & ~0x03; // Consume Padding
                offset = code[pc++] << 24 | code[pc++] << 16 | code[pc++] << 8 | code[pc++];
            var npairs = code[pc++] << 24 | code[pc++] << 16 | code[pc++] << 8 | code[pc++];
            value = i32[--sp];
            lookup:
            for (var i = 0; i < npairs; i++) {
              var key  = code[pc++] << 24 | code[pc++] << 16 | code[pc++] << 8 | code[pc++];
              if (key === value) {
                offset = code[pc++] << 24 | code[pc++] << 16 | code[pc++] << 8 | code[pc++];
              } else {
                pc += 4;
              }
              if (key >= value) {
                break lookup;
              }
            }
            pc = opPC + offset;
            break;
          //        case Bytecodes.NEWARRAY:
          //          type = frame.read8();
          //          size = stack.pop();
          //          stack.push(newArray(PrimitiveClassInfo["????ZCFDBSIJ"[type]].klass, size));
          //          break;
          case Bytecodes.ANEWARRAY:
            index = code[pc++] << 8 | code[pc++];
            classInfo = resolveClass(index, ci);
            classInitAndUnwindCheck(classInfo, opPC);
            size = i32[--sp];
            ref[sp++] = newArray(classInfo.klass, size);
            continue;
          case Bytecodes.MULTIANEWARRAY:
            index = code[pc++] << 8 | code[pc++];
            classInfo = resolveClass(index, ci);
            var dimensions = code[pc++];
            var lengths = new Array(dimensions);
            for (var i = 0; i < dimensions; i++) {
              lengths[i] = i32[--sp];
            }
            ref[sp++] = J2ME.newMultiArray(classInfo.klass, lengths.reverse());
            break;
          case Bytecodes.ARRAYLENGTH:
            array = ref[--sp];
            i32[sp++] = array.length;
            continue;
          case Bytecodes.GETFIELD:
          case Bytecodes.GETSTATIC:
            index = code[pc++] << 8 | code[pc++];
            fieldInfo = cp.resolved[index] || cp.resolveField(index, false);
            if (op === Bytecodes.GETSTATIC) {
              classInitAndUnwindCheck(fieldInfo.classInfo, opPC);
              //if (U) {
              //  return;
              //}
              object = fieldInfo.classInfo.getStaticObject($.ctx);
            } else {
              object = ref[--sp];
            }
            pushKindFromAddress(fieldInfo.kind, object._address + fieldInfo.byteOffset);
            break;
          case Bytecodes.PUTFIELD:
          case Bytecodes.PUTSTATIC:
            index = code[pc++] << 8 | code[pc++];
            fieldInfo = cp.resolved[index] || cp.resolveField(index, false);
            if (op === Bytecodes.PUTSTATIC) {
              classInitAndUnwindCheck(fieldInfo.classInfo, opPC);
              //if (U) {
              //  return;
              //}
              object = fieldInfo.classInfo.getStaticObject($.ctx);
              popKindIntoAddress(fieldInfo.kind, object._address + fieldInfo.byteOffset);
            } else {
              popKindIntoAddress(fieldInfo.kind, ref[sp - (isTwoSlot(fieldInfo.kind) ? 3 : 2)]._address + fieldInfo.byteOffset);
              sp--;
            }
            break;
          case Bytecodes.NEW:
            index = code[pc++] << 8 | code[pc++];
            release || traceWriter && traceWriter.writeLn(mi.implKey + " " + index);
            classInfo = resolveClass(index, ci);
            saveThreadState();
            classInitAndUnwindCheck(classInfo, pc - 3);
            if (U) {
              return;
            }
            loadThreadState();
            ref[sp++] = newObject(classInfo.klass);
            continue;
          case Bytecodes.CHECKCAST:
            index = code[pc++] << 8 | code[pc++];
            classInfo = resolveClass(index, mi.classInfo);
            object = ref[sp - 1];
            if (object && !isAssignableTo(object.klass, classInfo.klass)) {
              throw $.newClassCastException (
                object.klass.classInfo.getClassNameSlow() + " is not assignable to " +
                classInfo.getClassNameSlow()
              );
            }
            continue;
          case Bytecodes.INSTANCEOF:
            index = code[pc++] << 8 | code[pc++];
            classInfo = resolveClass(index, ci);
            object = ref[--sp];
            result = !object ? false : isAssignableTo(object.klass, classInfo.klass);
            i32[sp++] = result ? 1 : 0;
            continue;
          case Bytecodes.ATHROW:
            object = ref[--sp];
            if (!object) {
              throw $.newNullPointerException();
            }
            throw object;
            continue;
          case Bytecodes.MONITORENTER:
            object = ref[--sp];
            thread.ctx.monitorEnter(object);
            if (U === VMState.Pausing || U === VMState.Stopping) {
              return;
            }
            continue;
          case Bytecodes.MONITOREXIT:
            object = ref[--sp];
            thread.ctx.monitorExit(object);
            continue;
          case Bytecodes.WIDE:
            var op = code[pc++];
            switch (op) {
              case Bytecodes.ILOAD:
              case Bytecodes.FLOAD:
                i32[sp++] = i32[lp + (code[pc++] << 8 | code[pc++])];
                continue;
              case Bytecodes.ALOAD:
                ref[sp++] = ref[lp + (code[pc++] << 8 | code[pc++])];
                continue;
              case Bytecodes.LLOAD:
              case Bytecodes.DLOAD:
                offset = lp + (code[pc++] << 8 | code[pc++]);
                i32[sp++] = i32[offset];
                i32[sp++] = i32[offset + 1];
                continue;
              case Bytecodes.ISTORE:
              case Bytecodes.FSTORE:
                i32[lp + (code[pc++] << 8 | code[pc++])] = i32[--sp];
                continue;
              case Bytecodes.ASTORE:
                ref[lp + (code[pc++] << 8 | code[pc++])] = ref[--sp];
                continue;
              case Bytecodes.LSTORE:
              case Bytecodes.DSTORE:
                offset = lp + (code[pc++] << 8 | code[pc++]);
                i32[offset + 1] = i32[--sp];
                i32[offset]     = i32[--sp];
                continue;
              case Bytecodes.IINC:
                index = code[pc++] << 8 | code[pc++];
                value = code[pc++] << 24 >> 24;
                i32[lp + index] = i32[lp + index] + value | 0;
                continue;
              //case Bytecodes.RET:
              //  this.pc = this.local[this.read16()];
              //  break;
              default:
                var opName = Bytecodes[op];
                throw new Error("Wide opcode " + opName + " [" + op + "] not supported.");
            }
            continue;
          case Bytecodes.NEWARRAY:
            type = code[pc++];
            size = i32[--sp];
            ref[sp++] = newArray(PrimitiveClassInfo["????ZCFDBSIJ"[type]].klass, size);
            continue;
          case Bytecodes.LRETURN:
          case Bytecodes.DRETURN:
          case Bytecodes.IRETURN:
          case Bytecodes.FRETURN:
          case Bytecodes.ARETURN:
          case Bytecodes.RETURN:
            var lastSP = sp;
            pc = i32[fp + FrameLayout.CallerRAOffset];
            sp = fp - maxLocals;
            fp = i32[fp + FrameLayout.CallerFPOffset];
            mi = ref[fp + FrameLayout.CalleeMethodInfoOffset];
            if (mi === null) {
              saveThreadState();
              thread.popFrame(null);
              // REDUX: What do we do about the return value here?
              return;
            }
            maxLocals = mi.codeAttribute.max_locals;
            lp = fp - maxLocals;
            release || traceWriter && traceWriter.outdent();
            release || traceWriter && traceWriter.writeLn("<< Interpreter Return");
            ci = mi.classInfo;
            cp = ci.constantPool;
            code = mi.codeAttribute.code;

            // Push return value.
            switch (op) {
              case Bytecodes.LRETURN:
              case Bytecodes.DRETURN:
                i32[sp++] = i32[lastSP - 2]; // Low Bits
                // Fallthrough ...
              case Bytecodes.IRETURN:
              case Bytecodes.FRETURN:
                i32[sp++] = i32[lastSP - 1];
                continue;
              case Bytecodes.ARETURN:
                ref[sp++] = ref[lastSP - 1];
                continue;
            }
            continue;
          case Bytecodes.INVOKEVIRTUAL:
          case Bytecodes.INVOKESPECIAL:
          case Bytecodes.INVOKESTATIC:
          case Bytecodes.INVOKEINTERFACE:
            index = code[pc++] << 8 | code[pc++];
            if (op === Bytecodes.INVOKEINTERFACE) {
              pc += 2; // Args Number & Zero
            }
            var isStatic = (op === Bytecodes.INVOKESTATIC);

            // Resolve method and do the class init check if necessary.
            var calleeMethodInfo = cp.resolved[index] || cp.resolveMethod(index, isStatic);
            var calleeTargetMethodInfo = null;

            var callee = null;
            object = null;
            if (!isStatic) {
              object = ref[sp - calleeMethodInfo.argumentSlots];
            }
            switch (op) {
              case Bytecodes.INVOKESPECIAL:
                checkNull(object);
              case Bytecodes.INVOKESTATIC:
                calleeTargetMethodInfo = calleeMethodInfo;
                break;
              case Bytecodes.INVOKEVIRTUAL:
                calleeTargetMethodInfo = object.klass.classInfo.vTable[calleeMethodInfo.vTableIndex];
                break;
              case Bytecodes.INVOKEINTERFACE:
                calleeTargetMethodInfo = object.klass.classInfo.iTable[calleeMethodInfo.mangledName];
                break;
              default:
                release || traceWriter && traceWriter.writeLn("Not Implemented: " + Bytecodes[op]);
                assert(false, "Not Implemented: " + Bytecodes[op]);
            }

            // Call Native or Compiled Method.
            if (calleeTargetMethodInfo.isNative || calleeTargetMethodInfo.state === MethodState.Compiled) {
              var args = popArguments(calleeTargetMethodInfo);
              if (!isStatic) {
                --sp; // Pop Reference
              }
              saveThreadState();
              callee = calleeTargetMethodInfo.fn || getLinkedMethod(calleeTargetMethodInfo);
              result = callee.apply(object, args);
              loadThreadState();
              if (calleeMethodInfo.returnKind !== Kind.Void) {
                release || traceWriter && traceWriter.writeLn(">> Return Value: " + tempReturn0 + " " + result);
                pushKind(calleeMethodInfo.returnKind, result, tempReturn0);
              }
              continue;
            }

            release || traceWriter && traceWriter.writeLn(">> Interpreter Invoke: " + calleeMethodInfo.implKey);
            mi = calleeTargetMethodInfo;
            maxLocals = mi.codeAttribute.max_locals;
            ci = mi.classInfo;
            cp = ci.constantPool;

            // Reserve space for non-parameter locals.
            sp += maxLocals - mi.argumentSlots;

            // Caller saved values.
            i32[sp++] = pc;
            i32[sp++] = fp;
            ref[sp++] = mi;
            fp = sp - FrameLayout.CallerSaveSize;
            lp = fp - maxLocals;

            opPC = pc = 0;
            code = mi.codeAttribute.code;

            release || traceWriter && traceWriter.indent();
            continue;
          default:
            release || traceWriter && traceWriter.writeLn("Not Implemented: " + Bytecodes[op] + ", PC: " + opPC + ", CODE: " + code.length);
            release || assert(false, "Not Implemented: " + Bytecodes[op]);
            continue;
        }
      } catch (e) {
        release || traceWriter && traceWriter.writeLn("XXXXXX " + e);
        release || traceWriter && traceWriter.writeLn(e.stack);
        // release || traceWriter && traceWriter.writeLn(jsGlobal.getBacktrace());
        e = translateException(e);
        if (!e.klass) {
          // A non-java exception was thrown. Rethrow so it is not handled by tryCatch.
          throw e;
        }
        saveThreadStateBefore();
        thread.tryCatch(e);
        loadThreadState();

        mi = thread.frame.methodInfo;
        maxLocals = mi.codeAttribute.max_locals;
        lp = fp - maxLocals;
        ci = mi.classInfo;
        cp = ci.constantPool;
        code = mi.codeAttribute.code;
        continue;
      }

      if (traceWriter) {
        // traceWriter.writeLn("AFTER: ");
        // frame.set(fp, sp, opPC); frame.trace(traceWriter, fieldInfo);
      }
    }
  }

  // print(disassemble(interpret));
}
