var screenShotTab;
var screenShotData;

chrome.runtime.onInstalled.addListener(function(details) {	
	if (details.reason == "install") {
		localStorage["installDate"] = new Date();
		localStorage["installVersion"] = chrome.runtime.getManifest().version;
	} else if (details.reason == "update") {
		// do nothing
	}	
});