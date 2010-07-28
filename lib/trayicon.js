const apiutils = require("api-utils");
const url = require("url");
const xpcom = require("xpcom");
const {Cc,Ci} = require("chrome");

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
  
  // Create the xpcom component coming from MinimizeToTrayPlus
  // which allow us to display a trayicon and catch some events on it
  icon._xpcom = createXpcomIcon();
  // Create a hidden window that is hosting to popup displayed on right click on the trayicon
  icon._win   = createHiddenWindow();
  
  // Display the icon!
  icon._xpcom.setup(icon._win, icon.label);
  icon._xpcom.showIcon();
  
  // Wait for hidden window load before creating the right click popup
  icon._win.addEventListener("load",function () {
    icon._win.removeEventListener("load",arguments.callee,true);
    
    var context = icon._win.document.getElementById("tray-menu");
    for(var i=0; i<icon.context.length; i++) {
      var item = icon.context[i];
      if (item instanceof Separator) {
        context.appendChild(icon._win.document.createElement("menuseparator"));
      } else if (item instanceof Action) {
        var menuitem = icon._win.document.createElement("menuitem");
        menuitem.index = i;
        menuitem.setAttribute("label", item.label);
        context.appendChild(menuitem);
      }
    }
  }, true);
  
  // And finally catch events on the icon:
  // - click on right click popup items
  icon._commandListener = function Icon_CommandListener(event) {
    var index = event.target.index;
    var item = icon.context[index];
    if (item instanceof Action)
      require("errors").catchAndLog(function(e) item.onClick.apply(item, []))();
  }
  // - simple click on icon
  icon._clickListener = function Icon_ClickListener(event) {
    var button;
    if (event.button == 0)
      button = "left";
    else if (event.button == 2)
      button = "right";
    else
      button = "middle";
    if (icon.onClick)
      require("errors").catchAndLog(function(e) icon.onClick.apply(icon, [button]))();
    if (button == "right" && icon.context.length>0) {
      var popup = icon._win.document.getElementById('tray-menu');
      popup.openPopupAtScreen(event.screenX, event.screenY, true);
    }
  }
  // - double click on icon
  icon._dblClickListener = function Icon_DblClickListener() {
    if (icon.onDblClick)
      require("errors").catchAndLog(function(e) icon.onDblClick.apply(icon, []))();
  }
  icon._win.addEventListener("command", icon._commandListener,true);
  icon._win.addEventListener("TrayClick", icon._clickListener,true);
  icon._win.addEventListener("TrayDblClick", icon._dblClickListener, true);
  
}

exports.remove = function TrayIcon_remove(icon) {
  if (!(icon instanceof exports.TrayIcon))
    throw new Error("icon is not a TrayIcon instance.");
  var index = icons.indexOf(icon);
  if (index == -1) 
    throw new Error("The TrayIcon has not been added and can't be removed");
  icons.splice(index, 1);
  icon._xpcom.hideIcon();
  icon._win.removeEventListener("command", icon._commandListener,true);
  icon._win.removeEventListener("TrayClick", icon._clickListener,true);
  icon._win.removeEventListener("TrayDblClick", icon._dblClickListener, true);
  icon._win.close();
  delete icon._win;
  delete icon._xpcom;
  delete icon._clickListener;
  delete icon._dblClickListener;
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
    }
  });
  
  this.__defineGetter__("label", function() options.label || "");
  this.__defineGetter__("onClick", function() options.onClick || undefined);
  this.__defineGetter__("onDblClick", function() options.onDblClick || undefined);
  
  this.__defineGetter__("context", function() options.context || []);
  
  this.toString = function Menu_toString() {
    return '[object TrayIcon]';
  };
}

var registered = false;

function createXpcomIcon() {
  if (!registered) {
    registered = true;
    var path = url.toFilename(url.URL("platform", __url__).toString());
    xpcom.autoRegister(path);
  }
  var factory = xpcom.getClass("@codefisher.org/minimizetotray/window-icon;1", Ci.nsIFactory);
  return factory.createInstance(null, Ci.trayIWindowIcon);
}

function createHiddenWindow() {
  var url = require("self").data.url("hidden-window.xul");
  var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);
  var win = ww.openWindow(null, url,
                         "trayicon-window-"+(Math.random()*1000), "chrome=yes,dependant=yes,titlebar=no", null);
  var baseWin = win.QueryInterface(Ci.nsIInterfaceRequestor)
                                        .getInterface(Ci.nsIWebNavigation)
                                        .QueryInterface(Ci.nsIDocShell)
                                        .QueryInterface(Ci.nsIDocShellTreeItem)
                                        .treeOwner
                                        .QueryInterface(Ci.nsIBaseWindow);
  baseWin.visibility = false;
  baseWin.enabled = false;
  return win;
}


require("unload").when(
  function() {
    while(icons.length>0)
      exports.remove(icons[0]);
    icons = null;
  });
