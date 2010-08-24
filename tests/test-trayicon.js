exports.testTrayIcon = function(test) {
  var trayicon = require("trayicon");
  
  var icon = trayicon.TrayIcon({});
  trayicon.add(icon);
  
  var icon = trayicon.TrayIcon({label:"Hello from tray!"});
  trayicon.add(icon);
  
  var icon = trayicon.TrayIcon({context:[]});
  trayicon.add(icon);
  
  test.assertRaises(
      function() trayicon.Action({}),
      "An Action must have a non-empty string label property.",
      "Action is waiting at least a 'label' attribute");
  
  var icon = trayicon.TrayIcon({context:[trayicon.Separator()]});
  trayicon.add(icon);
  
  var icon = trayicon.TrayIcon({
                                  context:[
                                    trayicon.Action({label:"Only one action"})
                                  ]
                               });
  trayicon.add(icon);
  
  var icon = trayicon.TrayIcon({label:"Hi!", context:[]});
  trayicon.add(icon);
  
  test.assertRaises(
      function() trayicon.add({}),
      "icon is not a TrayIcon instance.",
      "Must raise an exception when we don't use TrayIcon instance");
  
  test.assertRaises(
      function() trayicon.remove(null),
      "icon is not a TrayIcon instance.",
      "Must raise an exception when we don't use TrayIcon instance");
  
  var icon = trayicon.TrayIcon({});
  trayicon.add(icon);
  test.assertRaises(
      function() trayicon.add(icon),
      "The TrayIcon has already been added",
      "throws on multiple add calls");
  trayicon.remove(icon);
  
  test.assertRaises(
      function() trayicon.remove(icon),
      "The TrayIcon has not been added and can't be removed",
      "throws on multiple add calls");
  
  
}

exports.testFullFeatureIcon = function (test) {
  var trayicon = require("trayicon");
  var file = require("file");
  var url = require("url");
  
  // Retrieve the path of the ico file which is in the tests directory
  var dir = file.dirname(url.toFilename(__url__));
  test.assert(file.exists(dir));
  
  var ico = file.join(dir,"test-icon.ico");
  test.assert(file.exists(ico));
  
  // Setup a trayicon with all features we can use!
  var icon = trayicon.TrayIcon({ 
    label : "Hello from tray!", 
    context : [
      trayicon.Action({ label : "First action", 
                        onClick : function () { 
                          console.log("First action seems working!"); 
                        } 
                      }),
      trayicon.Separator(),
      trayicon.Action({ label : "Second action", 
                        onClick : function () { 
                          console.log("Second action is working too."); 
                        } 
                      })
    ],
    ico : ico
  });
  trayicon.add(icon);
  
}

exports.testGiveSomeTimeToSeeIcons = function (test) {
  
  // Hacky way to visualy and manually check OS integration
  
  //changeHarnessMessage("Check out in your tray, for a new tray icon!")
  test.pass();
  test.waitUntilDone(6000);
  require("timer").setTimeout(function () {
    test.done();
  },5000);
  
};

// Some hack to change harness message :p
function changeHarnessMessage(message) {
  var windows = require("window-utils");
  var window = null;
  for(var win in windows.windowIterator()) {
    if (win.name=="harness") {
      window = win;
      break;
    }
  }
  if (!window) 
    return console.error("Unable to find harness window to hack its text message.");
  window.addEventListener("load",function () {
    window.document.location = "data:text/plain,"+message;
    require("timer").setTimeout(function () {
      window.sizeToContent();
    },0);
  },false);
}
