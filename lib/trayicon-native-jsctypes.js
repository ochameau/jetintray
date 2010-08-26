const win32api = require("win32api");
const {components} = require("chrome");
const ctypes = components.utils.import("resource://gre/modules/ctypes.jsm").ctypes;

exports.createNativeIcon = function createNativeIcon(params) {
  
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
        params.onDblClick.apply(null,[]);
      return 0;
    }
    if (params.onClick && button!=-1) {
      let point = win32api.POINT();
      win32api.GetCursorPos(point.address());
      params.onClick.apply(null,[{button:button,screenX:point.x,screenY:point.y}]);
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