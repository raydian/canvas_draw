var selectedTab;
var internalPage = false;

var canvas = "";
var ctx;
var cy = 0;
var SCROLLBAR_WIDTH = 22;

if (!chrome.runtime || !chrome.runtime.getBackgroundPage) {
	chrome.tabs.create({url:"http://jasonsavard.com/wiki/Old_Chrome_version"});
}

function showCannotCaptureWarning() {
	$("body *:not(#cannotCaptureWarning)").css("opacity", "0.7");
	$("#cannotCaptureWarning").fadeIn();
}

function captureVisibleTab(urlToGoAfter) {
	chrome.tabs.captureVisibleTab(null, {format:"png"}, function(data) {
		if (data) {
			chrome.runtime.getBackgroundPage(function(bg) {
				getActiveTab(function(tab) {
					bg.screenShotTab = tab;
					bg.screenShotData = data;
					chrome.tabs.create({url: urlToGoAfter});
				});
			});
		} else {
			showCannotCaptureWarning();
		}
	});
}

function captureRecursively(tab, callback) {
	console.log("captrecur")
	captureToCanvas(function() {
		console.log("sendnext")
		chrome.tabs.sendMessage(tab.id, {msg:"scroll_next"}, function(response) {
			if (response.msg == "scroll_next_done") {
				console.log("sendnextdone")
				captureRecursively(tab, callback);
			} else {
				console.log("finish")
				callback();
			}
		});
	});
}

function captureToCanvas(callback) {
	chrome.tabs.captureVisibleTab(null, {format:"png"}, function(data) {
		var image = new Image();
		console.log("capture");
		image.onload = function() {
			console.log("image loaded: " + cy);			
			console.log("image loaded: " + image.height);
			console.log("image loaded: " + canvas.height);
			var height = (cy+image.height > canvas.height) ? canvas.height-cy : image.height;
			console.log("height: " + height);
			console.log("width: " + image.width);
			if(height > 0) {
				console.log("ctx drawimage: ", image, canvas);
				ctx.drawImage(image, 0, image.height-height, image.width-SCROLLBAR_WIDTH, height, 0, cy, canvas.width-SCROLLBAR_WIDTH, height);
			}
			cy += image.height;
			callback();
		};
		image.src = data;
	});
}

$(document).ready(function() {
	
	getActiveTab(function(tab) {
		console.log("tab", tab);
		selectedTab = tab;
		if (!tab.url || tab.url.match("chrome://chrome/")) {
			internalPage = true;
			showCannotCaptureWarning();
			$("#selectedArea").addClass("disabled");
			$("#visibleArea").addClass("disabled");
			$("#entirePage").addClass("disabled");
		} else if (tab.url.indexOf("chrome-extension://") == 0 || tab.url.indexOf("https://chrome.google.com/webstore") == 0 || tab.url.indexOf("about:") == 0) {
			internalPage = true;
			$("#entirePage").addClass("disabled");
		}
	});

	$(".menuitem").click(function() {
		sendGA(['_trackEvent', 'popup', $(this).attr("id")]);
	});
	
	$("#particularPages").click(function() {
		$("#particularPagesList").slideDown();
	});
	
	$("#reloadTab").click(function() {
		chrome.tabs.update(selectedTab.id, {url:selectedTab.url});
		self.close();
	});
	
	$("#selectedArea").click(function() {
		localStorage.grabMethod = "selectedArea";
		captureVisibleTab("snapshot.html");
	});
	
	$("#visibleArea, #justInstalledGrabVisibleArea").click(function() {
		localStorage.grabMethod = "visibleArea";
		captureVisibleTab("editor.html");	
	});

	$("#entirePage").click(function() {
		localStorage.grabMethod = "entirePage";
		if (internalPage) {
			alert("This option is disabled for internal Chrome pages!")
		} else {
			document.getElementById("grabLinks").style.display = "none";
			document.getElementById("processing").style.display = "block";
			
			getActiveTab(function(tab) {
				var sendMessageResponded = false;
				
				chrome.tabs.executeScript(tab.id, {file:"js/contentScript.js"}, function() {

					if (chrome.extension.lastError) {
						console.error("error", chrome.extension.lastError.message);
					} else {					
						chrome.tabs.sendMessage(tab.id, {msg:"scroll_init"}, function(response) {
							sendMessageResponded = true;
							
							canvas = document.createElement('canvas');
							ctx = canvas.getContext("2d");
							console.log("original: " + response.width + " " + response.height);
							canvas.width = response.width;
							canvas.height = response.height;
							cy = 0;
							
							captureRecursively(tab, function() {
								chrome.runtime.getBackgroundPage(function(bg) {
									console.log("canvas: "); // + canvas.toDataURL())
									bg.screenShotTab = tab;
									bg.screenShotData = canvas.toDataURL();
									chrome.tabs.create({url: 'editor.html'});
								});
							});
	
						});
					}
					
				});

				setTimeout(function() {
					if (!sendMessageResponded) {
						$("body").css("width", "200px");
						$("#processing, #grabLinks").hide();
						$("#justInstalled").slideDown();
					}
				}, 500);

			});
		}
	});
	
	$("#uploadImage").click(function() {
		chrome.tabs.create({url: 'http://imm.io'});
	});

	$("#otherExtensions").click(function() {
		chrome.tabs.create({url: 'https://chrome.google.com/webstore/detail/checker-plus-for-gmail/oeopbcgkkoapgobdbedcemjljbihmemj?ref=ssPopup'});
	});

});