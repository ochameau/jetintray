The `trayicon` module provides a way to add icons in your tray with 
a menu on right click.

## Constructors ##

<api name="TrayIcon">
@constructor
Creates a new icon. `options` is an object with
the following keys. If any option is invalid, an exception is thrown.

@param options {object}
    
    @prop ico {string} Optional path to an ico file which is going to be 
    displayed in the tray. The default icon is the mozilla gecko.
    
    @prop label {string} An optional string displayed when overing the TrayIcon
    
    @prop context {array} An optional array containing items displayed in the 
    popup that appears on right click on TrayIcon.
    These items must be either :
     - `null` for an item separator, or,
     - an object with a mandatory `label` string 
       and an optional `onClick` function
    
    @prop onClick {callback} An optional function to be called when the 
    `TrayIcon` is clicked. It is called as `onClick(button)`. 
    `button` is a string which define which mouse button was used: 
    "left", "middle" or "right".
    
    @prop onDblClick {callback} An optional function to be called when the 
    `TrayIcon` is double-clicked.
    
</api>

## Functions ##

<api name="add">
@function
Adds an icon to the tray.

@param icon {object} A `TrayIcon` to be added to the tray.
</api>

<api name="remove">
@function
Removes an icon from the tray.

@param icon {object} A `TrayIcon` to be removed from the tray.
</api>

## Examples ##

    const trayicon = require("trayicon");
    
    trayicon.add(trayicon.TrayIcon({ 
      label : "Hello from tray!", 
      context : [
        trayicon.Action({ label : "First action", 
          onClick : function () { console.log("Seems working!"); } 
        }),
        trayicon.Separator(),
        trayicon.Action({ label : "Second action", 
          onClick : function () { console.log("Still working ?"); } 
        })
      ],
      ico : packaging.getURLForData("/myicon.ico")
      // You must have a `data` directory in your package with this ico file
    }));
    