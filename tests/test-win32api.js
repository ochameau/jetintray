
const {Cc,Ci,components} = require("chrome");
const ctypes = components.utils.import("resource://gre/modules/ctypes.jsm").ctypes;
const timer = require("timer");

const runtime = Cc["@mozilla.org/xre/app-info;1"]
                .getService(Ci.nsIXULRuntime);
const appstartup = Cc["@mozilla.org/toolkit/app-startup;1"].
                   getService(Ci.nsIAppStartup);
const versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"].
                       getService(Ci.nsIVersionComparator);
const enableThisTest = runtime.os=="WINNT" &&
                       versionChecker.compare(xulAppInfo.platformVersion,"2.0a")>=0;

if (!enableThisTest) {
  exports.noTestOnOtherPlatformThanWindows = function (test) {
    test.pass();
  }
}
else {
  const win32api=require("win32api");
}

if (enableThisTest)
exports.checkCursor = function (test) {
  
  var point = win32api.POINT();
  test.assertEqual(point.x,0);
  test.assertEqual(point.y,0);
  
  point.x=2;
  point.y=10000;
  test.assertEqual(point.x,2);
  test.assertEqual(point.y,10000);
  
  test.assertRaises(
    function () {
      point.x=2.7;
    },
    "expected type long, got 2.7");
  
  point.x=-1;
  point.y=-1;
  var rc = win32api.GetCursorPos(point.address());
  test.assert(rc);
  console.log("Cursor position -> "+point.x+" x "+point.y);
  test.assert(point.x>=0);
  test.assert(point.y>=0);
  
}

if (enableThisTest)
exports.checkCreateWindow = function (test) {
  var win = win32api.CreateWindowEx(
      0, "#32769", "most-simple-window", 
      0, 0, 0, 1, 1, null, null, null, null);
  test.assert(win);
  
  test.assert(win32api.DestroyWindow(win));
}

if (enableThisTest)
exports.checkCreateWindowWithClass = function (test) {
  var wndclass = win32api.WNDCLASS();
  wndclass.lpszClassName = ctypes.char.array()("my-window-class");
  wndclass.lpfnWndProc = win32api.DefWindowProc;
  
  var res = win32api.RegisterClass(wndclass.address());
  test.assert(res,"RegisterClass has to return something");
  
  var win = win32api.CreateWindowEx(
      0, wndclass.lpszClassName, "window-with-class", 
      0, 0, 0, 1, 1, null, null, null, null);
  test.assert(win);
  
  test.assert(win32api.DestroyWindow(win));
}

if (enableThisTest)
exports.checkCreateWindowWithWindowProc = function (test) {
  let count = 0;
  
  timer.setTimeout(function () {
    test.assertEqual(count,7);
    test.done();
  },2000);// Detect a leak if I launch this before 2000
  
  function windowProc(hwnd, uMsg, wParam, lParam) {
    //console.log("windowProc: "+uMsg+" -- "+lParam+" -- "+count);
    if (count==0 && uMsg == win32api.WM_GETMINMAXINFO) {
      count++;
    }
    else if (count==1 && uMsg == win32api.WM_NCCREATE) {
      count++;
    }
    else if (count==2 && uMsg == win32api.WM_NCCALCSIZE) {
      count++;
    }
    else if (count==3 && uMsg == win32api.WM_CREATE) {
      count++;
    }
    else if (count==4 && uMsg == win32api.WM_UAHDESTROYWINDOW) { 
      // Unable to find what means this code :/
      count++;
    }
    else if (count==4 && uMsg == win32api.WM_DESTROY) { 
      // There is no WM_UAHDESTROYWINDOW event on winXP, so skip it.
      count++; count++;
    }
    else if (count==5 && uMsg == win32api.WM_DESTROY) {
      count++;
    }
    else if (count==6 && uMsg == win32api.WM_NCDESTROY) {
      count++;
    }
    else {
      test.fail("Got unexpected winproc event with uMsg="+uMsg);
    }
    return win32api.DefWindowProc(hwnd, uMsg, wParam, lParam);
  }
  
  
  let wndclass = win32api.WNDCLASS();
  wndclass.lpszClassName = ctypes.char.array()("class-with-proc");
  wndclass.lpfnWndProc = win32api.WindowProc(windowProc);
  
  let res = win32api.RegisterClass(wndclass.address());
  test.assert(res,"RegisterClass has to return something");
  
  let win = win32api.CreateWindowEx(
      0, wndclass.lpszClassName, "window-with-proc", 
      0, 0, 0, 1, 1, null, null, null, null);
  test.assert(win);
  
  test.assert(win32api.DestroyWindow(win));
  
  test.waitUntilDone();
  
}

