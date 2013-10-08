// CanvasPaint r1
// by Christopher Clay <canvas@c3o.org>
//
// The code in this file is dedicated to the Public Domain
// http://creativecommons.org/licenses/publicdomain/
//

var canvas, c, canvastemp, ctemp, canvassel, csel, canvasundo, cundo, wsp, imgd, co, check, m;
var iface = { dragging:false, resizing:false, status:null, xy:null, txy:null };
var prefs = { pretty:false, controlpoints:false };
var dashed = new Image();
dashed.src = 'images/dashed.gif';
var FILL_STYLE = 'white';
var drawingColor;
var lastToolUsed;

function setDrawingColor(color) {
	drawingColor = c.strokeStyle = color;
}



