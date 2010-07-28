The `trayicon` module provides a way to add icons in your tray with a menu on right click.

## Constructor ##

<tt>trayicon.**TrayIcon**(*options*)</tt>

Creates a new icon. *options* is an object with
the following keys.  If any option is invalid, an exception is thrown.

<table>
  <tr>
    <td><tt>label</tt></td>
    <td>
      An optional string displayed when overing the <tt>TrayIcon</tt>.
    </td>
  </tr>
  <tr>
    <td><tt>context</tt></td>
    <td>
      An optional array containing items displayed in the popup that appears on right click on <tt>TrayIcon</tt>.
     These items must be either :
      - `null` for an item separator, or,
      - an object with a mandatory `label` string 
        and an optional `onClick` function
    </td>
  </tr>
  <tr>
    <td><tt>onClick</tt></td>
    <td>
      An optional function to be called when the <tt>TrayIcon</tt> is clicked.
      It is called as <tt>onClick(<em>button</em>)</tt>. 
      <em>button</em> a string which define which mouse button was used: "left", "middle" or "right".
    </td>
  </tr>
  <tr>
    <td><tt>onDblClick</tt></td>
    <td>
      An optional function to be called when the <tt>TrayIcon</tt> is double-clicked.
    </td>
  </tr>
</table>

## Functions ##

<tt>trayicon.**add**(*TrayIcon*)</tt>

Adds an icon to the tray.

<tt>trayicon.**remove**(*TrayIcon*)</tt>

Removes an icon from the tray.

## Examples ##

    const trayicon = require("trayicon");
    
    trayicon.add(trayicon.TrayIcon({ 
      label : "Hello from tray!", 
      context : [
        { label : "First action", onClick : function () { console.log("Seems working!"); } },
        null, // null means a separator
        { label : "Second action", onClick : function () { console.log("Still working ?"); } } 
      ]
    }));
    