/**********************************************************************************
 * (c) 2016, Master Technology
 * Licensed under the MIT license or contact me for a Support or Commercial License
 *
 * I do contract work in most languages, so let me solve your problems!
 *
 * Any questions please feel free to email me or put a issue up on the github repo
 * Version 1.0.9                                      Nathan@master-technology.com
 *********************************************************************************/
"use strict";

// TODO: Maybe Add ~/.gitconfig reader, requires embedding a simple .ini reader
// This could save three "initial" questions
// TODO: Finish "default" answer support

const child = require('child_process');
const readline = require('readline');
const fs = require('fs');
const cp = require('child_process');

var debug = false;
var indexName = "index";

console.log("-------------------------------------------------------");
console.log("NativeScript Plugin Template                      v1.09");
console.log("Copyright 2016, Nathanael Anderson / Master Technology.\r\n");
console.log("nathan@master-technology.com							");
console.log("-------------------------------------------------------");

const homePath = getUserHomePath() + "/.tns-plugin/";

var startupChoices = getCommandLine();

// TODO: Future enhancement
/* if (startupChoices.packageModifictions) {
    handlePackageModifications(startupChoices);
    process.exit(0);
} */


// We need to create the typing interface for the typing of answers
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: completer,
    historySize: 0
});

// Store our answers
var answers = {};

// Load our pre-existing answers (if they exist)
if (fs.existsSync(homePath+'settings.json')) {
    try {
        answers = require(homePath+'settings.json');
    }
    catch (e) {
        answers = {};
    }
}

if (startupChoices.debug) {
    debug = true;
    answers.plugin = 'test';
    answers.script = 'typescript';
    answers.os = 'both';
}

// Reset the answers
if (startupChoices.reset) {
    answers = {};
}

if (startupChoices.ts) {
    answers.script = "typescript";
} else if (startupChoices.js) {
    answers.script = "javascript";
}

if (startupChoices.license) {
    answers.license = startupChoices.license;
}

if (startupChoices.os) {
    answers.os = startupChoices.os;
}

if (startupChoices.dual_files) {
    answers.output_files = "dual";
}

if (startupChoices.single_files) {
    answers.output_files = "single";
}

if (startupChoices.name_type) {
    answers.name_type = startupChoices.name_type;
}

// Defaults Questions
var questions = [];

if (!answers.plugin) {
    questions.push({ name: "plugin", question: "What is the name of your plugin? "});
}

if (!answers.description) {
    questions.push({ name: "description", question: "The short description of your plugin? "});
}

if (!answers.keywords) {
    questions.push({name: "keywords", question: "Any plugin keywords (separate by commas)? "});
}

if (!answers.script) {
    questions.push({
        name: "script",
        question: "Will the plugin be (TypeScript) or (JavaScript)? ",
        answers: ["JavaScript", "TypeScript"]
    });
}

if (!answers.os) {
    questions.push({
        name: "os",
        question: "Is the Plugin for (Android), (iOS) or (both)? ",
        answers: ['Both', 'iOS', 'Android']
    });
}

if (!answers.license) {
    questions.push({
        name: 'license',
        question: "What License? ",
        answers: ["MIT", "APACHE 2.0", "BSD", "ISC", "COMMERCIAL", "PATRON", "OTHER"]
    });
}

if (!answers.output_files) {
    questions.push({name: 'output_files', question: 'Plugin need a (single) source code file, or (both) platform specific files? ', answers: ['single', 'one', 'dual', 'two', 'separate', 'both']});
}

if (!answers.name_type) {
    questions.push({name: 'name_type', question: 'Do you prefer the source file to be named (index) or the (plugin) name? ', answers: ['index', 'plugin']});
}

if (!answers.github) {
    questions.push({name: "github", question: "GitHub username? "});
}
if (!answers.name) {
    questions.push({name: 'name', question: "What is your name? "});
}
if (!answers.email) {
    questions.push({name: 'email', question: "What is your email address? "});
}

/**
 * Adds a toProperCase
 * @returns {string}
 */
if (typeof String.prototype.toProperCase === "undefined") {
    String.prototype.toProperCase = function () {
        return this.toLowerCase().replace(/^(.)|\s(.)/g, function (chr) {
            return chr.toUpperCase();
        });
    };
}

// ----------------------------------------------------------------------------
// Lets start and ask our questions
// ----------------------------------------------------------------------------
askQuestions(questions,
    function(results) {
        // Close our readline interface
        rl.close();

        // Copy our saved answers into the results array
        for (var key in answers) {
            if (answers.hasOwnProperty(key)) {
                results[key] = answers[key];
            }
        }
        // Grab the year since we use it in different places
        results.year = (new Date().getFullYear());

        // If this is cloned from my HD and we are debugging, we don't want to kill the .idea folder -- phpStorm hates that!
        if (!debug && fs.existsSync(".idea")) {
            recursiveDelete(".idea");
        }

        // Eliminate our docs folder
        if (fs.existsSync("docs")) {
            recursiveDelete("docs");
        }

        // if this is cloned from a git repo
        if (fs.existsSync(".git")) {
            recursiveDelete(".git");
        }

        // Save our persistent answers if they don't already exist
        if (!answers.name) {
            try {
                saveNewAnswers(results);
            } catch(err) {
                // Can't create our home setting directory, not a big issue; we can still complete the process.
            }
        }

        if (results.name_type === "plugin") {
            indexName = results.plugin.toLowerCase();
        }

        // OK so at this point we have all the answers we need; lets get to creating
        //console.log("Answer is:", results);

        copyScript();
        console.log("Generating README.md...");
        generateReadme(results);
        console.log("Generating package.json...");
        generatePackage(results);
        console.log("Generating index files...");
        generateIndex(results);
        console.log("Generating ignore files...");
        generateIgnores(results);
        console.log("Generating License...");
        generateLicense(results);

        var tns = "tns";
        var npm = "npm";
        if (process.platform === 'win32') {
            tns = "tns.cmd";
            npm = "npm.cmd";
        }

        if (!fs.existsSync("demo")) {
            console.log("Please wait creating demo project... (This might take a while)");
            var options = ["create","demo"];
            if (results.script === 'typescript') {
              options.push('--tsc');
            }
            // Create the Demo
            cp.spawnSync(tns, options, {cwd: process.cwd(), maxBuffer: 1000000});

            if (fs.existsSync('demo')) {
                // Add Platform Declarations
                if (results.script === "typescript") {
                    console.log("Installing typescript support files");
                    cp.spawnSync(npm, ['install', 'tns-platform-declarations','--save-dev'],{cwd: process.cwd()+"/demo", maxBuffer: 1000000});
                }

            } else {
                console.log("Unable to install demo, for a demo project type **tns create demo** in your plugins folder.");
            }
        }

        if (results.script === "typescript") {
            console.log("Generating tsconfig.json file...");
            generateTSConfig(results);
        }


        if (fs.existsSync("demo")) {
            console.log("Installing plugin shell in demo...");
            // Add the plugin initially
            cp.spawnSync(tns, ['plugin', 'add', '..'], {/* stdio:'inherit',*/ cwd: process.cwd() + "/demo", maxBuffer: 1000000});
        }



        console.log("\r\n\r\n\r\n-----------------------[ Plugin Setup ]--------------------------");
        console.log("Plugin quick commands are: ");
        console.log("  npm run demo.ios      = Will run your demo under the iOS emulator" );
        console.log("  npm run demo.android  = Will run your demo under the android emulator" );
        console.log("  npm run debug.ios     = Will debug your demo under the iOS emulator" );
        console.log("  npm run debug.android = Will debug your demo under the android emulator" );

        // If this is in a npm module; the platforms doesn't get saved into it
        if (!fs.existsSync("platforms")) { fs.mkdirSync("platforms"); }

        // We are done, so delete this script...
        fs.unlinkSync('setup.js');
        process.exit(0);
    }
);

/**
 * We need to copy the current script if it is the post install script
 */
function copyScript() {
    var isPostInstall = false;
    for (var i=0;i<process.argv.length;i++) {
        if (process.argv[i].indexOf('setup.js')) {
            isPostInstall = true;
        }
    }
    if (!isPostInstall) { return; }
    fs.writeFileSync(homePath+"setup.js", fs.readFileSync("setup.js"));
}

/**
 * Asks the final question if the answers are ok
 * @param questions
 * @param answers
 * @param finalCallback
 */
function checkIfOkAnswers(questions, answers, finalCallback) {
    console.log("\r\n\r\n-------[ Your answers ]---------");
    var results = {};
    for (var i=0;i<answers.length;i++) {
        console.log(answers[i].name+": ", answers[i].answer);
        results[answers[i].name] = answers[i].answer;
    }
    if (debug) {
        finalCallback(results);
        return;
    }
    askQuestion("Are all these answers correct? ", ["yes", "no"], function (answer) {
        console.log("\r\n\r\n\r\n");
        if (answer === "yes") {
            finalCallback(results);
        } else {
            askQuestions(questions, finalCallback);
        }
    });
}

/**
 * Asks a group of questions
 * @param questions
 * @param callback
 */
function askQuestions(questions, callback) {
    var answers = [];
    var callbackCheck = function(answer) {
        if (answer != null) {
            if (answer === "" && questions[answers.length].default) {
                answer = questions[answers.length].default;
            }
            answers.push({name: questions[answers.length].name, answer: answer});
        }
        if (answers.length === questions.length) {
            checkIfOkAnswers(questions, answers, callback);
        } else {
            askQuestion(questions[answers.length].question, questions[answers.length].answers, callbackCheck);
        }
    };
    callbackCheck();
}

/**
 * Asks  single question
 * @param question
 * @param answers
 * @param callback
 */
function askQuestion(question, answers, callback) {
    var finalAnswers = [];
    if (Array.isArray(answers)) {
        completer.data = answers;
        for (var i=0;i<answers.length;i++) {
            finalAnswers.push(answers[i].toLowerCase());
        }
    } else {
        completer.data = [];
        if (answers != null) {
            for (var key in answers) {
                if (!answers.hasOwnProperty(key)) { continue; }
                completer.data.push(key);
                finalAnswers.push(key.toLowerCase());
            }
        }
    }
    rl.question(question, function(ans) {
        if (finalAnswers.length === 0 || finalAnswers.indexOf(ans.toLowerCase()) !== -1) {
            if (finalAnswers.length > 0) {
                callback(ans.toLowerCase());
            } else {
                callback(ans);
            }
        } else {
            for (var i=0;i<finalAnswers.length;i++) {
                if (finalAnswers[i].indexOf(ans.toLowerCase()) === 0) {
                    callback(finalAnswers[i]);
                    return;
                }
            }
            console.log("Unknown answer:", ans, "Try hitting the TAB key for valid options.");
            askQuestion(question, answers, callback);
        }
    });
}

/**
 * Takes the answers and renders it into the docs...
 * @param data
 * @param answers
 * @returns {*}
 */
function renderData(data, answers) {
    for(var key in answers) {
        if (!answers.hasOwnProperty(key)) { continue; }
        var rX = new RegExp("\\[\\["+key+"\\]\\]", "gi");

        var curAnswer = answers[key].toString();
        switch (key) {
            case 'license':
                curAnswer = curAnswer.toUpperCase(); break;
        }
        data = data.replace(rX,curAnswer);
    }
    return data;
}

/**
 * Generates a  tsconfig file for TS users
 * @param answers
 */
function generateTSConfig(answers) {
    var data;

    // Don't overwrite the existing file...
    if (fs.existsSync('tsconfig.json')) { return; }

    if (fs.existsSync(homePath+"files/tsconfig.json")) {
        try {
            data = JSON.parse(renderData(fs.readFileSync(homePath + "files/tsconfig.json").toString(), answers));
        } catch (err) {
            console.log("Unable to parse your custom tsconfig.json file", err);
            data = null;
        }
    }
    if (!data) {
        data = {
            "compilerOptions": {
                "target": "es5",
                "module": "commonjs",
                "removeComments": true,
                "experimentalDecorators": true,
                "noEmitHelpers": true,
                "declaration": true
            },
            "files": [
                "demo/node_modules/tns-core-modules/tns-core-modules.d.ts"
            ],
            "compileOnSave": false
        };
    }

    // See where they ended up because v2.20 of the tns-platform-decs has a weird path
    // It is either a mis-build or they are looking to move them into tns-core-modules
    // So we will just attempt to figure out where the files ended up; so that we can
    // point to the proper version no matter where it got installed.  ;-)
    if (fs.existsSync('demo/node_modules/tns-core-modules/ios.d.ts')) {
        data.files.push("demo/node_modules/tns-core-modules/android17.d.ts");
        data.files.push("demo/node_modules/tns-core-modules/ios.d.ts");
        data.files.push("demo/node_modules/tns-core-modules/org.nativescript.widgets.d.ts");
    } else if (fs.existsSync('demo/node_modules/tns-platform-declarations/ios.d.ts')) {
        data.files.push("demo/node_modules/tns-platform-declarations/android17.d.ts");
        data.files.push("demo/node_modules/tns-platform-declarations/ios.d.ts");
        data.files.push("demo/node_modules/tns-platform-declarations/org.nativescript.widgets.d.ts");
    } else if (fs.existsSync('demo/node_modules/tns-platform-declarations/tns-core-modules/ios.d.ts')) {
        data.files.push("demo/node_modules/tns-platform-declarations/tns-core-modules/android17.d.ts");
        data.files.push("demo/node_modules/tns-platform-declarations/tns-core-modules/ios.d.ts");
        data.files.push("demo/node_modules/tns-platform-declarations/tns-core-modules/org.nativescript.widgets.d.ts");
    }

    if (answers.output_files === "single" || answers.output_files === "one") {
        data.files.push(indexName+".ts");
    } else {
        if (answers.os === "android" || answers.os === "both") {
            data.files.push(indexName+".android.ts");
        }
        if (answers.script === "ios" || answers.os === "both") {
            data.files.push(indexName+'.ios.ts');
        }
    }

    fs.writeFileSync("tsconfig.json", JSON.stringify(data, null, 4));
}

/**
 * Generates the index.js, index.ts and index.d.ts files
 * @param answers
 */
function generateIndex(answers) {
    var data =
        "/**********************************************************************************\r\n" +
        "* (c) " + answers.year + ", " + answers.name + ".\r\n" +
        "* Licensed under the " + answers.license.toUpperCase() + " license.\r\n" +
        "*\r\n" +
        "* Version 1.0.0  " + strPadding(66-answers.email.length)+answers.email + "\r\n" +
        "**********************************************************************************/\r\n'use strict';\r\n\r\n";

    // Check for our default file
    if (fs.existsSync('index.js')) {
        var indexFile = fs.readFileSync('index.js').toString();
        if (indexFile.indexOf("// 01010011 01110100 01101111 01110000") === -1) { return; }
    } else {
        // If it doesn't exist; then that means we have already deleted it...
        return;
    }

    // Eliminate our "STOP" JS file since we no longer need it...
    fs.unlinkSync('index.js');

    if (answers.script === "javascript") {

        data += "function "+answers.plugin+"() { \r\n // Put in your initialization\r\n}\r\n\r\nmodules.exports = "+answers.plugin+";\r\n";

        if (fs.existsSync(homePath + "files/index.js")) {
            data = renderData(fs.readFileSync(homePath + "files/index.js").toString(), answers);
        }

        if (answers.output_files === "single" || answers.output_files === "one") {
            fs.writeFileSync(indexName+'.js', data);
        } else {
            if (answers.os === "android" || answers.os === "both") {
                fs.writeFileSync(indexName+'.android.js', data);
            }
            if (answers.os === "ios" || answers.os === "both") {
                fs.writeFileSync(indexName+'.ios.js', data);
            }
        }

    } else {
        data += "export class " + generateClassName(answers.plugin) + " { \r\n  constructor() {\r\n    // Put in your initialization\r\n  }\r\n}\r\n";

        if (fs.existsSync(homePath + "files/index.ts")) {
            data = renderData(fs.readFileSync(homePath + "files/index.ts").toString(), answers);
        }

        if (answers.output_files === "single" || answers.output_files === "one") {
            fs.writeFileSync(indexName+'.ts', data);
        } else {
            if (answers.os === "android" || answers.os === "both") {
                fs.writeFileSync(indexName+'.android.ts', data);
            }
            if (answers.os === "ios" || answers.os === "both") {
                fs.writeFileSync(indexName+'.ios.ts', data);
            }
        }

    }

    fs.writeFileSync("index.d.ts", "//--------------------------\r\n// "+answers.plugin+" typings file.\r\n//--------------------------");
}

/**
 * Generates the TypeScript class name from plugin name using the Pascal case convention 
 * @param pluginName
 */
function generateClassName(pluginName) {
    return pluginName.replace("-", " ")
                              .replace(/\w+/g, function(w){return w[0].toUpperCase() + w.slice(1).toLowerCase();})
                              .replace(/\s+/g, '');

}

/**
 * Generates a new JSON file for the plugin
 * @param answers
 */
function generatePackage(answers) {

    var data;
    if (fs.existsSync(homePath+"files/package.json")) {
        var sData = fs.readFileSync(homePath+"files/package.json");
        try {
            data = JSON.parse(renderData(sData, answers));
        } catch (err) {
            console.log("Unable to parse your custom JSON file.", err);
            data = null;
        }
    }
    if (!data) {
        data = {
            name: "nativescript-" + answers.plugin,
            version: "1.0.0",
            description: answers.description,
            main: indexName+".js",  // Yes this is correct, the final file deployed to device MUST be JS
            typings: "index.d.ts",
            nativescript: {
                platforms: {}
            },
            repository: {
                type: "git",
                url: "https://github.com/" + answers.github + "/nativescript-" + answers.plugin + ".git"
            },
            keywords: [
                "NativeScript", answers.plugin
            ],
            author: {
                name: answers.name,
                email: answers.email
            },
            license: {
                type: answers.license.toUpperCase(),
                "url": "https://github.com/" + answers.github + "/nativescript-" + answers.plugin + "/blob/master/LICENSE"
            },
            bugs: {
                url: "https://github.com/" + answers.github + "/nativescript-" + answers.plugin + "/issues"
            },
            homepage: "https://github.com/" + answers.github + "/nativescript-" + answers.plugin,
            readmeFilename: "README.md"
        };
    }

    if (answers.keywords.length) {
        var keywords = answers.keywords.split(",");
        for (var i=0;i<keywords.length;i++) {
            var kw = keywords[i].trim();
            if (kw.length > 0) {
                data.keywords.push(kw);
            }
        }
    }

    if (answers.os === "android" || answers.os=== "both") {
        data.nativescript.platforms.android = '2.0.0';
    }
    if (answers.os === "ios" || answers.os=== "both") {
        data.nativescript.platforms.ios = '2.0.0';
    }

    if (answers.script === "typescript") {
        data.scripts = {
            "build": "tsc",
            "demo.ios": "npm run preparedemo && cd demo && tns emulate ios",
            "demo.android": "npm run preparedemo && cd demo && tns run android",
            "debug.ios": "npm run preparedemo && cd demo && tns debug ios --emulator",
            "debug.android": "npm run preparedemo && cd demo && tns debug android --emulator",
            "preparedemo": "npm run build && cd demo && tns plugin remove nativescript-"+answers.plugin+" && tns plugin add .. && tns install",
            "setup": "cd demo && npm install && cd .. && npm run build && cd demo && tns plugin add .. && cd .."
        };
        data.scripts.prepublish = "tsc";
        //data.devDependencies = { typescript: TYPESCRIPT_VERSION, "tns-platform-declarations": "^2.0.0" };
    } else {
        data.scripts = {
            "demo.ios": "npm run preparedemo && cd demo && tns emulate ios",
            "demo.android": "npm run preparedemo && cd demo && tns run android",
            "debug.ios": "npm run preparedemo && cd demo && tns debug ios --emulator",
            "debug.android": "npm run preparedemo && cd demo && tns debug android --emulator",
            "preparedemo": "cd demo && tns plugin remove nativescript-"+answers.plugin+" && tns plugin add .. && tns install",
            "setup": "cd demo && npm install && tns plugin add .. && cd .."
        };
    }


    // Mac is the only platform that has ios, the others have to be android...
    if (process.platform === 'darwin') {
        data.scripts.start = "npm run demo.ios";
    } else {
        data.scripts.start = "npm run demo.android";
    }
    //data.scripts['setup-plugin'] = 'node '+ homePath + "setup.js";

    fs.writeFileSync("package.json", JSON.stringify(data, null, 4));
}

/**
 * Generates the new Readme file
 * @param answers
 */
function generateReadme(answers) {
    var data;
    if (fs.existsSync(homePath+"files/README.md")) {
        data = fs.readFileSync(homePath+"files/README.md").toString();
        data = renderData(data, answers);
    } else if (fs.existsSync(homePath+"files/readme.md")) {
        data = fs.readFileSync(homePath+"files/readme.md").toString();
        data = renderData(data, answers);
    } else if (fs.existsSync(homePath+"files/Readme.md")) {
        data = fs.readFileSync(homePath+"files/Readme.md").toString();
        data = renderData(data, answers);
    } else {
        data = "# NativeScript-" + answers.plugin.toProperCase() + "\r\n" + answers.description+"\r\n\r\nFill in a little about your plugin!\r\n\r\n";
        data += "## License\r\nThis plugin is licensed under the " + answers.license.toUpperCase() + "license by "+answers.name+"\r\n\r\n";
        data += "## Installation\r\nTo install type\r\n\r\n```\r\ntns plugin add nativescript-" + answers.plugin + "\r\n```\r\n\r\n";
        data += "## Usages\r\n\r\n";
        data += "## Example\r\n\r\n";
    }
    fs.writeFileSync("README.md", data);
}

/**
 * Creates ignore files
 */
function generateIgnores() {

    // If the ignore file exists we don't overwrite them
    if (fs.existsSync('.gitignore')) { return; }

    var gitIgnore = "\
.idea/\r\n\
.vscode/\r\n\
.tscache/\r\n\
/demo/node_modules/\r\n\
/demo/platforms/\r\n\
node_modules/\r\n\
.settings/\r\n\
\r\n\
.DS_Store\r\n\
*.js.map\r\n\
*.tar\r\n\
*.tgz\r\n\
*.gz\r\n\
*.zip\r\n";

    fs.writeFileSync(".gitignore", gitIgnore);

    var npmIgnore = "\
demo/\r\n\
.git/\r\n\
.idea/\r\n\
docs/\r\n\
bin/\r\n\
tests/\r\n\
screenshots/\r\n\
graphics/\r\n\
.vs/\r\n\
.settings/\r\n\
.vscode/\r\n\
node_modules/\r\n\
.tscache/\r\n\
\r\n\
.gitignore\r\n\
.npmignore\r\n\
.DS_Store\r\n\
.editorconfig\r\n\
.bablerc\r\n\
.eslintignore\r\n\
.travis.yml\r\n\
.jshintrc\r\n\
*.sln\r\n\
*.md\r\n\
*.tmp\r\n\
*.log\r\n\
*.ts\r\n\
*.js.map\r\n\
*.tar\r\n\
*.tgz\r\n\
*.gz\r\n\
*.zip\r\n\
references.d.ts\r\n\
tsconfig.json\r\n\
tslint.json\r\n\
karma.conf.js\r\n\
typings.json\r\n\
typedoc.json\r\n";

    fs.writeFileSync(".npmignore", npmIgnore);



}

/**
 * This handles the ReadLine completion system
 * @param line
 * @returns {*[]}
 */
function completer(line) {
    var completions = completer.data;
    var hits = completions.filter(function(c) { return c.toLowerCase().indexOf(line.toLowerCase()) === 0; });
    return [hits.length ? hits : completions, line];
}

/***
 * Gets the Home Path of the user
 * @returns {*}
 */
function getUserHomePath() {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
}

/**
 * Recursively delete a folder
 * @param path
 */
function recursiveDelete(path) {
    if( fs.existsSync(path) ) {
        var files = fs.readdirSync(path);
        files.forEach(function(file){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                recursiveDelete(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

/**
 * Returns a padding
 * @param length
 * @returns {string}
 */
function strPadding(length) {
    var str = '';
    for (var i=0;i<length;i++) {
        str += ' ';
    }
    return str;
}


// TODO: Make this a simpler function, use a sub-function to check for the variations
/**
 * Parse the command line
 * @returns {{}}
 */
function getCommandLine() {
    var commandLine = {};
    for (var i=0;i<process.argv.length;i++) {
        var value  = process.argv[i].toLowerCase();
        if (value === "-ts" || value === "--ts" || value === "/ts") {
            commandLine.ts = true;
        }
        if (value === '-js' || value === '--js' || value === '/js') {
            commandLine.js = true;
        }
        if (value === '-reset' || value === '--reset' || value === '/reset') {
            commandLine.reset = true;
        }
        if (value === '-single' || value === '--single' || value === '/single') {
            commandLine.single = true;
        }
        if (value === '-dual' || value === '--dual' || value === '/dual') {
            commandLine.dual = true;
        }
        if (value === '-license' || value === '--license' || value === '/license') {
            commandLine.license = process.argv[i+1].toLowerCase(); i++;
        }
        if (value === '-os' || value === '--os' || value === '/os' || value === '-target' || value === '--target' || value === '/target') {
            commandLine.os = process.argv[i+1].toLowerCase(); i++;
            // Verify choice
            if (commandLine.os !== 'both' && commandLine.os !== 'android' && commandLine.os !== 'ios') {
                delete commandLine.os;
            }
        }
        if (value === '-naming' || value === '--naming' || value === '/naming') {
            commandLine.name_type = process.argv[i+1].toLowerCase(); i++;
            // Verify choice
            if (commandLine.name_type !== 'plugin' && commandLine.name_type !== 'index' ) {
                delete commandLine.name_type;
            }
        }
        if (value === '-debug' || value === '--debug' || value === '/debug') {
            commandLine.debug = true;
        }

        if (value === '-contributor' || value === '--contributor' || value === '/contributor') {
            commandLine.packageModification = true;
            commandLine.contributor = process.argv[i+1].toLowerCase(); i++;
        }


        if (value === '?' || value === '/?' || value === '-help' || value === '/help') {
            displayHelp();
            process.exit(0);
        }
    }
    return commandLine;
}

/*
 Save our common questions so we don't have to answer them again...
 */
function saveNewAnswers(results) {
    var newData = {name: results.name, github: results.github, email: results.email, license: results.license, name_type: results.name_type};
    if (!fs.existsSync(homePath)) {
        fs.mkdirSync(homePath);
        fs.mkdirSync(homePath+"files");
        fs.writeFileSync(homePath+"readme.txt", "This folder was created by the tns-template-plugin for settings.\r\n\r\nhttps://github.com/NathanaelA/tns-template-plugin");
    }
    fs.writeFileSync(homePath+"settings.json", JSON.stringify(newData, null, 4));
}


/**
 * Simple command line help
 */
function displayHelp() {
    console.log("\r\n\r\nHelp:\r\n");
    console.log("  -ts or --ts         = force a TS plugin");
    console.log("  -js or --js         = force a JS plugin");
    console.log("  -reset or --reset   = ignore any saved answers and re-ask all questions");
    console.log("  -single or --single = single index.js / index.ts file generated");
    console.log("  -dual or --dual     = both platform files index.android.?s & index.ios.?s generated");
    console.log("  -license <name>     = license to use");
    console.log("  -target <name>      = Target to run (android, ios, both)");
    console.log("  -naming <name>      = Plugin name type (index or plugin)");
}

function generateLicense(answers) {
    var data = getOtherLicense();
    if (data.length === 0) {
        switch (answers.license) {
            case 'mit':
                data = getMIT();
                break;
            case 'apache 2.0':
                data = getApache();
                break;
            case 'bsd':
                data = getBSD();
                break;
            case 'isc':
                data = getISC();
                break;
            default:
                data = '(c) [[year]], [[name]]\r\n\r\n';
        }
    }
    data = renderData(data, answers);
    fs.writeFileSync("LICENSE", data);
}

function getOtherLicense() {
    if (fs.existsSync(homePath+"files/LICENSE")) {
        return fs.readFileSync(homePath+"files/LICENSE").toString();
    }
    return '';
}

function getMIT() {
    return 'The MIT License (MIT)\r\n\r\n\
	[[plugin]]\r\n\
	Copyright (c) [[year]], [[name]]\r\n\r\n\
	Permission is hereby granted, free of charge, to any person obtaining a copy of\r\n\
	this software and associated documentation files (the "Software"), to deal in\r\n\
	the Software without restriction, including without limitation the rights to\r\n\
	use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of\r\n\
	the Software, and to permit persons to whom the Software is furnished to do so,\r\n\
	subject to the following conditions:\r\n\
\r\n\
	The above copyright notice and this permission notice shall be included in all\r\n\
	copies or substantial portions of the Software.\r\n\
\r\n\
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\r\n\
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS\r\n\
	FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR\r\n\
	COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER\r\n\
	IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN\r\n\
	CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.';
}

function getApache() {
    return 'Apache License\r\n\
Version 2.0, January 2004\r\n\
http://www.apache.org/licenses/\r\n\
\r\n\
	TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION\r\n\
\r\n\
1. Definitions.\r\n\
\r\n\
"License" shall mean the terms and conditions for use, reproduction,\r\n\
and distribution as defined by Sections 1 through 9 of this document.\r\n\
\r\n\
"Licensor" shall mean the copyright owner or entity authorized by\r\n\
the copyright owner that is granting the License.\r\n\
\r\n\
"Legal Entity" shall mean the union of the acting entity and all\r\n\
other entities that control, are controlled by, or are under common\r\n\
control with that entity. For the purposes of this definition,\r\n\
"control" means (i) the power, direct or indirect, to cause the\r\n\
direction or management of such entity, whether by contract or\r\n\
otherwise, or (ii) ownership of fifty percent (50%) or more of the\r\n\
outstanding shares, or (iii) beneficial ownership of such entity.\r\n\
\r\n\
"You" (or "Your") shall mean an individual or Legal Entity\r\n\
exercising permissions granted by this License.\r\n\
\r\n\
"Source" form shall mean the preferred form for making modifications,\r\n\
including but not limited to software source code, documentation\r\n\
source, and configuration files.\r\n\
\r\n\
"Object" form shall mean any form resulting from mechanical\r\n\
transformation or translation of a Source form, including but\r\n\
not limited to compiled object code, generated documentation,\r\n\
and conversions to other media types.\r\n\
\r\n\
"Work" shall mean the work of authorship, whether in Source or\r\n\
Object form, made available under the License, as indicated by a\r\n\
copyright notice that is included in or attached to the work\r\n\
(an example is provided in the Appendix below).\r\n\
\r\n\
"Derivative Works" shall mean any work, whether in Source or Object\r\n\
form, that is based on (or derived from) the Work and for which the\r\n\
editorial revisions, annotations, elaborations, or other modifications\r\n\
represent, as a whole, an original work of authorship. For the purposes\r\n\
of this License, Derivative Works shall not include works that remain\r\n\
separable from, or merely link (or bind by name) to the interfaces of,\r\n\
the Work and Derivative Works thereof.\r\n\
\r\n\
"Contribution" shall mean any work of authorship, including\r\n\
the original version of the Work and any modifications or additions\r\n\
to that Work or Derivative Works thereof, that is intentionally\r\n\
submitted to Licensor for inclusion in the Work by the copyright owner\r\n\
or by an individual or Legal Entity authorized to submit on behalf of\r\n\
the copyright owner. For the purposes of this definition, "submitted"\r\n\
means any form of electronic, verbal, or written communication sent\r\n\
to the Licensor or its representatives, including but not limited to\r\n\
communication on electronic mailing lists, source code control systems,\r\n\
and issue tracking systems that are managed by, or on behalf of, the\r\n\
Licensor for the purpose of discussing and improving the Work, but\r\n\
excluding communication that is conspicuously marked or otherwise\r\n\
designated in writing by the copyright owner as "Not a Contribution."\r\n\
\r\n\
"Contributor" shall mean Licensor and any individual or Legal Entity\r\n\
on behalf of whom a Contribution has been received by Licensor and\r\n\
subsequently incorporated within the Work.\r\n\
\r\n\
2. Grant of Copyright License. Subject to the terms and conditions of\r\n\
this License, each Contributor hereby grants to You a perpetual,\r\n\
worldwide, non-exclusive, no-charge, royalty-free, irrevocable\r\n\
copyright license to reproduce, prepare Derivative Works of,\r\n\
publicly display, publicly perform, sublicense, and distribute the\r\n\
Work and such Derivative Works in Source or Object form.\r\n\
\r\n\
3. Grant of Patent License. Subject to the terms and conditions of\r\n\
this License, each Contributor hereby grants to You a perpetual,\r\n\
worldwide, non-exclusive, no-charge, royalty-free, irrevocable\r\n\
(except as stated in this section) patent license to make, have made,\r\n\
use, offer to sell, sell, import, and otherwise transfer the Work,\r\n\
where such license applies only to those patent claims licensable\r\n\
by such Contributor that are necessarily infringed by their\r\n\
Contribution(s) alone or by combination of their Contribution(s)\r\n\
with the Work to which such Contribution(s) was submitted. If You\r\n\
institute patent litigation against any entity (including a\r\n\
cross-claim or counterclaim in a lawsuit) alleging that the Work\r\n\
or a Contribution incorporated within the Work constitutes direct\r\n\
or contributory patent infringement, then any patent licenses\r\n\
granted to You under this License for that Work shall terminate\r\n\
as of the date such litigation is filed.\r\n\
\r\n\
4. Redistribution. You may reproduce and distribute copies of the\r\n\
Work or Derivative Works thereof in any medium, with or without\r\n\
modifications, and in Source or Object form, provided that You\r\n\
meet the following conditions:\r\n\
\r\n\
(a) You must give any other recipients of the Work or\r\n\
Derivative Works a copy of this License; and\r\n\
\r\n\
(b) You must cause any modified files to carry prominent notices\r\n\
stating that You changed the files; and\r\n\
\r\n\
(c) You must retain, in the Source form of any Derivative Works\r\n\
that You distribute, all copyright, patent, trademark, and\r\n\
attribution notices from the Source form of the Work,\r\n\
excluding those notices that do not pertain to any part of\r\n\
the Derivative Works; and\r\n\
\r\n\
(d) If the Work includes a "NOTICE" text file as part of its\r\n\
distribution, then any Derivative Works that You distribute must\r\n\
include a readable copy of the attribution notices contained\r\n\
within such NOTICE file, excluding those notices that do not\r\n\
pertain to any part of the Derivative Works, in at least one\r\n\
of the following places: within a NOTICE text file distributed\r\n\
as part of the Derivative Works; within the Source form or\r\n\
documentation, if provided along with the Derivative Works; or,\r\n\
within a display generated by the Derivative Works, if and\r\n\
wherever such third-party notices normally appear. The contents\r\n\
of the NOTICE file are for informational purposes only and\r\n\
do not modify the License. You may add Your own attribution\r\n\
notices within Derivative Works that You distribute, alongside\r\n\
or as an addendum to the NOTICE text from the Work, provided\r\n\
that such additional attribution notices cannot be construed\r\n\
as modifying the License.\r\n\
\r\n\
You may add Your own copyright statement to Your modifications and\r\n\
may provide additional or different license terms and conditions\r\n\
for use, reproduction, or distribution of Your modifications, or\r\n\
for any such Derivative Works as a whole, provided Your use,\r\n\
reproduction, and distribution of the Work otherwise complies with\r\n\
the conditions stated in this License.\r\n\
\r\n\
5. Submission of Contributions. Unless You explicitly state otherwise,\r\n\
any Contribution intentionally submitted for inclusion in the Work\r\n\
by You to the Licensor shall be under the terms and conditions of\r\n\
this License, without any additional terms or conditions.\r\n\
Notwithstanding the above, nothing herein shall supersede or modify\r\n\
the terms of any separate license agreement you may have executed\r\n\
with Licensor regarding such Contributions.\r\n\
\r\n\
6. Trademarks. This License does not grant permission to use the trade\r\n\
names, trademarks, service marks, or product names of the Licensor,\r\n\
except as required for reasonable and customary use in describing the\r\n\
origin of the Work and reproducing the content of the NOTICE file.\r\n\
\r\n\
7. Disclaimer of Warranty. Unless required by applicable law or\r\n\
agreed to in writing, Licensor provides the Work (and each\r\n\
Contributor provides its Contributions) on an "AS IS" BASIS,\r\n\
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or\r\n\
implied, including, without limitation, any warranties or conditions\r\n\
of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A\r\n\
PARTICULAR PURPOSE. You are solely responsible for determining the\r\n\
appropriateness of using or redistributing the Work and assume any\r\n\
risks associated with Your exercise of permissions under this License.\r\n\
\r\n\
8. Limitation of Liability. In no event and under no legal theory,\r\n\
whether in tort (including negligence), contract, or otherwise,\r\n\
unless required by applicable law (such as deliberate and grossly\r\n\
negligent acts) or agreed to in writing, shall any Contributor be\r\n\
liable to You for damages, including any direct, indirect, special,\r\n\
incidental, or consequential damages of any character arising as a\r\n\
result of this License or out of the use or inability to use the\r\n\
Work (including but not limited to damages for loss of goodwill,\r\n\
work stoppage, computer failure or malfunction, or any and all\r\n\
other commercial damages or losses), even if such Contributor\r\n\
has been advised of the possibility of such damages.\r\n\
\r\n\
9. Accepting Warranty or Additional Liability. While redistributing\r\n\
the Work or Derivative Works thereof, You may choose to offer,\r\n\
and charge a fee for, acceptance of support, warranty, indemnity,\r\n\
or other liability obligations and/or rights consistent with this\r\n\
License. However, in accepting such obligations, You may act only\r\n\
on Your own behalf and on Your sole responsibility, not on behalf\r\n\
of any other Contributor, and only if You agree to indemnify,\r\n\
defend, and hold each Contributor harmless for any liability\r\n\
incurred by, or claims asserted against, such Contributor by reason\r\n\
of your accepting any such warranty or additional liability.\r\n\
\r\n\
END OF TERMS AND CONDITIONS';
}

function getBSD() {
    return 'Copyright (c) [[year]], [[name]]\r\n\
All rights reserved.\r\n\
\r\n\
Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:\r\n\
\r\n\
1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.\r\n\
\r\n\
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.\r\n\
\r\n\
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.\r\n\
\r\n\
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.';
}

function getISC() {
    return 'Copyright (c) [[year]], [[name]]\r\n\
\r\n\
Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.\r\n\
\r\n\
THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.';
}
