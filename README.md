[![npm](https://img.shields.io/npm/v/tns-template-plugin.svg)](https://www.npmjs.com/package/tns-template-plugin)
[![npm](https://img.shields.io/npm/l/tns-template-plugin.svg)](https://www.npmjs.com/package/tns-template-plugin)
[![npm](https://img.shields.io/npm/dt/tns-template-plugin.svg?label=npm%20d%2fls)](https://www.npmjs.com/package/tns-template-plugin)

# tns-template-plugin
Quickly builds a NativeScriot plugins
This will automatically create:
- source code
- License
- Readme
- package.json
- ignore files
- installs a demo project
- installs typescript support (if needed)
- tsconfig (if needed)

It asks you several questions about this plugin, automatically saves the common answers (so that way it does not need to ask them ever again.)
If has entry line completions, and ability to list the valid answers (hit <TAB>).

## License

This project itself is released under the MIT license; however the code generated is released under no license; so that you can release this under any license and claim all rights to the code contained here.
 
I also do contract work; so if you have a module you want built for NativeScript (or any other software projects) feel free to contact me [nathan@master-technology.com](mailto://nathan@master-technology.com).

[![Donate](https://img.shields.io/badge/Donate-PayPal-brightgreen.svg?style=plastic)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=HN8DDMWVGBNQL&lc=US&item_name=Nathanael%20Anderson&item_number=nativescript%2dmastertechnology&no_note=1&no_shipping=1&currency_code=USD&bn=PP%2dDonationsBF%3ax%3aNonHosted)
[![Patreon](https://img.shields.io/badge/Pledge-Patreon-brightgreen.svg?style=plastic)](https://www.patreon.com/NathanaelA)


## Screen
![Sample1](docs/tns-template-plugin.gif)

## Updates

Please feel free to fork this repo and update it!!!

## Instructions
After cloning the repo; type **npm start**, answer a couple questions and it will re-write the repo to match you plugin type you desire. 

## Features
$HOME/.tns-plugin/ folder is used to store settings and additional files you may want added to any new plugins.

So if you would like to have your OWN custom readme.md or package.json template that you use used as the source; create a file in your %HOMEPATH% or $HOME /.tns-plugin/files/

When parsing the files it will look for any \[[name]], \[[github]], \[[plugin]], \[[email]], \[[os], and \[[license] and replace them with the values you typed.



 

