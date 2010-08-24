const apiutils = require("api-utils");
const url = require("url");
const xpcom = require("xpcom");
const errors = require("errors");
const {Cc,Ci,components} = require("chrome");
const runtime = Cc["@mozilla.org/xre/app-info;1"].
                getService(Ci.nsIXULRuntime);
const xulAppInfo = Cc["@mozilla.org/xre/app-info;1"].
                   getService(Ci.nsIXULAppInfo);
const appstartup = Cc["@mozilla.org/toolkit/app-startup;1"].
                   getService(Ci.nsIAppStartup);
const versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"].
                       getService(Ci.nsIVersionComparator);  

// Holder for all displayed icons
let icons = [];

exports.Action = apiutils.publicConstructor(Action);
exports.Separator = apiutils.publicConstructor(Separator);
exports.TrayIcon = apiutils.publicConstructor(TrayIcon);

exports.add = function TrayIcon_add(icon) {
  if (!(icon instanceof TrayIcon))
    throw new Error("icon is not a TrayIcon instance.");
  if (icons.indexOf(icon)!=-1)
    throw new Error("The TrayIcon has already been added");
  icons.push(icon);
  
  // Create a hidden window that is hosting to popup displayed 
  // on right click on the trayicon
  icon._win = createHiddenWindow();
    
  // Wait for hidden window load before creating the right click popup
  icon._win.addEventListener("load",function () {
    icon._win.removeEventListener("load",arguments.callee,true);
    
    var context = icon._win.document.getElementById("tray-menu");
    for(var i=0; i<icon.context.length; i++) {
      var item = icon.context[i];
      if (item instanceof Separator) {
        context.appendChild(icon._win.document.createElement("menuseparator"));
      }
      else if (item instanceof Action) {
        var menuitem = icon._win.document.createElement("menuitem");
        menuitem.index = i;
        menuitem.setAttribute("label", item.label);
        context.appendChild(menuitem);
      }
    }
  }, true);
  
  // And finally catch events on the icon:
  // - click on popup items
  icon._commandListener = function Icon_CommandListener(event) {
    var index = event.target.index;
    var item = icon.context[index];
    if (item instanceof Action)
      errors.catchAndLog(function(e) item.onClick.apply(item, []))();
  }
  // - simple click on icon
  function Icon_ClickListener(event) {
    var button;
    if (event.button == 0)
      button = "left";
    else if (event.button == 2)
      button = "right";
    else
      button = "middle";
    
    if (icon.onClick)
      errors.catchAndLog(function(e) icon.onClick.apply(icon, [button]))();
    
    // Open menupopup on right click if there is a context menu defined
    if (button == "right" && icon.context.length>0) {
      var popup = icon._win.document.getElementById('tray-menu');
      popup.openPopupAtScreen(event.screenX, event.screenY, true);
    }
  }
  // - double click on icon
  function Icon_DblClickListener() {
    if (icon.onDblClick)
      errors.catchAndLog(function(e) icon.onDblClick.apply(icon, []))();
  }
  
  icon._win.addEventListener("command", icon._commandListener,true);
  icon._nativeIcon = createNativeIcon({
      win : icon._win,
      label : icon.label,
      ico : icon.ico,
      onClick : Icon_ClickListener,
      onDblClick : Icon_DblClickListener
    });
  
}

exports.remove = function TrayIcon_remove(icon, callback) {
  if (!(icon instanceof exports.TrayIcon))
    throw new Error("icon is not a TrayIcon instance.");
  var index = icons.indexOf(icon);
  if (index == -1) 
    throw new Error("The TrayIcon has not been added and can't be removed");
  icons.splice(index, 1);
  icon._nativeIcon.remove(callback);
  icon._win.removeEventListener("command", icon._commandListener,true)
  icon._win.close();
  delete icon._win;
  delete icon._nativeIcon;
}



function Action(options) {
  options = apiutils.validateOptions(options, {
    label: {
      is: ["string"],
      msg: "An Action must have a non-empty string label property."
    },
    onClick: {
      is: ["function", "array", "null", "undefined"],
    }
  });
  
  this.__defineGetter__("label", function() options.label);
  this.__defineGetter__("onClick", function() options.onClick || undefined);
}

function Separator() {
  
}

function TrayIcon(options) {
  options = apiutils.validateOptions(options, {
    context: {
      is: ["undefined", "null", "array"]
    },
    label: {
      is: ["undefined", "null", "string"]
    },
    onClick: {
      is: ["function", "array", "null", "undefined"],
    },
    onDblClick: {
      is: ["function", "array", "null", "undefined"],
    },
    ico : {
      is: ["undefined", "null", "string"]
    }
  });
  
  this.__defineGetter__("label", function() options.label || "");
  this.__defineGetter__("onClick", function() options.onClick || undefined);
  this.__defineGetter__("onDblClick", function() options.onDblClick || undefined);
  
  this.__defineGetter__("context", function() options.context || []);
  
  this.__defineGetter__("ico", function() options.ico || undefined);
  
  this.toString = function Menu_toString() {
    return '[object TrayIcon]';
  };
}

if (runtime.OS=="WINNT" && 
    versionChecker.compare(xulAppInfo.platformVersion,"2.0a")>=0) {
  const win32api = require("win32api");
  const ctypes = components.utils.import("resource://gre/modules/ctypes.jsm").ctypes;
  function createNativeIcon(params) {
    
    let deleteCallback = null;
    
    // Define one Window Proc function in order to catch win32 api events
    function windowProc(hWnd, uMsg, wParam, lParam) {
      let button = -1;
      if (lParam == win32api.WM_LBUTTONDOWN) {
        button = 0;
      }
      else if (lParam == win32api.WM_RBUTTONDOWN) {
        button = 2;
      }
      else if (lParam == win32api.WM_LBUTTONDBLCLK || 
               lParam == win32api.WM_RBUTTONDBLCLK) {
        if (params.onDblClick)
          params.onDblClick();
        return 0;
      }
      if (params.onClick && button!=-1) {
        let point = win32api.POINT();
        win32api.GetCursorPos(point.address());
        params.onClick({button:button,screenX:point.x,screenY:point.y});
        return 0;
      }
      if (uMsg==win32api.WM_NCDESTROY && deleteCallback) {
        require("timer").setTimeout(deleteCallback,0);
        deleteCallback = null;
      }
      return win32api.DefWindowProc(hWnd, uMsg, wParam, lParam);
    }
    
    // Define a custom Window Class in order to bind our custom Window Proc
    let wndclass = win32api.WNDCLASS();
    wndclass.lpszClassName = ctypes.char.array()("class-trayicon-"+
                                                 (Math.random()*10000));
    wndclass.lpfnWndProc = win32api.WindowProc(windowProc);
    win32api.RegisterClass(wndclass.address());
    
    // Create a Message event only Window using this custom class
    let win = win32api.CreateWindowEx(
        0, wndclass.lpszClassName, 
        ctypes.char.array()("trayicon-window-"+(Math.random()*10000)), 
        0, 0, 0, 0, 0, 
        ctypes.voidptr_t(win32api.HWND_MESSAGE), null, null, null);
    
    // Setup a default icon path if noone valid is given to us
    var ico = params.ico;
    if (!ico || !require("file").exists(ico))
      ico = require("url").toFilename(require("self").data.url("default.ico"));
    
    // Create a win32api icon object with this icon path
    let hIcon = win32api.LoadImage(0, ico, win32api.IMAGE_ICON, 16, 16, 
                                   win32api.LR_LOADFROMFILE);
    
    // Now create the trayicon win32 object
    let icon = win32api.NOTIFICATIONDATA();
    icon.cbSize = win32api.NOTIFICATIONDATA.size;
    icon.uFlags = win32api.NIF_ICON | win32api.NIF_TIP | win32api.NIF_MESSAGE;
    icon.szTip = params.label || "";
    icon.hIcon = hIcon;
    icon.uCallbackMessage = win32api.WM_USER+1000;
    icon.hWnd = win;
    icon.uID = 1;
    
    // Finally, tell window to display it right now!
    win32api.Shell_NotifyIcon(win32api.NIM_ADD, icon.address());
    
    return {
      remove : function (callback) {
        
        deleteCallback = callback;
        // Hide the trayicon and cleanup all others used objects
        win32api.Shell_NotifyIcon(win32api.NIM_DELETE, icon.address());
        win32api.DestroyWindow(win);
        win32api.UnregisterClass(wndclass.lpszClassName,null);
        win32api.DestroyIcon(hIcon);
        delete win, wndclass, icon, hIcon;
        
      }
    };
    
  }
}
else {
  // Create the xpcom component coming from MinimizeToTrayPlus
  // which allow us to display a trayicon and catch some events on it
  var xpcomRegistered = false;
  function createNativeIcon(params) {
    if (!xpcomRegistered) {
      xpcomRegistered = true;
      var path = url.toFilename(url.URL("platform", __url__).toString());
      xpcom.autoRegister(path);
    }
    var factory = xpcom.getClass("@codefisher.org/minimizetotray/window-icon;1", 
                                 Ci.nsIFactory);
    var icon = factory.createInstance(null, Ci.trayIWindowIcon);
    icon.setup(params.win, params.label);
    icon.showIcon();
    if (params.onClick)
      params.win.addEventListener("TrayClick", params.onClick,true);
    if (params.onDblClick)
      params.win.addEventListener("TrayDblClick", params.onDblClick, true);
    return {
      remove : function(callback) {
        icon.hideIcon();
        if (params.onClick)
          params.win.removeEventListener("TrayClick", params.onClick, true);
        if (params.onDblClick)
          params.win.removeEventListener("TrayDblClick", params.onDblClick, true);
        if (callback)
          callback();
      }
    };
  }
}

function createHiddenWindow() {
  // Create an hidden window which is used to display menupopup 
  // on trayicon's rightclick
  var url = require("self").data.url("hidden-window.xul");
  var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].
           getService(Ci.nsIWindowWatcher);
  var win = ww.openWindow(null, url,
                          "trayicon-window-"+(Math.random()*1000), 
                          "chrome=yes,popup=yes", null);
  var baseWin = win.QueryInterface(Ci.nsIInterfaceRequestor).
                getInterface(Ci.nsIWebNavigation).
                QueryInterface(Ci.nsIDocShell).
                QueryInterface(Ci.nsIDocShellTreeItem).
                treeOwner.
                QueryInterface(Ci.nsIBaseWindow);
  baseWin.visibility = true;
  baseWin.enabled = true;
  return win;
}

require("unload").when(
  function() {
    // Just ensured that app is kept alive during icons detroy
    // because we may have jsctypes crash when win32api call 
    // jsctypes windowProc function :(
    let iconsToDelete = -1;
    if (icons.length>0) {
      appstartup.enterLastWindowClosingSurvivalArea();
      iconsToDelete = icons.length;
    }
    function onIconRemoved() {
      iconsToDelete--;
      if (iconsToDelete==0)
        appstartup.exitLastWindowClosingSurvivalArea();
    }
    
    while(icons.length>0)
      exports.remove(icons[0],onIconRemoved);
    icons = null;
  });


