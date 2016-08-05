"use strict";

// TODO: pull the version from the github repo
const TYPESCRIPT_VERSION = "^1.8.10";

const child = require('child_process');
const readline = require('readline');
const fs = require('fs');
const cp = require('child_process');

console.log("-------------------------------------------------------");
console.log("NativeScript Plugin Template 					  v1.00");
console.log("Copyright 2016, Nathanael Anderson / Master Technology.\r\n");
console.log("nathan@master-technology.com							");
console.log("-------------------------------------------------------");

const homePath = getUserHomePath() + "/.tns-plugin/";

var startupChoices = getCommandLine();

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

// Defaults Questions
var questions = [{ name: "plugin", question: "What is the name of your plugin? "}];

if (!answers.script) {
	questions.push({
		name: "script",
		question: "Will the plugin be TypeScript or JavaScript? ",
		answers: ["JavaScript", "TypeScript"]
	});
}

if (!answers.os) {
	questions.push({
		name: "os",
		question: "Is the Plugin for Android, iOS or both? ",
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
	questions.push({name: 'output_files', question: 'Do you prefer a single index.js, or separate platform version indexes? ', answers: ['single', 'dual']});
}

if (!answers.github) {
	questions.push({name: "github", question: "Github username? "});
}
if (!answers.name) {
	questions.push({name: 'name', question: "What is your name? "});
}
if (!answers.email) {
	questions.push({name: 'email', question: "What is your email address? "});
}


/*
Save our common questions so we don't have to answer them again...
 */
function saveNewAnswers(results) {
	var newData = {name: results.name, github: results.github, email: results.email, license: results.license, output_files: results.output_files};
	if (!fs.existsSync(homePath)) {
		fs.mkdirSync(homePath);
		fs.mkdirSync(homePath+"files");
		fs.writeFileSync(homePath+"readme.txt", "This folder was created by the tns-template-plugin for settings.\r\n\r\nhttps://github.com/NathanaelA/tns-template-plugin");
	}
	fs.writeFileSync(homePath+"settings.json", JSON.stringify(newData, null, 4));
}


// Lets start and ask our questions
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


		// Save our persistent answers if they don't already exist
		if (!answers.name) {
			try {
				saveNewAnswers(results);
			} catch(err) {
				// Can't create our home setting directory, not a big issue; we can still complete the process.
			}
		}

		// OK so at this point we have all the answers we need; lets get to creating
		//console.log("Answer is:", results);

		copyScript();
		console.log("Generating readme.me...");
		generateReadme(results);
		console.log("Generating package.json...");
		generateJSON(results);
		console.log("Generating index files...");
		generateIndex(results);
		if (results.script === "typescript") {
			console.log("Generating tconfig.json file...");
			generateTSConfig(results);
		}
		console.log("Generating License...");
		generateLicense(results);
		if (!fs.existsSync("demo")) {
			cp.spawnSync("tns",["create","demo"]);
		}
		console.log("\r\n\r\n\r\n-----------------------[ Plugin Setup ]--------------------------");
		console.log("Plugin quick commands are: ");
		console.log("  npm run demo.ios      = Will run your demo under the iOS emulator" );
		console.log("  npm run demo.android  = Will run your demo under the android emulator" );
		console.log("  npm run debug.ios     = Will debug your demo under the iOS emulator" );
		console.log("  npm run debug.android = Will debug your demo under the android emulator" );

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

// TODO: Maybe create a Default answer, would make this script a bit smarter.
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
		var rX = new RegExp("\[\["+key+"\]\]", "gi");
		data.replace(rX,answers[key]);
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
				"demo/node_modules/tns-core-modules/tns-core-modules.d.ts",
				"node_modules/tns-platform-declarations/android17.d.ts",
				"node_modules/tns-platform-declarations/ios.d.ts",
				"node_modules/tns-platform-declarations/org.nativescript.widgets.d.ts"
			],
			"compileOnSave": false
		};
	}

	if (answers.output_files === "single") {
		data.files.push("index.ts");
	} else {
		if (answers.os === "android" || answers.os === "both") {
			data.files.push("index.android.ts");
		}
		if (answers.script === "ios" || answers.os === "both") {
			data.files.push('index.ios.ts');
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
		"* (c) " + answers.year + ", " + answers.name + "\r\n" +
		"* Licensed under the " + answers.license + " license.\r\n" +
		"* Version 1.0.0                                      " + answers.email + "\r\n" +
		"*********************************************************************************/\r\n'use strict';\r\n\r\n";

	// Check for our default file
	if (fs.existsSync('index.js')) {
		var indexFile = fs.readFileSync('index.js').toString();
		if (indexFile.indexOf("// 01010011 01110100 01101111 01110000") !== -1) { return; }
	}

	if (answers.script === "javascript") {
		if (fs.existsSync(homePath + "files/index.js")) {
			data = renderData(fs.readFileSync(homePath + "files/index.js").toString(), answers);
		}

		if (answers.output_files === "single") {
			fs.writeFileSync('index.js', data);
		} else {
			if (answers.os === "android" || answers.os === "both") {
				fs.writeFileSync('index.android.js', data);
			}
			if (answers.os === "ios" || answers.os === "both") {
				fs.writeFileSync('index.ios.js', data);
			}
		}

	} else {
		if (fs.existsSync(homePath + "files/index.ts")) {
			data = renderData(fs.readFileSync(homePath + "files/index.ts").toString(), answers);
		}

		if (answers.output_files === "single") {
			fs.writeFileSync('index.ts', data);
		} else {
			if (answers.os === "android" || answers.os === "both") {
				fs.writeFileSync('index.android.ts', data);
			}
			if (answers.os === "ios" || answers.os === "both") {
				fs.writeFileSync('index.ios.ts', data);
			}
		}

	}

	fs.writeFileSync("index.d.ts", "//--------------------------\r\n// "+answers.plugins+" typings file.\r\n//--------------------------");
}

/**
 * Generates a new JSON file for the plugin
 * @param answers
 */
function generateJSON(answers) {

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
			name: "nativescript-" + answers.name,
			version: "1.0.0",
			description: "A plugin by " + answers.name,
			main: "index.js",  // Yes this is correct, the final file deployed to device MUST be JS
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
				type: answers.license,
				"url": "https://github.com/" + answers.github + "/nativescript-" + answers.plugin + "/blob/master/LICENSE"
			},
			bugs: {
				url: "https://github.com/" + answers.github + "/nativescript-" + answers.plugin + "/issues"
			},
			homepage: "https://github.com/" + answers.github + "/nativescript-" + answers.plugin,
			readmeFilename: "README.md"
		};
	}

	if (answers.platform === "android" || answers.platform === "both") {
		data.nativescript.platforms.android = '2.0.0';
	}
	if (answers.platform === "ios" || answers.platform === "both") {
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
		data.devDependencies = { typescript: TYPESCRIPT_VERSION, "tns-platform-declarations": "^2.0.0" };
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
	data.scripts['setup-plugin'] = 'node '+ homePath + "setup.js";

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
		data = "# " + answers.plugin + "\r\nFill in a little about your plugin!\r\n\r\n";
		data += "## License\r\nThis plugin is licensed under the " + answers.license + " by "+answers.name+"\r\n";
		data += "## Installation\r\n\r\ntns plugin add nativescript-" + answers.plugin + "\r\n\r\n";
	}
		fs.writeFileSync("README.md", data);

}

/**
 * This handles the ReadLine completion system
 * @param line
 * @returns {*[]}
 */
function completer(line) {
	var completions = completer.data;
	var hits = completions.filter(function(c) { return c.indexOf(line) === 0; });
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
		
		if (value === '?' || value === '/?' || value === '-help' || value === '/help') {
			displayHelp();
			process.exit(0);
		}
	}
	return commandLine;
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
	return 'The MIT License (MIT)\
\
	[[plugin]]\
	Copyright (c) [[year]], [[name]]\
\
	Permission is hereby granted, free of charge, to any person obtaining a copy of\
	this software and associated documentation files (the "Software"), to deal in\
	the Software without restriction, including without limitation the rights to\
	use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of\
	the Software, and to permit persons to whom the Software is furnished to do so,\
		subject to the following conditions:\
\
		The above copyright notice and this permission notice shall be included in all\
	copies or substantial portions of the Software.\
\
		THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS\
	FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR\
	COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER\
	IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN\
	CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.';
}

function getApache() {
	return 'Apache License\
Version 2.0, January 2004\
http://www.apache.org/licenses/\
\
	TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION\
\
1. Definitions.\
\
"License" shall mean the terms and conditions for use, reproduction,\
and distribution as defined by Sections 1 through 9 of this document.\
\
"Licensor" shall mean the copyright owner or entity authorized by\
the copyright owner that is granting the License.\
\
"Legal Entity" shall mean the union of the acting entity and all\
other entities that control, are controlled by, or are under common\
control with that entity. For the purposes of this definition,\
"control" means (i) the power, direct or indirect, to cause the\
direction or management of such entity, whether by contract or\
otherwise, or (ii) ownership of fifty percent (50%) or more of the\
outstanding shares, or (iii) beneficial ownership of such entity.\
\
"You" (or "Your") shall mean an individual or Legal Entity\
exercising permissions granted by this License.\
\
"Source" form shall mean the preferred form for making modifications,\
including but not limited to software source code, documentation\
source, and configuration files.\
\
"Object" form shall mean any form resulting from mechanical\
transformation or translation of a Source form, including but\
not limited to compiled object code, generated documentation,\
and conversions to other media types.\
\
"Work" shall mean the work of authorship, whether in Source or\
Object form, made available under the License, as indicated by a\
copyright notice that is included in or attached to the work\
(an example is provided in the Appendix below).\
\
"Derivative Works" shall mean any work, whether in Source or Object\
form, that is based on (or derived from) the Work and for which the\
editorial revisions, annotations, elaborations, or other modifications\
represent, as a whole, an original work of authorship. For the purposes\
of this License, Derivative Works shall not include works that remain\
separable from, or merely link (or bind by name) to the interfaces of,\
the Work and Derivative Works thereof.\
\
"Contribution" shall mean any work of authorship, including\
the original version of the Work and any modifications or additions\
to that Work or Derivative Works thereof, that is intentionally\
submitted to Licensor for inclusion in the Work by the copyright owner\
or by an individual or Legal Entity authorized to submit on behalf of\
the copyright owner. For the purposes of this definition, "submitted"\
means any form of electronic, verbal, or written communication sent\
to the Licensor or its representatives, including but not limited to\
communication on electronic mailing lists, source code control systems,\
and issue tracking systems that are managed by, or on behalf of, the\
Licensor for the purpose of discussing and improving the Work, but\
excluding communication that is conspicuously marked or otherwise\
designated in writing by the copyright owner as "Not a Contribution."\
\
"Contributor" shall mean Licensor and any individual or Legal Entity\
on behalf of whom a Contribution has been received by Licensor and\
subsequently incorporated within the Work.\
\
2. Grant of Copyright License. Subject to the terms and conditions of\
this License, each Contributor hereby grants to You a perpetual,\
worldwide, non-exclusive, no-charge, royalty-free, irrevocable\
copyright license to reproduce, prepare Derivative Works of,\
publicly display, publicly perform, sublicense, and distribute the\
Work and such Derivative Works in Source or Object form.\
\
3. Grant of Patent License. Subject to the terms and conditions of\
this License, each Contributor hereby grants to You a perpetual,\
worldwide, non-exclusive, no-charge, royalty-free, irrevocable\
(except as stated in this section) patent license to make, have made,\
use, offer to sell, sell, import, and otherwise transfer the Work,\
where such license applies only to those patent claims licensable\
by such Contributor that are necessarily infringed by their\
Contribution(s) alone or by combination of their Contribution(s)\
with the Work to which such Contribution(s) was submitted. If You\
institute patent litigation against any entity (including a\
cross-claim or counterclaim in a lawsuit) alleging that the Work\
or a Contribution incorporated within the Work constitutes direct\
or contributory patent infringement, then any patent licenses\
granted to You under this License for that Work shall terminate\
as of the date such litigation is filed.\
\
4. Redistribution. You may reproduce and distribute copies of the\
Work or Derivative Works thereof in any medium, with or without\
modifications, and in Source or Object form, provided that You\
meet the following conditions:\
\
(a) You must give any other recipients of the Work or\
Derivative Works a copy of this License; and\
\
(b) You must cause any modified files to carry prominent notices\
stating that You changed the files; and\
\
(c) You must retain, in the Source form of any Derivative Works\
that You distribute, all copyright, patent, trademark, and\
attribution notices from the Source form of the Work,\
excluding those notices that do not pertain to any part of\
the Derivative Works; and\
\
(d) If the Work includes a "NOTICE" text file as part of its\
distribution, then any Derivative Works that You distribute must\
include a readable copy of the attribution notices contained\
within such NOTICE file, excluding those notices that do not\
pertain to any part of the Derivative Works, in at least one\
of the following places: within a NOTICE text file distributed\
as part of the Derivative Works; within the Source form or\
documentation, if provided along with the Derivative Works; or,\
within a display generated by the Derivative Works, if and\
wherever such third-party notices normally appear. The contents\
of the NOTICE file are for informational purposes only and\
do not modify the License. You may add Your own attribution\
notices within Derivative Works that You distribute, alongside\
or as an addendum to the NOTICE text from the Work, provided\
that such additional attribution notices cannot be construed\
as modifying the License.\
\
You may add Your own copyright statement to Your modifications and\
may provide additional or different license terms and conditions\
for use, reproduction, or distribution of Your modifications, or\
for any such Derivative Works as a whole, provided Your use,\
reproduction, and distribution of the Work otherwise complies with\
the conditions stated in this License.\
\
5. Submission of Contributions. Unless You explicitly state otherwise,\
any Contribution intentionally submitted for inclusion in the Work\
by You to the Licensor shall be under the terms and conditions of\
this License, without any additional terms or conditions.\
Notwithstanding the above, nothing herein shall supersede or modify\
the terms of any separate license agreement you may have executed\
with Licensor regarding such Contributions.\
\
6. Trademarks. This License does not grant permission to use the trade\
names, trademarks, service marks, or product names of the Licensor,\
except as required for reasonable and customary use in describing the\
origin of the Work and reproducing the content of the NOTICE file.\
\
7. Disclaimer of Warranty. Unless required by applicable law or\
agreed to in writing, Licensor provides the Work (and each\
Contributor provides its Contributions) on an "AS IS" BASIS,\
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or\
implied, including, without limitation, any warranties or conditions\
of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A\
PARTICULAR PURPOSE. You are solely responsible for determining the\
appropriateness of using or redistributing the Work and assume any\
risks associated with Your exercise of permissions under this License.\
\
8. Limitation of Liability. In no event and under no legal theory,\
whether in tort (including negligence), contract, or otherwise,\
unless required by applicable law (such as deliberate and grossly\
negligent acts) or agreed to in writing, shall any Contributor be\
liable to You for damages, including any direct, indirect, special,\
incidental, or consequential damages of any character arising as a\
result of this License or out of the use or inability to use the\
Work (including but not limited to damages for loss of goodwill,\
work stoppage, computer failure or malfunction, or any and all\
other commercial damages or losses), even if such Contributor\
has been advised of the possibility of such damages.\
\
9. Accepting Warranty or Additional Liability. While redistributing\
the Work or Derivative Works thereof, You may choose to offer,\
and charge a fee for, acceptance of support, warranty, indemnity,\
or other liability obligations and/or rights consistent with this\
License. However, in accepting such obligations, You may act only\
on Your own behalf and on Your sole responsibility, not on behalf\
of any other Contributor, and only if You agree to indemnify,\
defend, and hold each Contributor harmless for any liability\
incurred by, or claims asserted against, such Contributor by reason\
of your accepting any such warranty or additional liability.\
\
END OF TERMS AND CONDITIONS';
}

function getBSD() {
	return 'Copyright (c) [[year]], [[name]]\
All rights reserved.\
\
Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:\
\
1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.\
\
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.\
\
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.\
\
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.';
}

function getISC() {
	return 'Copyright (c) [[year]], [[name]]\
\
Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.\
\
THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.';
}