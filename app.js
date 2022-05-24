function mainCurve() {
    var HISTOGRAMQ = 1; // Default Q
    var LOGSCALEBASE = 2;
    var TRANSITION_DUR = 750; // ms

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

    var x = d3.scale.linear()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var line = d3.svg.line()
        .x(function(d) {
            return x(d.q);
        })
        .y(function(d) {
            return y(d.p);
        });

    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(d3.extent(data, function(d) {
        return d.q;
    }));
    y.domain(d3.extent(data, function(d) {
        return d.p;
    }));

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);

    function getData() {
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

    //taken from Jason Davies science library
    // https://github.com/jasondavies/science.js/
    function gaussian(x) {
        var gaussianConstant = 1 / Math.sqrt(2 * Math.PI),
            mean = 0,
            sigma = 1;

        x = (x - mean) / sigma;
        return gaussianConstant * Math.exp(-.5 * x * x) / sigma;
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
		  .attr("y", function(d) { return yScale(d.y); })
		  .attr("width", function(d) { return xScale(d.x + d.dx) - xScale(d.x); })
		  .attr("height", function(d) { return height - yScale(d.y); });

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
				.attr("y", function(d) { return yScale(d.y); })
				.attr("height", function(d) { 
                    var dHeight = height - yScale(d.y);
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

		bars.select('title')
			.text(function(d) {
				return d.x + ' bis ' + (d.x+d.dx) + ": " + d3.round(d.y*100,2) + "% (" + d.length + " samples)";
			});
	}

    function redraw() {
        histogramData = getHistogram(xData, histQ, logScaleBase);

        renderHistogram(svg, histogramData, x, y);
    }

    function getHistogram(data, q, logScaleBase) {
        var dataRange=[-5, 5];

        logScaleBase = (logScaleBase==null?1:logScaleBase);

        var base=1/logScaleBase;
        var expQ=Math.pow(q*Math.pow(base,4) , base);  // Incremental Q

        var points = [];
        for (var p = Math.pow(dataRange[0], base),len=Math.pow(dataRange[1], base); p<len; p+=expQ)
            points.push(d3.round(Math.pow(p,1/base), 2));

        points.push(d3.round(dataRange[1], 2));

        var histogram = d3.layout.histogram()
            .frequency(false)
            .bins(points);
        console.log(histogram(data));
        return histogram(data);
    }

    var histQ=HISTOGRAMQ;
    var logScaleBase=1;  // use =LOGSCALEBASE to start as log scale

    redraw();
}