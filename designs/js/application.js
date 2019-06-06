// application.js
function boxplot(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let plot = svg.select("g");
  let dotPlots = plot.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let grouped = grouping(data, xField, yField, (group)=>{

    group.median = d3.median(group.values, v => v[yField]);
    group.Q1 = d3.quantile(group.values, 0.25, v => v[yField]);
    group.Q3 = d3.quantile(group.values, 0.75, v => v[yField]);
    group.medianIndex = (group.values.length - 1) / 2;
    group.Q1Index = group.values.filter( v=> v[yField] < group.Q1).length - 1;
    group.Q3Index = group.values.filter( v=> v[yField] < group.Q3).length - 1;
    group.boxMax = group.Q3 + 1.5*(group.Q3 - group.Q1);
    group.boxMin = group.Q1 - 1.5*(group.Q3 - group.Q1);
  });
  let map = d3.map(grouped, d=>d.key);
  let totalCount = d3.sum(grouped, g => g.len);

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");
  let shift = 30;

  let color = (d, i) => {
    return map.get(d[xField]).Q1Index >= i ? red :
      (map.get(d[xField]).Q1Index < i && Math.floor(map.get(d[xField]).medianIndex) >= i ? blue :
      (map.get(d[xField]).medianIndex < i && map.get(d[xField]).Q3Index >= i ? orange : green));
  };
  let cx = (d,i) => {
    let g = map.get(d[xField]);
    let shiftPadded = 0.9*shift;
    return g.Q1Index >= i ? -shiftPadded/2 :
      (g.Q1Index < i && Math.floor(g.medianIndex) >= i ? -shiftPadded/6 :
      (g.medianIndex < i && g.Q3Index >= i ? shiftPadded/6 : shiftPadded/2));
  };
  let box = newDotPlots.append("rect")
    .attr("x",   - shift/2)
    .attr("width", shift)
    .attr("y", d => y(d.median))
    .attr("height", 0)
    .style("opacity", 0);

  let linesMedian = newDotPlots
            .append("line")
            .attr("x1", - shift/2)
            .attr("x2", shift/2)
            .attr("y1", (d,i) => y(d.median))
            .attr("y2", (d,i) => y(d.median))
            .style("stroke-opacity", 0);

  let linesQ1 = newDotPlots
            .append("line")
            .attr("x1", - shift/2)
            .attr("x2", shift/2)
            .attr("y1", (d,i) => y(d.Q1))
            .attr("y2", (d,i) => y(d.Q1))
            .style("stroke-opacity", 0);

  let linesQ3 = newDotPlots
            .append("line")
            .attr("x1", - shift/2)
            .attr("x2", shift/2)
            .attr("y1", (d,i) => y(d.Q3))
            .attr("y2", (d,i) => y(d.Q3))
            .style("stroke-opacity", 0);

  let topWhisker = newDotPlots
            .append("line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", (d,i) => y(d.median))
            .attr("y2", (d,i) => y(d.median))
            .style("stroke-opacity", 1);
  let botWhisker = newDotPlots
            .append("line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", (d,i) => y(d.median))
            .attr("y2", (d,i) => y(d.median))
            .style("stroke-opacity", 1);

  let boxPlotMax = newDotPlots
            .append("line")
            .attr("x1", - shift/2)
            .attr("x2", shift/2)
            .attr("y1", (d,i) => y(d.boxMax))
            .attr("y2", (d,i) => y(d.boxMax))
            .attr("r", radius)
            .style("stroke-opacity", 0);
  let boxPlotMin = newDotPlots
            .append("line")
            .attr("x1", - shift/2)
            .attr("x2", shift/2)
            .attr("y1", (d,i) => y(d.boxMin))
            .attr("y2", (d,i) => y(d.boxMin))
            .attr("r", radius)
            .style("stroke-opacity", 0);


  let steps = [
    {
      tracks: totalCount,
      content: (done) => {
        let stepInterval = interval * 0.2;
        dotPlots.exit().selectAll(".point")
         .transition()
          .duration(stepInterval)
          .style("stroke", color)
          .style("fill", color)
          .attr("cx", cx)
          .on("end", done);

      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        let stepInterval = interval * 0.2;
        let stepDelay = interval * 0;

        linesMedian
         .transition()
          .delay(stepDelay)
          .duration(stepInterval)
          .style("stroke-opacity", 1)

        linesQ1
         .transition()
          .delay(stepDelay)
          .duration(stepInterval)
          .style("stroke-opacity", 1)
          .on("end", done);

        linesQ3
         .transition()
          .delay(stepDelay)
          .duration(stepInterval)
          .style("stroke-opacity", 1)

      }
    },
    {
      tracks: grouped.length*7 + 1,
      content: (done) => {
        let stepInterval = interval * 0.2;
        let stepDelay = interval * 0.15;

        box
          .style("opacity", 0.7)
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .attr("y", d => y(d.Q3))
          .attr("height", d => Math.abs(y(d.Q3) - y(d.Q1)))
          .on("end", done);

        // dotPlots.exit().selectAll(".point")
        //  .transition()
        //   .duration(stepInterval)
        //   .delay(stepDelay)
        //   .style("opacity", 0)
        //   .remove();

        svg.select(".yAxis .axis-title")
            .attr("opacity", 1)
           .transition()
            .delay(stepDelay )
            .duration((stepInterval)/2)
            .attr("opacity", 0)
           .transition()
            .duration((stepInterval)/2)
            .attr("opacity", 1)
            .text(svg.postYTitle)
            .on("end", done);


        linesQ3.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 0)
          .on("end", done)
          .remove();

        linesQ1.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 0)
          .on("end", done)
          .remove();

        topWhisker.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .attr("y1", (d,i) => y(d.Q3))
          .attr("y2", (d,i) => y(d.boxMax))
          .on("end", done);
        botWhisker.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .attr("y1", (d,i) => y(d.Q1))
          .attr("y2", (d,i) => y(d.boxMin))
          .on("end", done);

        boxPlotMax.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 1)
          .on("end", done);

        boxPlotMin.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 1)
          .on("end", done);

      }
    },

    {
      tracks: totalCount,
      content: (done) => {
        let stepInterval = interval * 0.15;
        let stepDelay = interval * 0.1;
        dotPlots.exit().selectAll(".point")
         .filter((d,i) => d[yField] <= map.get(d[xField]).boxMax && d[yField] >= map.get(d[xField]).boxMin)
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("opacity", 0)
          .on("end", done)
          .remove();

        dotPlots.exit().selectAll(".point")
         .filter((d,i) => d[yField] > map.get(d[xField]).boxMax || d[yField] < map.get(d[xField]).boxMin)
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke", blue)
          .style("fill", blue)
          .attr("cx", 0)
          .on("end", done);
      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        cb();
      }
    }
  ];


  play(steps,0);
}

function histogram(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 2000;
  let x = svg.x;
  let xField = svg.xField;
  let yField = svg.yField;
  let height = opt.height || 250;
  let margin = opt.margin || svg.plotOpt.margin;

  let histogram = d3.histogram()
    .domain(x.domain())
    .thresholds(x.ticks(opt.count || 10))
    .value(d => d[xField]);
  let bins = histogram(data).filter(b => b.x0 !== b.x1);
  bins.forEach((b, binN) => {
    b.forEach((d, i) => {
      d.binNum = binN;
      d.inID = i;
    });
  });


  // console.log(bins);

  let newX = d3.scalePoint()
    .range([0, width])
    .padding(0.5)
    .domain(bins.map((d,i) => i));

  let y = d3.scaleLinear()
    .range([height, 0])
    .domain(d3.extent(bins, b => b.length))
    .nice(5);


  let plot = svg.select("g");
  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");
  let newXGrid = d3.axisBottom(newX).ticks(5).tickFormat("").tickSize(-height);
  let yAxis = d3.axisLeft(y).ticks(5);

  let yGrid = d3.axisLeft(y).ticks(5).tickFormat("").tickSize(-width);
  let yGridG = plot.append("g")
      .attr("class", "yGrid")
      .call(yGrid)
      .style("opacity", 0);


  let boxes = plot.selectAll("rect").data(bins).enter()
   .append("rect")
    .attr("class", "box")
    .attr("x", d => x(d.x0)+1)
    .attr("width", d => x(d.x1) - x(d.x0)-1)
    .style("fill", blue)
    .attr("height", d => y(0)-y(d.length))
    .attr("y", d => y(d.length))
    .style("opacity", 0);

  let yAxisG =plot.append("g")
      .attr("transform", "translate(0,0)")
      .attr("class", "yAxis")
      .call(yAxis);
  yAxisG.style("opacity", 0);



  let steps = [
    {
      tracks: data.length+5,
      content: (done) => {
        let stepInterval = interval * 0.4;

        svg.transition()
        .duration(stepInterval)
          .attr("height", height + margin.top + margin.bottom)

          .on("end", done);

        plot.transition()
        .duration(stepInterval)
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

          .on("end", done);

        svg.selectAll(".grid").transition()
          .duration(stepInterval)
          .attr("transform", `translate(0,${height})`)
          .style("opacity", 0)
          .call(newXGrid)
          .on("end", done)
          .remove();

        svg.selectAll(".xAxis").transition()
          .duration(stepInterval)
          .attr("transform", `translate(0,${height})`)
          .on("end", done);

        dotPlots.transition()
          .duration(stepInterval)
          .attr("transform", "translate(0,0)")
          .on("end", done);

        dots.transition()
          .duration(stepInterval)
          .attr("cx", d => newX(d.binNum))
          .attr("cy", d => y(d.inID)-radius)
          .on("end", done);

      }
    },
    {
      tracks: 2,
      content: (done) => {
        let stepDelay = 0.15 * interval;
        let stepInterval = 0.15 * interval;
        yAxisG.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("opacity", 1)
          .on("end", done);

        yGridG.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("opacity", 1)
          .on("end", done);
      }
    },
    {
      tracks: bins.length,
      content: (done) => {
        let stepDelay = 0.15 * interval;
        let stepInterval = 0.15 * interval;
        boxes.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .attr("height", d => y(0)-y(d.length))
          .attr("y", d => y(d.length))
          .style("opacity", 1)
          .on("end", done);
      }
    },
    {
      tracks: 1,
      content: (done) => {
        cb();
      }
    }
  ];

  play(steps,0);
  //build y axis
  //bin x range

}

function bootstrap(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 2000;
  let x = svg.x;
  let xField = svg.xField;
  let yField = svg.yField;
  let height = opt.height || 250;
  let margin = opt.margin || svg.plotOpt.margin;


  let plot = svg.select("g");
  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  sampledMeans = [];
  for (var i = 0; i < 100; i++) {
    sampledData = data.filter(d => d["sampled_"+i]);

    sampledMean = sampledData.reduce((acc, curr) => {
        acc += curr[xField] * curr["sampled_"+i];
        return acc;
      }, 0) / data.length;
    sampledMeans.push(sampledMean);
  }
  let meanMean = d3.mean(sampledMeans);
  let meanStdev = d3.deviation(sampledMeans);


  let dotsSample0 = dotPlots.selectAll(".point-sample1")
    .data(data.filter(d => d.sampled_0)).enter()
     .append("circle")
     .attr("cx", d => x(d[xField]))
     .attr("cy", d => 0)
     .attr("r", radius)
     .style("fill", grey)
     .style("opacity", 0);

  let sampleMean0Line = dotPlots
     .append("line")
     .attr("x1", d => x(sampledMeans[0]))
     .attr("x2", d => x(sampledMeans[0]))
     .attr("y1", -20)
     .attr("y2", -10)
     .style("opacity", 0);



  let dotsSample1 = dotPlots.selectAll(".point-sample1")
    .data(data.filter(d => d.sampled_1)).enter()
     .append("circle")
     .attr("cx", d => x(d[xField]))
     .attr("cy", d => 0)
     .attr("r", radius)
     .style("fill", grey)
     .style("opacity", 0);
 let sampleMean1Line = dotPlots
     .append("line")
     .attr("x1", d => x(sampledMeans[1]))
     .attr("x2", d => x(sampledMeans[1]))
     .attr("y1", -20)
     .attr("y2", -10)
     .style("opacity", 0);


  let sampleMeanPoints = dotPlots.selectAll(".point-sample-mean")
    .data(sampledMeans)
   .enter()
    .append("circle")
     .attr("class", "point-sample-mean")
     .attr("cx", d => x(d))
     .attr("cy", 0)
     .attr("cy", -15)
     .attr("r", radius)
     .style("fill", grey)
     .style("opacity", 0);

  let sampleMean0Point = sampleMeanPoints.filter((d,i) => i===0);
  let sampleMean1Point = sampleMeanPoints.filter((d,i) => i===1);

  let sampleMeanCI = dotPlots.append("line")
     .attr("x1", d => x(meanMean))
     .attr("x2", d => x(meanMean))
     .attr("y1", -15)
     .attr("y2", -15)
     .style("opacity", 0);
  let sampleMeanMeanPoint = dotPlots.append("circle")
     .attr("cx", d => x(meanMean))
     .attr("cy", -15)
     .attr("r", radius)
     .style("fill", orange)
     .style("opacity", 0);

  let steps = [
    {
      tracks: dotsSample0.data().length + 2,
      content: (done) => {
        let stepInterval = interval * 0.4;

        dotsSample0.transition()
          .duration(stepInterval/3)
          .attr("cy", -15)
          .style("opacity", 0.2)
         .transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .attr("cx", x(sampledMeans[0]))
          .on("end",done)
          .remove();

        sampleMean0Line.transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .style("opacity", 1)
         .transition()
          .duration(stepInterval/3)
          .style("opacity", 0)
          .on("end",done)
          .remove();

        sampleMean0Point.transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .style("opacity", 0.7)
          .style("fill", orange)
          .on("end",done);
      }
    },
    {
      tracks: dotsSample1.data().length + 2,
      content: (done) => {
        let stepInterval = interval * 0.4;

        dotsSample1.transition()
          .duration(stepInterval/3)
          .attr("cy", -15)
          .style("opacity", 0.2)
         .transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .attr("cx", x(sampledMeans[1]))
          .on("end",done)
          .remove();

        sampleMean1Line.transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .style("opacity", 1)
         .transition()
          .duration(stepInterval/3)
          .style("opacity", 0)
          .on("end",done)
          .remove();

        sampleMean1Point.transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .style("opacity", 0.7)
          .style("fill", orange)
          .on("end",done);

      }
    },
    {
      tracks: sampleMeanPoints.data().length,
      content: (done) => {
        let stepInterval = interval * 0.2;

        sampleMeanPoints.transition()
          .duration(stepInterval)
          .delay((d,i) => stepInterval*i/sampleMeanPoints.data().length + stepInterval/2)
          .attr("cy", -15)
          .style("opacity", 0.7)
          .style("fill", orange)
          .on("end",done);


      }
    },
    {
      tracks: sampleMeanPoints.data().length + 2,
      content: (done) => {
        let stepInterval = interval * 0.4;

        sampleMeanPoints.transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .attr("cx", x(meanMean))
          .on("end",done)
          .remove();

        sampleMeanMeanPoint.transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .style("opacity", 1)
          .on("end",done);

        sampleMeanCI.style("opacity", 1)
         .transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .attr("x1", x(meanMean-meanStdev*1.96))
          .attr("x2", x(meanMean+meanStdev*1.96))
          .on("end",done);
      }
    },
    {
      tracks: 2 + data.length,
      content: (done) => {
        let stepInterval = interval * 0.4;

        sampleMeanMeanPoint.transition()
          .delay(stepInterval/2)
          .duration(stepInterval/2)
          .attr("cy", 0)
          .style("fill", blue)
          .on("end",done);

        sampleMeanCI
         .transition()
          .delay(stepInterval/2)
          .duration(stepInterval/2)
          .attr("y1", 0)
          .attr("y2", 0)
          .on("end",done);

        dotPlots.selectAll(".point").transition()
          .delay(stepInterval/2)
          .duration(stepInterval/2)
          .attr("cy", 15)
          .style("opacity", 0)
          .on("end", done);
      }
    },
    {
      tracks: 1,
      content: (done) => {
        cb();
      }
    }
  ];

  play(steps,0);
  //build y axis
  //bin x range

}

function bootstrapY(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 2000;
  let y = svg.y;
  let yField = svg.yField;
  let xField = svg.xField;
  let height = opt.height || 250;
  let margin = opt.margin || svg.plotOpt.margin;


  let plot = svg.select("g");
  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  sampledMeans = [];
  for (var i = 0; i < 100; i++) {
    sampledData = data.filter(d => d["sampled_"+i]);

    sampledMean = sampledData.reduce((acc, curr) => {
        acc += curr[yField] * curr["sampled_"+i];
        return acc;
      }, 0) / data.length;
    sampledMeans.push(sampledMean);
  }
  let meanMean = d3.mean(sampledMeans);
  let meanStdev = d3.deviation(sampledMeans);


  let dotsSample0 = dotPlots.selectAll(".point-sample1")
    .data(data.filter(d => d.sampled_0)).enter()
     .append("circle")
     .attr("cy", d => y(d[yField]))
     .attr("cx", d => 0)
     .attr("r", radius)
     .style("fill", grey)
     .style("opacity", 0);

  let sampleMean0Line = dotPlots
     .append("line")
     .attr("y1", d => y(sampledMeans[0]))
     .attr("y2", d => y(sampledMeans[0]))
     .attr("x1", 20)
     .attr("x2", 10)
     .style("opacity", 0);



  let dotsSample1 = dotPlots.selectAll(".point-sample1")
    .data(data.filter(d => d.sampled_1)).enter()
     .append("circle")
     .attr("cy", d => y(d[yField]))
     .attr("cx", d => 0)
     .attr("r", radius)
     .style("fill", grey)
     .style("opacity", 0);
 let sampleMean1Line = dotPlots
     .append("line")
     .attr("y1", d => y(sampledMeans[1]))
     .attr("y2", d => y(sampledMeans[1]))
     .attr("x1", 20)
     .attr("x2", 10)
     .style("opacity", 0);


  let sampleMeanPoints = dotPlots.selectAll(".point-sample-mean")
    .data(sampledMeans)
   .enter()
    .append("circle")
     .attr("class", "point-sample-mean")
     .attr("cy", d => y(d))
     .attr("cx", 0)
     .attr("cx", 15)
     .attr("r", radius)
     .style("fill", grey)
     .style("opacity", 0);

  let sampleMean0Point = sampleMeanPoints.filter((d,i) => i===0);
  let sampleMean1Point = sampleMeanPoints.filter((d,i) => i===1);

  let sampleMeanCI = dotPlots.append("line")
     .attr("y1", d => y(meanMean))
     .attr("y2", d => y(meanMean))
     .attr("x1", 15)
     .attr("x2", 15)
     .style("opacity", 0);
  let sampleMeanMeanPoint = dotPlots.append("circle")
     .attr("cy", d => y(meanMean))
     .attr("cx", 15)
     .attr("r", radius)
     .style("fill", orange)
     .style("opacity", 0);

  let steps = [
    {
      tracks: dotsSample0.data().length + 2,
      content: (done) => {
        let stepInterval = interval * 0.4;

        dotsSample0.transition()
          .duration(stepInterval/3)
          .attr("cx", 15)
          .style("opacity", 0.2)
         .transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .attr("cy", y(sampledMeans[0]))
          .on("end",done)
          .remove();

        sampleMean0Line.transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .style("opacity", 1)
         .transition()
          .duration(stepInterval/3)
          .style("opacity", 0)
          .on("end",done)
          .remove();

        sampleMean0Point.transition()
          .delay(stepInterval*2/3)
          .duration(stepInterval/3)
          .style("opacity", 0.7)
          .style("fill", orange)
          .on("end",done);
      }
    },
    {
      tracks: dotsSample1.data().length + 2,
      content: (done) => {
        let stepInterval = interval * 0.4;

        dotsSample1.transition()
          .duration(stepInterval/3)
          .attr("cx", 15)
          .style("opacity", 0.2)
         .transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .attr("cy", y(sampledMeans[1]))
          .on("end",done)
          .remove();

        sampleMean1Line.transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .style("opacity", 1)
         .transition()
          .duration(stepInterval/3)
          .style("opacity", 0)
          .on("end",done)
          .remove();

        sampleMean1Point.transition()
          .delay(stepInterval*2/3)
          .duration(stepInterval/3)
          .style("opacity", 0.7)
          .style("fill", orange)
          .on("end",done);

      }
    },
    {
      tracks: sampleMeanPoints.data().length,
      content: (done) => {
        let stepInterval = interval * 0.2;

        sampleMeanPoints.transition()
          .duration(stepInterval)
          .delay((d,i) => stepInterval*i/sampleMeanPoints.data().length + stepInterval/2)
          .attr("cx", 15)
          .style("opacity", 0.7)
          .style("fill", orange)
          .on("end",done);


      }
    },
    {
      tracks: sampleMeanPoints.data().length + 2,
      content: (done) => {
        let stepInterval = interval * 0.4;

        sampleMeanPoints.transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .attr("cy", y(meanMean))
          .on("end",done)
          .remove();

        sampleMeanMeanPoint.transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .style("opacity", 1)
          .on("end",done);

        sampleMeanCI.style("opacity", 1)
         .transition()
          .delay(stepInterval/3)
          .duration(stepInterval/3)
          .attr("y1", y(meanMean-meanStdev*1.96))
          .attr("y2", y(meanMean+meanStdev*1.96))
          .on("end",done);
      }
    },
    {
      tracks: 2 + data.length,
      content: (done) => {
        let stepInterval = interval * 0.4;

        sampleMeanMeanPoint.transition()
          .delay(stepInterval/2)
          .duration(stepInterval/2)
          .attr("cx", 0)
          .style("fill", blue)
          .on("end",done);

        sampleMeanCI
         .transition()
          .delay(stepInterval/2)
          .duration(stepInterval/2)
          .attr("x1", 0)
          .attr("x2", 0)
          .on("end",done);

        dotPlots.selectAll(".point").transition()
          .delay(stepInterval/2)
          .duration(stepInterval/2)
          .attr("cx", -15)
          .style("opacity", 0)
          .on("end", done);
      }
    },
    {
      tracks: 1,
      content: (done) => {
        cb();
      }
    }
  ];

  play(steps,0);
  //build y axis
  //bin x range

}