let data =[], grouped;
// Get the data
let animations = [];
var margin = {top: 20, right: 20, bottom: 40, left: 80},
      width = 250,
      height = 250,
      radius = 4;
let xField = "Origin";
// let yField = "Miles_per_Gallon";
let yField = "Weight_in_lbs";
let yellow = "#EECA3B";
let orange = "#F58518";
let green  = '#54A24B';
let red = '#E45756';
let blue = "#4C78A8";
let purple = "#B279A2";
let grey = "#aaa";


function play(steps, i){
  console.log(new Date() - timeStamp);
  timeStamp = new Date();
  let done = genDone(steps[i].tracks, () => play(steps, i+1));
  steps[i].content(done, i);
}

function genDone(totalTracks ,next){
  let doneTracks = 0;
  return function () {
    doneTracks ++;
    if (doneTracks === totalTracks) {
      next();
    }
  };
}

function all(fn){
  svgs.forEach(svg => {
    let start = Date.now();
    let end = () => {
      console.log(Date.now() - start);
    };
    fn(svg, end);
  });
}

function grouping(data, keyField, valField, func){
  let grouped = d3.nest()
    .key(d => d[keyField]).sortKeys(d3.ascending)
    .sortValues( (a,b) => a[valField] - b[valField])
    .entries(data);
  grouped.forEach(group => {
    group.count = group.len = group.values.length;
    if(!!func) {
      func(group);
    }
  });
  return grouped;
}

function draw(elm, data, xField, yField, opt={width: 250, height: 250, margin: margin}){
  data = data.filter(d => d[xField] && d[yField]);
  // set the dimensions and margins of the graph

  // set the ranges
  let width = opt.width;
  let height = opt.height;
  let margin = opt.margin;

  let x = d3.scalePoint().range([0, width]).padding(0.5);
  let y = d3.scaleLinear().range([height, 0]);

  // Scale the range of the data
  x.domain(d3.map(data, d => d[xField]).keys());
  let extent = d3.extent(data, function(d) { return d[yField]; });
  y.domain(opt.yDomain || [Math.min(extent[0],0), extent[1]]).nice(5);

  let svg = d3.select(elm).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");
  let  grouped = d3.nest()
    .key(d => d[xField]).sortKeys(d3.ascending)
    .sortValues( (a,b) => a[yField] - b[yField])
    .entries(data);
  let xAxis = d3.axisBottom(x),
  yAxis = d3.axisLeft(y).ticks(5),
  yGrid = d3.axisLeft(y).ticks(5).tickFormat("").tickSize(-width);

  svg.append("g")
      .attr("class", "grid")
      .call(yGrid);
  // Add the X Axis
  svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .attr("class", "xAxis")
      .call(xAxis);

  // Add the Y Axis
  let yAxisG = svg.append("g")
      .attr("class", "yAxis")
      .call(yAxis);


  // Add the Y Axis title
  let yTitle = yAxisG.append("text")
      .attr("class", "axis-title")
      .attr("text-anchor", "middle")
      .attr("transform", "translate("+ (-margin.left + 10) +","+(height/2)+")rotate(-90)")
      .attr("fill", "#000")
      .text(opt.yTitle);



  let xTitle = svg.append("text")
      .attr("class", "axis-title")
      .attr("text-anchor", "middle")
      .attr("transform", "translate("+ (width/2) +","+(height + margin.bottom - 10)+")")
      .text(opt.xTitle);



  // Add the scatterplot
  let dotPlots = svg.selectAll(".dotPlot")
      .data(grouped, (d, i) => d.key);

  let circles = dotPlots
   .enter()
    .append("g")
    .attr("class", "dotPlot")
    .attr("transform", d => "translate(" + x(d.key) + ",0)")
    .selectAll("circle").data(d => d.values, (d, i) => "datum"+i);

  circles.enter().append("circle")
      .attr("class", "point")
      .attr("r", radius)
      .attr("cy", function(d) { return y(d[yField]); });





  var blurStable = '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 5 -7';
  var blurIn =     '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -11';
  var blurOut =    '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 15 -7';

  var filters = svg.append('defs')
        .selectAll('filter')
        .data(grouped)
       .enter().append('filter')
        .attr('id', function (d) { return 'gooeyCodeFilter-' + d.key; });

  filters.append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', '0.01')
      .attr('color-interpolation-filters', 'sRGB')
      .attr('result', 'blur');

  var blurValues = filters.append('feColorMatrix')
      .attr('class', 'blurValues')
      .attr('in', 'blur')
      .attr('mode', 'matrix')
      .attr('values', blurStable)
      .attr('result', 'gooey');

  filters.append('feBlend')
      .attr('in', 'SourceGraphic')
      .attr('in2', 'gooey');

  svg.blurValues = blurValues;
  svg.xField = xField;
  svg.yField = yField;
  svg.yGrid = yGrid;
  svg.x = x;
  svg.y = y;
  svg.yAxis = yAxis;
  svg.yTitle = yTitle;
  svg.plotOpt = opt;
  svg.postYTitle = opt.postYTitle;
  svg.xTitle = xTitle;
  svg.blurOut =blurOut;
  svg.blurIn = blurIn;
  svg.blurStable = blurStable;
  svg.data = data;
  return svg;
}

function drawHorizontally(elm, data, xField, yField, opt={width: 250, height: 250, margin: margin}){
  data = data.filter(d => d[yField] && d[xField]);
  data.forEach((d,i) => {
    d.id = i;
  });
  // set the dimensions and margins of the graph

  // set the ranges
  let width = opt.width;
  let height = opt.height;
  let margin = opt.margin;

  let x = d3.scaleLinear().range([0, width]);
  let y = d3.scalePoint().range([height, 0]).padding(0.5);

  // Scale the range of the data
  y.domain(d3.map(data, d => d[yField]).keys());

  let extent = d3.extent(data, function(d) { return d[xField]; });
  x.domain(opt.xDomain || [Math.min(extent[0],0), extent[1]]).nice(5);

  let svg = d3.select(elm).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  let plot = svg.append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");
  let  grouped = d3.nest()
    .key(d => d[yField]).sortKeys(d3.ascending)
    .sortValues( (a,b) => a[xField] - b[xField])
    .entries(data);
  // let yAxis = d3.axisLeft(y),
  xAxis = d3.axisBottom(x).ticks(5),
  xGrid = d3.axisBottom(x).ticks(5).tickFormat("").tickSize(-height);

  plot.append("g")
      .attr("class", "grid")
      .attr("transform", "translate(0,"+height+")")
      .call(xGrid);
  // Add the X Axis
  // plot.append("g")
  //     .attr("transform", "translate(0,0)")
  //     .attr("class", "yAxis")
  //     .call(yAxis);

  // Add the Y Axis
  let xAxisG = plot.append("g")
      .attr("transform", "translate(0,"+height+")")
      .attr("class", "xAxis")
      .call(xAxis);


  // Add the Y Axis title
  let xTitle = xAxisG.append("text")
      .attr("class", "axis-title")
      .attr("text-anchor", "middle")
      .attr("transform", "translate("+ (-margin.left + 10) +","+(height/2)+")rotate(-90)")
      .attr("fill", "#000")
      .text(opt.xTitle);



  let yTitle = plot.append("text")
      .attr("class", "axis-title")
      .attr("text-anchor", "middle")
      .attr("transform", "translate("+ (width/2) +","+(height + margin.bottom - 10)+")")
      .text(opt.yTitle);



  // Add the scatterplot
  let dotPlots = plot.selectAll(".dotPlot")
      .data(grouped, (d, i) => d.key);

  let circles = dotPlots
   .enter()
    .append("g")
    .attr("class", "dotPlot")
    .attr("transform", d => "translate(0," + y(d.key) + ")")
    .selectAll("circle").data(d => d.values, (d, i) => d.id);

  circles.enter().append("circle")
      .attr("class", "point")
      .attr("r", radius)
      .attr("cx", function(d) { return x(d[xField]); })
      .attr("cy", 0)
      .style("opacity", 0.7);


  svg.yField = yField;
  svg.xField = xField;
  svg.xGrid = xGrid;
  svg.x = x;
  svg.y = y;
  svg.xAxis = xAxis;
  svg.xTitle = xTitle;
  svg.plotOpt = opt;
  svg.postxTitle = opt.postxTitle;
  svg.yTitle = yTitle;

  svg.data = data;
  return svg;
}


function drawVertically(elm, data, xField, yField, opt={width: 250, height: 250, margin: margin}){
  data = data.filter(d => d[yField] && d[xField]);
  data.forEach((d,i) => {
    d.id = i;
  });
  // set the dimensions and margins of the graph

  // set the ranges
  let width = opt.width;
  let height = opt.height;
  let margin = opt.margin;

  let y = d3.scaleLinear().range([height, 0]);
  let x = d3.scalePoint().range([0, width]).padding(0.5);

  // Scale the range of the data
  x.domain(d3.map(data, d => d[xField]).keys());

  let extent = d3.extent(data, function(d) { return d[yField]; });
  y.domain(opt.yDomain || [Math.min(extent[0],0), extent[1]]).nice(5);

  let svg = d3.select(elm).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  let plot = svg.append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");
  let  grouped = d3.nest()
    .key(d => d[xField]).sortKeys(d3.ascending)
    .sortValues( (a,b) => a[yField] - b[yField])
    .entries(data);
  // let yAxis = d3.axisLeft(y),
  yAxis = d3.axisLeft(y).ticks(5),
  yGrid = d3.axisLeft(y).ticks(5).tickFormat("").tickSize(-width);

  plot.append("g")
      .attr("class", "grid")
      .attr("transform", "translate(0,0)")
      .call(yGrid);
  // Add the X Axis
  // plot.append("g")
  //     .attr("transform", "translate(0,0)")
  //     .attr("class", "yAxis")
  //     .call(yAxis);

  // Add the Y Axis
  let yAxisG = plot.append("g")
      .attr("transform", "translate(0,0)")
      .attr("class", "yAxis")
      .call(yAxis);


  // Add the Y Axis title
  let yTitle = yAxisG.append("text")
      .attr("class", "axis-title")
      .attr("text-anchor", "middle")
      .attr("transform", "translate("+ (-margin.left + 10) +","+(height/2)+")rotate(-90)")
      .attr("fill", "#000")
      .text(opt.yTitle);



  let xTitle = plot.append("text")
      .attr("class", "axis-title")
      .attr("text-anchor", "middle")
      .attr("transform", "translate("+ (width/2) +","+(height + margin.bottom - 10)+")")
      .text(opt.xTitle);



  // Add the scatterplot
  let dotPlots = plot.selectAll(".dotPlot")
      .data(grouped, (d, i) => d.key);

  let circles = dotPlots
   .enter()
    .append("g")
    .attr("class", "dotPlot")
    .attr("transform", d => "translate("+x(d.key)+",0)")
    .selectAll("circle").data(d => d.values, (d, i) => d.id);

  circles.enter().append("circle")
      .attr("class", "point")
      .attr("r", radius)
      .attr("cy", function(d) { return y(d[yField]); })
      .attr("cx", 0)
      .style("opacity", 0.7);


  svg.yField = yField;
  svg.xField = xField;
  svg.yGrid = yGrid;
  svg.x = x;
  svg.y = y;
  svg.yAxis = yAxis;
  svg.yTitle = yTitle;
  svg.plotOpt = opt;
  svg.postyTitle = opt.postyTitle;
  svg.xTitle = xTitle;

  svg.data = data;
  return svg;
}

function copy(o){
  return JSON.parse(JSON.stringify(o));
}

function randomSort(arr){
  return arr.map((d, i) => {
      return{ index: i, val: Math.random()};
    }).sort((a,b) => a.val - b.val)
      .map(d => arr[d.index]);
}