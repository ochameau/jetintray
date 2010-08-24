TrayIcon offers an API to display a custom icon in the tray, 
with a label dislayed on mouseover, click handling on it 
and supports the display of a menu on right click.

This library has been tested on Window XP and Seven with :

* Firefox 3.6.8 (using xpcom component),
* Firefox 4 nightlies (using jsctypes) 
   It doesn't work on beta3, because of bugs with jsctypes. 
   It is going to work with beta4+.

It may work on linux too with Firefox 3.6 as xpcom component for linux 
is shipped in this package.

Futhermore it contains a good usage example of jsctypes with complex struct, 
calls to win32api and use of FunctionType (C function pointer for callbacks).
Interresting parts are files in the `lib` directory.


## LICENCE ##
Part of this library, the XPCOM component comes from MinimizeToTrayPlus
extension, released with the GPL 2.0 LICENCE:
http://codefisher.org/minimizetotray/
