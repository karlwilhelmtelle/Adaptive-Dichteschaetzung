var dataArray = {
    x: [-8, -6, -4, -2, 0, 2, 4, 6, 8],
    y: [99, 610, 1271, 1804, 1823, 1346, 635, 125, 24]
};

var data = [];
for (var i = 0; i < dataArray.x.length; i++) {
    data[i] = { x: dataArray.x[i], y: dataArray.y[i] };
}
console.log(data);

var width = 600,
    height = 500,
    spacing = 120;

var svg = d3.select("body")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + spacing/2 + "," + spacing/2 + ")");

var xScale = d3.scaleLinear()
                .domain([d3.min(dataArray.x) - 1, d3.max(dataArray.x) + 1])
                .range([0, width - spacing]);

var yScale = d3.scaleLinear()
                .domain([0, d3.max(dataArray.y)])
                .range([height - spacing, 0]);

var xAxis = d3.axisBottom(xScale);
var yAxis = d3.axisLeft(yScale);

svg.append("g")
    .attr("transform", "translate(0," + (height - spacing) + ")")
    .call(xAxis);

svg.append("g").call(yAxis);

var dots = svg.append("g")
                .selectAll("dot")
                .data(data);

dots.enter()
    .append("circle")
    .attr("cx", function (d) { 
        return xScale(d.x); 
    })
    .attr("cy", function (d) {
        return yScale(d.y); 
    })
    .attr("r", 5)
    .style("fill", "red");