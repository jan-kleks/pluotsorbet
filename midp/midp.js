/* -*- Mode: Java; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/* vim: set shiftwidth=4 tabstop=4 autoindent cindent expandtab: */

'Use strict';

var MIDP = {
};

Native["com/sun/midp/jarutil/JarReader.readJarEntry0.(Ljava/lang/String;Ljava/lang/String;)[B"] = function(ctx, stack) {
    var entryName = util.fromJavaString(stack.pop()), jar = util.fromJavaString(stack.pop());
    var bytes = CLASSES.loadFileFromJar(jar, entryName);
    if (!bytes)
        ctx.raiseException("java/lang/IOException");
    var length = bytes.byteLength;
    var data = new Uint8Array(bytes);
    var array = ctx.newPrimitiveArray("B", length);
    for (var n = 0; n < length; ++n)
        array[n] = data[n];
    stack.push(array);
}

Native["com/sun/midp/log/LoggingBase.report.(IILjava/lang/String;)V"] = function(ctx, stack) {
    var message = stack.pop(), channelID = stack.pop(), severity = stack.pop();
    console.info(util.fromJavaString(message));
}

MIDP.groupTBL = [
    "net_access",
    "low_level_net_access",
    "call_control",
    "application_auto_invocation",
    "local_connectivity",
    "messaging",
    "restricted_messaging",
    "multimedia_recording",
    "read_user_data_access",
    "write_user_data_access",
    "location",
    "landmark",
    "payment",
    "authentication",
    "smart_card",
    "satsa"
];

Native["com/sun/midp/security/Permissions.loadGroupList.()[Ljava/lang/String;"] = function(ctx, stack) {
    var list = ctx.newArray("[Ljava/lang/String;", MIDP.groupTBL.length);
    MIDP.groupTBL.forEach(function (e, n) {
        list[n] = ctx.newString(e);
    });
    stack.push(list);
}

MIDP.messagesTBL = [
     ["Airtime",
      "How often should %1 ask for permission to use airtime? Using airtime may result in charges.",
      "Don't use airtime and don't ask",
      "Is it OK to Use Airtime?",
      "%1 wants to send and receive data using the network. This will use airtime and may result in charges.\n\nIs it OK to use airtime?",
      ],
     ["Network",
      "How often should %1 ask for permission to use network? Using network may result in charges.",
      "Don't use network and don't ask",
      "Is it OK to Use Network?",
      "%1 wants to send and receive data using the network. This will use airtime and may result in charges.\n\nIs it OK to use network?"
      ],
     ["Restricted Network Connections",
      "How often should %1 ask for permission to open a restricted network connection?",
      "Don't open any restricted connections and don't ask",
      "Is it OK to open a restricted network connection?",
      "%1 wants to open a restricted network connection.\n\nIs it OK to open a restricted network connection?"
      ],
     ["Auto-Start Registration",
      "How often should %1 ask for permission to register itself to automatically start?",
      "Don't register and don't ask",
      "Is it OK to automatically start the application?",
      "%1 wants to register itself to be automatically started.\n\nIs it OK to register to be automatically started?"
      ],
     ["Computer Connection",
      "How often should %1 ask for permission to connect to a computer? This may require a data cable that came with your phone.",
      "Don't connect and don't ask",
      "Is it OK to Connect?",
      "%1 wants to connect to a computer. This may require a data cable.\n\nIs it OK to make a connection?"
      ],
     ["Messaging",
      "How often should %1 ask for permission before sending or receiving text messages?",
      "Don't send or receive messages and don't ask",
      "Is it OK to Send Messages?",
      "%1 wants to send text message(s). This could result in charges.%3 message(s) will be sent to %2.\n\nIs it OK to send messages?"
      ],
     ["Secured Messaging",
      "How often should %1 ask for permission before sending or receiving secured text messages?",
      "Don't send or receive secured messages and don't ask",
      "Is it OK to Send secured Messages?",
      "%1 wants to send text secured message(s). This could result in charges.%3 message(s) will be sent to %2.\n\nIs it OK to send messages?"
      ],
     ["Recording",
      "How often should %1 ask for permission to record audio and images? This will use space on your phone.",
      "Don't record and don't ask",
      "Is it OK to Record?",
      "%1 wants to record an image or audio clip.\n\nIs it OK to record?"
      ],
     ["Read Personal Data",
      "How often should %1 ask for permission to read your personal data (contacts, appointments, etc)?",
      "Don't read my data and don't ask",
      "Is it OK to read your personal data?",
      "%1 wants to read your personal data (contacts, appointments, etc)\n\nIs it OK to read your personal data?"
      ],
     ["Update Personal Data",
      "How often should %1 ask for permission to update your personal data (contacts, appointments, etc)?",
      "Don't update my data and don't ask",
      "Is it OK to update your personal data?",
      "%1 wants to update your personal data (contacts, appointments, etc)\n\nIs it OK to update your personal data?",
      "%1 wants to update %2\n\nIs it OK to update this data?"
      ],
     ["Obtain Current Location",
      "How often should %1 ask for permission to obtain your location?",
      "Don't give my location and don't ask",
      "Is it OK to obtain your location?",
      "Application %1 wants to obtain your the location.\n\nIs it OK to obtain your location?"
      ],
     ["Access Landmark Database",
      "How often should %1 ask for permission to access your landmark database?",
      "Don't access my landmark database and don't ask",
      "Is it OK to access your landmark database?",
      "Application %1 wants to access your landmark database.\n\nIs it OK to access your landmark database?"
      ],
     ["payment"],
     ["Personal Indentification",
      "How often should %1 ask for permission to use your smart card to identify you?",
      "Don't sign and don't ask",
      "Is it OK to obtain your personal signature?",
      "%1 wants to obtain your personal digital signature.\n\nIs it OK to obtain your personal signature?\nContent to be signed:\n\n%3"
      ],
     ["Smart Card Communication",
      "How often should %1 ask for permission to access your smart card?",
      "Don't access my smart card and don't ask",
      "Is it OK to access your smart card?",
      "Application %1 wants to access your smart card.\n\nIs it OK to access your smart card?"
      ],
     ["satsa"]
];

Native["com/sun/midp/security/Permissions.getGroupMessages.(Ljava/lang/String;)[Ljava/lang/String;"] = function(ctx, stack) {
    var name = util.fromJavaString(stack.pop());
    var list = null;
    MIDP.groupTBL.forEach(function(e, n) {
        if (e === name) {
            var messages = MIDP.messagesTBL[n];
            list = ctx.newArray("[Ljava/lang/String;", messages.length);
            messages.forEach(function (e, n) {
                list[n] = ctx.newString(e);
            });
        }
    });
    stack.push(list);
}

MIDP.membersTBL = [
    ["javax.microedition.io.Connector.http",
     "javax.microedition.io.Connector.https",
     "javax.microedition.io.Connector.obex.client.tcp",
     "javax.microedition.io.Connector.obex.server.tcp"],
    ["javax.microedition.io.Connector.datagram",
     "javax.microedition.io.Connector.datagramreceiver",
     "javax.microedition.io.Connector.socket",
     "javax.microedition.io.Connector.serversocket",
     "javax.microedition.io.Connector.ssl"],
    ["javax.microedition.io.Connector.sip",
     "javax.microedition.io.Connector.sips"],
    ["javax.microedition.io.PushRegistry",
     "javax.microedition.content.ContentHandler"],
    ["javax.microedition.io.Connector.comm",
     "javax.microedition.io.Connector.obex.client",
     "javax.microedition.io.Connector.obex.server",
     "javax.microedition.io.Connector.bluetooth.client",
     "javax.microedition.io.Connector.bluetooth.server"],
    ["javax.wireless.messaging.sms.send",
     "javax.wireless.messaging.mms.send",
     "javax.microedition.io.Connector.sms",
     "javax.wireless.messaging.sms.receive",
     "javax.microedition.io.Connector.mms",
     "javax.wireless.messaging.mms.receive"],
    ["javax.wireless.messaging.cbs.receive",
     "javax.microedition.io.Connector.cbs"],
    ["javax.microedition.media.control.RecordControl",
     "javax.microedition.media.control.VideoControl.getSnapshot",
     "javax.microedition.amms.control.camera.enableShutterFeedback"],
    ["javax.microedition.pim.ContactList.read",
     "javax.microedition.pim.EventList.read",
     "javax.microedition.pim.ToDoList.read",
     "javax.microedition.io.Connector.file.read"],
    ["javax.microedition.pim.ContactList.write",
     "javax.microedition.pim.EventList.write",
     "javax.microedition.pim.ToDoList.write",
     "javax.microedition.io.Connector.file.write",
     "javax.microedition.amms.control.tuner.setPreset"],
    ["javax.microedition.location.Location",
     "javax.microedition.location.ProximityListener",
     "javax.microedition.location.Orientation"],
    ["javax.microedition.location.LandmarkStore.read",
     "javax.microedition.location.LandmarkStore.write",
     "javax.microedition.location.LandmarkStore.category",
     "javax.microedition.location.LandmarkStore.management"],
    ["javax.microedition.payment.process"],
    ["javax.microedition.securityservice.CMSMessageSignatureService"],
    ["javax.microedition.apdu.aid",
     "javax.microedition.jcrmi"],
    ["javax.microedition.apdu.sat"],
];

Native["com/sun/midp/security/Permissions.loadGroupPermissions.(Ljava/lang/String;)[Ljava/lang/String;"] = function(ctx, stack) {
    var name = util.fromJavaString(stack.pop());
    var list = null;
    MIDP.groupTBL.forEach(function(e, n) {
        if (e === name) {
            var members = MIDP.membersTBL[n];
            list = ctx.newArray("[Ljava/lang/String;", members.length);
            members.forEach(function (e, n) {
                list[n] = ctx.newString(e);
            });
        }
    });
    stack.push(list);
}

Native["com/sun/midp/main/CommandState.restoreCommandState.(Lcom/sun/midp/main/CommandState;)V"] = function(ctx, stack) {
    var state = stack.pop();
    var midletClassName = urlParams.midletClassName ? urlParams.midletClassName.replace(/\//g, '.') : "internal";
    var suiteId = (midletClassName === "internal") ? -1 : 1;
    state.class.getField("suiteId", "I").set(state, suiteId);
    state.class.getField("midletClassName", "Ljava/lang/String;").set(state, ctx.newString(midletClassName));
    var args = urlParams.args;
    state.class.getField("arg0", "Ljava/lang/String;").set(state, ctx.newString((args.length > 0) ? args[0] : ""));
    state.class.getField("arg1", "Ljava/lang/String;").set(state, ctx.newString((args.length > 1) ? args[1] : ""));
    state.class.getField("arg2", "Ljava/lang/String;").set(state, ctx.newString((args.length > 2) ? args[2] : ""));
}

MIDP.domainTBL = [
    "manufacturer",
    "operator",
    "identified_third_party",
    "unidentified_third_party,unsecured",
    "minimum,unsecured",
    "maximum,unsecured",
];

Native["com/sun/midp/security/Permissions.loadDomainList.()[Ljava/lang/String;"] = function(ctx, stack) {
    var list = ctx.newArray("[Ljava/lang/String;", MIDP.domainTBL.length);
    MIDP.domainTBL.forEach(function (e, n) {
        list[n] = ctx.newString(e);
    });
    stack.push(list);
}

MIDP.NEVER = 0;
MIDP.ALLOW = 1;
MIDP.BLANKET = 4;
MIDP.SESSION = 8;
MIDP.ONESHOT = 16;

MIDP.identifiedTBL = {
    net_access: { max: MIDP.BLANKET, default: MIDP.SESSION},
    low_level_net_access: { max: MIDP.BLANKET, default: MIDP.SESSION},
    call_control: { max: MIDP.BLANKET, default: MIDP.ONESHOT},
    application_auto_invocation: { max: MIDP.BLANKET, default: MIDP.ONESHOT},
    local_connectivity: { max: MIDP.BLANKET, default: MIDP.SESSION},
    messaging: { max: MIDP.BLANKET, default: MIDP.ONESHOT},
    restricted_messaging: { max: MIDP.BLANKET, default: MIDP.ONESHOT},
    multimedia_recording: { max: MIDP.BLANKET, default: MIDP.SESSION},
    read_user_data_access: { max: MIDP.BLANKET, default: MIDP.ONESHOT},
    write_user_data_access: { max: MIDP.BLANKET, default: MIDP.ONESHOT},
    location: { max: MIDP.BLANKET, default: MIDP.SESSION},
    landmark: { max: MIDP.BLANKET, default: MIDP.SESSION},
    payment: { max: MIDP.ALLOW,   default: MIDP.ALLOW},
    authentication: { max: MIDP.BLANKET, default: MIDP.SESSION},
    smart_card: { max: MIDP.BLANKET, default: MIDP.SESSION},
    satsa: { max: MIDP.NEVER,   default: MIDP.NEVER},
};

MIDP.unidentifiedTBL = {
    net_access: { max: MIDP.SESSION, default: MIDP.ONESHOT},
    low_level_net_access: { max: MIDP.SESSION, default: MIDP.ONESHOT},
    call_control: { max: MIDP.ONESHOT, default: MIDP.ONESHOT},
    application_auto_invocation: { max: MIDP.SESSION, default: MIDP.ONESHOT},
    local_connectivity: { max: MIDP.BLANKET, default: MIDP.ONESHOT},
    messaging: { max: MIDP.ONESHOT, default: MIDP.ONESHOT},
    restricted_messaging: { max: MIDP.ONESHOT, default: MIDP.ONESHOT},
    multimedia_recording: { max: MIDP.SESSION, default: MIDP.ONESHOT},
    read_user_data_access: { max: MIDP.ONESHOT, default: MIDP.ONESHOT},
    write_user_data_access: { max: MIDP.ONESHOT, default: MIDP.ONESHOT},
    location: { max: MIDP.SESSION, default: MIDP.ONESHOT},
    landmark: { max: MIDP.SESSION, default: MIDP.ONESHOT},
    payment: { max: MIDP.NEVER,   default: MIDP.NEVER},
    authentication: { max: MIDP.NEVER,   default: MIDP.NEVER},
    smart_card: { max: MIDP.NEVER,   default: MIDP.NEVER},
    satsa: { max: MIDP.NEVER,   default: MIDP.NEVER},
};

Native["com/sun/midp/security/Permissions.getDefaultValue.(Ljava/lang/String;Ljava/lang/String;)B"] = function(ctx, stack) {
    var group = util.fromJavaString(stack.pop()), domain = util.fromJavaString(stack.pop());
    var allow = MIDP.NEVER;
    switch (domain) {
    case "manufacturer":
    case "maximum":
    case "operator":
        allow = MIDP.ALLOW;
        break;
    case "identified_third_party":
        allow = MIDP.identifiedTBL[group].default;
        break;
    case "unidentified_third_party":
        allow = MIDP.unidentifiedTBL[group].default;
        break;
    }
    stack.push(allow);
}

Native["com/sun/midp/security/Permissions.getMaxValue.(Ljava/lang/String;Ljava/lang/String;)B"] = function(ctx, stack) {
    var group = util.fromJavaString(stack.pop()), domain = util.fromJavaString(stack.pop());
    var allow = MIDP.NEVER;
    switch (domain) {
    case "manufacturer":
    case "maximum":
    case "operator":
        allow = MIDP.ALLOW;
        break;
    case "identified_third_party":
        allow = MIDP.identifiedTBL[group].max;
        break;
    case "unidentified_third_party":
        allow = MIDP.unidentifiedTBL[group].max;
        break;
    }
    stack.push(allow);
}

Native["com/sun/midp/security/Permissions.loadingFinished.()V"] = function(ctx, stack) {
}

Native["com/sun/midp/main/MIDletSuiteUtils.getIsolateId.()I"] = function(ctx, stack) {
    stack.push(0);
}

Native["com/sun/midp/main/MIDletSuiteUtils.registerAmsIsolateId.()V"] = function(ctx, stack) {
}

Native["com/sun/midp/main/MIDletSuiteUtils.getAmsIsolateId.()I"] = function(ctx, stack) {
    stack.push(0);
}

Native["com/sun/midp/main/MIDletSuiteUtils.isAmsIsolate.()Z"] = function(ctx, stack) {
    stack.push(1);
}

Native["com/sun/midp/main/MIDletSuiteUtils.vmBeginStartUp.(I)V"] = function(ctx, stack) {
    var midletIsolateId = stack.pop();
}

Native["com/sun/midp/main/MIDletSuiteUtils.vmEndStartUp.(I)V"] = function(ctx, stack) {
    var midletIsolateId = stack.pop();
}

Native["com/sun/midp/main/Configuration.getProperty0.(Ljava/lang/String;)Ljava/lang/String;"] = function(ctx, stack) {
    var key = stack.pop();
    var value;
    switch (util.fromJavaString(key)) {
    case "com.sun.midp.publickeystore.WebPublicKeyStore":
        value = "web.pks";
        break;
    case "com.sun.midp.events.dispatchTableInitSize":
        value = "16";
        break;
    case "microedition.locale":
        value = navigator.language;
        break;
    default:
        console.log("UNKNOWN PROPERTY (com/sun/midp/main/Configuration): " + util.fromJavaString(key));
        value = null;
        break;
    }
    stack.push(value ? ctx.newString(value) : null);
}

Native["com/sun/midp/io/j2me/storage/File.initConfigRoot.(I)Ljava/lang/String;"] = function(ctx, stack) {
    var storageId = stack.pop();
    stack.push(ctx.newString("assets/" + storageId + "/"));
}

Native["com/sun/midp/chameleon/skins/resources/LoadedSkinData.beginReadingSkinFile.(Ljava/lang/String;)V"] = function(ctx, stack) {
    var fileName = util.fromJavaString(stack.pop());
    var data = CLASSES.loadFile(fileName);
    if (!data)
        ctx.raiseException("java/lang/IOException");
    MIDP.skinFileData = new DataView(data);
    MIDP.skinFilePos = 0;
}

Native["com/sun/midp/chameleon/skins/resources/LoadedSkinData.readByteArray.(I)[B"] = function(ctx, stack) {
    var len = stack.pop();
    if (!MIDP.skinFileData || (MIDP.skinFilePos + len) > MIDP.skinFileData.byteLength)
        ctx.raiseException("java/lang/IllegalStateException");
    var bytes = ctx.newPrimitiveArray("B", len);
    for (var n = 0; n < len; ++n) {
        bytes[n] = MIDP.skinFileData.getUint8(MIDP.skinFilePos++);
    }
    stack.push(bytes);
}

Native["com/sun/midp/chameleon/skins/resources/LoadedSkinData.readIntArray.()[I"] = function(ctx, stack) {
    if (!MIDP.skinFileData || (MIDP.skinFilePos + 4) > MIDP.skinFileData.byteLength)
        ctx.raiseException("java/lang/IllegalStateException");
    var len = MIDP.skinFileData.getInt32(MIDP.skinFilePos, true);
    MIDP.skinFilePos += 4;
    var ints = ctx.newPrimitiveArray("I", len);
    for (var n = 0; n < len; ++n) {
        if ((MIDP.skinFilePos + 4) > MIDP.skinFileData.byteLength)
            ctx.raiseException("java/lang/IllegalStateException");
        ints[n] = MIDP.skinFileData.getInt32(MIDP.skinFilePos, true);
        MIDP.skinFilePos += 4;
    }
    stack.push(ints);
}

MIDP.STRING_ENCODING_USASCII = 0;
MIDP.STRING_ENCODING_UTF8 = 1;

Native["com/sun/midp/chameleon/skins/resources/LoadedSkinData.readStringArray.()[Ljava/lang/String;"] = function(ctx, stack) {
    if (!MIDP.skinFileData || (MIDP.skinFilePos + 4) > MIDP.skinFileData.byteLength)
        ctx.raiseException("java/lang/IllegalStateException");
    var len = MIDP.skinFileData.getInt32(MIDP.skinFilePos, true);
    MIDP.skinFilePos += 4;
    var strings = ctx.newArray("[Ljava/lang/String;", len);
    for (var n = 0; n < len; ++n) {
        if ((MIDP.skinFilePos + 2) > MIDP.skinFileData.byteLength)
            ctx.raiseException("java/lang/IllegalStateException");
        var strLen = MIDP.skinFileData.getUint8(MIDP.skinFilePos++);
        var strEnc = MIDP.skinFileData.getUint8(MIDP.skinFilePos++);
        if ((MIDP.skinFilePos + strLen) > MIDP.skinFileData.byteLength)
            ctx.raiseException("java/lang/IllegalStateException");
        var bytes = MIDP.skinFileData.buffer.slice(MIDP.skinFilePos, MIDP.skinFilePos + strLen);
        MIDP.skinFilePos += strLen;
        var str;
        if (strEnc === MIDP.STRING_ENCODING_USASCII) {
            var data = new Uint8Array(bytes);
            str = "";
            for (var i = 0; i < strLen; ++i)
                str += String.fromCharCode(data[i]);
        } else if (strEnc === MIDP.STRING_ENCODING_UTF8) {
            str = util.decodeUtf8(bytes);
        } else {
            ctx.raiseException("java/lang/IllegalStateException");
        }
        strings[n] = ctx.newString(str);
    }
    stack.push(strings);
}

Native["com/sun/midp/chameleon/skins/resources/LoadedSkinData.finishReadingSkinFile.()I"] = function(ctx, stack) {
    MIDP.skinFileData = null;
    MIDP.skinFilePos = 0;
    stack.push(0);
}

Native["com/sun/midp/chameleon/skins/resources/SkinResourcesImpl.shareResourcePool.(Ljava/lang/Object;)V"] = function(ctx, stack) {
    var pool = stack.pop();
}

Native["com/sun/midp/chameleon/skins/resources/SkinResourcesImpl.shareSkinData.(Ljava/lang/Object;)V"] = function(ctx, stack) {
    var data = stack.pop();
}

Native["com/sun/midp/chameleon/skins/resources/SkinResourcesImpl.ifLoadAllResources0.()Z"] = function(ctx, stack) {
    stack.push(0);
}

Native["com/sun/midp/util/ResourceHandler.loadRomizedResource0.(Ljava/lang/String;)[B"] = function(ctx, stack) {
    var fileName = "assets/0/" + util.fromJavaString(stack.pop()).replace("_", ".").replace("_png", ".png");
    var data = CLASSES.loadFile(fileName);
    if (!data) {
        console.log(fileName);
        ctx.raiseException("java/lang/IOException");
    }
    var len = data.byteLength;
    var bytes = ctx.newPrimitiveArray("B", len);
    var src = new Uint8Array(data);
    for (var n = 0; n < bytes.byteLength; ++n)
        bytes[n] = src[n];
    stack.push(bytes);
}

Native["com/sun/midp/chameleon/layers/SoftButtonLayer.isNativeSoftButtonLayerSupported0.()Z"] = function(ctx, stack) {
    stack.push(0);
}

MIDP.Context2D = (function() {
    var c = document.getElementById("canvas");
    c.width = 320;
    c.height = 480;

    // TODO These mouse event handlers only work on firefox right now,
    // because they use layerX and layerY.

    var mouse_is_down = false;
    
    c.addEventListener("mousedown", function(ev) {
        mouse_is_down = true;
        MIDP.sendNativeEvent({ type: MIDP.PEN_EVENT, intParam1: MIDP.PRESSED, intParam2: ev.layerX, intParam3: ev.layerY, intParam4: 1 });
    });
    
    c.addEventListener("mousemove", function(ev) {
        if (mouse_is_down)
            MIDP.sendNativeEvent({ type: MIDP.PEN_EVENT, intParam1: MIDP.DRAGGED, intParam2: ev.layerX, intParam3: ev.layerY, intParam4: 1 })
    });
    
    c.addEventListener("mouseup", function(ev) {
        mouse_is_down = false;
        MIDP.sendNativeEvent({ type: MIDP.PEN_EVENT, intParam1: MIDP.RELEASED, intParam2: ev.layerX, intParam3: ev.layerY, intParam4: 1 });
    });

    return c.getContext("2d");
})();

Native["com/sun/midp/midletsuite/MIDletSuiteStorage.loadSuitesIcons0.()I"] = function(ctx, stack) {
    stack.push(0);
}

Native["com/sun/midp/midletsuite/MIDletSuiteStorage.suiteExists.(I)Z"] = function(ctx, stack) {
    var id = stack.pop(), _this = stack.pop();
    stack.push(id <= 1 ? 1 : 0);
}

Native["com/sun/midp/midletsuite/MIDletSuiteStorage.getSecureFilenameBase.(I)Ljava/lang/String;"] = function(ctx, stack) {
    var id = stack.pop(), _this = stack.pop();
    stack.push(ctx.newString(""));
}

Native["com/sun/midp/rms/RecordStoreUtil.exists.(Ljava/lang/String;Ljava/lang/String;I)Z"] = function(ctx, stack) {
    var ext = stack.pop(), name = util.fromJavaString(stack.pop()), path = util.fromJavaString(stack.pop());
    stack.push(0);
}

Native["com/sun/midp/midletsuite/MIDletSuiteStorage.getMidletSuiteStorageId.(I)I"] = function(ctx, stack) {
    var id = stack.pop();
    stack.push(0);
}

Native["com/sun/midp/rms/RecordStoreFile.spaceAvailableNewRecordStore0.(Ljava/lang/String;I)I"] = function(ctx, stack) {
    var storageId = stack.pop(), name = util.fromJavaString(stack.pop());
    stack.push(10 * 4096 * 4096);
}

Native["com/sun/midp/rms/RecordStoreFile.spaceAvailableRecordStore.(ILjava/lang/String;I)I"] = function(ctx, stack) {
    var storageId = stack.pop(), base = util.fromJavaString(stack.pop()), handle = stack.pop();
    stack.push(10 * 4096 * 4096);
}

Native["com/sun/midp/rms/RecordStoreFile.openRecordStoreFile.(Ljava/lang/String;Ljava/lang/String;I)I"] = function(ctx, stack) {
    var ext = stack.pop(), name = util.fromJavaString(stack.pop()), base = util.fromJavaString(stack.pop()), _this = stack.pop();
    stack.push(0);
}

Native["com/sun/midp/rms/RecordStoreFile.setPosition.(II)V"] = function(ctx, stack) {
    var pos = stack.pop(), handle = stack.pop();
}

Native["com/sun/midp/rms/RecordStoreFile.writeBytes.(I[BII)V"] = function(ctx, stack) {
    var count = stack.pop(), offset = stack.pop(), bytes = stack.pop(), fileId = stack.pop();
}

Native["com/sun/midp/rms/RecordStoreFile.commitWrite.(I)V"] = function(ctx, stack) {
    var fileId = stack.pop();
}

Native["com/sun/midp/rms/RecordStoreFile.closeFile.(I)V"] = function(ctx, stack) {
    var fileId = stack.pop();
}

Native["com/sun/midp/rms/RecordStoreSharedDBHeader.getLookupId0.(ILjava/lang/String;I)I"] = function(ctx, stack) {
    var headerDataSize = stack.pop(), storeName = util.fromJavaString(stack.pop()), suiteId = stack.pop();
    stack.push(0);
}

Native["com/sun/midp/rms/RecordStoreSharedDBHeader.shareCachedData0.(I[BI)I"] = function(ctx, stack) {
    var headerDataSize = stack.pop(), headerData = stack.pop(), lookupId = stack.pop();
    stack.push(0);
}

Native["com/sun/midp/rms/RecordStoreSharedDBHeader.updateCachedData0.(I[BII)I"] = function(ctx, stack) {
    var headerVersion = stack.pop(), headerDataSize = stack.pop(), headerData = stack.pop(), lookupId = stack.pop();
    stack.push(0);
}

Native["com/sun/midp/rms/RecordStoreSharedDBHeader.cleanup0.()V"] = function(ctx, stack) {
    var _this = stack.pop();
}

Native["com/sun/midp/rms/RecordStoreRegistry.getRecordStoreListeners.(ILjava/lang/String;)[I"] = function(ctx, stack) {
    var storeName = util.fromJavaString(stack.pop()), suiteId = stack.pop();
    stack.push(ctx.newPrimitiveArray("I", 0));
}

Native["com/sun/midp/rms/RecordStoreRegistry.sendRecordStoreChangeEvent.(ILjava/lang/String;II)V"] = function(ctx, stack) {
    var recordId = stack.pop(), changeType = stack.pop(), storeName = util.fromJavaString(stack.pop()), suiteId = stack.pop();
}

Native["com/sun/midp/rms/RecordStoreRegistry.stopRecordStoreListening.(ILjava/lang/String;)V"] = function(ctx, stack) {
    var storeName = util.fromJavaString(stack.pop()), suiteId = stack.pop();
}

Native["com/sun/midp/midletsuite/MIDletSuiteImpl.lockMIDletSuite.(IZ)V"] = function(ctx, stack) {
    var lock = stack.pop(), id = stack.pop();
}

Native["com/sun/midp/midletsuite/SuiteSettings.load.()V"] = function(ctx, stack) {
    var _this = stack.pop();
}

Native["com/sun/midp/midletsuite/InstallInfo.load.()V"] = function(ctx, stack) {
    var _this = stack.pop();
}

Native["com/sun/midp/midletsuite/SuiteProperties.load.()[Ljava/lang/String;"] = function(ctx, stack) {
    var _this = stack.pop();

    var keys = Object.keys(MIDP.manifest);

    var arr = ctx.newArray("[Ljava/lang/String;", keys.length * 2);

    var i = 0;
    keys.forEach(function(key) {
      arr[i++] = ctx.newString(key);
      arr[i++] = ctx.newString(MIDP.manifest[key]);
    });

    stack.push(arr);
}

Native["javax/microedition/lcdui/SuiteImageCacheImpl.loadAndCreateImmutableImageDataFromCache0.(Ljavax/microedition/lcdui/ImageData;ILjava/lang/String;)Z"] = function(ctx, stack) {
    var fileName = util.fromJavaString(stack.pop()), suiteId = stack.pop(), imageData = stack.pop();
    stack.push(0);
}

Native["com/sun/midp/util/isolate/InterIsolateMutex.getID0.(Ljava/lang/String;)I"] = function(ctx, stack) {
    var name = util.fromJavaString(stack.pop());
    stack.push(0);
}

Native["com/sun/midp/util/isolate/InterIsolateMutex.lock0.(I)V"] = function(ctx, stack) {
    var id = stack.pop();
}

Native["com/sun/midp/util/isolate/InterIsolateMutex.unlock0.(I)V"] = function(ctx, stack) {
    var id = stack.pop();
}

Native["com/sun/midp/rms/RecordStoreSharedDBHeader.getHeaderRefCount0.(I)I"] = function(ctx, stack) {
    var id = stack.pop();
    stack.push(1);
}

MIDP.nativeEventQueue = [];

MIDP.copyEvent = function(obj) {
    var e = MIDP.nativeEventQueue.shift();
    obj.class.getField("type", "I").set(obj, e.type);
    obj.class.fields.forEach(function(field) {
        field.set(obj, e[field.name]);
    });
}

MIDP.deliverWaitForNativeEventResult = function(ctx) {
    var stack = ctx.current().stack;
    var obj = stack.pop();
    if (MIDP.nativeEventQueue.length > 0)
        MIDP.copyEvent(obj);
    stack.push(MIDP.nativeEventQueue.length);
}

MIDP.sendEvent = function(obj) {
    var e = { type: obj.class.getField("type", "I").get(obj) };
    obj.class.fields.forEach(function(field) {
        e[field.name] = field.get(obj);
    });
    MIDP.sendNativeEvent(e);
}

MIDP.sendNativeEvent = function(e) {
    MIDP.nativeEventQueue.push(e);
    var ctx = MIDP.waitingNativeEventContext;
    if (!ctx)
        return;
    MIDP.deliverWaitForNativeEventResult(MIDP.waitingNativeEventContext);
    MIDP.waitingNativeEventContext.resume();
    MIDP.waitingNativeEventContext = null;
}

MIDP.KEY_EVENT = 1;
MIDP.PEN_EVENT = 2;
MIDP.PRESSED = 1;
MIDP.RELEASED = 2;
MIDP.DRAGGED = 3;
MIDP.COMMAND_EVENT = 3;
MIDP.EVENT_QUEUE_SHUTDOWN = 31;

MIDP.suppressKeyEvents = false;

MIDP.keyPress = function(keyCode) {
    if (!MIDP.suppressKeyEvents)
        MIDP.sendNativeEvent({ type: MIDP.KEY_EVENT, intParam1: MIDP.PRESSED, intParam2: keyCode, intParam3: 0, intParam4: 1 });
}

window.addEventListener("keypress", function(ev) {
    MIDP.keyPress(ev.which);
});

Native["com/sun/midp/events/EventQueue.getNativeEventQueueHandle.()I"] = function(ctx, stack) {
    var _this = stack.pop();
    stack.push(0);
}

Native["com/sun/midp/events/EventQueue.resetNativeEventQueue.()V"] = function(ctx, stack) {
    var _this = stack.pop();
}

Native["com/sun/midp/events/EventQueue.sendNativeEventToIsolate.(Lcom/sun/midp/events/NativeEvent;I)V"] = function(ctx, stack) {
    var isolate = stack.pop(), obj = stack.pop(), _this = stack.pop();
    MIDP.sendEvent(obj);
}

Native["com/sun/midp/events/NativeEventMonitor.waitForNativeEvent.(Lcom/sun/midp/events/NativeEvent;)I"] = function(ctx, stack) {
    if (MIDP.nativeEventQueue.length === 0) {
        MIDP.waitingNativeEventContext = ctx;
        throw VM.Pause;
    }
    MIDP.deliverWaitForNativeEventResult(ctx);
}

Native["com/sun/midp/events/NativeEventMonitor.readNativeEvent.(Lcom/sun/midp/events/NativeEvent;)Z"] = function(ctx, stack) {
    var obj = stack.pop();
    if (!MIDP.nativeEventQueue.length) {
        stack.push(0);
        return;
    }
    MIDP.copyEvent(obj);
    stack.push(1);
}

Native["com/sun/midp/l10n/LocalizedStringsBase.getContent.(I)Ljava/lang/String;"] = function(ctx, stack) {
    var id = stack.pop();
    var classInfo = CLASSES.getClass("com/sun/midp/i18n/ResourceConstants");
    var key;
    classInfo.fields.forEach(function(field) {
        if (classInfo.constant_pool[field.constantValue].integer === id)
            key = field.name;
    });
    var data = CLASSES.loadFile("assets/0/en-US.xml");
    if (!data || !key)
        ctx.raiseException("java/lang/IOException");
    var text = util.decodeUtf8(data);
    var xml = new window.DOMParser().parseFromString(text, "text/xml");
    var entries = xml.getElementsByTagName("localized_string");
    for (n = 0; n < entries.length; ++n) {
        var entry = entries[n];
        if (entry.attributes.Key.value === key) {
            stack.push(ctx.newString(entry.attributes.Value.value));
            return;
        }
    }
    ctx.raiseException("java/lang/IllegalStateException");
}

Native["javax/microedition/lcdui/Graphics.getPixel.(IIZ)I"] = function(ctx, stack) {
    var isGray = stack.pop(), gray = stack.pop(), rgb = stack.pop(), _this = stack.pop();
    stack.push(rgb);
}

Native["javax/microedition/lcdui/Display.drawTrustedIcon0.(IZ)V"] = function(ctx, stack) {
    var drawTrusted = stack.pop(), displayId = stack.pop(), _this = stack.pop();
}

Native["com/sun/midp/rms/RecordStoreRegistry.stopAllRecordStoreListeners.(I)V"] = function(ctx, stack) {
    var taskId = stack.pop();
}

Native["com/sun/midp/events/EventQueue.sendShutdownEvent.()V"] = function(ctx, stack) {
    var _this = stack.pop();
    var obj = ctx.newObject(CLASSES.getClass("com/sun/midp/events/NativeEvent"));
    obj.class.getField("type", "I").set(obj, MIDP.EVENT_QUEUE_SHUTDOWN);
    MIDP.sendEvent(obj);
}

Native["com/sun/midp/main/CommandState.saveCommandState.(Lcom/sun/midp/main/CommandState;)V"] = function(ctx, stack) {
    var commandState = stack.pop();
}

Native["com/sun/midp/main/CommandState.exitInternal.(I)V"] = function(ctx, stack) {
    console.log("Exit: " + stack.pop());
    throw VM.Pause;
}

Native["com/sun/midp/suspend/SuspendSystem$MIDPSystem.allMidletsKilled.()Z"] = function(ctx, stack) {
    var _this = stack.pop();
    stack.push(0);
}

Native["com/sun/midp/chameleon/input/InputModeFactory.getInputModeIds.()[I"] = function(ctx, stack) {
    var ids = ctx.newPrimitiveArray("I", 1);
    ids[0] = 1; // KEYBOARD_INPUT_MODE
    stack.push(ids);
}

Native["javax/microedition/lcdui/KeyConverter.getSystemKey.(I)I"] = function(ctx, stack) {
    var key = stack.pop();
    /* We don't care about the system keys POWER, SEND, END, SELECT,
      SOFT_BUTTON1, SOFT_BUTTON2, DEBUG_TRACE1, CLAMSHELL_OPEN, CLAMSHELL_CLOSE,
      but we do care about SYSTEM_KEY_CLEAR, so send it when the delete key is pressed.
    */
    if (key === 8) {
        stack.push(4)
    } else {
        stack.push(0);
    }
}

Native["javax/microedition/lcdui/KeyConverter.getKeyName.(I)Ljava/lang/String;"] = function(ctx, stack) {
    var keyCode = stack.pop();
    stack.push(ctx.newString(String.fromCharCode(keyCode)));
}

Native["com/sun/midp/io/j2me/push/ConnectionRegistry.checkInByMidlet0.(ILjava/lang/String;)V"] = function(ctx, stack) {
    var className = stack.pop(), suiteId = stack.pop();
}

MIDP.gameKeys = {
    119: 1,  // UP
    97: 2,   // LEFT
    115: 6,  // DOWN
    100: 5,  // RIGHT
    32: 8,   // FIRE
    113: 9,  // GAME_A
    101: 10, // GAME_B
    122: 11, // GAME_C
    99: 12   // GAME_D
};

Native["javax/microedition/lcdui/KeyConverter.getGameAction.(I)I"] = function(ctx, stack) {
    var keyCode = stack.pop();
    stack.push(MIDP.gameKeys[keyCode] || 0);
}

Native["javax/microedition/lcdui/game/GameCanvas.setSuppressKeyEvents.(Ljavax/microedition/lcdui/Canvas;Z)V"] = function(ctx, stack) {
    var suppressKeyEvents = stack.pop(), canvas = stack.pop(), _this = stack.pop();
    MIDP.suppressKeyEvents = suppressKeyEvents;
}

Native["com/sun/midp/main/MIDletProxyList.resetForegroundInNativeState.()V"] = function(ctx, stack) {
    var _this = stack.pop();
}

Native["com/sun/midp/main/MIDletProxyList.setForegroundInNativeState.(II)V"] = function(ctx, stack) {
    var displayId = stack.pop(), isolateId = stack.pop(), _this = stack.pop();
}

Native["com/sun/midp/io/j2me/push/ConnectionRegistry.poll0.(J)I"] = function(ctx, stack) {
    var time = stack.pop(), _this = stack.pop();
    // Wait for incoming connections
    throw VM.Pause;
}

Native["com/nokia/mid/ui/gestures/GestureRegistrationManager.setListener.(Ljava/lang/Object;Lcom/nokia/mid/ui/gestures/GestureListener;)V"] = function(ctx, stack) {
    var listener = stack.pop(), container = stack.pop();
}

Native["com/nokia/mid/ui/gestures/GestureRegistrationManager.register.(Ljava/lang/Object;Lcom/nokia/mid/ui/gestures/GestureInteractiveZone;)Z"] = function(ctx, stack) {
    var gestureInteractiveZone = stack.pop(), container = stack.pop();
    stack.push(0);
}

Native["com/nokia/mid/ui/gestures/GestureInteractiveZone.isSupported.(I)Z"] = function(ctx, stack) {
    var gestureEventIdentity = stack.pop();
    stack.push(0);
}

Native["com/ibm/oti/connection/file/Connection.isValidFilenameImpl.([B)Z"] = function(ctx, stack) {
    var byteArray = stack.pop(), _this = stack.pop();
    stack.push(1);
}

Native["com/ibm/oti/connection/file/Connection.existsImpl.([B)Z"] = function(ctx, stack) {
    var byteArray = stack.pop(), _this = stack.pop();

    var path = "/" + util.decodeUtf8(byteArray);

    fs.exists(path, function(exists) {
        stack.push(exists ? 1 : 0);
        ctx.resume();
    });

    throw VM.Pause;
}

Native["com/ibm/oti/connection/file/Connection.fileSizeImpl.([B)J"] = function(ctx, stack) {
    var byteArray = stack.pop(), _this = stack.pop();

    var path = "/" + util.decodeUtf8(byteArray);

    fs.size(path, function(size) {
        stack.push2(Long.fromNumber(size));
        ctx.resume();
    });

    throw VM.Pause;
}

Native["com/ibm/oti/connection/file/Connection.isDirectoryImpl.([B)Z"] = function(ctx, stack) {
    var byteArray = stack.pop(), _this = stack.pop();

    var path = "/" + util.decodeUtf8(byteArray);

    fs.list(path, function(files) {
        stack.push(files ? 1 : 0);
        ctx.resume();
    });

    throw VM.Pause;
}

Native["com/ibm/oti/connection/file/Connection.listImpl.([B[BZ)[[B"] = function(ctx, stack) {
    // TODO: FILTER

    var includeHidden = stack.pop(), filterArray = stack.pop(), byteArray = stack.pop(), _this = stack.pop();

    var path = "/" + util.decodeUtf8(byteArray);

    var filter = "";
    if (filterArray) {
        filter = util.decodeUtf8(filterArray);
    }

    fs.list(path, function(files) {
        var pathsArray = ctx.newArray("[B", files.length);
        for (var i = 0; i < files.length; i++) {
            var curPath = path + files[i];
            var bytesCurPath = new TextEncoder().encode(curPath);
            var pathArray = ctx.newPrimitiveArray("B", bytesCurPath.byteLength);
            for (var j = 0; j < bytesCurPath.byteLength; j++) {
                pathArray[j] = bytesCurPath[j];
            }
            pathsArray[i] = pathArray;
        }

        stack.push(pathsArray);
        ctx.resume();
    });

    throw VM.Pause;
}

Native["com/ibm/oti/connection/file/Connection.mkdirImpl.([B)I"] = function(ctx, stack) {
    var byteArray = stack.pop(), _this = stack.pop();

    var path = "/" + util.decodeUtf8(byteArray);

    // IBM's implementation returns different error numbers, we don't care

    fs.mkdir(path, function(created) {
        stack.push(created ? 0 : 42);
        ctx.resume();
    });

    throw VM.Pause;
}

Native["com/nokia/mid/ui/gestures/GestureInteractiveZone.isSupported.(I)Z"] = function(ctx, stack) {
    var gestureEventIdentity = stack.pop();
    stack.push(0);
}

Native["com/ibm/oti/connection/file/Connection.newFileImpl.([B)I"] = function(ctx, stack) {
    var byteArray = stack.pop(), _this = stack.pop();

    var path = "/" + util.decodeUtf8(byteArray);

    // IBM's implementation returns different error numbers, we don't care

    fs.exists(path, function(exists) {
        if (exists) {
            fs.truncate(path, function(truncated) {
                stack.push(truncated ? 0 : 42);
                ctx.resume();
            });
        } else {
            fs.create(path, new Blob(), function(created) {
                stack.push(created ? 0 : 42);
                ctx.resume();
            });
        }
    });

    throw VM.Pause;
}

Native["com/ibm/oti/connection/file/Connection.truncateImpl.([BJ)V"] = function(ctx, stack) {
    var newLength = stack.pop2().toNumber(), byteArray = stack.pop(), _this = stack.pop();

    var path = "/" + util.decodeUtf8(byteArray);

    // IBM's implementation returns different error numbers, we don't care

    fs.open(path, function(fd) {
      if (fd == -1) {
        ctx.raiseException("java/lang/IOException", "truncate failed");
        ctx.resume();
      } else {
        var data = fs.read(fd);
        fs.truncate(path, function(truncated) {
          if (truncated) {
            fs.write(fd, data.subarray(0, newLength));
          } else {
            ctx.raiseException("java/lang/IOException", "truncate failed");
          }
          ctx.resume();
        });
      }
    });

    throw VM.Pause;
}

Native["com/ibm/oti/connection/file/FCOutputStream.closeImpl.(I)V"] = function(ctx, stack) {
    var fd = stack.pop(), _this = stack.pop();

    fs.flush(fd, function() {
        fs.close(fd);
        ctx.resume();
    });

    throw VM.Pause;
}

Native["com/ibm/oti/connection/file/FCOutputStream.openImpl.([B)I"] = function(ctx, stack) {
    var byteArray = stack.pop(), _this = stack.pop();

    var path = "/" + util.decodeUtf8(byteArray);

    function open() {
        fs.open(path, function(fd) {
            stack.push(fd);
            _this.pos = 0;
            ctx.resume();
        });
    }

    fs.exists(path, function(exists) {
        if (exists) {
            fs.truncate(path, function(truncated) {
                if (truncated) {
                    open();
                } else {
                    stack.push(-1);
                    ctx.resume();
                }
            });
        } else {
            fs.create(path, function(created) {
                if (created) {
                    open();
                } else {
                    stack.push(-1);
                    ctx.resume();
                }
            });
        }
    });

    throw VM.Pause;
}

Native["com/ibm/oti/connection/file/FCOutputStream.openOffsetImpl.([BJ)I"] = function(ctx, stack) {
    var offset = stack.pop2(), byteArray = stack.pop(), _this = stack.pop();

    var path = "/" + util.decodeUtf8(byteArray);

    function open() {
        fs.open(path, function(fd) {
            stack.push(fd);
            _this.pos = offset.toNumber();
            ctx.resume();
        });
    }

    fs.exists(path, function(exists) {
        if (exists) {
            open();
        } else {
            fs.create(path, function(created) {
                if (created) {
                    open();
                } else {
                    stack.push(-1);
                    ctx.resume();
                }
            });
        }
    });

    throw VM.Pause;
}

Native["com/ibm/oti/connection/file/FCOutputStream.syncImpl.(I)V"] = function(ctx, stack) {
    var fd = stack.pop(), _this = stack.pop();

    fs.flush(fd, function() {
        ctx.resume();
    });

    throw VM.Pause;
}

Native["com/ibm/oti/connection/file/FCOutputStream.writeByteImpl.(II)V"] = function(ctx, stack) {
    var fd = stack.pop(), val = stack.pop(), _this = stack.pop();

    var intBuf = new Uint32Array(1);
    intBuf[0] = val;

    var buf = new Uint8Array(intBuf.buffer);

    fs.write(fd, buf.subarray(3, 4), _this.pos);

    _this.pos += 1;
}

Native["com/ibm/oti/connection/file/FCOutputStream.writeImpl.([BIII)V"] = function(ctx, stack) {
    var fd = stack.pop(), count = stack.pop(), offset = stack.pop(), byteArray = stack.pop(), _this = stack.pop();

    fs.write(fd, byteArray.subarray(offset, offset+count), _this.pos);

    _this.pos += count;
}
