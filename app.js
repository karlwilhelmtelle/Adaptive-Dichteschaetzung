function mainCurve($elem, inputData) {
    var HISTOGRAMQ = 1; // Default Q
    var LOGSCALEBASE = 2;
    var DENSQ = HISTOGRAMQ/8; // Smoothing of the density function, in value units
	if (inputData !== undefined) {
		DENSQ = 10;
	}
    var DENSNORM = 1; // Normalizing value of the densityfunction (0-1)
    var TRANSITION_DUR = 750; // ms
    var CDFQ = HISTOGRAMQ/8;
    var SHOWCDF = false; // Default value - show cdf function at startup
    var SHOWDENSITY = true; // Default value - show density function at startup

    //setting up empty data array
    var data = [];
    var xData = [];
    var yData = [];

    getData(); // popuate data 

    // line chart based on http://bl.ocks.org/mbostock/3883245
    var margin = {
            top: 20,
            right: 20,
            bottom: 30,
            left: 50
        },
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

	var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

	if (inputData === undefined) {
		x.domain(d3.extent(data, function(d) {
			return d.q;
		}));
		y.domain(d3.extent(data, function(d) {
			return d.p;
		}));
		var line = d3.svg.line()
			.x(function(d) {
				return x(d.q);
			})
			.y(function(d) {
				return y(d.p);
			});
		svg.append("path")
			.datum(data)
			.attr("class", "line")
			.attr("d", line);
	} else {
		x.domain([d3.min(xData) - 10, d3.max(xData) + 10]);
		y.domain([0, 0.1]);
	}

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    function getData() {
        if (inputData === undefined) {
			createGaussianData();
		} else {
			inputData.sort();
			xData = inputData;
		}
    }

	function createGaussianData() {
		// loop to populate data array with 
        // probabily - quantile pairs
        for (var i = 0; i < 1e5; i++) {
            q = normal();
            p = gaussian(q) // calc prob of rand draw
            el = {
                "q": q,
                "p": p
            }
            data.push(el)
        };

		// need to sort for plotting
        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
        data.sort(function(x, y) {
            return x.q - y.q;
        });

        data.forEach(function (el) {
            xData.push(el.q);
            yData.push(el.p);
        });
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

    function getDensityDistribution(data, q, xScale, normVal, maxPoints) {

		function getNumberOfSamplesInArea(x, radius, sample) {
			var sum = 0;
			var n = sample.length;
			for (var i = 0; i < n; i++) {
				var xVal = sample[i];
				var left = x - radius;
				var right = x + radius;
				if (xVal > right) {
					break;
				}
				if (xVal >= left && xVal <= right) {
					sum++;
				}
			}
			return sum;
		}

		function getScaleFromPosition(x, sample) {
			var samplesInArea = getNumberOfSamplesInArea(x, 1, sample);
			if (samplesInArea == 0) {
				scale = 2 * q;
			} else {
				scale = 0.5 * q / samplesInArea;
			}
			//console.log("x", x, "scale", scale);
			return scale;
		}

		function kernelDensityEstimator(kernelFunc, x) {
			return function(sample) {
				return x.map(function(x) {
					var scale = q;
					return [x, d3.mean(sample, function(v) {
						if (inputData !== undefined) {
							scale = getScaleFromPosition(v, sample);
						}
						return kernelFunc()((x - v) / scale) / scale; 
					})];
				});
			};
		}

		function epanechnikovKernel() {
			return function(u) {
				return Math.abs(u) <= 1 ? .75 * (1 - u * u) : 0;
			};
		}

		var valDomain=xScale.domain()[1] - xScale.domain()[0];
		var nrPoints = Math.min(Math.round(valDomain/q*4), maxPoints);
		nrPoints = Math.max(nrPoints, Math.round(valDomain));
		var points = xScale.ticks(nrPoints);

		var densityData = kernelDensityEstimator(epanechnikovKernel, points)(data);
		
		// Normalise
		var scaleFactor = 1//normVal/d3.max(densityData, function(d) { return d[1] });

		for (var i=0,len=densityData.length;i<len;i++)
			densityData[i][1]*=scaleFactor;

		// Add termination points
		densityData.splice(0,0,[0,0]);
		densityData.push([xScale.domain()[1],0]);
		return densityData;
	}

    function initStatic(svg) {
        var linScale = x;
        y2Scale = getY2Scale();

        densityData = getDensityDistribution(xData, DENSQ, linScale, DENSNORM/2, width*2);
        cdfData = getCdf(xData, CDFQ, linScale, 1, width/2);
    }

    // from http://bl.ocks.org/mbostock/4349187
    // Sample from a normal distribution with mean 0, stddev 1.
    function normal() {
        var x = 0,
            y = 0,
            rds, c;
        do {
            x = Math.random() * 2 - 1;
            y = Math.random() * 2 - 1;
            rds = x * x + y * y;
        } while (rds == 0 || rds > 1);
        c = Math.sqrt(-2 * Math.log(rds) / rds); // Box-Muller transform
        return x * c; // throw away extra sample y * c
    }

    var redrawNewBin = _.throttle(function (newQ) {
		histQ = newQ;
		histogramData = getHistogram(xData, histQ, logScaleBase);

		renderHistogram(svg, histogramData, x, y);
	}, 200, { leading: false });

    function addControls ($elem) {
		//// Bin control
		var binStepper = $('<input>')
			.css('width', 100);

		// Linear/log scale
        /*
		var logRadio = $('<input type="radio" name="scaleType" value="' + LOGSCALEBASE + '">');
		var linearRadio = $('<input type="radio" name="scaleType" value="1">');

		(logScaleBase==1?linearRadio:logRadio).attr('checked', 'checked');

		var logAddedMult = $('<span>')
			.html(logScaleBase==1?'':'(*' + logScaleBase + '<sup>n</sup>)');

		var scaleRadio=$('<span>').append(
				$('<label>').append(linearRadio, ' Linear').css('cursor', 'pointer'),
				$('<label>').append(logRadio, ' Log scale').css({'cursor': 'pointer', 'margin-left': 5})
		).css('margin-left', 20);
        */
		// CDF
		var cdfCb = $('<input type="checkbox">');

		if (showCdf)
			cdfCb.attr('checked', 'checked');

		// Density
		var densCb = $('<input type="checkbox">');

		if (showDensity)
			densCb.attr('checked', 'checked');

		var binWidthSpan = $('<span>');
		if (inputData === undefined) {
			binWidthSpan = $('<span>').append(
				$('<label>').append('Bin width:').css('margin-right', 5),
				binStepper/*,
				$('<span>').append(logAddedMult).css('margin-left', 3)*/
			).css('margin-left', 7);

			binStepper.slider({
				step: 0.1,
				max: 5,
				min: 0.1,
				value: HISTOGRAMQ,
				tooltip: 'always'
			}).on('change', function(e) {
				redrawNewBin(e.value.newValue);
			});
		} 
		
		
		$('<div>').appendTo($elem).append([
			binWidthSpan,
			//scaleRadio,
			$('<label>').append(densCb, ' Show density')
				.css({'cursor': 'pointer', 'margin-left': 25}),
			$('<label>').append(cdfCb, ' Show cdf')
				.css({'cursor': 'pointer', 'margin-left': 15})
		]).css({
			'text-align': 'center',
			'margin-top': 5
		});

        /*
		$.each([linearRadio, logRadio], function() {
			$(this).change( function() {
				logScaleBase=parseInt($(this).val());
				logAddedMult.html(logScaleBase==1?'':'(*' + logScaleBase + '<sup>n</sup>)');
				xScale = getXScale(data, logScaleBase);
				setInitZoomLevel();
				redraw();
			})
		});
        */
		cdfCb.change( function() {
			showCdf=this.checked;
			renderCdf(svg, cdfData, x, y2Scale);
			svg.select('.y2-axis')
				.transition().duration(TRANSITION_DUR)
				.style('opacity', (showCdf?1:0));
		});

		densCb.change( function() {
			showDensity=this.checked;
			renderDensity(svg, densityData, x, y);
		});

	}

    //taken from Jason Davies science library
    // https://github.com/jasondavies/science.js/
    function gaussian(x) {
        var gaussianConstant = 1 / Math.sqrt(2 * Math.PI),
            mean = 0,
            sigma = 1;

        x = (x - mean) / sigma;
        return gaussianConstant * Math.exp(-.5 * x * x) / sigma;
    }

    function getY2Scale() {
		return d3.scale.linear()
			.domain([0, 1])
			.range([height, 0]);
	}

    function renderCdf(svg, data, xScale, yScale) {

		var dataFilter = function(d) {
			return (d[0] >= xScale.domain()[0] && d[0]<=xScale.domain()[1]);
		};

		// CDF line
		var line = d3.svg.line()
			.x(function(d) { return xScale(d[0]); })
			.y(function(d) { return yScale(d[1]); })
			.interpolate("basis");

		var lines = svg.selectAll('.cdf-line')
			.data([(showCdf?data:[])]);

		lines.enter()
			.append("path")
			.attr("class", "cdf-line")
			.style({
				"fill": "none",
				"stroke": "green",
				"stroke-opacity": .4,
				"stroke-width": "2px"
			})
			.on("mouseover", function() {
				var coords= d3.mouse(this);
				var x = xScale.invert(coords[0]);
				var y = yScale.invert(coords[1]);

				d3.select(this).select('title')
					.text('<' + d3.round(x,2) + ': ' + d3.round(y*100, 2) + '%');

				d3.select(this)
					.transition()
					.style({
						"stroke-width": "3px",
						"stroke-opacity": .9
					})
			})
			.on("mouseout", function() {
				svg.select('.cdf-line')
					.transition()
					.style({
						"stroke-width": "2px",
						"stroke-opacity": .4
					})
			})
			.append('title');


		lines
		  .transition().duration(TRANSITION_DUR)
			.attr("d", line);
	}

    function renderDensity(svg, data, xScale, yScale) {

		var dataFilter = function(d) {
			return (d[0] >= xScale.domain()[0] && d[0]<=xScale.domain()[1]);
		};

		var thisData = showDensity?data.slice(0):[];

		// Add termination points
		thisData.splice(0,0,[xScale.domain()[0],0]);
		thisData.push([xScale.domain()[1],0]);

		var line = d3.svg.line()
			.x(function(d) { return xScale(d[0]); })
			.y(function(d) { return yScale(d[1]); })
			.interpolate("basis");

		var lines = svg.selectAll('.density-line')
			.data([thisData]);

		lines.enter()
			.append("path")
			.attr("class", "density-line")
			.style({
				"fill": "blue",
				"fill-opacity": .13,
				"stroke": "none"
			});

		lines
		  //.datum(function(d) { return d; })
		  .transition().duration(TRANSITION_DUR)
			  .attr("d", line);
	}

    function renderHistogram(svg, data, xScale, yScale) {
		var dataFilter = function(d) {
			return (d.x >= xScale.domain()[0] && (d.x+d.dx)<=xScale.domain()[1]);
		};

		var bars = svg.selectAll(".histo-bar")
			.data(data);

		bars.exit()
			.transition()
				.style({
					"fill-opacity": 0,
					"stroke-opacity": 0
				})
				.remove();

	   bars.transition().duration(TRANSITION_DUR)
		  .attr("x", function(d) { return xScale(d.x); })
		  .attr("y", function(d) { return yScale(d.y / d.dx); })
		  .attr("width", function(d) { return xScale(d.x + d.dx) - xScale(d.x); })
		  .attr("height", function(d) {
                var dHeight = height - yScale(d.y);
				dHeight /= d.dx;
                return Math.max(0, dHeight); 
            });

		var newBars = bars.enter()
		  .append("rect")
		  .attr("class", "histo-bar");

		newBars
			.attr("rx", 1)
			.attr("ry", 1)
			.style({
				"fill": "lightgrey",
				"fill-opacity": .3,
				"stroke": "brown",
				"stroke-opacity": .4,
				"shape-rendering": "crispEdges",
				"cursor": "crosshair"
			})
			.attr("x", function(d) { return xScale(d.x); })
			.attr("width", function(d) { return xScale(d.x + d.dx) - xScale(d.x); })
			.attr("y", height)
			.attr("height", 0)
			.transition().duration(TRANSITION_DUR)
				.attr("y", function(d) { return yScale(d.y / d.dx); })
				.attr("height", function(d) {
                    var dHeight = height - yScale(d.y);
					dHeight /= d.dx;
                    return Math.max(0, dHeight); 
                });


		newBars
			.on("mouseover", function() {
				d3.select(this)
					//.transition().duration(70)
					.style({
						"stroke-opacity": .9,
						"fill-opacity": .7
					});
			})
			.on("mouseout", function() {
				d3.select(this)
					//.transition().duration(250)
					.style({
						"stroke-opacity": .4,
						"fill-opacity": .3
					});
			});

		newBars.append('title');
		var sqrtN = d3.round(Math.sqrt(xData.length));
		var percentage = d3.round(100 * sqrtN / xData.length, 2);
		bars.select('title')
			.text(function(d) {
				if (inputData === undefined) {
					percentage = d3.round(d.y*100,2);
				}
				return d.x + ' bis ' + (d.x+d.dx) + ": " + 
				percentage + "% (" + d.length + " Sample)";
			});
	}

    function redraw() {
		var histogramData;
		if (inputData === undefined) {
			histogramData = getHistogram(xData, histQ, logScaleBase);
		} else {
			histogramData = getAdaptiveHistogram(xData);
		}

		renderDensity(svg, densityData, x, y);
		renderHistogram(svg, histogramData, x, y);
        renderCdf(svg, cdfData, x, y2Scale);
    }

    function getHistogram(data, q, logScaleBase) {
		var dataRange;
		if (inputData === undefined) {
			dataRange=[-5, 5];
		} else {
			dataRange = [d3.min(data) - 10, d3.max(data) + 10];
		}
		logScaleBase = (logScaleBase==null?1:logScaleBase);

		var base=1/logScaleBase;
		var expQ=Math.pow(q*Math.pow(base,4) , base);  // Incremental Q

		var points = [];
		for (var p = Math.pow(dataRange[0], base),len=Math.pow(dataRange[1], base); p<len; p+=expQ)
			points.push(d3.round(Math.pow(p,1/base), 2));

		points.push(d3.round(dataRange[1], 2));

		histogram = d3.layout.histogram()
			.frequency(false)
			.bins(points);
			
        return histogram(data);
	}
	
	function getAdaptiveHistogram(data) {
		var n = data.length;
		var sqrtN = Math.round(Math.sqrt(n));
		
		var points = [];

		for (var i = 0; i < n; i += sqrtN) {
			var x = data[i];
			var x2 = data[Math.min(i + sqrtN, n - 1)];
			var dx = x2 - x;
			var y = 1 / sqrtN;
			points.push({
				x: x,
				dx: dx,
				y: y,
				length: sqrtN
			});
		}
		console.log(points);
		return points;
	}

    var histQ=HISTOGRAMQ;
    var logScaleBase=1;  // use =LOGSCALEBASE to start as log scale
    var showCdf = SHOWCDF;
    var showDensity = SHOWDENSITY;
    var densityData = null;
	var cdfData = null;
    var y2Scale = null;

    initStatic(svg);
    addControls($elem);
    redraw();
}