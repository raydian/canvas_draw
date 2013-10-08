$(document).ready(function() {
	
	var canvas_id = 'canvas';
	var canvastemp_id = 'canvastemp';
	var img_src = 'http://ww3.sinaimg.cn/mw1024/9d86d3e8gw1e8atmpc4ucj20c80mcabq.jpg';
	var workspace_id = 'workspace';
	drawboard.initialize(canvas_id, canvastemp_id, workspace_id);
	drawboard.bindEvent();
	drawboard.updateImage(img_src);
});

