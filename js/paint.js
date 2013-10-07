var paint = {
		
		initPaint : function(board){
			this.board = board;
			board.context.tool = new tool.arrow();
			
			//set up events
			window.onmouseup = bodyUp;
			window.onmousemove = bodyMove;
			window.onkeydown = this.shortcuts;
			board.canvas.onmousedown = board.canvastemp.onmousedown = c_down;
			board.canvas.onmousemove = board.canvastemp.onmousemove = c_move;
			board.canvas.onmouseout = board.canvastemp.onmouseout = c_out;
			board.canvas.onmouseup = board.canvastemp.onmouseup = c_up;
		},
		
		shortcuts : function(e) {
			var c = this.board.context;
			if(e.keyCode == 46) { //delete
				if(c.tool.name == 'select' && c.tool.status > 0) { //del selection
					c.tool.del();
				}
			} else if (e.keyCode == 27) {
				$("#text").val("").hide();
			} else if (e.keyCode == 13) {
				//$("#text").blur();
				//document.getElementById("canvas").className = "text";
			} else if(e.ctrlKey || e.metaKey) {
				var letter = String.fromCharCode(e.keyCode);
				switch(letter) {
					case 'C':
						this.copy();
						break;
					case 'V':
						this.paste();
						break;
					case 'X':
						this.cut();
						break;
					case 'Z':
						this.undo();
						break;
				}
			}
			return true;
		},
		
		

		sel_cancel:function() {
			c = this.board.context;
			canvastemp = this.board.canvastemp;
			ctemp = this.board.contexttemp;
			if (c.tool.status == 2) {
				if (ctemp && ctemp.start) {
					c.drawImage(canvassel, Math.floor(ctemp.start.x), Math.floor(ctemp.start.y));
				}
			}
			if (c.tool.status != 4) {
				canvastemp.style.display='none';
			}
		},

		copy:function() {
			c = this.board.context;
		  if(c.tool.name == 'select' && c.tool.status > 0) {  //copy selection
				c.tool.copy();
			}
		},

		cut:function() {
			c = this.board.context;
			if(c.tool.name == 'select' && c.tool.status > 0) {  //cut selection
				c.tool.copy();
				c.tool.del();
			}
		},

		paste:function() {
			c = this.board.context;
			//todo only if something on canvassel
			//selTool(document.getElementById('select'));
			c.tool.paste();
		},

		undo:function() {
			c = this.board.context;
		  if(c.tool.name == 'select') {	//reset all info about current selection
				activateTempCanvas(); 
				canvastemp.style.display='none';
				c.tool.status = 0;
			}
			undoLoad();
		},

		getxy:function(e, o) {
		//gets mouse position relative to object o
			c = this.board.context;
			if(c) {
				var bo = getpos(o);
				var x = e.clientX - bo.x + wsp.scrollLeft;	//correct for canvas position, workspace scroll offset
				var y = e.clientY - bo.y + wsp.scrollTop;									
				x += document.documentElement.scrollLeft;	//correct for window scroll offset
				y += document.documentElement.scrollTop;									
				x = (c.zoom) ? x/c.zoom : x; 	//correct for zoom
				y = (c.zoom) ? y/c.zoom : y;
				return { x: x-.5, y: y-.5 }; //-.5 prevents antialiasing of stroke lines
			}
		},

		getpos:function(o) {
		//gets position of object o
			var bo, x, y, b; x = y = 0;
			if(document.getBoxObjectFor) {	//moz
				bo = document.getBoxObjectFor(o);
				x = bo.x; y = bo.y;
			} else if (o.getBoundingClientRect) { //ie (??)
				bo = o.getBoundingClientRect();
				x = bo.left; y = bo.top;
			} else { //opera, safari etc
				while(o && o.nodeName != 'BODY') {
					x += o.offsetLeft;
					y += o.offsetTop;
					b = parseInt(document.defaultView.getComputedStyle(o,null).getPropertyValue('border-width'));
					if(b > 0) { x += b; y +=b; }
					o = o.offsetParent;
				}
			}
			return { x:x, y:y };
		},


		blurImage:function(realCanvas, simulateCanvas, layerId, startX, startY, endX, endY) {
		  var x = startX < endX ? startX : endX;
		  var y = startY < endY ? startY : endY;
		  var width = Math.abs(endX - startX - 1);
		  var height = Math.abs(endY - startY - 1);
		  //simulateCanvas.width = $(layerId).clientWidth + 10; //canvas.style.width
		  //simulateCanvas.height = $(layerId).clientHeight + 10;
		  var ctx = simulateCanvas.getContext('2d');
		  try {
		    ctx.drawImage(realCanvas, x, y, width, height, 0, 0, width, height);
		  } catch(error) {
		    console.log(error + ' width : height' + width + ' : ' + height) ;
		  }
		  var imageData = ctx.getImageData(0, 0, width, height);
		  imageData = boxBlur(imageData, width, height, 10);
		  ctx.putImageData(imageData, 0, 0);
		},

		boxBlur:function(image, width, height, count) {
		  var j;
		  var pix = image.data;
		  var inner = 0;
		  var outer = 0;
		  var step = 0;
		  var rowOrColumn;
		  var nextPosition;
		  var nowPosition;
		  for(rowOrColumn = 0; rowOrColumn < 2; rowOrColumn++) {
		    if (rowOrColumn) {
		      // column blurring
		      outer = width;
		      inner = height;
		      step = width * 4;
		    } else {
		      // Row blurring
		      outer = height;
		      inner = width;
		      step = 4;
		    }
		    for (var i = 0; i < outer; i++) {
		      // Calculate for r g b a
		      nextPosition = (rowOrColumn == 0 ? (i * width * 4) : (4 * i));
		      for (var k = 0; k < 4; k++) {
		        nowPosition = nextPosition + k;
		        var pixSum = 0;
		          for(var m = 0; m < count; m++) {
		            pixSum += pix[nowPosition + step * m];
		          }
		          pix[nowPosition] = pix[nowPosition + step] =
		              pix[nowPosition + step * 2] = Math.floor(pixSum/count);
		          for (j = 3; j < inner-2; j++) {
		            pixSum = Math.max(0, pixSum - pix[nowPosition + (j - 2) * step]
		                + pix[nowPosition + (j + 2) * step]);
		            pix[nowPosition + j * step] = Math.floor(pixSum/count);
		          }
		          pix[nowPosition + j * step] = pix[nowPosition + (j + 1) * step] =
		              Math.floor(pixSum / count);
		      }
		    }
		  }
		  return image;
		}		
		
		
		
};