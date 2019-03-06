
function count(svg, opt, cb){
  let interval = opt.interval || 1000;
  let data = svg.data;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;
  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");
  let height = svg.plotOpt.height;
  let width = svg.plotOpt.width;
  let grouped = grouping(data, xField, yField, (g)=>{
    g.dotCount = 0;
    g.stepCount = 0;
    g.values.forEach((d, i) => d.__i = i);
  });
  let map = d3.map(grouped, d=>d.key);

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");

  let maxCount = d3.max(grouped, d => d.values.length);
  let totalCount = dotPlots.exit().selectAll(".point").data().length;


  let stepN = opt.stepN || 1;
  // let stepN = Math.min(5, maxCount);
  let nPerRow = opt.nPerRow || Math.floor(maxCount * radius * 2 / height) + 1;
  // let nPerRow = 1;

  let shift = 0;
  let lineWidth = 30;


  let stepInterval = interval*0.3/(stepN);

  y.domain([0, maxCount]).nice(5);


  let cut = (maxCount + 1) / stepN;

  let cx = (d, i) => {
    return shift + Math.floor(i + map.get(d[xField]).stepCount * cut) % nPerRow * radius * 2 - (nPerRow-1) * radius * 2 / 2;
  };
  let cy = (d, i) => {
    return y(Math.floor((i  + map.get(d[xField]).stepCount * cut)/nPerRow)*nPerRow+ 1);
  };
  let lines = newDotPlots.append("line")
    .style("stroke-opacity", 0)
    .attr("y1", d=> y(d.len))
    .attr("y2", d=> y(d.len))
    .attr("x1", d=> - lineWidth/2)
    .attr("x2", d=> lineWidth/2);

  let newDots = newDotPlots.append("circle")
      .attr("class", "point")
      // .attr("cx", d => cx(d.values[d.len-1], d.len-1))
      // .attr("cy", (d, i) => cy(d.values[d.len-1], d.len-1))
      .attr("cy", (d, i) => y(d.len))
      .attr("r", radius)
      .style("stroke-opacity", 0)
      .style("opacity", 0)


  let delay = (d,i) => {
    return Math.floor(i / cut) * stepInterval;
  }

  let steps = [
    {
      tracks: 1,
      content: (done) => {
      svg.select(".grid").selectAll("line")
        .style("stroke-opacity", 0.7)
       .transition()
        .duration(interval * 0.15)
        .ease(d3.easeLinear)
        .style("stroke-opacity", 0)
        .on("end", ()=>{
          svg.select(".grid").remove();
        });


      svg.select(".yAxis")
        .attr("stroke-opacity", 1)
        .attr("fill-opacity", 1)
       .transition()
        .duration(interval * 0.15)
        .ease(d3.easeLinear)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
       .transition()
        .delay(interval * 0.1)
        .duration(0)
        .on("end", function(d){
        d3.select(this).remove();
        svg.append("g").attr("class", "yAxis");
        done();
      })


      }
    },
    {
      tracks: totalCount,
      content: (done) => {
        dotPlots.exit().selectAll(".point")
         .transition()
         .duration(stepInterval)
         .delay(delay)
         .attr("cx", cx)
         .attr("cy", cy)
         .on("end", done);

        lines
         .transition()
          .duration(stepInterval)
          .delay(stepInterval*(stepN-1))
          .style("stroke-opacity", 1)
      }
    },
    {
      tracks: 1,
      content: (done) => {


        svg.append("g")
          .attr("class", "grid")
          .call(svg.yGrid)
          .selectAll("line")
          .style("stroke-opacity", 0)

        svg.select(".grid").selectAll("line")
         .transition()
          .delay(interval*0.1)
          .duration(interval*0.15)
          .style("stroke-opacity", 0.7)

        svg.select(".yAxis")
          .attr("fill-opacity", 1)
          .attr("stroke-opacity", 1)
         .transition()
          .delay(interval*0.1)
          .duration(interval*0.15)
          .call(svg.yAxis);

        svg.select(".yAxis")
          .append("text")
          .attr("class", "axis-title")
          .attr("text-anchor", "middle")
          .attr("transform", "translate("+ (-svg.plotOpt.margin.left + 10) +","+(svg.plotOpt.height/2)+")rotate(-90)")
          .attr("fill", "#000")
          .attr("opacity", 0)
         .transition()
          .delay(interval*0.1)
          .duration(interval*0.15)
          .attr("opacity", 1)
          .text(svg.postYTitle)
          .on("end", done);


      }
    },
    {
      tracks: grouped.length,
      content: (done) => {

        dotPlots.exit().selectAll(".point")
         .transition()
          .delay(interval*0.1)
          .duration(interval*0.1)
          .style("opacity", 0)
          .remove();

        lines
         .transition()
          .delay(interval*0.1)
          .duration(interval*0.1)
          .style("stroke-opacity", 0);

        newDots.transition()
          .attr("cx", 0)
          .delay(interval*0.1)
          .duration(interval*0.1)
          .style("stroke-opacity", 0.7)
          .style("opacity", 0.7)
          .on("end", done);
      }
    },
    {
      tracks: dotPlots.exit().data().length,
      content: (done) => {
        cb();
      }
    }
  ];

  play(steps,0);
}




function sum4(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let grouped = grouping(data, xField, yField, (group)=>{
    group.sum = d3.sum(group.values, v => v[yField]);
    group.min = d3.min(group.values, v => v[yField]);
    group.values.reduce((acc, d, i) => {
      d[yField+"-prevAccSum"] = acc;
      acc += d[yField];
      d[yField+"-accSum"] = acc;
      return acc;
    }, 0);
    group.values.forEach(d => d.parent = group);
  });
  let map = d3.map(grouped, d=>d.key);

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");

  let minimum = d3.min(grouped, d => d.min);
  let maxSum = d3.max(grouped, d => d.sum);
  let maxCount = d3.max(grouped, d => d.len);
  let totalCount = d3.sum(grouped, d => d.len);
  let oldY = y.copy();
  let shift = 30;

  y.domain([0, maxSum]).nice(5); //TODO what about negative values?

  let intermediateR = Math.abs(y(minimum)-y(0)) <  radius/2 ? 0 : radius/2;
  dotPlots.exit()
    .selectAll(".point")
    .remove();
  let lineWidth = 30;


  let vLines = newDotPlots.selectAll(".vline")
    .data(d=> d.values)
   .enter()
    .append("line")
    .attr("class", "vline")
    .style("stroke-opacity", 0)
    .attr("x1", (d, i) => shift * (i / d.parent.len - 0.5))
    .attr("x2", (d, i) => shift * (i / d.parent.len - 0.5))
    .attr("y1", d => oldY(d[yField]))
    .attr("y2", d => oldY(d[yField]))
    .style("stroke", grey);

  let newDots = newDotPlots.selectAll(".point")
    .data(d=> d.values)
   .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", 0)
    .attr("cy", d => oldY(d[yField]))
    .attr("r", radius);



  let lines = newDotPlots.append("line")
    .style("stroke-opacity", 0)
    .attr("y1", d=> oldY(d.min))
    .attr("y2", d=> oldY(d.min))
    .attr("x1", d=> - lineWidth/2)
    .attr("x2", d=> lineWidth/2);


  let steps = [
    {
      tracks: totalCount,
      content: (done)=>{
        //Shift

        let stepInterval = interval * 0.15;

        newDots
         .transition()
          .duration(stepInterval)
          .attr("cx", (d, i) => shift * (i / d.parent.len - 0.5))
          // .attr("r", radius/2)
          .on("end", done);

      }
    },
    {
      tracks: totalCount,
      content: (done)=>{
        //vLine

        let stepInterval = interval * 0.15;

        vLines
         .transition()
          .duration(stepInterval)
          .style("stroke-opacity", 0.7)
          .attr("y1", oldY(0))
          .on("end", done);


      }
    },
    {
      tracks: totalCount+2,
      content: (done)=>{
        let intervalAtOnce = interval * 0.6;

        svg.select(".yAxis")
         .transition()
          .delay(intervalAtOnce * 0.25)
          .duration(intervalAtOnce * 0.75)
          .call(svg.yAxis)
          .on("end", done);

        svg.select(".grid")
         .transition()
          .delay(intervalAtOnce * 0.25)
          .duration(intervalAtOnce * 0.75)
          .call(svg.yGrid)
          .on("end", done);

        svg.select(".yAxis .axis-title")
          .attr("opacity", 1)
         .transition()
          .delay(intervalAtOnce * 0.25)
          .duration(intervalAtOnce * 0.75 /2)
          .attr("opacity", 0);


        let delayAtOnce = intervalAtOnce/4;
        let durationAtOnce = intervalAtOnce;

        if (opt.mode === "oneByOne") {
          vLines
           .transition()
            .delay((d,i) => i / maxCount * delayAtOnce + delayAtOnce)
            .duration(durationAtOnce * 0.5)
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y2", d => y(d[yField+"-accSum"]))
            .attr("y1", d => y(d[yField+"-prevAccSum"]))

          newDots
           .transition()
            .delay((d,i) => i / maxCount * delayAtOnce + delayAtOnce)
            .duration(durationAtOnce * 0.5)
            .attr("cx", 0)
            .attr("cy", d => y(d[yField+"-accSum"]))
            .attr("r", radius/2)
           .transition()
            .duration(0)
            .attr("r", (d,i) => i===d.parent.len -1 ? radius : intermediateR)
            .on("end", done);

          lines
            .transition()
             .delay(delayAtOnce)
             .duration(durationAtOnce * 0.5)
             .attr("y1", (d, i) => y(d.min))
             .attr("y2", (d, i) => y(d.min))
             .style("stroke-opacity", 1)
            .transition()
             .duration(delayAtOnce)
             .attr("y1", (d, i) => y(d.sum))
             .attr("y2", (d, i) => y(d.sum));

        } else if (opt.mode === "step") {
          let stepN = 3;
          let durationAtOnce = intervalAtOnce * stepN / (stepN+1);


          let delay = (d,i) => {
            let stepSize = Math.ceil(maxCount / stepN);
            return Math.floor(i / stepSize) * durationAtOnce / stepN
          }

          vLines
           .transition()
            // .delay((d,i) => i / maxCount * delayAtOnce + delayAtOnce)
            // .duration(durationAtOnce * 0.5)
            .delay(delay)
            .duration(durationAtOnce / stepN)
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", d => y(d[yField+"-accSum"]))
            .attr("y2", d => y(d[yField+"-prevAccSum"]))

          newDots
           .transition()
            // .delay((d,i) => i / maxCount * delayAtOnce + delayAtOnce)
            // .duration(durationAtOnce * 0.5)
            .delay(delay)
            .duration(durationAtOnce / stepN)
            .attr("cx", 0)
            .attr("cy", d => y(d[yField+"-accSum"]))
            .attr("r", (d,i) => i===d.parent.len -1 ? radius : intermediateR)
            .on("end", done);

          let subStep = {
            tracks: grouped.length,
            content: (subDone, stepI) => {
              let stepSize = Math.ceil(maxCount / stepN);
              let index = stepSize*(stepI+1) -1;
              let currentY = (d,i) => {
                return y(d.values[Math.min(index, d.len-1)][yField+"-accSum"]);
              }
              if (stepI===0) {
                lines
                .attr("y1", currentY)
                .attr("y2", currentY)
               .transition()
                .duration(durationAtOnce / stepN)
                .style("stroke-opacity", 1)
                .on("end", subDone);
              } else {
                lines
                 .transition()
                  .duration(durationAtOnce / stepN)
                  .attr("y1", currentY)
                  .attr("y2", currentY)
                  .on("end", subDone);
              }
            }
          };
          let subSteps = [];
          for (var i = 0; i < stepN; i++) {
            subSteps.push(subStep);
          }
          play(subSteps, 0);

        } else {
          vLines
           .transition()
            .delay((d,i) => intervalAtOnce * 0.2)
            .duration(intervalAtOnce * 0.8)
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", d => y(d[yField+"-accSum"]))
            .attr("y2", d => y(d[yField+"-prevAccSum"]));

          newDots
           .transition()
            .delay((d,i) => intervalAtOnce * 0.2)
            .duration(intervalAtOnce * 0.8)
            .attr("cx", 0)
            .attr("cy", d => y(d[yField+"-accSum"]))
            .attr("r", (d,i) => i===d.parent.len -1 ? radius : intermediateR)
            .on("end", done);
        }
      }
    },{
      tracks: totalCount,
      content: (done) => {

        let finishInterval = interval * 0.1;
        let finishDelay = finishInterval * 0.5;

        lines
          .transition()
          .delay(finishDelay)
          .duration(finishInterval * 0.5)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0)
          .remove();

        vLines
         .transition()
          .delay(finishDelay)
          .duration(finishInterval * 0.5)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0)
          .on("end", done)
          .remove();


        newDots
          .filter((d,i) =>  i!==d.parent.len -1)
          .transition()
          .delay(finishDelay)
          .duration(finishInterval * 0.5)
          .ease(d3.easeQuad)
          .style("opacity", 0)
          .remove();


        svg.select(".yAxis .axis-title")
         .transition()
          .delay(finishDelay)
          .duration(finishInterval * 0.5)
          .attr("opacity", 1)
          .text(svg.postYTitle)
          .on("end", done);

      }
    },{
      tracks: 1,
      content: (done) => {
        cb();
        // done();
      }
    }
  ];
  play(steps,0);

}
function sum5(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let grouped = grouping(data, xField, yField, (group)=>{
    group.sum = d3.sum(group.values, v => v[yField]);
    group.values.reduce((acc, d, i) => {
      d[yField+"-prevAccSum"] = acc;
      acc += d[yField];
      d[yField+"-accSum"] = acc;
      return acc;
    }, 0);
    group.min = d3.min(group.values, v => v[yField]);
    group.values.forEach(d => d.parent = group);
  });
  let map = d3.map(grouped, d=>d.key);
  let minimum = d3.min(grouped, g => g.min);
  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");


  let maxSum = d3.max(grouped, d => d.sum);
  let maxCount = d3.max(grouped, d => d.len);
  let totalCount = d3.sum(grouped, d => d.len);
  let oldY = y.copy();
  let shift = 30;

  y.domain([0, maxSum]).nice(5); //TODO what about negative values?


  dotPlots.exit()
    .selectAll(".point")
    .remove();

  let intermediateR = Math.abs(y(minimum)-y(0)) <  radius/2 ? 0 : radius/2;

  let vLines = newDotPlots.selectAll("line")
    .data(d=> d.values)
   .enter()
    .append("line")
    .style("stroke-opacity", 0)
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", d => oldY(d[yField]))
    .attr("y2", d => oldY(d[yField]))
    .style("stroke", grey);

  let newDots = newDotPlots.selectAll(".point")
    .data(d=> d.values)
   .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", 0)
    .attr("cy", d => oldY(d[yField]))
    .attr("r", radius);

  let lineWidth = 30;
  let lines = newDotPlots.append("line")
    .style("stroke-opacity", 0)
    .attr("y1", d=> oldY(d.min))
    .attr("y2", d=> oldY(d.min))
    .attr("x1", d=> - lineWidth/2)
    .attr("x2", d=> lineWidth/2);


  let steps = [
    {
      tracks: totalCount,
      content: (done)=>{
        //vLine

        let stepInterval = interval * 0.15;

        vLines
         .transition()
          .duration(stepInterval)
          .style("stroke-opacity", 0.7)
          .attr("y1", oldY(0))
          .on("end", done);


      }
    },
    {
      tracks: totalCount+2,
      content: (done)=>{

        let intervalAtOnce = interval * 0.75;
        svg.select(".yAxis")
         .transition()
          .delay(intervalAtOnce * 0.25)
          .duration(intervalAtOnce * 0.75)
          .call(svg.yAxis)
          .on("end", done);

        svg.select(".grid")
         .transition()
          .delay(intervalAtOnce * 0.25)
          .duration(intervalAtOnce * 0.75)
          .call(svg.yGrid)
          .on("end", done);

        svg.select(".yAxis .axis-title")
          .attr("opacity", 1)
         .transition()
          .delay(intervalAtOnce * 0.25)
          .duration(intervalAtOnce * 0.75)
          .attr("opacity", 0)

        let delayAtOnce = intervalAtOnce/4;
        let durationAtOnce = intervalAtOnce;

        if (opt.mode === "oneByOne") {
          vLines
           .transition()
            .delay((d,i) => i / maxCount * delayAtOnce + delayAtOnce)
            .duration(durationAtOnce * 0.5)
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y2", d => y(d[yField+"-accSum"]))
            .attr("y1", d => y(d[yField+"-prevAccSum"]))

          newDots
           .transition()
            .delay((d,i) => i / maxCount * delayAtOnce + delayAtOnce)
            .duration(durationAtOnce * 0.5)
            .attr("cx", 0)
            .attr("cy", d => y(d[yField+"-accSum"]))
            .attr("r", radius/2)
           .transition()
            .duration(0)
            .attr("r", (d,i) => i===d.parent.len -1 ? radius : intermediateR)
            .on("end", done);

          lines
            .transition()
             .delay(delayAtOnce)
             .duration(durationAtOnce * 0.5)
             .attr("y1", (d, i) => y(d.min))
             .attr("y2", (d, i) => y(d.min))
             .style("stroke-opacity", 1)
            .transition()
             .duration(delayAtOnce)
             .attr("y1", (d, i) => y(d.sum))
             .attr("y2", (d, i) => y(d.sum));

        } else if (opt.mode === "step") {
            let stepN = 3;
            let durationAtOnce = intervalAtOnce * stepN / (stepN+1);


            let delay = (d,i) => {
              let stepSize = Math.ceil(maxCount / stepN);
              return Math.floor(i / stepSize) * durationAtOnce / stepN
            }

            vLines
             .transition()
              // .delay((d,i) => i / maxCount * delayAtOnce + delayAtOnce)
              // .duration(durationAtOnce * 0.5)
              .delay(delay)
              .duration(durationAtOnce / stepN)
              .attr("x1", 0)
              .attr("x2", 0)
              .attr("y1", d => y(d[yField+"-accSum"]))
              .attr("y2", d => y(d[yField+"-prevAccSum"]))

            newDots
             .transition()
              // .delay((d,i) => i / maxCount * delayAtOnce + delayAtOnce)
              // .duration(durationAtOnce * 0.5)
              .delay(delay)
              .duration(durationAtOnce / stepN)
              .attr("cx", 0)
              .attr("cy", d => y(d[yField+"-accSum"]))
              .attr("r", (d,i) => i===d.parent.len -1 ? radius : intermediateR)
              .on("end", done);
        } else {
          vLines
           .transition()
            .duration( intervalAtOnce * 0.2)
            .style("stroke-opacity", 0.7)
            .attr("y1", oldY(0))
           .transition()

            .duration(intervalAtOnce * 0.8)

            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", d => y(d[yField+"-accSum"]))
            .attr("y2", d => y(d[yField+"-prevAccSum"]));

          newDots
           .transition()
            .delay((d,i) => intervalAtOnce * 0.2)
            .duration(intervalAtOnce * 0.8)
            .attr("cx", 0)
            .attr("cy", d => y(d[yField+"-accSum"]))
            .attr("r", (d,i) => i===d.parent.len -1 ? radius : intermediateR)
            .on("end", done);
        }
      }
    },{
      tracks: totalCount,
      content: (done) => {

        let finishInterval = interval * 0.1;
        let finishDelay = finishInterval * 0.5;

        lines
          .transition()
          .delay(finishDelay)
          .duration(finishInterval * 0.5)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0)
          .remove();

        vLines
         .transition()
          .delay(finishDelay)
          .duration(finishInterval * 0.5)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0)
          .on("end", done)
          .remove();

        svg.select(".yAxis .axis-title")
         .transition()
          .delay(finishDelay)
          .duration(finishInterval/2)
          .attr("opacity", 1)
          .text(svg.postYTitle)


        newDots
          .filter((d,i) =>  i!==d.parent.len -1)
          .transition()
          .delay(finishDelay)
          .duration(finishInterval * 0.5)
          .ease(d3.easeQuad)
          .style("opacity", 0)
          .remove();

      }
    },{
      tracks: 1,
      content: (done) => {
        cb();
        // done();
      }
    }
  ];
  play(steps,0);

}
function extremum(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");

  let grouped = d3.nest()
    .key(d => d[xField]).sortKeys(d3.ascending)
    .sortValues( (a,b) => a[yField] - b[yField])
    .entries(data);
  let map = d3.map(grouped, d=>d.key);
  grouped.forEach(group => {
    group.max = d3.max(group.values, d=>d[yField]);
    group.min = d3.min(group.values, d=>d[yField]);
  });

  dotPlots = dotPlots.data(grouped, d => d.max ? "agg" + d.key : d.key);

  let newDotPlots = dotPlots.enter()
   .append("g")
    .attr("class", "dotPlot")
    .attr("transform", d => "translate(" + x(d.key) + ",0)");
  let minOrMax = opt.func || "max";
  let shift = 30;

  steps = [
    {
      tracks: 2,
      content: (done) => {
        newDotPlots.append("circle")
          .attr("cy", (d, i) => y(d[minOrMax]))
          .attr("cx", 0)
          .attr("r", radius)
         .transition()
          .duration(interval * 0.2)
          .ease(d3.easeQuad)
          .on("end", done);

        newDotPlots.append("line")
          .attr("y1", (d, i) => y(d[minOrMax]))
          .attr("y2", (d, i) => y(d[minOrMax]))
          .attr("x1", 0)
          .attr("x2", 0)
          .attr("stroke-opacity", 1)
         .transition()
          .duration(interval * 0.2)
          .ease(d3.easeQuad)
          .attr("x1", -shift/2)
          .attr("x2", shift/2)
          .on("end", done);
      }
    },
    {
      tracks: 2,
      content: (done) => {
        dotPlots.exit()
          .selectAll(".point")
         .transition()
          .duration(interval * 0.2)
          .style("opacity", 0)
          .on("end", done);

        svg.select(".yAxis .axis-title")
          .attr("opacity", 1)
         .transition()
          .duration(interval * 0.2)
          .attr("opacity", 0)
          .on("end", done);


      }
    },
    {
      tracks: grouped.length + 1,
      content: (done) => {
        newDotPlots.selectAll("circle")
         .transition()
          .duration(interval * 0.2)
          .ease(d3.easeQuad)
          .attr("cx", 0);

        newDotPlots.selectAll("line")
         .transition()
          .delay(interval * 0.4)
          .duration(interval * 0.2)
          .attr("stroke-opacity", 0)
          .on("end", done);

        svg.select(".yAxis .axis-title")
         .transition()
          .delay(interval * 0.4)
          .duration(interval * 0.2)
          .attr("opacity", 1)
          .text(svg.postYTitle)
          .on("end", done);

      }
    },
    {
      tracks: 0,
      content: cb
    }
  ];


  play(steps,0);


}

function baseline(svg, opt, cb){
  let interval = opt.interval || 1000;
  let data = svg.data;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;
  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");
  let func = opt.func;
  let newAxis = ["count", "sum"].indexOf(func) >= 0;
  let range = ["stdev", "variance", "iqr"].indexOf(func) >= 0;
  let middleFunc = null;
  let grouped = grouping(data, xField, yField, g => {
    if (func === "count") {
      return;
    }
    if (range && ["stdev"].indexOf(func) >= 0) {
      g[func] = d3.deviation(g.values, v => v[yField]);
      g.upper = d3.mean(g.values, v => v[yField]) + g[func];
      g.lower = d3.mean(g.values, v => v[yField]) - g[func];
      middleFunc = "mean";
      g[middleFunc] = d3[middleFunc](g.values, v => v[yField]);
    } else if (range && func === "iqr") {
      middleFunc = "median";
      g.upper = d3.quantile(g.values, 0.75, v => v[yField]);
      g.lower = d3.quantile(g.values, 0.25, v => v[yField]);
      g[middleFunc] = d3[middleFunc](g.values, v => v[yField]);
    } else {
      g[func] = d3[func](g.values, v => v[yField]);
    }
  });
  let map = d3.map(grouped, d=>d.key);

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");

  let shift = 30;
  let boxes = newDotPlots.append("rect")
    .style("opacity", 0)
    .attr("stroke-opacity", 0);
  let lines = newDotPlots.append("line")
    .attr("stroke-opacity", 0);
  if (range){
    boxes.attr("y", d => y(d.upper))
      .attr("height", d => Math.abs(y(d.lower) - y(d.upper)))
      .attr("x", d => -shift/2 )
      .attr("width", d => shift );

    lines.attr("y1", d => y(d[middleFunc]))
      .attr("y2", d => y(d[middleFunc]))
      .attr("x1", -shift/2)
      .attr("x2", shift/2)
      .attr("stroke-opacity", 0);
  }


  if (newAxis) {
    let max = d3.max(grouped, g => g[func]);
    y.domain([0, max]).nice(5);
  }


  let oldDotPlots = dotPlots.exit();
  steps = [
    {
      tracks: oldDotPlots.selectAll(".point").data().length,
      content: (done) => {
        if (!range) {
          if (["min", "max"].indexOf(func) >= 0) {
            oldDotPlots.selectAll(".point")
             .transition()
              .duration(interval)
              .style("opacity", 0)
              .on("end", done)
              .remove();

            newDotPlots
              .append("circle")
              .attr("class", "point")
              .attr("cy", (d, i) => y(d[func]))
              .attr("r", radius)
              .style("opacity", 0)
             .transition()
              .duration(interval)
              .style("opacity", 0.7)
          } else if (func==="median"){
            oldDotPlots.selectAll(".point")
             .transition()
              .duration(interval)
              .style("opacity", 0)
              .on("end", done)
              .remove();

            newDotPlots
              .append("circle")
              .attr("class", "point")
              .attr("cy", (d, i) => y(d[func]))
              .attr("r", radius)
              .style("opacity", 0)
             .transition()
              .duration(interval)
              .style("opacity", 0.7)
            // newDotPlots.filter(d => d.len % 2 === 1)
            //   .append("circle")
            //   .attr("class", "point")
            //   .attr("cy", (d, i) => y(d[func]))
            //   .attr("r", radius)
            //   .style("opacity", 0)
            //  .transition()
            //   .duration(interval * 0.67)
            //   .style("opacity", 0.7)


            // let evenDotPlots = newDotPlots.filter(d => d.len % 2 === 0);

            // evenDotPlots
            //   .append("circle")
            //   .attr("class", "intermediate point")
            //   .attr("cy", (d, i) => y(d.values[Math.floor((d.len-1)/2)][yField]))
            //   .attr("r", radius)
            //   .style("opacity", 0)
            //  .transition()
            //   .duration(interval * 0.67)
            //   .style("opacity", 0.7)
            //  .transition()
            //   .duration(interval * 0.33)
            //   .attr("cy", (d, i) => y(d[func]))

            // evenDotPlots
            //   .append("circle")
            //   .attr("class", "intermediate point")
            //   .attr("cy", (d, i) => y(d.values[Math.ceil((d.len-1)/2)][yField]))
            //   .attr("r", radius)
            //   .style("opacity", 0.7)
            //  .transition()
            //   .duration(interval * 0.67)
            //   .style("opacity", 0.7)
            //  .transition()
            //   .duration(interval * 0.33)
            //   .attr("cy", (d, i) => y(d[func]))
            //   .remove();
          }
          else {
            oldDotPlots.selectAll(".point")
             .transition()
              .duration(interval)
              .attr("cy", (d, i) => y(map.get(d[xField])[func]))
              .on("end", done)
              .remove();
          }

          //Axis changes
          if (func === "count") {
            svg.select(".grid").selectAll("line")
              .style("stroke-opacity", 0.7)
             .transition()
              .duration(interval * 0.5)
              .style("stroke-opacity", 0)
              .on("end", ()=>{
                svg.select(".grid").remove();
                svg.append("g")
                  .attr("class", "grid")
                  .call(svg.yGrid)
                  .selectAll("line")
                  .style("stroke-opacity", 0)

                svg.select(".grid").selectAll("line")
                 .transition()
                  .duration(interval*0.5)
                  .style("stroke-opacity", 0.7)
              })


            svg.select(".yAxis")
              .attr("stroke-opacity", 1)
              .attr("fill-opacity", 1)
             .transition()
              .duration(interval * 0.5)
              .attr("fill-opacity", 0)
              .attr("stroke-opacity", 0)
              .on("end", function(d){


              d3.select(this).remove();

              svg.append("g").attr("class", "yAxis")
                .call(svg.yAxis)
                .attr("fill-opacity", 0)
                .attr("stroke-opacity", 0)
               .transition()
                .duration(interval*0.5)
                .attr("stroke-opacity", 1)
                .attr("fill-opacity", 1);

              svg.append("g").attr("class", "yAxis")
                .append("text")
                .attr("class", "axis-title")
                .attr("text-anchor", "middle")
                .attr("transform", "translate("+ (-svg.plotOpt.margin.left + 10) +","+(svg.plotOpt.height/2)+")rotate(-90)")
                .attr("fill", "#000")
                .attr("opacity", 0)
               .transition()
                .duration(interval*0.5)
                .attr("opacity", 1)
                .text(svg.postYTitle)
            })
          } else if (func === "sum"){
            svg.select(".grid")
             .transition()
              .duration(interval)
              .call(svg.yGrid);

            svg.select(".yAxis")
             .transition()
              .duration(interval)
              .call(svg.yAxis);

            svg.select(".yAxis .axis-title")
              .attr("opacity", 1)
             .transition()
              .duration(interval/2)
              .attr("opacity", 0)
             .transition()
              .duration(interval/2)
              .attr("opacity", 1)
              .text(svg.postYTitle)

          } else {
            svg.select(".yAxis .axis-title")
              .attr("opacity", 1)
             .transition()
              .duration(interval/2)
              .attr("opacity", 0)
             .transition()
              .duration(interval/2)
              .attr("opacity", 1)
              .text(svg.postYTitle);
          }



        } else {
          oldDotPlots.selectAll(".point")
           .transition()
            .duration(interval)
            .style("opacity", 0)
            .on("end", done)
            .remove();

          lines.transition()
            .duration(interval)
            .attr("stroke-opacity", 0.7);

          boxes.transition()
            .duration(interval)
            .style("opacity", 1)
            .attr("stroke-opacity", 1);

          svg.select(".yAxis .axis-title")
              .attr("opacity", 1)
             .transition()
              .duration(interval/2)
              .attr("opacity", 0)
             .transition()
              .duration(interval/2)
              .attr("opacity", 1)
              .text(svg.postYTitle)

        }
      }
    },
    {
      tracks: 0,
      content: (done) => {
        if(!range){
          if (["min", "max", "median"].indexOf(func) < 0) {
            newDotPlots.append("circle")
              .attr("class", "point")
              .attr("cy", (d, i) => y(d[func]))
              .attr("r", radius);
          }
        }
        cb();
      }
    }
  ];
  play(steps,0);
}

function median(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let grouped = grouping(data, xField, yField, (group)=>{
    group.median = d3.median(group.values, v => v[yField]);
    group.medianIndex = (group.values.length - 1) / 2;
  });
  let map = d3.map(grouped, d=>d.key);

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");

  let shift = 30;
  let totalCount = dotPlots.exit().selectAll(".point").data().length;
  let color = (d, i) => {
    return map.get(d[xField]).medianIndex > i ? green :
    (map.get(d[xField]).medianIndex < i ? orange : blue);
  };
  let binaryCx = (d,i) => {
    let g = map.get(d[xField]);
    return g.medianIndex < i ? shift/4 : (g.medianIndex > i ? -shift/4 : 0);
  };
  let lowerPoints = dotPlots.exit().selectAll(".point")
            .filter( (d, i) => map.get(d[xField]).medianIndex < i);
  let lines = newDotPlots
            .append("line")
            .attr("x1", - shift/2)
            .attr("x2", shift/2)
            .attr("y1", (d,i) => y(d.median))
            .attr("y2", (d,i) => y(d.median))
            .attr("stroke-opacity", 0);
  let steps = [
      {
        tracks: totalCount,
        content: (done) => {
          dotPlots.exit().selectAll(".point")
           .transition()
            .duration(interval * 0.2)
            .style("stroke", color)
            .style("fill", color)
            .attr("cx", binaryCx)
            .on("end", done);

        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          lines.transition()
            .duration(interval * 0.2)
            .attr("stroke-opacity", 1)
            .on("end", done);


        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepInterval = interval * 0.3;
          let stepDelay = interval * 0.3;
          dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepInterval)
            .delay(stepDelay)
            .style("opacity", 0)
            .remove();

          newDotPlots.append("circle")
            .attr("cx", 0)
            .attr("cy", d => y(d.median))
            .attr("r", radius)
            .style("opacity", 0)
           .transition()
            .duration(stepInterval)
            .delay(stepDelay)
            .style("opacity", 0.7)
            .on("end", done);

          lines.transition()
            .duration(stepInterval)
            .delay(stepDelay)
            .attr("stroke-opacity", 0)
            .remove();

          svg.select(".yAxis .axis-title")
            .attr("opacity", 1)
           .transition()
            .delay(stepDelay)
            .duration(stepInterval / 2)
            .attr("opacity", 0)
           .transition()
            .duration(stepInterval / 2)
            .attr("opacity", 1)
            .text(svg.postYTitle)

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

function median8(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let grouped = grouping(data, xField, yField, (group)=>{
    group.max = group.values[group.values.length - 1][yField];
    group.min = group.values[0][yField];
    group.median = d3.median(group.values, v => v[yField]);
    group.medianIndex = (group.values.length - 1) / 2;
  });
  let map = d3.map(grouped, d=>d.key);
  let totalCount = d3.sum(grouped, g=>g.len);
  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let lineWidth = 30;
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");

  let upperLines = newDotPlots
    .append("line")
    .attr("x1", lineWidth / 2)
    .attr("x2", - lineWidth / 2)
    .attr("y1", (d,i) => y(d.max))
    .attr("y2", (d,i) => y(d.max))
    .attr("stroke-opacity", 0);

  let lowerLines = newDotPlots
    .append("line")
    .attr("x1", lineWidth / 2)
    .attr("x2", - lineWidth / 2)
    .attr("y1", (d,i) => y(d.min))
    .attr("y2", (d,i) => y(d.min))
    .attr("stroke-opacity", 0);

  let newDots = newDotPlots.selectAll(".point")
    .data(d => d.values)
    .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", 0)
    .attr("cy", d => y(d[yField]))
    .style("opacity", 0)
    .style("stroke-opacity", 0)
    .attr("r", radius);


  let medians = newDotPlots
    .append("circle")
    .attr("cx", 0)
    .attr("cy", d => y(d.median))
    .attr("r", radius)
    .style("opacity", 0)
    .style("stroke-opacity", 0);


  let shift = opt.shift !== undefined ? opt.shift : 30;

  let xOffset = radius;

  let binaryCx = (d,i) => {
    let g = map.get(d[xField]);
    return g.medianIndex < i ? shift/4 : (g.medianIndex > i ? -shift/4 : 0);
  };

  let steps = [
    {
        tracks: totalCount,
        content: (done) => {
          let stepInterval = 0.15 * interval;


          upperLines
            .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .style("stroke-opacity", 1);

          lowerLines
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .style("stroke-opacity", 1);


          dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .style("fill", grey)
            .style("opacity", 0.3)
            .style("stroke-opacity", 0.3)
            .on("end",done);
        }
      },
      {
        tracks: totalCount,
        content: (done) => {
          let stepInterval = 0.1 * interval;
          let offsetInterval = 0.2 * interval;
          let color = (d,i) => {
            return i > map.get(d[xField]).medianIndex ? orange : (i !== map.get(d[xField]).medianIndex ? green : blue);
          };
          // let delayScale = d3.scalePow().domain([0, 1]).range([0, stepInterval]).exponent(1);
          let delayScale = d3.scaleLog().range([0, stepInterval]).domain([0.1, 1]);
          let delay = (d,i) => {
            let g = map.get(d[xField]);
            if (i === 0 || i === g.len-1) {
              return 0;
            } else if (i < 3 || i > g.len-4 ) {
              return offsetInterval * Math.min(i, g.len-1 -i);
            }
            return delayScale(1 - Math.abs(i - g.medianIndex) / g.medianIndex) + offsetInterval*2;
            // console.log(i, delayScale(1 - Math.abs(i - g.medianIndex) / g.medianIndex + 1));
            // return delayScale(1 - Math.abs(i - g.medianIndex) / g.medianIndex + 0.001);
          };

          let cx = (d,i) => {
            let g = map.get(d[xField]);
            let deltaI = i - g.medianIndex;
            return deltaI > 0 ? shift * Math.abs(deltaI)/g.len : deltaI < 0 ? -shift * Math.abs(deltaI)/g.len : 0;
          };

          dotPlots.exit().selectAll(".point")
           .transition()
            .duration(0)
            .delay(delay)
            .ease(d3.easeQuad)
            .remove();

          newDots
           .transition()
            .duration(0)
            .delay(delay)
            .style("fill", color)
            .style("opacity", 0.7)
           .transition()
            .duration(offsetInterval/2)
            .delay(0)
            .ease(d3.easeQuad)
            .attr("cx", binaryCx)
            .on("end", done);

          lowerLines
           .transition()
            .delay(offsetInterval/2)
            .duration(offsetInterval/2)
            .attr("y1", g => y((g.values[1] && g.len > 2 ? g.values[1][yField] : g.median)))
            .attr("y2", g => y((g.values[1] && g.len > 2 ? g.values[1][yField] : g.median)))
           .transition()
            .delay(offsetInterval/2)
            .duration(offsetInterval/2)
            .attr("y1", g => y((g.values[2] && g.len > 4 ? g.values[2][yField] : (g.values[1] && g.len > 2 ? g.values[1][yField] : g.median))))
            .attr("y2", g => y((g.values[2] && g.len > 4 ? g.values[2][yField] : (g.values[1] && g.len > 2 ? g.values[1][yField] : g.median))))
           .transition()
            .duration(stepInterval)
            .ease(d3.easeExpIn)
            .attr("y1", g => y(g.median))
            .attr("y2", g => y(g.median));

          upperLines
           .transition()
            .delay(offsetInterval/2)
            .duration(offsetInterval/2)
            .attr("y1", g => y((g.values[g.len-2] && g.len > 2 ? g.values[g.len-2][yField] : g.median)))
            .attr("y2", g => y((g.values[g.len-2] && g.len > 2 ? g.values[g.len-2][yField] : g.median)))
           .transition()
            .delay(offsetInterval/2)
            .duration(offsetInterval/2)
            .attr("y1", g => y((g.values[g.len-3] && g.len > 4 ? g.values[g.len-3][yField] :
              (g.values[g.len-2] && g.len > 2 ? g.values[g.len-2][yField] : g.median))))
            .attr("y2", g => y((g.values[g.len-3] && g.len > 4 ? g.values[g.len-3][yField] :
              (g.values[g.len-2] && g.len > 2 ? g.values[g.len-2][yField] : g.median))))
           .transition()
            .duration(stepInterval)
            .ease(d3.easeExpIn)
            .attr("y1", g => y(g.median))
            .attr("y2", g => y(g.median));



        }
      },
     {
        tracks: grouped.length,
        content: (done) => {
          let stepDuration = 0.1 * interval;
          let stepDelay = 0.15 * interval;

          lowerLines
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .style("stroke-opacity", 0);

          upperLines
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .style("stroke-opacity", 0)

          newDots
            .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .style("stroke-opacity", 0)
            .style("opacity", 0)
            .remove();

          svg.select(".yAxis .axis-title")
            .attr("opacity", 1)
           .transition()
            .delay(stepDelay)
            .duration(stepDuration / 2)
            .attr("opacity", 0)
           .transition()
            .duration(stepDuration / 2)
            .attr("opacity", 1)
            .text(svg.postYTitle)

          newDotPlots.append("circle")
            .attr("cx", 0)
            .attr("cy", d => y(d.median))
            .attr("r", radius)
            .style("stroke-opacity", 0)
            .style("opacity", 0)
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .style("stroke-opacity", 0.7)
            .style("opacity", 0.7)
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


function avg2(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let grouped = grouping(data, xField, yField, (group)=>{
    group.mean = d3.mean(group.values, v => v[yField]);
  });
  let map = d3.map(grouped, d=>d.key);

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");


  let means = newDotPlots
    .append("circle")
    .attr("cx", 0)
    .attr("cy", d => y(d.mean))
    .attr("r", radius)
    .style("opacity", 0)
    .style("stroke-opacity", 0);

  let shift = 30;
  let lines = newDotPlots
            .append("line")
            .attr("x1", - shift/2)
            .attr("x2", shift/2)
            .attr("y1", (d,i) => y(d.mean))
            .attr("y2", (d,i) => y(d.mean))
            .attr("stroke-opacity", 0);

  let steps = [
      {
        tracks: grouped.length,
        content: (done) => {
          lines
           .transition()
            .duration(interval * 0.2)
            .ease(d3.easeQuad)
            .attr("stroke-opacity", 1)
            .on("end", done);
        }
      },
      {
        tracks: dotPlots.exit().selectAll(".point").data().length,
        content: (done) => {
          let stepInterval = interval * 0.4;
          let v = d3.max(grouped, g => d3.max(g.values.map(d => Math.abs(y(d[yField]) - y(g.mean))))) / (stepInterval);
          dotPlots.exit()
            .selectAll(".point")
           .transition()
            .duration(d => opt.atOnce ? stepInterval : Math.abs(y(d[yField]) - y(map.get(d[xField]).mean)) / v)
            .delay(interval * 0.1)
            .ease(d3.easeQuad)
            .attr("cy", (d,i) => y(map.get(d[xField]).mean))
            .on("end", done)

          svg.select(".yAxis .axis-title")
            .attr("opacity", 1)
           .transition()
            .delay(interval * 0.1)
            .duration(interval * 0.2)
            .attr("opacity", 0)

        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          lines.transition()
            .duration(interval * 0.2)
            .ease(d3.easeQuad)
            .delay(interval * 0.1)
            .attr("stroke-opacity", 0)
            .remove();

          dotPlots.exit()
            .selectAll(".point")
           .transition()
            .duration(interval * 0.2)
            .delay(interval * 0.1)
            .style("opacity", 0)
            .remove();

          means
           .transition()
            .duration(interval * 0.2)
            .delay(interval * 0.1)
            .ease(d3.easeQuad)
            .style("opacity", 0.7)
            .style("stroke-opacity", 0.7)
            .on("end", done);

          svg.select(".yAxis .axis-title")
           .transition()
            .duration(interval * 0.2)
            .attr("opacity", 1)
            .text(svg.postYTitle)
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

function avg3(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let grouped = grouping(data, xField, yField, (group)=>{
    group.mean = d3.mean(group.values, v => v[yField]);
    let meanI = 0;
    let delta = -1;
    group.values.forEach((v,i)=>{
      if (v[yField] < group.mean) {
        v.__deltaSum = d3.sum(group.values.filter((u,j) => j > i && u[yField] < group.mean), u => y(group.mean - u[yField]));
      } else {
        v.__deltaSum = d3.sum(group.values.filter((u,j) => j < i && u[yField] > group.mean), u => y(u[yField] - group.mean));
      }
    });
  });
  let map = d3.map(grouped, d=>d.key);

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");

  dotPlots.exit().remove();

  let shift = 30;


  let means = newDotPlots
    .append("circle")
    .attr("cx", 0)
    .attr("cy", d => y(d.mean))
    .attr("r", radius)
    .style("opacity", 0)
    .style("stroke-opacity", 0);

  let vBoxes = newDotPlots.selectAll(".vBox").data(d => d.values).enter()
    .append("rect")
    .attr("class", 'vBox')
    .attr("x", (d,i) => (i / (map.get(d[xField]).len) - 0.5) * shift )
    .attr("width", (d, i) => Math.max(shift / map.get(d[xField]).len, 2))
    .attr("y", (d,i) => y(d[yField]))
    .attr("height", 0)
    .style("fill", grey)
    .style("stroke-opacity", 0)
    .style("opacity", 0);

  let newDots = newDotPlots.selectAll(".point").data(d => d.values).enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", 0)
    .attr("cy", d => y(d[yField]))
    .attr("r", radius);

  let lines = newDotPlots
            .append("line")
            .attr("x1", - shift / 2)
            .attr("x2", shift / 2)
            .attr("y1", (d,i) => y(d.mean))
            .attr("y2", (d,i) => y(d.mean))
            .attr("stroke-opacity", 0);

  let steps = [

      {
        tracks: newDots.data().length,
        content: (done) => {

          lines.transition()
            .duration(interval * 0.2)
            .ease(d3.easeQuad)
            .attr("stroke-opacity", 1);

          newDots
           .transition()
            .duration(interval * 0.2)
            .ease(d3.easeQuad)
            .attr("cx", (d,i) => (i / (map.get(d[xField]).len) - 0.5) * shift + Math.max(shift / map.get(d[xField]).len, 2) /2)
            .on("end", done);
        }
      },
      {
        tracks: newDots.data().length,
        content: (done) => {
          let stepInterval = interval * 0.2;

          newDots
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("r",0 )
            .on("end", done)
            .remove();

          vBoxes
            .style("opacity", 0.7)
            .style("stroke-opacity", 1)
           .transition()
            .duration(stepInterval)
            .attr("y", (d,i) => Math.min(y(map.get(d[xField]).mean), y(d[yField])))
            .attr("height", (d,i) => Math.abs(y(map.get(d[xField]).mean) - y(d[yField])));

          svg.select(".yAxis .axis-title")
            .attr("opacity", 1)
           .transition()
            .duration(stepInterval / 2)
            .attr("opacity", 0);

        }
      },
      {
        tracks: newDots.data().length,
        content: (done) => {
          // let v2 = d3.max(grouped, g=> d3.max(g.values, v => Math.abs(y(v[yField]) - y(g.mean)))) / ;
          let stepInterval = (interval * 0.3);
          let offsetDelay = interval * 0.2;
          vBoxes
           .transition()
            .delay(offsetDelay)
            .duration(stepInterval)
            .attr("y", (d,i) => y(map.get(d[xField]).mean))
            .attr("height", 0)
            .remove()
            .on("end", done);


        }
      },
      // {
      //   tracks: newDots.data().length,
      //   content: (done) => {

      //     let v = d3.max(grouped, g=> d3.max(g.values, v => v.__deltaSum)) / (interval * 0.4);
      //     let v2 = d3.max(grouped, g=> d3.max(g.values, v => Math.abs(y(v[yField]) - y(g.mean)))) / (interval * 0.01);
      //     let offsetDelay = interval * 0.2;
      //     vLines
      //      .transition()
      //       .duration( d => (d.__deltaSum) / v)
      //       .delay(offsetDelay)
      //       .attr("x1", 0)
      //       .attr("x2", 0)
      //      .transition()
      //       .duration((d,i) => Math.abs(y(d[yField]) - y(map.get(d[xField]).mean)) / v2)
      //       .ease(d3.easeQuad)
      //       .attr("y2", (d,i) =>y(map.get(d[xField]).mean))
      //       .remove();

      //     newDots
      //      .transition()
      //       .duration( d => y(d.__deltaSum) / v)
      //       .delay(offsetDelay)
      //       .ease(d3.easeQuad)
      //       .attr("cy", (d,i) => y(map.get(d[xField]).mean))
      //       .on("end", done)
      //       .remove();

      //   }
      // },
      {
        tracks: grouped.length,
        content: (done) => {
          lines.transition()
            .duration(interval * 0.1)
            .ease(d3.easeQuad)
            .attr("stroke-opacity", 1)
            .on("end", done)
            .remove();


          means
           .transition()
            .duration(interval * 0.1)
            .ease(d3.easeQuad)
            .style("opacity", 0.7)
            .style("stroke-opacity", 0.7);

          svg.select(".yAxis .axis-title")
           .transition()
            .duration(interval * 0.1)
            .attr("opacity", 1)
            .text(svg.postYTitle)
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



function stdev4(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let grouped = grouping(data, xField, yField, (group)=>{
    group.mean = d3.mean(group.values, v => v[yField]);
    group.stdevSamp = d3.deviation(group.values, d => d[yField]);
    let meanI = 0;
    let delta = -1;
    group.values.forEach((v,i)=>{
      if (v[yField] < group.mean) {
        v.__deltaSum = d3.sum(group.values.filter((u,j) => j > i && u[yField] < group.mean), u => y(group.mean - u[yField]));
      } else {
        v.__deltaSum = d3.sum(group.values.filter((u,j) => j < i && u[yField] > group.mean), u => y(u[yField] - group.mean));
      }
    });
  });
  let map = d3.map(grouped, d=>d.key);

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");

  dotPlots.exit().remove();
  let shift = 30;
  let box = newDotPlots.append("rect")
    .attr("x",  - shift/2)
    .attr("width", +shift)
    .attr("y", d => y(d.mean))
    .attr("height", 0)
    .style("opacity", 0.7);

  let vBoxes = newDotPlots.selectAll(".vBox").data(d => d.values).enter()
    .append("rect")
    .attr("class", 'vBox')
    .attr("x", (d,i) => (i / (map.get(d[xField]).len) - 0.5) * shift )
    .attr("width", (d, i) => Math.max(shift / map.get(d[xField]).len, 2))
    .attr("y", (d,i) => y(d[yField]))
    .attr("height", 0)
    .style("stroke-opacity", 0)
    .style("opacity", 0);

  let mirroredBox  = newDotPlots
    .append("rect")
    .attr("transform", d => `translate(0 ${y(d.mean)}) rotate(180)`)
    .attr("y", 0)
    .attr("height", d => y(d.mean) - y(d.mean + d.stdevSamp))
    .attr("x",  -shift/2)
    .attr("width", +shift)
    .style("opacity", 0);

  let newDots = newDotPlots.selectAll(".point").data(d => d.values).enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", 0)
    .attr("cy", d => y(d[yField]))
    .attr("r", radius);

  let lines = newDotPlots
    .append("line")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", (d,i) => y(d.mean))
    .attr("y2", (d,i) => y(d.mean))
    .attr("stroke-opacity", 1);

  let steps = [

      {
        tracks: newDots.data().length,
        content: (done) => {
          let stepInterval = interval * 0.2;
          lines.transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("x1",-shift/2)
            .attr("x2", shift/2);

          newDots
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("cx", (d,i) => (i / (map.get(d[xField]).len) - 0.5) * shift + Math.max(shift / map.get(d[xField]).len, 2)/2)
            .on("end", done);
        }
      },
      {
        tracks: newDots.data().length,
        content: (done) => {
          let stepInterval = interval * 0.2;
          newDots
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("r",0 )
            .on("end", done)
            .remove();

           svg.select(".yAxis .axis-title")
            .attr("opacity", 1)
           .transition()
            .duration(stepInterval)
            .attr("opacity", 0);

          vBoxes
            .style("opacity", 1)
            .style("stroke-opacity", 1)
           .transition()
            .duration(stepInterval)
            .attr("y", (d,i) => Math.min(y(map.get(d[xField]).mean), y(d[yField])))
            .attr("height", (d,i) => Math.abs(y(map.get(d[xField]).mean) - y(d[yField])));


        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepInterval = interval * 0.4;
          let offsetDelay = interval * 0.2;



          if (opt.mirroring === "fadeIn") {
            stepInterval = stepInterval/2;
            offsetDelay = offsetDelay/2;
            box.style("opacity", 1)
             .transition()
              .delay(offsetDelay)
              .duration(stepInterval)
              .attr("x",  -shift/2)
              .attr("width", +shift)
              .attr("y", d => y(d.mean + d.stdevSamp))
              .attr("height", d => y(d.mean) - y(d.mean + d.stdevSamp))
              .on("end", done);
          } else {
            box.style("opacity", 1)
             .transition()
              .delay(offsetDelay)
              .duration(stepInterval)
              .attr("x",  -shift/2)
              .attr("width", +shift)
              .attr("y", d => y(d.mean + d.stdevSamp))
              .attr("height", d => y(d.mean - d.stdevSamp) - y(d.mean + d.stdevSamp))
              .on("end", done);
          }
          vBoxes
           .transition()
            .delay(offsetDelay)
            .duration(stepInterval)
            .attr("y", (d,i) => y(map.get(d[xField]).mean))
            .attr("height", 0)
            .remove();
        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepInterval = interval * 0.2;
          let offsetDelay = interval * 0.1;

          if (opt.mirroring === "fadeIn") {
            mirroredBox
            .attr("transform", d => `translate(0 ${y(d.mean)}) rotate(0)`)
           .transition()
            .delay(offsetDelay)
            .duration(stepInterval)
            .style("opacity", 1)
            .on("end", done);
          } else {
            grouped.forEach(done);
          }

          svg.select(".yAxis .axis-title")
           .transition()
            .delay(offsetDelay)
            .duration(stepInterval)
            .attr("opacity", 1)
            .text(svg.postYTitle)
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



function stdev8(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let grouped = grouping(data, xField, yField, (group)=>{
    group.mean = d3.mean(group.values, v => v[yField]);
    group.sum = d3.sum(group.values, v => v[yField]);
    group.stdevSamp = d3.deviation(group.values, d => d[yField]);
    let meanI = 0;
    let delta = -1;
    group.values.reduce((acc,v) => {
      v.__stdevContribution = v[yField]/group.sum;
      acc += v.__stdevContribution;
      return v.__accContribution = acc;
    }, 0);
  });
  let map = d3.map(grouped, d=>d.key);

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");

  dotPlots.exit().remove();
  let shift = 30;
  let box = newDotPlots.append("rect")
    .attr("x",  -shift/2)
    .attr("width", +shift)
    .attr("y", d => y(d.mean))
    .attr("height", 0)
    .style("opacity", 0);

  let vBoxes = newDotPlots.selectAll(".vBox").data(d => d.values).enter()
    .append("rect")
    .attr("class", 'vBox')
    .attr("x", (d,i) => (i / (map.get(d[xField]).len) - 0.5) * shift )
    .attr("width", (d, i) => Math.max(shift / map.get(d[xField]).len, 2))
    .attr("y", (d,i) => y(d[yField]))
    .attr("height", 0)
    .style("stroke-opacity", 0)
    .style("opacity", 0);

  let newDots = newDotPlots.selectAll(".point").data(d => d.values).enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", 0)
    .attr("cy", d => y(d[yField]))
    .attr("r", radius);

  let lines = newDotPlots
    .append("line")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", (d,i) => y(d.mean))
    .attr("y2", (d,i) => y(d.mean))
    .attr("stroke-opacity", 1);

  let mirroredBox  = newDotPlots
    .append("rect")
    .attr("transform", d => `translate(0 ${y(d.mean)}) rotate(180)`)
    .attr("y", 0)
    .attr("height", d => y(d.mean) - y(d.mean + d.stdevSamp))
    .attr("x",  -shift/2)
    .attr("width", +shift)
    .style("opacity", 0);

  let steps = [
    {
      tracks: grouped.length,
      content: (done) => {

        lines
         .transition()
          .duration(interval * 0.2)
          .ease(d3.easeQuad)
          .attr("x1", -shift/2)
          .attr("x2", shift/2)
          .on("end", done);

      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        let stepInterval = interval * 0.4;
        box.style("opacity", 1)
           .transition()
            .duration(stepInterval)
            .attr("y", d => y(d.mean + d.stdevSamp))
            .attr("height", d => y(d.mean) - y(d.mean + d.stdevSamp))
            .on("end", done);

        newDots
         .transition()
          .duration(stepInterval)
          .attr("cy", d => y(map.get(d[xField]).mean))
          .remove();

        svg.select(".yAxis .axis-title")
            .attr("opacity", 1)
           .transition()
            .duration(stepInterval)
            .attr("opacity", 0)
      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        let stepInterval = interval * 0.2;
        let offsetDelay = interval * 0.2;
        if (opt.mirroring === "fadeIn") {
          mirroredBox
            .attr("transform", d => `translate(0 ${y(d.mean)}) rotate(0)`)
           .transition()
            .delay(offsetDelay)
            .duration(stepInterval)
            .style("opacity", 1)
            .on("end", done);
        } else {
          mirroredBox
            .style("opacity", 1)
           .transition()
            .delay(offsetDelay)
            .duration(stepInterval)
            .attr("transform", d => `translate(0 ${y(d.mean)}) rotate(0)`)
            .on("end", done);
        }

        svg.select(".yAxis .axis-title")
         .transition()
          .delay(offsetDelay)
          .duration(stepInterval)
          .attr("opacity", 1)
          .text(svg.postYTitle)
      }
    },
    {
      tracks: grouped.length,
      content: (done) => cb()
    }
  ];

  play(steps,0);
}
function IQR(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let grouped = grouping(data, xField, yField, (group)=>{

    group.median = d3.median(group.values, v => v[yField]);
    group.Q1 = d3.quantile(group.values, 0.25, v => v[yField]);
    group.Q3 = d3.quantile(group.values, 0.75, v => v[yField]);
    group.medianIndex = (group.values.length - 1) / 2;
    group.Q1Index = group.values.filter( v=> v[yField] < group.Q1).length - 1;
    group.Q3Index = group.values.filter( v=> v[yField] < group.Q3).length - 1;

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
            .style("stroke-opacity", 0)

  let linesQ1 = newDotPlots
            .append("line")
            .attr("x1", - shift/2)
            .attr("x2", shift/2)
            .attr("y1", (d,i) => y(d.Q1))
            .attr("y2", (d,i) => y(d.Q1))
            .style("stroke-opacity", 0)

  let linesQ3 = newDotPlots
            .append("line")
            .attr("x1", - shift/2)
            .attr("x2", shift/2)
            .attr("y1", (d,i) => y(d.Q3))
            .attr("y2", (d,i) => y(d.Q3))
            .style("stroke-opacity", 0)



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
      tracks: grouped.length,
      content: (done) => {
        let stepInterval = interval * 0.3;
        let stepDelay = interval * 0.3;

        box
          .style("opacity", 1)
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .attr("y", d => y(d.Q3))
          .attr("height", d => Math.abs(y(d.Q3) - y(d.Q1)))
          .on("end", done);

        dotPlots.exit().selectAll(".point")
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("opacity", 0)
          .remove();

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
          .remove();

        linesQ1.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 0)
          .remove()
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


function IQR9(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let grouped = grouping(data, xField, yField, (group)=>{
    group.min =  d3.min(group.values, v => v[yField]);
    group.median = d3.median(group.values, v => v[yField]);
    group.Q1 = d3.quantile(group.values, 0.25, v => v[yField]);
    group.Q3 = d3.quantile(group.values, 0.75, v => v[yField]);
    group.medianIndex = (group.values.length - 1) / 2;
    group.Q1Index = group.values.filter( v=> v[yField] < group.Q1).length - 1;
    group.Q3Index = group.values.filter( v=> v[yField] < group.Q3).length - 1;

  });
  let map = d3.map(grouped, d=>d.key);
  let totalCount = d3.sum(grouped, g => g.len);
  let shift = 30;
  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");

  let cx = (d, i) => {
    let shitPadded = shift * 0.9;
    return map.get(d[xField]).Q1Index >= i ? -shitPadded/2 :
      (map.get(d[xField]).Q1Index < i && Math.floor(map.get(d[xField]).medianIndex) >= i ? -shitPadded/6 :
      (map.get(d[xField]).medianIndex < i && map.get(d[xField]).Q3Index >= i ? shitPadded/6 : shitPadded/2));
  };

  let box = newDotPlots.append("rect")
    .attr("x",   - shift/2)
    .attr("width", shift)
    .attr("y", d => y(d.median))
    .attr("height", 0)
    .style("opacity", 0);

  let newDots = newDotPlots.selectAll(".point")
    .data(d => d.values)
    .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", 0)
    .attr("cy", d => y(d[yField]))
    .style("opacity", 0)
    .style("stroke-opacity", 0)
    .attr("r", radius);

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

  let steps = [
    {
      tracks: totalCount,
      content: (done) => {

        let stepInterval = 0.05 * interval;


        dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .style("fill", grey)
            .style("stroke", grey)
            .style("opacity", 0.3)
            .on("end",done);



      }
    },
    {
      tracks: totalCount,
      content: (done) => {
        // TODO :
        // 1) Re-coloring with proper delays.

        let stepInterval = 0.1 * interval;
        let offsetInterval = 0.15 * interval;

        let v = d3.max(grouped, g => g.Q3 - g.min) / (stepInterval);
        let color = (d, i) => {
          return map.get(d[xField]).Q1Index >= i ? red :
            (map.get(d[xField]).Q1Index < i && Math.floor(map.get(d[xField]).medianIndex) >= i ? blue :
            (map.get(d[xField]).medianIndex < i && map.get(d[xField]).Q3Index >= i ? orange : green));
        };
        let delayScale = d3.scalePow().domain([0, 1]).range([0, stepInterval]).exponent(1/2);
        let delay = (d,i) => {
          let g = map.get(d[xField]);
          let quantileStartIndcies = [0, g.Q1Index+1, Math.floor(g.medianIndex) +1, g.Q3Index +1, g.len];
          let temp = quantileStartIndcies.map(qsI => i-qsI).filter(delta => delta>=0);
          let quantile = temp.length - 1;
          let qI = d3.min(temp);
          if (qI < 1) {
            return 0;
          } else if (qI < 3 ) {
            return offsetInterval * qI;
          }
          return delayScale((qI+1) / (quantileStartIndcies[quantile+1] - quantileStartIndcies[quantile])) + offsetInterval*2;
        };
        // let delay = 100;
        dotPlots.exit().selectAll(".point")
           .transition()
            .duration(0)
            .delay(delay)
            .ease(d3.easeQuad)
            .remove();

        newDots
         .transition()
            .duration(0)
            .delay(delay)
            .style("fill", color)
            .style("opacity", 0.7)
           .transition()
            .duration(offsetInterval/2)
            .delay(0)
            .ease(d3.easeQuad)
            .attr("cx", cx)
            .style("fill", color)
            .style("opacity", 0.7)
            .on("end",done);
      }
    },
    {
      tracks: grouped.length,
      content: (done) => {

        let stepInterval = interval * 0.1;
        let stepDelay = interval * 0.05;

        linesQ1.transition()
          .delay(stepDelay)
          .duration(stepInterval)
          .style("stroke-opacity", 1)
          .on("end",done);

        linesQ3.transition()
          .delay(stepDelay)
          .duration(stepInterval)
          .style("stroke-opacity", 1)
          .on("end",done);

        linesMedian.transition()
          .delay(stepDelay)
          .duration(stepInterval)
          .style("stroke-opacity", 1)
          .on("end",done);
      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        // TODO :
        // 1) Remove the points and introduce the box

        let stepInterval = interval * 0.1;
        let stepDelay = interval * 0.05;




        newDots
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 0)
          .style("opacity", 0)
          .remove();
        box
          .style("opacity", 1)
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .attr("y", d => y(d.Q3))
          .attr("height", d => Math.abs(y(d.Q3) - y(d.Q1)))
          .on("end", done);

        svg.select(".yAxis .axis-title")
            .attr("opacity", 1)
           .transition()
            .delay(stepDelay)
            .duration((stepInterval+interval * 0.15)/2)
            .attr("opacity", 0)
           .transition()
            .duration((stepInterval+interval * 0.15)/2)
            .attr("opacity", 1)
            .text(svg.postYTitle)
            .on("end", done);

      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        let stepInterval = interval * 0.1;
        let stepDelay = interval * 0.05;


        linesQ1.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0)
          .remove();

        linesQ3.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0)
          .remove()
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