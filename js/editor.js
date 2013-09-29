//var bg = chrome.extension.getBackgroundPage();

var screenShotTab;

var DEBUG_PICT_DOWN = false;
var DEBUG_IMM_DOWN = false;

var globalImageURL;
var canvas;
var canvastemp;
var context;
var contexttemp;
var clickedTool;
var canvasLeft;
var ajaxObj;
var aborted = false;
var hoveringOverFontSize = false;

var immioOrigins = "http://imm.io/*";
var immioGranted = false;
var chemicalOrigins = "http://files.chemicalservers.com/*";
var chemicalGranted = false;

/*
chrome.permissions.contains({origins: [immioOrigins]}, function(result) {
	if (result) {
		immioGranted = true;
	}
});
chrome.permissions.contains({origins: [chemicalOrigins]}, function(result) {
	if (result) {
		chemicalGranted = true;
	}
});
*/

var SCROLLBAR_WIDTH = 22; /***** duplpicated in popup.js ***/

if (!window.BlobBuilder && window.WebKitBlobBuilder) {
	window.BlobBuilder = window.WebKitBlobBuilder;
}

function writeText(str, context, x, y) {
	if (context.fillText) {
		context.fillText(str, x, y);
	} else if (context.strokeText) {
		context.strokeText(str, x, y);
	}
}

function watermarkImage() {
	if (typeof canvas != "undefined" && canvas.width > 200) {
		setShadow(false);
		context.font = 'normal 10px sans-serif';
		c.strokeStyle = c.fillStyle = "black";
		writeText("Explain and Send Screenshots", context, 10, 15);
		writeText(screenShotTab.url, context, 10, canvas.height-15);
		c.strokeStyle = c.fillStyle = drawingColor;
	}
}

function setShadow(flag, offset) {
	if (flag) {
		if (!offset) {
			offset = 5;
		}
		context.shadowOffsetX = contexttemp.shadowOffsetX = offset;
		context.shadowOffsetY = contexttemp.shadowOffsetY = offset;
		context.shadowBlur = contexttemp.shadowBlur = 4;
		context.shadowColor = contexttemp.shadowColor = "gray";
	} else {
		context.shadowOffsetX = contexttemp.shadowOffsetX = 0;
		context.shadowOffsetY = contexttemp.shadowOffsetY = 0;
		context.shadowBlur = contexttemp.shadowBlur = 0;
		context.shadowColor = contexttemp.shadowColor = "none";
	}
}




function postGrantedUpload(website) {
	$("#uploadProcessing").show();
	$("#uploadProcessingDone").hide();
	
	$("#uploadWebsitesWrapper").slideUp("fast", function() {			
		sendGA(['_trackEvent', "uploadWebsite", website]);			
		
		uploadImageWrapper(website, function(params) {
			if (!params.error) {
				$("#gmailIssue").slideUp();
			}
		});
		
		return false;
	});
}

$(document).ready(function() {
	
	if (localStorage.alwaysUpload) {
		$("#gmailIssue").hide();
		$(".makeDefault").hide();
	} else {
		$("#removeDefault").hide();
	}
	


	function initTools() {
		if (lastToolUsed == "select") {
			c.tool.down();
		}
	}
	
	function initFonts() {
		var fontSize;
		var fontSizePref = pref("fontSize", "normal");
		$(".fontSize").removeClass("selected");
		if (fontSizePref.match(/small/i)) {
			$("#fontSmall").addClass("selected");
			fontSize = 12;					
		} else if (fontSizePref.match(/normal/i)) {
			$("#fontNormal").addClass("selected");
			fontSize = 18;
		} else {
			$("#fontLarge").addClass("selected");
			fontSize = 30;
		}
		context.font = 'bold ' + fontSize + "px sans-serif";
		$("#text").css("font", context.font); 
	}
	
	setTimeout(function(){

		
		var image = new Image();
		image.src = 'http://ww3.sinaimg.cn/mw1024/9d86d3e8gw1e8atmpc4ucj20c80mcabq.jpg';
		image.onload = function() {
			
			console.log("width of image: " + image.width);
			
			canvas = document.getElementById('canvas');
			canvastemp = document.getElementById('canvastemp');
			var rightMargin = 0;
			if (localStorage.grabMethod == "entirePage") {
				rightMargin = SCROLLBAR_WIDTH;
			}
			canvas.width = canvastemp.width = image.width - rightMargin;
			
			console.log("width of image: " + canvas.width);
			
			canvas.height = canvastemp.height = image.height;
			context = canvas.getContext('2d');
			contexttemp = canvastemp.getContext('2d');
			context.drawImage(image, 0, 0);
			canvasLeft = $("canvas").offset().left;
			$("#canvastemp").css("left", canvasLeft );
			if (canvas.width < 600) {
				$("#workspace").css("margin-top", "30px");
			}

			initPaint();

			initFonts();
			setShadow(true);
		};		
		
	}, 500);



	$("#toolbar li img").click(function() {
		setShadow(true);
		clickedTool = $(this);
		if (clickedTool.attr("src").indexOf("select") != -1) {
			setShadow(false);
			c.tool = new tool.select();
			document.getElementById("canvas").className = "line";
		} else if (clickedTool.attr("src").indexOf("ellipsis") != -1) {
			initTools();
			c.tool = new tool.ellipse();
			document.getElementById("canvas").className = "line";
		} else if (clickedTool.attr("src").indexOf("blur") != -1) {
			setShadow(false);
			initTools();
			c.tool = new tool.eraser();
			document.getElementById("canvas").className = "line";
		} else if (clickedTool.attr("src").indexOf("rectangle") != -1) {
			initTools();
			c.tool = new tool.rectangle();
			document.getElementById("canvas").className = "line";
		} else if (clickedTool.attr("src").indexOf("drawFreehand") != -1) {
			initTools();
			c.tool = new tool.pencil();
			document.getElementById("canvas").className = "line";
		} else if (clickedTool.attr("src").indexOf("line") != -1) {
			initTools();
			c.tool = new tool.line();
			document.getElementById("canvas").className = "line";
		} else if (clickedTool.attr("src").indexOf("text") != -1) {
			console.log("text clicked");
			$("#editingInstructions").slideUp("fast", function() {
				$("#textOptions").slideDown();
			});
			setShadow(true, 1)
			initTools();
			c.tool = new tool.text();
			document.getElementById("canvas").className = "text";
		} else if (clickedTool.attr("src").indexOf("undo") != -1) {
			undo();
			return;
		} else if (clickedTool.attr("src").indexOf("refresh") != -1) {
			window.location.reload();
			return;
		} else {
			initTools();
			c.tool = new tool.arrow();
			document.getElementById("canvas").className = "line";
		}
		
		if (!clickedTool.attr("src").match("text")) {
			$("#textOptions").fadeOut();
		}
		
		$("#toolbar li img").each(function(i) {
			if (clickedTool.attr("src") == $(this).attr("src")) {
				var newSrc = $(this).attr("src").replace("Off", "On");
				$(this).attr("src", newSrc);
			} else {
				var newSrc = $(this).attr("src").replace("On", "Off");
				$(this).attr("src", newSrc);
			}
		});
	});

	$("#text").blur(function() {
		if (!hoveringOverFontSize) {
			console.log("text blur: " + hoveringOverFontSize)
			//context.font = 'bold 18px sans-serif';
			context.textBaseline = 'top';
			c.fillStyle = c.strokeStyle;

			var x = $(this).position().left - canvasLeft + 1;
			var y = $(this).position().top - 1;
			var lineHeight = 22;

			var lines = $(this).val().split("\n");
			for (a=0; a<lines.length; a++) {
				writeText(lines[a], context, x, y);
				y += lineHeight;
			}

			$(this).hide();
			document.getElementById("workspace").className = "text";
		}
	});



	$("#colorPicker").click(function() {				
		$("#colorGrid").toggle();
		$("#colorGrid").css("left", $("#colorPicker").offset().left + "px");
		sendGA(['_trackEvent', "colorPicker", "click"]);
	});
	$(".color").click(function() {
		var color = $(this).css("background-color");
		setDrawingColor(color);
		$("#colorPicker").css("background-color", color);
		$("#text").css("color", color);
		$("#colorGrid").hide();
	});



	
	$(".fontSize").click(function() {
		if (donationClicked("fontSize")) {
			console.log("fontsize");
			localStorage["fontSize"] = $(this).attr("id");
			initFonts();
		}
	}).mouseenter(function() {
		hoveringOverFontSize = true;
	}).mouseleave(function() {
		hoveringOverFontSize = false;
	});


	
	$("#download").click(function() {
		if (globalImageURL) {
			// use download image instead
			//$(this).attr("href", globalImageURL);
			//$(this).attr("target", "_blank");
			location.href = globalImageURL;
		} else {
			// data url
			saveAs(dataURItoBlob( $("#editedImage").attr("src") ));
		}
	});
	
	$("body").click(function() {
		
		//saveAs(dataURItoBlob( $("#editedImage").attr("src") ));
		return;

		function onInitFs(fs) {
			
			function errorHandler(e) {
				  var msg = '';

				  switch (e.code) {
				    case FileError.QUOTA_EXCEEDED_ERR:
				      msg = 'QUOTA_EXCEEDED_ERR';
				      break;
				    case FileError.NOT_FOUND_ERR:
				      msg = 'NOT_FOUND_ERR';
				      break;
				    case FileError.SECURITY_ERR:
				      msg = 'SECURITY_ERR';
				      break;
				    case FileError.INVALID_MODIFICATION_ERR:
				      msg = 'INVALID_MODIFICATION_ERR';
				      break;
				    case FileError.INVALID_STATE_ERR:
				      msg = 'INVALID_STATE_ERR';
				      break;
				    default:
				      msg = 'Unknown Error';
				      break;
				  };

				  alert("err: " + msg);
				  logError('Error oninitfs: ' + msg);
				}
			
	        var cvs = document.createElement('canvas');
	        var ctx  = cvs.getContext("2d");
	        
	        var img = document.getElementById("editedImage");
	        
	        cvs.width = img.width;
	        cvs.height = img.height;
	        ctx.drawImage(img, 0, 0);
	        var imd = cvs.toDataURL("image/png");
	        var ui8a = convertDataURIToBinary(imd);
	        
	        //img.src = ui8a;
	        
	        //var bb = new Blob();
	        //bb.append(ui8a.buffer);
	        //alert('a: ' + ui8a);
	        
	        fs.root.getFile('test2.txt', {}, function(fileEntry) {
	        	
	        	function toArray(list) {
	        		  return Array.prototype.slice.call(list || [], 0);
	        		}

	        		function listResults(entries) {
	        		  // Document fragments can improve performance since they're only appended
	        		  // to the DOM once. Only one browser reflow occurs.

	        		  entries.forEach(function(entry, i) {
	        		    var img = entry.isDirectory ? '<img src="folder-icon.gif">' :
	        		                                  '<img src="file-icon.gif">';
	        		    var li = document.createElement('li');
	        		    li.innerHTML = [img, '<span>', entry.name, '</span>'].join('');
	        		    console.log("file: ", entry);
	        		    
	 	               //var objURL = window.webkitURL.createObjectURL(entry);
		               //console.log("objurl", objURL);

		               fs.root.getFile(entry.name, {}, function(fileEntry) {
		            	   console.log("fileentry: ", fileEntry)
		               });
	        		    
	        		  });

	        		}
	        	
	        	var dirReader = fs.root.createReader();
	        	  var entries = [];
	        	  
	        	  alert('afterread')
	        	  
	        	  // Call the reader.readEntries() until no more results are returned.
	        	  var readEntries = function() {
	        	     dirReader.readEntries (function(results) {
	        	    	 alert('reading')
	        	      if (!results.length) {
	        	        listResults(entries.sort());
	        	      } else {
	        	        entries = entries.concat(toArray(results));
	        	        readEntries();
	        	      }
	        	    }, errorHandler);
	        	  };

	        	  readEntries(); // Start reading dirs.
	        	  

	        	console.log("in getfile")
	        		
	            // Get a File object representing the file,
	            // then use FileReader to read its contents.
	            fileEntry.file(function(file) {
	               var reader = new FileReader();

	               console.log("in getfile2")
	               
	               reader.onloadend = function(e) {
	                 var txtArea = document.createElement('textarea');
	                 txtArea.value = this.result;
	                 document.body.appendChild(txtArea);
	               };

	               reader.readAsText(file);
	               
	               var objURL = window.webkitURL.createObjectURL(file);
	               console.log("objurl", objURL);
	               
	               console.log("in getfile3")
	               
	               img.src=objURL;
	               
	            }, errorHandler);
	        	
	        	console.log("in getfileaftger")

	          }, errorHandler );
	        
	        
	        fs.root.getFile("test2.txt", {create: true}, function(fileEntry) {
	        	alert('b')
	        	// Create a FileWriter object for our FileEntry (log.txt).
	            fileEntry.createWriter(function(fileWriter) {

	              fileWriter.onwriteend = function(e) {
	            	  alert('c')
	            	  console.log(window.webkitURL.createObjectURL(fileEntry));
	                console.log('Write completed.');
	              };

	              fileWriter.onerror = function(e) {
	                console.log('Write failed: ' + e.toString());
	              };

	              // Create a new Blob and write it to log.txt.
	              var blob = new Blob(['Lorem Ipsum'], {type: 'text/plain'});

	              fileWriter.write(blob);

	            }, errorHandler);

	        	/*
	            // Create a FileWriter object for our FileEntry (log.txt).
	            fileEntry.createWriter(function(fileWriter) {
	                fileWriter.onwriteend = function(e) {
	                    console.log('Write completed.');
	                    callback && callback("test.jpg");
	                };

	                fileWriter.onerror = function(e) {
	                    console.log('Write failed: ' + e.toString());
	                };

	                fileWriter.write(bb.getBlob("image/png"));
	            });
	            */
	        }, errorHandler);

			function convertDataURIToBinary(dataURI) {
			var BASE64_MARKER = ';base64,';
			var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
			var base64 = dataURI.substring(base64Index);
			var raw = window.atob(base64);
			var rawLength = raw.length;
			var array = new Uint8Array(new ArrayBuffer(rawLength));
			
			for (i = 0; i < rawLength; i++) {
			array[i] = raw.charCodeAt(i);
			}
			return array;
			}

			
			/*
		      fs.root.getFile('image.png', {create: true}, function(fileEntry) {
		        // Create a FileWriter object for our FileEntry (log.txt).
		        fileEntry.createWriter(function(fileWriter) {
		        //WRITING THE BLOB TO FILE
		        fileWriter.write(blob);
		        }, errorHandler);
		      }, errorHandler);
		      */
		      
		    }

		window.webkitRequestFileSystem(window.PERSISTENT, 5*1024*1024, onInitFs, function(e) {
	    	alert("error: " + e)
	    	console.log(e);
	    });
		
	})
	
});

function dataURItoBlob(d, k) {
    var j = atob(d.split(",")[1]);
    var c = d.split(",")[0].split(":")[1].split(";")[0];
    var g = new ArrayBuffer(j.length);
    var e = new Uint8Array(g);
    for (var f = 0; f < j.length; f++) {
        e[f] = j.charCodeAt(f)
    }
    var dataView = new DataView(g);
    var h = new Blob([dataView]);
    //h.append(g);
    //return h.getBlob(c)
    return h;
}

var saveAs = saveAs || (function(h) {
    var r = h.document,
        l = function() {
            return h.URL || h.webkitURL || h
        },
        e = h.URL || h.webkitURL || h,
        n = r.createElementNS("http://www.w3.org/1999/xhtml", "a"),
        g = "download" in n,
        j = function(t) {
            var s = r.createEvent("MouseEvents");
            s.initMouseEvent("click", true, false, h, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            return t.dispatchEvent(s)
        },
        o = h.webkitRequestFileSystem,
        p = h.requestFileSystem || o || h.mozRequestFileSystem,
        m = function(s) {
            (h.setImmediate || h.setTimeout)(function() {
                throw s
            }, 0)
        },
        c = "application/octet-stream",
        k = 0,
        b = [],
        i = function() {
            var t = b.length;
            while (t--) {
                var s = b[t];
                if (typeof s === "string") {
                    e.revokeObjectURL(s)
                } else {
                    s.remove()
                }
            }
            b.length = 0
        },
        q = function(t, s, w) {
            s = [].concat(s);
            var v = s.length;
            while (v--) {
                var x = t["on" + s[v]];
                if (typeof x === "function") {
                    try {
                        x.call(t, w || t)
                    } catch (u) {
                        m(u)
                    }
                }
            }
        },
        f = function(t, u) {
            var v = this,
                B = t.type,
                E = false,
                x, w, s = function() {
                    var F = l().createObjectURL(t);
                    console.log("object url: " + F);
                    b.push(F);
                    return F
                },
                A = function() {
                    q(v, "writestart progress write writeend".split(" "))
                },
                D = function() {
                    if (E || !x) {
                        x = s(t)
                    }
                    w.location.href = x;
                    v.readyState = v.DONE;
                    A()
                },
                z = function(F) {
                    return function() {
                        if (v.readyState !== v.DONE) {
                            return F.apply(this, arguments)
                        }
                    }
                },
                y = {
                    create: true,
                    exclusive: false
                },
                C;
            v.readyState = v.INIT;
            if (!u) {
                u = "download.jpg"
            }
            if (g) {
                x = s(t);
                n.href = x;
                n.download = u;
                if (j(n)) {
                    v.readyState = v.DONE;
                    A();
                    return
                }
            }
            if (h.chrome && B && B !== c) {
                C = t.slice || t.webkitSlice;
                t = C.call(t, 0, t.size, c);
                E = true
            }
            if (o && u !== "download") {
                u += ".download"
            }
            if (B === c || o) {
                w = h
            } else {
                w = h.open()
            }
            if (!p) {
                D();
                return
            }
            k += t.size;
            p(h.PERSISTENT, k, z(function(F) { //TEMPORARY
                F.root.getDirectory("saved", y, z(function(G) {
                    var H = function() {
                            G.getFile(u, y, z(function(I) {
                                I.createWriter(z(function(J) {
                                    J.onwriteend = function(K) {
                                        w.location.href = I.toURL();
                                        b.push(I);
                                        v.readyState = v.DONE;
                                        q(v, "writeend", K)
                                    };
                                    J.onerror = function() {
                                        var K = J.error;
                                        if (K.code !== K.ABORT_ERR) {
                                            D()
                                        }
                                    };
                                    "writestart progress write abort".split(" ").forEach(function(K) {
                                        J["on" + K] = v["on" + K]
                                    });
                                    J.write(t);
                                    v.abort = function() {
                                        J.abort();
                                        v.readyState = v.DONE
                                    };
                                    v.readyState = v.WRITING
                                }), D)
                            }), D)
                        };
                    G.getFile(u, {
                        create: false
                    }, z(function(I) {
                        I.remove();
                        H()
                    }), z(function(I) {
                        if (I.code === I.NOT_FOUND_ERR) {
                            H()
                        } else {
                            D()
                        }
                    }))
                }), D)
            }), D)
        },
        d = f.prototype,
        a = function(s, t) {
            return new f(s, t)
        };
    d.abort = function() {
        var s = this;
        s.readyState = s.DONE;
        q(s, "abort")
    };
    d.readyState = d.INIT = 0;
    d.WRITING = 1;
    d.DONE = 2;
    d.error = d.onwritestart = d.onprogress = d.onwrite = d.onabort = d.onerror = d.onwriteend = null;
    h.addEventListener("unload", i, false);
    return a
}(self));