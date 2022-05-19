function sampleDistributionGraph($elem, data) {

	var HISTOGRAMQ = 1; // Default Q
	var DENSQ = HISTOGRAMQ/8; // Smoothing of the density function, in value units
	var DENSNORM = 0.8; // Normalizing value of the densityfunction (0-1)
	var CDFQ = HISTOGRAMQ/8;
	var MAXSAMPLEAREAPOINTS = 2000; // Max svg lines to display in the sample area (to avoid browser freeze)

	var LOGSCALEBASE = 2;
	var SHOWCDF = false; // Default value - show cdf function at startup
	var SHOWDENSITY = true; // Default value - show density function at startup

	var INITZOOMPERCENTILE = 0.98; // Which value percentile area should the initial zoom be set to

	var SVG_W = $elem.width();
	var SVG_H = Math.min(Math.round(SVG_W*0.8), window.innerHeight*0.85);
	var AXIS_MARGIN = Math.min(55, Math.round(SVG_W*0.07));
	var SAMPLE_AREA_H = Math.round(SVG_H*0.03);

	var GRAPH_W = SVG_W - AXIS_MARGIN*2;
	var GRAPH_H = SVG_H - AXIS_MARGIN*2 - SAMPLE_AREA_H;

	var TRANSITION_DUR = 750; // ms

	function getDensityDistribution(data, q, xScale, normVal, maxPoints) {

		function kernelDensityEstimator(kernel, x) {
			return function(sample) {
				return x.map(function(x) {
					return [x, d3.mean(sample, function(v) { return kernel(x - v); })];
				});
			};
		}

		function epanechnikovKernel(scale) {
			return function(u) {
				return Math.abs(u /= scale) <= 1 ? .75 * (1 - u * u) / scale : 0;
			};
		}

		var valDomain=xScale.domain()[1] - xScale.domain()[0];

		var nrPoints = Math.min(Math.round(valDomain/q*4), maxPoints);
		var points = xScale.ticks(nrPoints);

		var densityData = kernelDensityEstimator(epanechnikovKernel(q), points)(data);

		// Normalise
		var scaleFactor = normVal/d3.max(densityData, function(d) { return d[1] });

		for (var i=0,len=densityData.length;i<len;i++)
			densityData[i][1]*=scaleFactor;

		// Add termination points
		densityData.splice(0,0,[0,0]);
		densityData.push([xScale.domain()[1],0]);

		return densityData;
	}

	function getCdf(data, q, xScale, logScaleBase, maxPoints) {

		var maxQ = Math.max(q, (xScale.domain()[1]-xScale.domain()[0])/maxPoints);

		var binnedData = getHistogram(data, maxQ, logScaleBase);

		if (binnedData.length==0)
			return [];

		var xOffset = binnedData[0].dx/2;

		var cdfData=[];
		var aggr=0;
		for (var i=0, len=binnedData.length; i<len; i++) {
			aggr+=binnedData[i].y;
			cdfData.push([binnedData[i].x+xOffset, aggr]);
		}

		// Add termination points
		cdfData.splice(0,0,[xScale.domain()[0],0]);
		cdfData.push([xScale.domain()[1],1]);

		return cdfData;
	}

	function getHistogram(data, q, logScaleBase) {

		var dataRange=[0, d3.max(data)];

		logScaleBase = (logScaleBase==null?1:logScaleBase);

		var base=1/logScaleBase;
		var expQ=Math.pow(q*Math.pow(base,4) , base);  // Incremental Q

		var points = [];
		for (var p = Math.pow(dataRange[0], base),len=Math.pow(dataRange[1], base); p<len; p+=expQ)
			points.push(Math.round(Math.pow(p,1/base), 2));

		points.push(Math.round(dataRange[1], 2));

		var histogram = d3.histogram()
			.thresholds(points);

		return histogram(data);
	}


	function downSampleData (data, xScale, nrPoints) {
		nrPoints = (nrPoints==null?40:nrPoints);
		var points = xScale.ticks(nrPoints);
		var resData=[];
		var pointIdx=0;
		for (var i=0, len=data.length;i<len;i++) {
			if (data[i][0]>=points[pointIdx]) {
				resData.push(data[i]);
				pointIdx++;
				if (pointIdx==points.length)
					break;
			}
		}
		return resData;
	}


	function getXScale(xVals, logScaleBase) {
		var maxX = d3.max(xVals);

		return (logScaleBase==1?d3.scaleLinear():d3.scalePow().exponent(1/logScaleBase))
			.domain([0, maxX])
			.range([0, GRAPH_W])
			.clamp(true);
	}

	function getYScale(dataH, xDomain) {
		var maxY=0;
		for (var i=0, len=dataH.length; i<len; i++) {
			if (xDomain!=null) {
				if(dataH[i].x+dataH[i].dx < xDomain[0])
					continue;
				if (dataH[i].x > xDomain[1])
					break;
			}
			if(dataH[i].y>maxY)
				maxY=dataH[i].y;
		}

		maxY=(maxY==0?1:maxY);

		return d3.scaleLinear()
			.domain([0, maxY*1.05])
			.range([GRAPH_H, 0])
			.clamp(true);
	}

	function getY2Scale() {
		return d3.scaleLinear()
			.domain([0, 1])
			.range([GRAPH_H, 0]);
	}

	function setInitZoomLevel() {

		var zoom = 0;
		for (var i=0, len=cdfData.length; i<len; i++) {
			zoom = cdfData[i][0];
			if (cdfData[i][1]>INITZOOMPERCENTILE) {
				break;
			}
		}

		xScale.domain([0, zoom]);
	}

	function initStatic(svg) {

		var linScale = getXScale(data, 1);

		densityData = getDensityDistribution(data, DENSQ, linScale, DENSNORM, GRAPH_W*2);

		cdfData = getCdf(data, CDFQ, linScale, 1, GRAPH_W*2);

		xScale = getXScale(data, logScaleBase);
		yScale = getYScale([]);
		y2Scale = getY2Scale();

		setInitZoomLevel();


		/**************/

		var container = svg.append('g');

		/* Grid */
		var grid = container.append('g');

		grid.append("g")
			.attr("class", "x-grid")
			.attr("transform", "translate(0," + (GRAPH_H + SAMPLE_AREA_H) + ")");

		grid.append("g").attr("class", "y-grid");

		grid.styles({
			"shape-rendering": "crispEdges",
			"fill": "none",
			"stroke": "lightgrey",
			"stroke-opacity": 0.6
		});

		/* Sample Area */
		container.append('rect')
			.attr("width", GRAPH_W)
			.attr("height", SAMPLE_AREA_H)
			.attr("x", 0)
			.attr("y", GRAPH_H)
			.styles({
				"stroke": 'black',
				"stroke-width": 0.5,
				"stroke-opacity": 0.7,
				"fill": 'lightgrey'
			});

		/* Axises */
		var axises = container.append('g')
			.attr("class", "axises");

		axises.append("g")
			.attr("class", "x-axis")
			.attr("transform", "translate(0," + (GRAPH_H + SAMPLE_AREA_H) + ")");

		var yAxis = axises.append("g")
			.attr("class", "y-axis");

		// y2 axis is static
		var y2Axis = axises.append("g")
			.attr("class", "y2-axis")
			.attr("transform", "translate(" + GRAPH_W + ", 0)")
			.call(
				d3.axisRight()
					.scale(y2Scale)
					.tickFormat( function(d) { return Math.round(d*100,2) + "%" } )
			)
			.styles('opacity', (showCdf?1:0));

		axises.styles({
			"shape-rendering": "crispEdges",
			"font": AXIS_MARGIN*.25 + 'px sans-serif'
		});

		axises.selectAll('path, line')
			.styles({
				"stroke": "black",
				"fill": "none"
		});

		/* Labels */
		container.append("text")
			.attr("x", GRAPH_W - AXIS_MARGIN*2)
			.attr("y", GRAPH_H + SAMPLE_AREA_H)
			.styles("text-anchor", "end")
			.attr('dy','2.5em')
			.styles({
				font: 'italic '+ AXIS_MARGIN*.28 + 'px sans-serif',
				fill: '#777'
			})
			.text(data.length + " Samples");

		yAxis.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 8)
			.attr('dy','.8em')
			.styles("text-anchor", "end")
			.text("Relative (%)");

		y2Axis.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", -12)
			.styles("text-anchor", "end")
			.text("Cumulative (%)");

		y2Axis.selectAll('text')
			.styles("fill", "green");

		/*
		// Tooltip
		container.append("div")
			.attr("class", "graphTooltip")
			.styles({
				position: 'absolute',
				'text-align': 'left',
				width: '100px',
				height: '40px',
				padding: '5px',
				font: '12px sans-serif',
				background: 'lightsteelblue',
				border: '0px',
				'border-radius': '8px',
				'pointer-events': 'none',
				opacity: 0
			});
		*/

		// Traction for the zoom function
		container.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', GRAPH_W)
			.attr('height', GRAPH_H)
			.styles({
				opacity: 0,
				cursor: 'crosshair'
			});

		svg.on("mousedown", function(e) {
				if (d3.pointer(e)[0]<0 || d3.pointer(e)[0]>GRAPH_W || d3.pointer(e)[1]<0 || d3.pointer(e)[1]>GRAPH_H)
					return;

				var rect = svg.append("rect")
					.styles({
						stroke: 'blue',
						'stroke-opacity': .6,
						fill: 'blue',
						'fill-opacity': .3
					});

				var startX = d3.pointer(e)[0];

				d3.select("body").classed("stat-noselect", true);

				d3.select(window)
					.on("mousemove.zoomRect", function(e) {
						e.stopPropagation();
						var newX = Math.max(0, Math.min(GRAPH_W, d3.pointer(e)[0]));
						rect.attr("x", Math.min(startX, newX))
							.attr("y", 0)
							.attr("width", Math.abs(startX - newX))
							.attr("height", GRAPH_H);
						})
					.on("mouseup.zoomRect", function(e) {
						d3.select(window).on("mousemove.zoomRect", null).on("mouseup.zoomRect", null);
						d3.select("body").classed("stat-noselect", false);
						rect.remove();

						var endX = Math.max(0, Math.min(GRAPH_W, d3.pointer(e)[0]));
						var newDomain = [startX, endX].map(xScale.invert).sort(d3.ascending);
						if ((endX !== startX) && (newDomain[1]-newDomain[0]>0.001)) {  // Zoom damper
							xScale.domain(newDomain);
							redrawX();
						}
					}, true);

				e.stopPropagation();
			})
			.append('title').text('click-drag to zoom in');

		container.append('text')
			.attr("x", GRAPH_W*.99 - AXIS_MARGIN*2)
			.attr("y", -GRAPH_H*.03)
			.styles("text-anchor", "end")
			.styles({
				font: "italic " + AXIS_MARGIN*.26 + 'px sans-serif',
				fill: "blue",
				opacity: .65,
				cursor: 'pointer'
			})
			.text("Reset Zoom")
			.on("mouseup" , function() {
				xScale.domain([0,maxBwidth]);
				redrawX();
			})
			.on("mouseover", function(){
				d3.select(this).styles('opacity', 1);
			})
			.on("mouseout", function() {
				d3.select(this).styles('opacity', .6);
			});

		renderContainer(svg, xScale, yScale, y2Scale);

	}

	function renderContainer(svg, xScale, yScale) {

		var xAxis = d3.axisBottom()
			.scale(xScale);
			//.ticks(10, 2);

		var xGrid = d3.axisTop()
			.scale(xScale)
			.tickFormat("")
			.tickSize(GRAPH_H + SAMPLE_AREA_H, 0, 0);
			//.ticks(10, 1);

		var yAxis = d3.axisLeft()
			.scale(yScale)
			.tickFormat( function(d) { return Math.round(d*100,3) + "%" } );
			//.ticks(10, 2);

		var yGrid = d3.axisRight()
			.scale(yScale)
			.tickFormat("")
			.tickSize(GRAPH_W, 0, 0);
			//.ticks(10, 1);

		svg.select('.x-grid')
			.transition().duration(TRANSITION_DUR)
			.call(xGrid);

		svg.select('.y-grid')
			.transition().duration(TRANSITION_DUR)
			.call(yGrid);

		svg.select('.x-axis')
			.transition().duration(TRANSITION_DUR)
			.call(xAxis);

		svg.select('.y-axis')
			.transition().duration(TRANSITION_DUR)
			.call(yAxis);

		var axises = svg.select('.axises');

		axises.selectAll('path, line')
			.styles({
				"stroke": "black",
				"fill": "none"
			});

		axises.select('.y-axis').selectAll('text')
			.styles("fill", "brown");
	}

	function renderSampleArea(svg, data, xScale) {

		// If there's many points, plot only a sub-sample, to avoid browser freeze
		var step = Math.ceil(data.length/MAXSAMPLEAREAPOINTS);

		var downSampleFilter = function(d, i) {
			return (i%step==0);
		};

		var scaleFilter = function(d) {
			return (d >= xScale.domain()[0] && d<=xScale.domain()[1]);
		};

		// So they don't overlap with existing vals
		var mean = meanVal + 0.00001;
		var median = medianVal + 0.00002;

		var feedData = data.filter(downSampleFilter).concat(mean, median).filter(scaleFilter);

		var samples = svg.selectAll(".bw-sample")
			.data(feedData, function(d) { return d; });

		samples.exit()
			.transition()
				.styles({
					"fill-opacity": 0,
					"stroke-opacity": 0
				})
				.remove();

		var sampleOpacity = Math.min(.3, 0.05*MAXSAMPLEAREAPOINTS/Math.min(feedData.length, MAXSAMPLEAREAPOINTS));

		samples.transition().duration(TRANSITION_DUR)
			.attr("x1", function(d) { return xScale(d); })
			.attr("x2", function(d) { return xScale(d); })
			.styles("stroke-opacity", function (d, i) { return (i<feedData.length-2 || (d!=mean && d!=median))?sampleOpacity:0.9; });

		var newSamples = samples.enter().append("line")
			.attr("class", "bw-sample")
			.attr("y1", GRAPH_H)
			.attr("y2", GRAPH_H + SAMPLE_AREA_H)
			.attr("x1", function(d) { return xScale(d); })
			.attr("x2", function(d) { return xScale(d); })
			.styles({
				"stroke": "blue",
				"stroke-width": 1,
				"stroke-opacity": 0,
				"shape-rendering": "crispEdges"
			});

		newSamples.transition().duration(TRANSITION_DUR/2)
			.styles("stroke-opacity", function (d,i) { return (i<feedData.length-2 || (d!=mean && d!=median))?sampleOpacity:0.9; });

		newSamples.filter(function(d,i) { return (i>=feedData.length-2 && (d==mean || d==median)); })
			.styles({
				stroke: function (d) { return d==mean?'brown':'darkorange'; },
				'stroke-width': 2,
				cursor: 'help'
			})
			.append('title').text(function(d) { return (d==mean?('Average Value: ' + Math.round(d,3)):('Median Value: ' + Math.round(d,3))) });
	}

	function renderHistogram(svg, data, xScale, yScale) {

		var dataFilter = function(d) {
			return (d.x0 >= xScale.domain()[0] && (d.x0+d.x1)<=xScale.domain()[1]);
		};

		var bars = svg.selectAll(".histo-bar")
			.data(data);

		bars.exit()
			.transition()
				.styles({
					"fill-opacity": 0,
					"stroke-opacity": 0
				})
				.remove();

	   bars.transition().duration(TRANSITION_DUR)
		  .attr("x", function(d) { return xScale(d.x0); })
		  .attr("y", function(d, i) { return yScale(d[i]); })
		  .attr("width", function(d) { return xScale(d.x0 + d.x1) - xScale(d.x0); })
		  .attr("height", function(d, i) { 
			  return GRAPH_H - yScale(d[i]); 
			});

		var newBars = bars.enter()
		  .append("rect")
		  .attr("class", "histo-bar");

		newBars
			.attr("rx", 1)
			.attr("ry", 1)
			.styles({
				"fill": "lightgrey",
				"fill-opacity": .3,
				"stroke": "brown",
				"stroke-opacity": .4,
				"shape-rendering": "crispEdges",
				"cursor": "crosshair"
			})
			.attr("x", function(d) { return xScale(d.x0); })
			.attr("width", function(d) {
				return xScale(d.x0 + d.x1) - xScale(d.x0); 
			})
			.attr("y", GRAPH_H)
			.attr("height", 0)
			.transition().duration(TRANSITION_DUR)
				.attr("y", function(d, i) { return yScale(d[i]); })
				.attr("height", function(d, i) { return GRAPH_H - yScale(d[i]); });


		newBars
			.on("mouseover", function() {
				d3.select(this)
					//.transition().duration(70)
					.styles({
						"stroke-opacity": .9,
						"fill-opacity": .7
					});
			})
			.on("mouseout", function() {
				d3.select(this)
					//.transition().duration(250)
					.styles({
						"stroke-opacity": .4,
						"fill-opacity": .3
					});
			});

		newBars.append('title');

		bars.select('title')
			.text(function(d, i) {
				return d.x0 + '-' + (d.x0+d.x1) + " bin: " + Math.round(d[i]*100,2) + "% (" + d.length + " samples)";
			});
	}

	function renderDensity(svg, data, xScale, yScale) {

		var dataFilter = function(d) {
			return (d[0] >= xScale.domain()[0] && d[0]<=xScale.domain()[1]);
		};

		var thisData = showDensity?data.slice(0):[];

		// Add termination points
		thisData.splice(0,0,[xScale.domain()[0],0]);
		thisData.push([xScale.domain()[1],0]);

		var line = d3.line()
			.x(function(d) { return xScale(d[0]); })
			.y(function(d) { return yScale(d[1]); })
			.curve(d3.curveBasis);

		var lines = svg.selectAll('.density-line')
			.data([thisData]);

		lines.enter()
			.append("path")
			.attr("class", "density-line")
			.styles({
				"fill": "blue",
				"fill-opacity": .13,
				"stroke": "none"
			});

		lines
		  //.datum(function(d) { return d; })
		  .transition().duration(TRANSITION_DUR)
			  .attr("d", line);
	}

	function renderCdf(svg, data, xScale, yScale) {

		var dataFilter = function(d) {
			return (d[0] >= xScale.domain()[0] && d[0]<=xScale.domain()[1]);
		};

		// CDF line
		var line = d3.line()
			.x(function(d) { return xScale(d[0]); })
			.y(function(d) { return yScale(d[1]); })
			.curve(d3.curveBasis);

		var lines = svg.selectAll('.cdf-line')
			.data([(showCdf?data:[])]);

		lines.enter()
			.append("path")
			.attr("class", "cdf-line")
			.styles({
				"fill": "none",
				"stroke": "green",
				"stroke-opacity": .4,
				"stroke-width": "2px"
			})
			.on("mouseover", function(event) {
				var coords= d3.pointer(event);
				var x = xScale.invert(coords[0]);
				var y = yScale.invert(coords[1]);

				d3.select(this).select('title')
					.text('<' + Math.round(x,2) + ': ' + Math.round(y*100, 2) + '%');

				d3.select(this)
					.transition()
					.styles({
						"stroke-width": "3px",
						"stroke-opacity": .9
					})
			})
			.on("mouseout", function() {
				svg.select('.cdf-line')
					.transition()
					.styles({
						"stroke-width": "2px",
						"stroke-opacity": .4
					})
			})
			.append('title');


		lines
		  .transition().duration(TRANSITION_DUR)
			.attr("d", line);
	}

	function redraw() {

		histogramData = getHistogram(data, histQ, logScaleBase);
		yScale = getYScale(histogramData, xScale.domain());

		renderContainer(svg, xScale, yScale, y2Scale);
		renderSampleArea(svg, data, xScale);
		renderDensity(svg, densityData, xScale, y2Scale);
		renderHistogram(svg, histogramData, xScale, yScale);
		renderCdf(svg, cdfData, xScale, y2Scale);
	}

	function redrawX() {

		yScale = getYScale(histogramData, xScale.domain());

		renderContainer(svg, xScale, yScale, y2Scale);
		renderSampleArea(svg, data, xScale);
		renderDensity(svg, densityData, xScale, y2Scale);
		renderHistogram(svg, histogramData, xScale, yScale);
		renderCdf(svg, cdfData, xScale, y2Scale);
	}

	var redrawNewBin = _.throttle(function (newQ) {
		histQ = newQ;
		histogramData = getHistogram(data, histQ, logScaleBase);
		yScale = getYScale(histogramData, xScale.domain());

		renderContainer(svg, xScale, yScale, y2Scale);
		renderHistogram(svg, histogramData, xScale, yScale);
	}, 200, { leading: false });

	function addControls ($elem) {

		//// Bin control
		var binStepper = $('<input>')
			.css('width', 100);

		// Linear/log scale
		var logRadio = $('<input type="radio" name="scaleType" value="' + LOGSCALEBASE + '">');
		var linearRadio = $('<input type="radio" name="scaleType" value="1">');

		(logScaleBase==1?linearRadio:logRadio).attr('checked', 'checked');

		var logAddedMult = $('<span>')
			.html(logScaleBase==1?'':'(*' + logScaleBase + '<sup>n</sup>)');

		var scaleRadio=$('<span>').append(
				$('<label>').append(linearRadio, ' Linear').css('cursor', 'pointer'),
				$('<label>').append(logRadio, ' Log scale').css({'cursor': 'pointer', 'margin-left': 5})
		).css('margin-left', 20);

		// CDF
		var cdfCb = $('<input type="checkbox">');

		if (showCdf)
			cdfCb.attr('checked', 'checked');

		// Density
		var densCb = $('<input type="checkbox">');

		if (showDensity)
			densCb.attr('checked', 'checked');

		$('<div>').appendTo($elem).append([
			$('<span>').append(
				$('<label>').append('Bin width:').css('margin-right', 5),
				binStepper,
				$('<span>').append(logAddedMult).css('margin-left', 3)
			).css('margin-left', 7),
			scaleRadio,
			$('<label>').append(densCb, ' Show density')
				.css({'cursor': 'pointer', 'margin-left': 25}),
			$('<label>').append(cdfCb, ' Show cdf')
				.css({'cursor': 'pointer', 'margin-left': 15})
		]).css({
			'text-align': 'center',
			'margin-top': 5
		});

		binStepper.slider({
			step: 0.1,
			max: 5,
			min: 0.1,
			value: HISTOGRAMQ,
			tooltip: 'always'
		}).on('change', function(e) {
			redrawNewBin(e.value.newValue);
		});

		$.each([linearRadio, logRadio], function() {
			$(this).change( function() {
				logScaleBase=parseInt($(this).val());
				logAddedMult.html(logScaleBase==1?'':'(*' + logScaleBase + '<sup>n</sup>)');
				xScale = getXScale(data, logScaleBase);
				setInitZoomLevel();
				redraw();
			})
		});

		cdfCb.change( function() {
			showCdf=this.checked;
			renderCdf(svg, cdfData, xScale, y2Scale);
			svg.select('.y2-axis')
				.transition().duration(TRANSITION_DUR)
				.styles('opacity', (showCdf?1:0));
		});

		densCb.change( function() {
			showDensity=this.checked;
			renderDensity(svg, densityData, xScale, y2Scale);
		});

	}

	var svg = d3.select($elem[0]).append("svg")
		.attr("width", SVG_W)
		.attr("height", SVG_H)
		.append('g')
			.attr("transform", "translate(" + AXIS_MARGIN + "," + AXIS_MARGIN + ")");

	var histQ=HISTOGRAMQ;
	var logScaleBase=1;  // use =LOGSCALEBASE to start as log scale
	var showCdf = SHOWCDF;
	var showDensity = SHOWDENSITY;
	//var zoomedPerc = $('<span>');

	var maxBwidth=d3.max(data);

	var xScale = null;
	var yScale = null;
	var y2Scale = null;
	var histogramData = null;
	var densityData = null;
	var cdfData = null;
	var meanVal = d3.mean(data);
	var medianVal = d3.median(data);

	addControls($elem);

	initStatic(svg);
	redraw();
}