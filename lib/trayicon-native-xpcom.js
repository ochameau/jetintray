const xpcom = require("xpcom");
const {Cc,Ci} = require("chrome");
const url = require("url");

// Create the xpcom component coming from MinimizeToTrayPlus
// which allow us to display a trayicon and catch some events on it
let xpcomRegistered = false;

exports.createNativeIcon = function createNativeIcon(params) {
  
  if (!xpcomRegistered) {
    xpcomRegistered = true;
    let path = url.toFilename(url.URL("platform", __url__).toString());
    xpcom.autoRegister(path);
  }
  let factory = xpcom.getClass("@codefisher.org/minimizetotray/window-icon;1", 
                               Ci.nsIFactory);
  let icon = factory.createInstance(null, Ci.trayIWindowIcon);
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
