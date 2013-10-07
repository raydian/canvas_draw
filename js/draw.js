var drawboard = {

		hoveringOverFontSize : false,
		
		initialize : function(canvas_id,canvastemp_id,img_src,workspace_id){
			
			this.drawingColor = 'red';
			this.strokeFill = 1;
			this.tertStyle = '#DDD';
			
			this.dashed = new Image();
			this.dashed.src = 'images/dashed.gif';
			this.FILL_STYLE = 'white';
			this.lastToolUsed;
			
			this.canvas = document.getElementById(canvas_id);
			this.canvastemp = document.getElementById(canvastemp_id);
			this.workspace = document.getElementById(workspace_id);
			this.context = this.canvas.getContext('2d');
			this.contexttemp = this.canvastemp.getContext('2d');
			this.textArea = $("#text");
			
			this.context.fillStyle = this.FILL_STYLE;
			this.setDrawingColor('red');
			this.context.tertStyle = this.tertStyle;
			this.context.strokeFill = this.strokeFill;
			
			this.iface = { dragging:false, resizing:false, status:null, xy:null, txy:null };
			this.iface.status = document.getElementById('status').firstChild;
			this.iface.xy = document.getElementById('xy').firstChild;
			this.iface.txy = document.getElementById('txy').firstChild;
			
			this.prefs = { pretty:false, controlpoints:false };
			
			//set up selection canvas (invisible, used for selections)
			this.canvassel = document.getElementById("canvassel");
			this.csel = this.canvassel.getContext("2d");

			//set up undo canvas (invisible)
			this.canvasundo = document.getElementById("canvasundo");
			this.cundo = this.canvasundo.getContext("2d");			
			
			this.updateImage(img_src);

			
		},
		
		canvas_height : function(height){
			this.canvas.height = this.canvastemp.height = height;
		},
		
		canvas_width : function(width){
			this.canvas.width = this.canvastemp.width = width;
		},
		
		updateImage : function(src){
			var image = new Image();
			image.src = src;
			var _this = this;
			image.onload = function() {
				
				console.log("load image: " + image.src);
				_this.canvas.width = _this.canvastemp.width = image.width;
				console.log("canvas width: " + _this.canvas.width);
				_this.canvas.height = _this.canvastemp.height = image.height;
				_this.context = _this.canvas.getContext('2d');
				_this.contexttemp = _this.canvastemp.getContext('2d');
				_this.context.drawImage(image, 0, 0);
				_this.canvasLeft = $(_this.canvas).offset().left;
				$(_this.canvastemp).css("left", _this.canvasLeft );
				if (_this.canvas.width < 600) {
					//$("#workspace").css("margin-top", "30px");
				}
				initPaint();
				_this.initFonts();
				_this.setShadow(true);

			};	
			
		},
		
		initFonts : function() {
			var fontSize;
//			var fontSizePref = pref("fontSize", "normal");
			var fontSizePref = "normal";
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
			this.context.font = 'bold ' + fontSize + "px sans-serif";
			this.textArea.css("font", this.context.font); 
		},
		
		setShadow : function(flag, offset) {
			if (flag) {
				if (!offset) {
					offset = 5;
				}
				this.context.shadowOffsetX = this.contexttemp.shadowOffsetX = offset;
				this.context.shadowOffsetY = this.contexttemp.shadowOffsetY = offset;
				this.context.shadowBlur = this.contexttemp.shadowBlur = 4;
				this.context.shadowColor = this.contexttemp.shadowColor = "gray";
			} else {
				this.context.shadowOffsetX = this.contexttemp.shadowOffsetX = 0;
				this.context.shadowOffsetY = this.contexttemp.shadowOffsetY = 0;
				this.context.shadowBlur = this.contexttemp.shadowBlur = 0;
				this.context.shadowColor = this.contexttemp.shadowColor = "none";
			}
		},
		
		writeText : function(str, context, x, y) {
			if (context.fillText) {
				context.fillText(str, x, y);
			} else if (context.strokeText) {
				context.strokeText(str, x, y);
			}
		},
		
		setDrawingColor : function(color) {
			this.drawingColor = this.context.strokeStyle = color;
		},
		
		bindEvent : function(){
			
			var _draw = this;
			//var c = _draw.context;
			
			$("#toolbar li img").click(function() {
				_draw.setShadow(true);
				clickedTool = $(this);
				if (clickedTool.attr("src").indexOf("select") != -1) {
					_draw.setShadow(false);
					_draw.context.tool = new tool.select();
					_draw.canvas.className = "line";
//					document.getElementById("canvas").className = "line";
				} else if (clickedTool.attr("src").indexOf("ellipsis") != -1) {
//					initTools();
					_draw.context.tool = new tool.ellipse();
					_draw.canvas.className = "line";
//					document.getElementById("canvas").className = "line";
				} else if (clickedTool.attr("src").indexOf("blur") != -1) {
					_draw.setShadow(false);
//					initTools();
					_draw.context.tool = new tool.eraser();
					_draw.canvas.className = "line";
//					document.getElementById("canvas").className = "line";
				} else if (clickedTool.attr("src").indexOf("rectangle") != -1) {
//					initTools();
					_draw.context.tool = new tool.rectangle();
					_draw.canvas.className = "line";
//					document.getElementById("canvas").className = "line";
				} else if (clickedTool.attr("src").indexOf("drawFreehand") != -1) {
//					initTools();
					_draw.context.tool = new tool.pencil();
					_draw.canvas.className = "line";
//					document.getElementById("canvas").className = "line";
				} else if (clickedTool.attr("src").indexOf("line") != -1) {
//					initTools();
					_draw.context.tool = new tool.line();
					_draw.canvas.className = "line";
//					document.getElementById("canvas").className = "line";
				} else if (clickedTool.attr("src").indexOf("text") != -1) {
					console.log("text clicked");
					$("#editingInstructions").slideUp("fast", function() {
						$("#textOptions").slideDown();
					});
					_draw.setShadow(true, 1);
//					setShadow(true, 1);
//					initTools();
					_draw.context.tool = new tool.text();
					_draw.canvas.className = "text";
//					document.getElementById("canvas").className = "text";
				} else if (clickedTool.attr("src").indexOf("undo") != -1) {
					undo();
					return;
				} else if (clickedTool.attr("src").indexOf("refresh") != -1) {
					window.location.reload();
					return;
				} else {
//					initTools();
					_draw.context.tool = new tool.arrow();
					_draw.canvas.className = "line";
//					document.getElementById("canvas").className = "line";
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


			$("#colorPicker").click(function() {
				$("#colorGrid").toggle();
				$("#colorGrid").css("left", $("#colorPicker").offset().left + "px");
				//sendGA(['_trackEvent', "colorPicker", "click"]);
			});
			$(".color").click(function() {
				var color = $(this).css("background-color");
				_draw.setDrawingColor(color);
//				setDrawingColor(color);
				$("#colorPicker").css("background-color", color);
				textArea.css("color", color);
				$("#colorGrid").hide();
			});


			$("#text").blur(function() {
				if (!_draw.hoveringOverFontSize) {
//					console.log("text blur: " + hoveringOverFontSize);
					//context.font = 'bold 18px sans-serif';
					_draw.context.textBaseline = 'top';
					_draw.context.fillStyle = _draw.context.strokeStyle;

					var x = $(this).position().left - _draw.canvasLeft + 1;
					var y = $(this).position().top - 1;
					var lineHeight = 22;

					var lines = $(this).val().split("\n");
					for (var a=0; a<lines.length; a++) {
						_draw.writeText(lines[a], _draw.context, x, y);
						y += lineHeight;
					}

					$(this).hide();
					_draw.workspace.className = "text";
//					document.getElementById("workspace").className = "text";
				}
			});



			
			$(".fontSize").click(function() {
				//console.log("fontsize");
				//localStorage["fontSize"] = $(this).attr("id");
//				initFonts();
				_draw.initFonts();
//				if (donationClicked("fontSize")) {
//				}
			}).mouseenter(function() {
				_draw.hoveringOverFontSize = true;
//				hoveringOverFontSize = true;
			}).mouseleave(function() {
				_draw.hoveringOverFontSize = false;
//				hoveringOverFontSize = false;
			});
			
			
		}
		
		
};


$(document).ready(function() {
	
	var canvas_id = 'canvas';
	var canvastemp_id = 'canvastemp';
	var img_src = 'http://ww3.sinaimg.cn/mw1024/9d86d3e8gw1e8atmpc4ucj20c80mcabq.jpg';
	var workspace_id = 'workspace';
	drawboard.initialize(canvas_id, canvastemp_id, img_src, workspace_id);
	drawboard.bindEvent();
});

