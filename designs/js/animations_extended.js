var aggregations_old = {};



aggregations_old.sum = function(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let stepN = 50;
  let stepInterval = Math.floor(1000/stepN);
  let streams = new Array(stepN);
  let buffer = {};
  let grouped = d3.nest()
    .key(d => d[xField]).sortKeys(d3.ascending)
    .sortValues( (a,b) => a[yField] - b[yField])
    .entries(data);
  let map = d3.map(grouped, d=>d.key);

  grouped.forEach(group => {
    group.values.forEach((d,i) => {
      d[yField+"accSum"] = d3.sum(group.values.slice(0,i+1), e => e[yField]);
      d[yField+"index"] = i;
    });
    group.len = group.values.length;
    group.sum = d3.sum(group.values, d=> d[yField]);
    group.step = 0;
    buffer[group.key] = [];
  });


  let maxSum = d3.max(grouped, d => d.sum);
  let maxCount = d3.max(grouped, d => d.len);
  let oldY = y.copy();


  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);

  let stepIndex = 0,
      prevStepIndex=0,
      decayRate = 1,
      jumpStepIndex = 3,
      streamInterval = interval / (jumpStepIndex + 3),
      finishInterval = streamInterval,
      finalStepIndex = maxCount-1;

  function stream(pause = 0, final = false){
    let state = 0;
    let newYdomain = d3.extent(data.filter(d=> d[yField + "index"] <= stepIndex), d=> d[yField + "accSum"]);
    let oldYdomain = y.domain();
    let oldY = y.copy();

    y.domain([Math.min(oldYdomain[0], newYdomain[0], 0), Math.max(oldYdomain[1], newYdomain[1])]).nice(5);
    svg.select(".yAxis")
      .transition()
      .delay(pause)
      .duration(streamInterval)
      .call(svg.yAxis)
      .on("end", ready);

    let countPoints = dotPlots.exit().selectAll(".point").data().length;

    function newX (d){
      let offset = 20;
      if (d[yField] < 0) {
        offset = 15;
      }
      return d[yField + "index"] > stepIndex ? 0 : offset;
    }

    let v = Math.max(...dotPlots.exit().selectAll(".point").data().map(d => Math.abs(y(d[yField]) - y(d[yField+"accSum"])))) / streamInterval;

    dotPlots.exit().selectAll(".point")
     .transition()
      .duration(d=> final ? Math.abs(y(d[yField]) - y(d[yField+"accSum"]))/v : streamInterval)
      // .duration(streamInterval)
      .delay(pause)
      .ease(d3.easeQuad)
      .attr("cy", (d, i) => d[yField + "index"] > stepIndex ? y(d[yField]) : y(d[yField+"accSum"]))
      .attr("cx", newX)
      .on("end", function(){
      countPoints--;
      if(countPoints === 0){
        ready();
      }
    });


    let lines = dotPlots.exit().selectAll("line")
      .data(d => {
        let stepI = Math.min(stepIndex, d.values.length-1);
        let prevStepI = Math.min(prevStepIndex, Math.max(0, d.values.length-2));
        let currY = d.values.filter(e => e[yField + "index"] === stepI)[0][yField];
        let prevY = d.values.filter(e => e[yField + "index"] === prevStepI)[0][yField];
        if (prevY * currY < 0 && final) {
          let minimumAccSum = d3.min(d.values, e => e[yField+"accSum"]);
          let argmin = d.values.map(e => e[yField+"accSum"]).indexOf(minimumAccSum);
          return [{
              accY1: stepI === 0 ? 0 : d.values.filter(e => e[yField + "index"] === prevStepI)[0][yField+"accSum"],
              accY2: minimumAccSum,
              x: d.key,
              oldY2: 0,
              oldY1: d.values.filter(e => e[yField + "index"] === argmin)[0][yField],
              id: d.key + stepI + 'minus'
            }, {
              accY1: minimumAccSum,
              accY2: d.values.filter(e => e[yField + "index"] === stepI)[0][yField+"accSum"],
              x: d.key,
              oldY2: d.values.filter(e => e[yField + "index"] === argmin)[0][yField],
              oldY1: currY,
              id: d.key + stepI + 'plus'
            }];
        }

        return [{
          accY1: d.values.filter(e => e[yField + "index"] === stepI)[0][yField+"accSum"],
          accY2: stepI === 0 ? 0 : d.values.filter(e => e[yField + "index"] === prevStepI)[0][yField+"accSum"],
          x: d.key,
          oldY2: 0,
          oldY1: currY,
          id: d.key + stepI
        }];
      }, d => d.id);

    dotPlots.exit().selectAll("line")
     .transition()
      .duration(streamInterval)
      .delay(pause)
      .ease(d3.easeQuad)
      .attr("y1", d => y(d.accY1))
      .attr("y2", d => y(d.accY2));

    let lineCount = lines.enter().data().length;
    lines.enter().append("line")
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", d => oldY(d.oldY1))
      .attr("y2", d => oldY(d.oldY2))
     .transition()
      .duration(streamInterval)
      .delay(pause)
      .ease(d3.easeQuad)
      .attr("x1", d => d.oldY1 > 0 ? 20 : 15)
      .attr("x2", d => d.oldY1 > 0 ? 20 : 15)
      .attr("y1", d => y(d.accY1))
      .attr("y2", d => y(d.accY2))
      .attr("class", "old")
      .on("end", function(){
      lineCount--;
      if(lineCount === 0){
        ready();
      }
    });


    function ready(){
      state ++;

      if (!final && state === 3) {
        state = 0;
        prevStepIndex = stepIndex;
        stepIndex += 1;
        // streamInterval = interval * (0.2 - 0.1 * stepIndex / jumpStepIndex);
        // streamInterval = streamInterval * 0.5 + streamInterval * 0.5 * (4 / (stepIndex+3));
        streamInterval = streamInterval * decayRate;

        if (stepIndex > jumpStepIndex) {
          streamInterval = streamInterval;
          stepIndex = finalStepIndex;
          stream(0, true);
        } else {
          stream();
        }
      } else if (final && (state === 3)) {
        finish(finishInterval);
      }
    }
  }
  //Last step! give different time

  stream();
  function finish(finishInterval) {
    let finishDelay = finishInterval * 0.5;
    dotPlots.exit().selectAll("line")
      .attr("stroke-opacity", 1)
     .transition()
      .delay(finishDelay)
      .duration(finishInterval * 0.5)
      .ease(d3.easeQuad)
      .attr("stroke-opacity", 0)
      .remove();

    dotPlots.exit().selectAll(".point")
      .attr("stroke-opacity", 1)
     .transition()
      .delay(finishDelay)
      .duration(finishInterval * 0.5)
      .ease(d3.easeQuad)
      .attr("stroke-opacity", 0)
      .remove();

    let N = dotPlots.enter().data().length;
    dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)")
     .append("circle")
      .attr("cy", (d, i) => y(d.sum))
      .attr("cx", 20)
      .attr("r", radius)
     .transition()
      .delay(finishDelay)
      .duration(finishInterval * 0.5)
      .ease(d3.easeQuad)
      .attr("cx", 0)
      .on("end", () => {
      N--;
      if (N===0) {
        cb();
      }
    });
  }
};


aggregations_old.median = function(svg, opt, cb){
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
    group.len = group.values.length;
    group.median = d3.median(group.values, d=>d[yField]);
    group.values.forEach((d,i) => d.groupIndex = i);
  });

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);

  dotPlots.exit().selectAll(".point").attr("stroke-opacity", 1);
  let newDotPlots = dotPlots.enter()
   .append("g")
    .attr("class", "dotPlot")
    .attr("transform", d => "translate(" + x(d.key) + ",0)");



  let maxStep = 4;
  let stepIntervalTotal = interval * 0.75;
  let stepInterval = stepIntervalTotal / (maxStep+1);
  let intervalRate = 1;
  let stepN = Math.min(Math.floor(d3.max(grouped, g => g.len - 1)/2), maxStep);
  let steps = [
      {
        tracks: 1,
        content: (done) => {
          dotPlots.exit().selectAll("line")
            .data(d=> [d.values[0], d.values[d.values.length - 1]], (d,i) => d[xField] + i)
            .enter()
           .append("line")
            .attr("x1", - 4 * radius)
            .attr("x2", 4 * radius)
            .attr("y1", (d,i) => y(d[yField]) + (i===0 ? radius : -radius))
            .attr("y2", (d,i) => y(d[yField]) + (i===0 ? radius : -radius))
            .attr("stroke-opacity", 1);

          dotPlots.exit().selectAll("line")
           .transition()
            .duration(0)
            .on("end", done);
        }
      }
    ];
  for (let i = 0; i < stepN; i++) {
    steps.push({
      tracks: grouped.filter(g => g.len > (i+1)*2).length * 2,
      content: (done) => { step(i, done); }
    });

  }
  if (stepN >= maxStep) {
    let remainedN = d3.sum(grouped, g=> g.len -  (Math.min((stepN-1)*2, (g.len + g.len %2) - 2)) - (g.len % 2 === 0 ? 2 : g)) ;
    stepInterval = stepIntervalTotal / (maxStep+2);
    steps.push({
      tracks: remainedN,
      content: (done) => step(stepN - 1, done, true)
    });
  }
  steps.push({
    tracks: 1,
    content: (done) => finish()
  });

  function step(stepI, done, flush=false){
    let modfiedStepInterval = stepInterval * Math.pow(intervalRate, stepI);
    let filtered = dotPlots.exit()
      .selectAll(".point")
      .filter((d, i) => {
      let len = map.get(d[xField]).len;
      let noPoints = Math.floor((len -1)/2) <= stepI;
      let maxI = len - 1 - stepI;
      if (noPoints){
        return false;
      }
      return !flush ? [stepI, maxI].indexOf(i) >= 0 : i >= stepI && i <= maxI && 0.5 < Math.abs((len -1)/2-i) ;
    });

    let v = Math.max(...filtered.data().map(e => map.get(e[xField]).len/2 - Math.abs(e.groupIndex-map.get(e[xField]).len/2))) / stepInterval;
    function flushDelay(d){
      return (map.get(d[xField]).len/2 - Math.abs(d.groupIndex-map.get(d[xField]).len/2)) / v;
    }

    filtered.attr("cx", 0)
     .transition()
      .delay((d,i) => {
      return flush ? flushDelay(d) : 0;
    }).duration(flush? stepInterval * 2 : modfiedStepInterval)
      .attr("cx", 20)
      .on("start", (d, i) => {
      if (!flush){
        let len = map.get(d[xField]).len;
        let isMin = d.groupIndex < (len-1)/2;
        let newD = map.get(d[xField]).values[(isMin ? d.groupIndex + 1 : d.groupIndex - 1)];

        dotPlots.exit()
          .selectAll("line")
          .filter((e,j) => e[xField] === d[xField] && ((isMin && j === 0) || (!isMin && j === 1)))
          .transition()
          .duration(modfiedStepInterval)
          .attr("y1", d => y(newD[yField]) + (isMin ? radius : -radius))
          .attr("y2", d => y(newD[yField]) + (isMin ? radius : -radius));
      }
    }).on("end", done)
     .transition()
      .duration(interval*0.1)
      .attr("stroke-opacity", 0)
      .style("opacity", 0);


    if (flush) {
      let flushValue = function(d, i) {
        let group = map.get(d[xField]);
        if (group.len % 2 === 0) {
          return y(group.values[Math.floor((group.len - 1 + (i % 2)) / 2)][yField]) + (i%2===0 ? +1 : -1) * radius;
        }
        return y(group.values[Math.floor((group.len - 1) / 2)][yField]) + (i%2===0 ? +1 : -1) * radius;
      };

      dotPlots.exit()
        .selectAll("line")
       .transition()
        .duration(stepInterval )
        .attr("y1", flushValue)
        .attr("y2", flushValue);
    }

  }
  play(steps,0);

  function finish(){

    dotPlots.exit()
      .selectAll("line")
     .transition()
      .delay(interval*0.1)
      .duration(interval*0.1)
      .ease(d3.easeLinear)
      .attr("y1", d => y(map.get(d[xField]).median))
      .attr("y2", d => y(map.get(d[xField]).median))
      .remove();

    dotPlots.exit()
      .selectAll(".point")
     .transition()
      .delay(interval*0.1)
      .duration(interval*0.1)
      .remove();

    let N = newDotPlots.data().length;
    newDotPlots.append("circle")
      .attr("class", "point")
      .attr("cx", 0)
      .attr("cy", (d, i) => y(map.get(d.key).median))
      .attr("r", radius)
      .attr("stroke-opacity", 0)
     .transition()
      .delay(interval*0.1)
      .duration(interval*0.1)
      .attr("stroke-opacity", 1)
      .on("end", () => {
      N--;
      if(N===0){
        cb();
      }
    });
  }

  function play(steps, i){
    let done = genDone(steps[i].tracks, () => play(steps, i+1));
    steps[i].content(done);
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
};



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

function sum(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let grouped = grouping(data, xField, yField, (group)=>{
    group.values.reduce((acc, d, i) => {
      d[yField+"-prevAccSum"] = acc;
      acc += d[yField];
      d[yField+"-accSum"] = acc;
      d[yField+"-index"] = i;
      return acc;
    }, 0);
    group.sum = group.values[group.len -1][yField+"-accSum"];
    group.step = 0;
  });
  let map = d3.map(grouped, d=>d.key);

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");


  let shift = 0;

  let maxSum = d3.max(grouped, d => d.sum);
  let maxCount = d3.max(grouped, d => d.len);
  let totalCount = d3.sum(grouped, d => d.len);
  let oldY = y.copy();

  y.domain([0, maxSum]).nice(5); //TODO what about negative values?

   dotPlots.exit()
    .selectAll(".point")
    .remove();

  let newDots = newDotPlots.selectAll(".point")
    .data(d=> d.values)
   .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", 0)
    .attr("cy", d => oldY(d[yField]))
    .attr("r", radius);

  let vLines = newDotPlots.selectAll("line")
    .data(d=> d.values)
   .enter()
    .append("line")
    .attr("stroke-opacity", 0)
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", d => y(0))
    .attr("y2", d => y(d[yField]));

  let steps = [
    {
      tracks: 1,
      content: (done)=>{
        let stepInterval = interval * 0.2;
        svg.select(".yAxis")
         .transition()
          .duration(stepInterval)
          .call(svg.yAxis)
          .on("end", done);

        newDots
         .transition()
          .duration(stepInterval)
          .attr("cy", d => y(d[yField]));

      }
    },{
      tracks: totalCount - grouped.length,
      content: (done) => {

        let intervalAtOnce = interval * 0.4;
        let delayAtOnce = 0.25 * intervalAtOnce;
        let durationAtOnce = 0.75 * intervalAtOnce;

        newDots.filter((d,i) => i < map.get(d[xField]).len -1)
         .transition()
          .delay((d,i) => opt.oneByOne ? i / maxCount * interval * (opt.instantDisapear? 0.4 : 0.2) : delayAtOnce)
          .duration(!opt.oneByOne ? durationAtOnce : (opt.instantDisapear ? 0 : interval * 0.1))
          .attr("cx", shift)
          .attr("cy", d => y(d[yField+"-accSum"]))
          .attr("r", 1/2 * radius)
         .transition()
          .delay(opt.instantDisapear ? 0 : interval * 0.2)
          .duration(1)
          .on("end", function(){
          done();
          d3.select(this).remove();
        });

        newDots.filter((d,i) => i === map.get(d[xField]).len -1)
          .transition()
          .delay((d,i) => opt.oneByOne ? interval * (opt.instantDisapear? 0.4 : 0.2) : delayAtOnce)
          .duration(!opt.oneByOne ? durationAtOnce : (opt.instantDisapear ? 0 : interval * 0.1))
          .attr("cx", shift)
          .attr("cy", d => y(d[yField+"-accSum"]));

        vLines
          .style("stroke", grey)
          .attr("stroke-opacity", 1)
         .transition()
          .delay((d,i) => opt.oneByOne ? i / maxCount * interval * (opt.instantDisapear? 0.4 : 0.2) : delayAtOnce)
          .duration(!opt.oneByOne ? durationAtOnce : (opt.instantDisapear ? 0 : interval * 0.1))
          .attr("stroke-opacity", 0.7)
          .attr("x1", shift)
          .attr("x2", shift)
          .attr("y1", d => y(d[yField+"-accSum"]))
          .attr("y2", d => y(d[yField+"-prevAccSum"]));
      }
    },{
      tracks: 1,
      content: (done) => {

        let finishInterval = interval * 0.2;
        let finishDelay = finishInterval * 0.5;
        vLines
         .transition()
          .delay(finishDelay)
          .duration(finishInterval * 0.5)
          .ease(d3.easeQuad)
          .attr("stroke-opacity", 0)
          .remove();

        let doneCount = newDotPlots.data().length;
        newDots
         .transition()
          .delay(finishDelay)
          .duration(finishInterval * 0.5)
          .ease(d3.easeQuad)
          .attr("cx", 0)
          .attr("r", radius)
          .on("end", () => {
          doneCount--;
          if (doneCount===0) {
            cb();
          }
        });
      }
    }
  ];
  play(steps,0);

}
function sum2(svg, opt, cb){
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
    group.values.forEach(d => d.parent = group);
  });
  let map = d3.map(grouped, d=>d.key);

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

  let newDots = newDotPlots.selectAll(".point")
    .data(d=> d.values)
   .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", 0)
    .attr("cy", d => oldY(d[yField]))
    .attr("r", radius);

  let vLines = newDotPlots.selectAll("line")
    .data(d=> d.values)
   .enter()
    .append("line")
    .style("stroke-opacity", 0)
    .attr("x1", (d, i) => shift * (i / d.parent.len - 0.5))
    .attr("x2", (d, i) => shift * (i / d.parent.len - 0.5))
    .attr("y1", d => oldY(d[yField]))
    .attr("y2", d => oldY(d[yField]))
    .style("stroke", grey);


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
          .attr("r", radius/2)
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
          .style("stroke-opacity", 1)
          .attr("y1", oldY(0))
          .on("end", done);


      }
    },
    {
      tracks: 1,
      content: (done)=>{
        let stepInterval = interval * 0.15;
        svg.select(".yAxis")
         .transition()
          .duration(stepInterval)
          .call(svg.yAxis)
          .on("end", done);

        vLines
         .transition()
          .duration(stepInterval)
          .attr("y2", d => y(d[yField]));

        newDots
         .transition()
          .duration(stepInterval)
          .attr("cy", d => y(d[yField]))

      }
    },{
      tracks: totalCount,
      content: (done) => {

        let intervalAtOnce = interval * 0.5;
        let delayAtOnce = 0.2 * intervalAtOnce;
        let durationAtOnce = 0.8 * intervalAtOnce;

        if (opt.mode === "oneByOne") {
          vLines
           .transition()
            .delay((d,i) => i / maxCount * delayAtOnce + delayAtOnce)
            .duration(durationAtOnce * 0.5)
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", d => y(d[yField+"-accSum"]))
            .attr("y2", d => y(d[yField+"-prevAccSum"]))

          newDots
           .transition()
            .delay((d,i) => i / maxCount * delayAtOnce + delayAtOnce)
            .duration(durationAtOnce * 0.5)
            .attr("cx", 0)
            .attr("cy", d => y(d[yField+"-accSum"]))
           .transition()
            .duration(0)
            .attr("r", (d,i) => i===d.parent.len -1 ? radius : 0)
            .on("end", done);

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
              .attr("r", (d,i) => i===d.parent.len -1 ? radius : 0)
              .on("end", done);
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
            .attr("r", (d,i) => i===d.parent.len -1 ? radius : 0)
            .on("end", done);
        }
      }
    },{
      tracks: totalCount,
      content: (done) => {

        let finishInterval = interval * 0.15;
        let finishDelay = finishInterval * 0.5;

        vLines
         .transition()
          .delay(finishDelay)
          .duration(finishInterval * 0.5)
          .ease(d3.easeQuad)
          .attr("stroke-opacity", 0)
          .on("end", done)
          .remove();


        newDots
          .filter((d,i) =>  i!==d.parent.len -1)
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



function median4(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;

  let dotPlots = svg.selectAll(".dotPlot");
  let dots = dotPlots.selectAll(".point");

  let grouped = grouping(data, xField, yField, (group)=>{
    group.min = group.values[0][yField];
    group.median = d3.median(group.values, v => v[yField]);
    group.medianIndex = (group.values.length - 1) / 2;
  });
  let map = d3.map(grouped, d=>d.key);

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");



  let upperPoints = dotPlots.exit().selectAll(".point")
            .filter( (d, i) => map.get(d[xField]).medianIndex < i);
  let lowerPoints = dotPlots.exit().selectAll(".point")
            .filter( (d, i) => map.get(d[xField]).medianIndex > i);
  let medians = newDotPlots
    .append("circle")
    .attr("cx", 0)
    .attr("cy", d => y(d.median))
    .attr("r", radius)
    .style("opacity", 0)
    .style("stroke-opacity", 0);


  let lines = newDotPlots
            .append("line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", (d,i) => y(d.min))
            .attr("y2", (d,i) => y(d.min))
            .attr("stroke-opacity", 1);

  let texts = newDotPlots
            .append("text")
            .attr("x", 10)
            .attr("y", d => y(d.median) - 8)
            .attr("dy", ".35em")
            .text("50%")
            .style("opacity", 0);

  let steps = [
      {
        tracks: grouped.length,
        content: (done) => {
          lines.transition()
            .duration(interval * 0.2)
            .ease(d3.easeQuad)
            .attr("x1", - 15  - radius)
            .attr("x2", 15 +  radius)
            .on("end", done);
        }
      },
      {
        tracks: lowerPoints.data().length,
        content: (done) => {
          let v = d3.max(grouped, g => g.median- g.min) / (interval * 0.2);
          lowerPoints
           .transition()
            .duration(0)
            .ease(d3.easeQuad)
            .delay(d=> Math.abs(d[yField] - map.get(d[xField]).min) / v )
            .style("fill", orange)
            .style("stroke", orange)
            .on("end", done);

          lines.transition()
            .duration(interval * 0.2)
            .ease(d3.easeQuad)
            .attr("y1", (d,i) => y(d.median))
            .attr("y2", (d,i) => y(d.median))
            .on("end", done);

        }
      },
      {
        tracks: grouped.length,
        content: (done) => {

          texts
           .transition()
            .duration(interval * 0.2)
            .ease(d3.easeQuad)
            .style("opacity", 0.7)
            .on("end", done);
        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          lines.transition()
            .duration(interval * 0.2)
            .ease(d3.easeQuad)
            .delay(interval * 0.2)
            .attr("x1", 0)
            .attr("x2", 0)
            .on("end", done)
            .remove();

          texts
           .transition()
            .duration(interval * 0.2)
            .ease(d3.easeQuad)
            .delay(interval * 0.2)
            .style("opacity", 0)
            .remove();

          dotPlots.exit().selectAll(".point")
           .transition()
            .duration(interval * 0.2)
            .delay(interval * 0.2)
            .ease(d3.easeQuad)
            .style("opacity", 0)
            .style("stroke-opacity", 0)
            .remove();

          medians
           .transition()
            .duration(interval * 0.2)
            .delay(interval * 0.1)
            .ease(d3.easeQuad)
            .style("opacity", 0.7)
            .style("stroke-opacity", 0.7);
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
function median5(svg, opt, cb){
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
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");


  let medians = newDotPlots
    .append("circle")
    .attr("cx", 0)
    .attr("cy", d => y(d.median))
    .attr("r", radius)
    .style("opacity", 0)
    .style("stroke-opacity", 0);


  let shift = 30;
  let lines = newDotPlots
    .append("line")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", (d,i) => y(d.median))
    .attr("y2", (d,i) => y(d.median))
    .attr("stroke-opacity", 0);



  let steps = [
      {
        tracks: totalCount,
        content: (done) => {
          let stepInterval = 0.2 * interval;
          let color = (d,i) => {
            return i > map.get(d[xField]).medianIndex ? green : (i !== map.get(d[xField]).medianIndex ? orange : blue);
          };

          if(opt.wave){
            dotPlots.exit().selectAll(".point")
             .transition()
              .duration(stepInterval)
              .delay((d,i) => Math.abs(i / (map.get(d[xField]).len-1) - 0.5) * stepInterval )
              .ease(d3.easeQuad)
              .style("stroke", color)
              .style("fill", color)
              .attr("cx", (d,i) => (i / (map.get(d[xField]).len-1) - 0.5) >0 ? shift/2 : -shift/2 )
              .on("end", done);
          } else {
            if (opt.discrete) {
              dotPlots.exit().selectAll(".point")
               .transition()
                .duration(stepInterval)
                .ease(d3.easeQuad)
                .style("stroke", color)
                .style("fill", color)
                .attr("cx", (d,i) => (i / (map.get(d[xField]).len-1) - 0.5) >0 ? shift/2 : -shift/2 )
                .on("end", done);
            } else {
              dotPlots.exit().selectAll(".point")
               .transition()
                .duration(stepInterval)
                .ease(d3.easeQuad)
                .style("stroke", color)
                .style("fill", color)
                .attr("cx", (d,i) => (i / (map.get(d[xField]).len-1) - 0.5) *shift )
                .on("end", done);
            }
          }
        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepInterval = 0.2* interval;

          if (opt.lineDirection === "vertical") {
            lines
             .transition()
              .duration(stepInterval)
              .ease(d3.easeQuad)
              .attr("y1",d => y(d.median) - shift/2)
              .attr("y2",d => y(d.median) + shift/2)
              .attr("stroke-opacity", 1)
              .on("end", done);

          } else {
            lines.transition()
              .duration(stepInterval)
              .ease(d3.easeQuad)
              .attr("x1", shift/2)
              .attr("x2", -shift/2)
              .attr("stroke-opacity", 1)
              .on("end", done);
          }

        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepDuration = 0.2 * interval;
          let stepDelay = 0.4 * interval;
          dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("opacity", 0)
            .style("stroke-opacity", 0)
            .remove();


          medians
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("opacity", 0.7)
            .style("stroke-opacity", 1)
            .on("end",done);

          lines.transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .attr("stroke-opacity", 0)
            .remove(0);

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

function median6(svg, opt, cb){
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
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");

  let shift = 30;
  let xOffset = radius;
  let medians = newDotPlots
    .append("circle")
    .attr("cx", 0)
    .attr("cy", d => y(d.median))
    .attr("r", radius)
    .style("opacity", 0)
    .style("stroke-opacity", 0);

  let lines = newDotPlots
    .append("line")
    .attr("x1", - shift/2)
    .attr("x2", shift/2)
    .attr("y1", (d,i) => y(d.median))
    .attr("y2", (d,i) => y(d.median))
    .attr("stroke-opacity", 0);




  let leftLines = newDotPlots
            .append("line")
            .attr("x1", -3)
            .attr("x2", -shift/2)
            .attr("y1", (d,i) => y(d.median) - 5)
            .attr("y2", (d,i) => y(d.median) - 5)
            .attr("stroke-opacity", 0);

  let rightLines = newDotPlots
            .append("line")
            .attr("x1", 3)
            .attr("x2", shift/2)
            .attr("y1", (d,i) => y(d.median) - 5)
            .attr("y2", (d,i) => y(d.median) - 5)
            .attr("stroke-opacity", 0);
  let leftCross = newDotPlots
    .append("line")
    .attr("x1", -shift/4 + 1 - 2)
    .attr("x2", -shift/4 - 1 - 2)
    .attr("y1", (d,i) => y(d.median)+3 - 5)
    .attr("y2", (d,i) => y(d.median)-3 - 5)
    .attr("stroke-opacity", 0);
  let rightCross = newDotPlots
    .append("line")
    .attr("x1", shift/4 + 1 + 2)
    .attr("x2", shift/4 - 1 + 2)
    .attr("y1", (d,i) => y(d.median)+3 - 5)
    .attr("y2", (d,i) => y(d.median)-3 - 5)
    .attr("stroke-opacity", 0);

  let steps = [
    {
        tracks: totalCount,
        content: (done) => {
          let stepInterval = 0.2 * interval;
          let color = (d,i) => {
            return i > map.get(d[xField]).medianIndex ? orange : (i !== map.get(d[xField]).medianIndex ? green : blue);
          };
          lines
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .style("stroke-opacity", 1)


          dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .style("stroke", color)
            .style("fill", color)
            .on("end",done);

        }
      },
      {
        tracks: totalCount,
        content: (done) => {
          let stepInterval = 0.2 * interval;
          let cx = (d,i) => {

            return (i / (map.get(d[xField]).len - 1) - 0.5) * shift +
              (map.get(d[xField]).medianIndex > i ? -offset :
                (map.get(d[xField]).medianIndex < i ? +offset : 0)
              );
          };
          let offset = 0;
          let cy = (d,i) => {
            return y(map.get(d[xField]).median) +
              (map.get(d[xField]).medianIndex > i ? offset :
                (map.get(d[xField]).medianIndex < i ? -offset : 0 )
              );
          };
          dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("cy", cy)
            .attr("cx", cx)
            .on("end",done);

          lines
           .transition()
            .duration(0)
            .delay(stepInterval)
            .ease(d3.easeQuad)
            .style("stroke-opacity", 0)
            .remove();
        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepDuration = 0.1 * interval;
          let stepDelay = 0.1 * interval;

          leftCross
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("stroke-opacity", 1)
            .on("end", done);

          rightCross
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("stroke-opacity", 1);

          leftLines
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("stroke-opacity", 1);
          rightLines
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("stroke-opacity", 1);


        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepDuration = 0.15 * interval;
          let stepDelay = 0.25 * interval;


          dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("opacity", 0)
            .style("stroke-opacity", 0)
            .on("end",done)
            .remove();

          leftCross
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("stroke-opacity", 0);
          rightCross
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("stroke-opacity", 0);

          leftLines
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("stroke-opacity", 0);
          rightLines
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("stroke-opacity", 0);

          medians
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("opacity", 0.7)
            .style("stroke-opacity", 1)
            .on("end",done);


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
          let delayScale = d3.scaleLog().range([stepInterval/2, stepInterval]).domain([1, 2]);
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
            .delay(stepInterval*0.1)
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
            .delay(offsetInterval*0.8/2)
            .duration(offsetInterval*0.8/2)
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
            .delay(offsetInterval*0.8/2)
            .duration(offsetInterval*0.8/2)
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

function median9(svg, opt, cb){
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
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");


  let medians = newDotPlots
    .append("circle")
    .attr("cx", 0)
    .attr("cy", d => y(d.median))
    .attr("r", radius)
    .style("opacity", 0)
    .style("stroke-opacity", 0);

  let lines = newDotPlots
    .append("line")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", (d,i) => y(d.median))
    .attr("y2", (d,i) => y(d.median))
    .attr("stroke-opacity", 0);

  let shift = 30;
  let xOffset = radius;



  let steps = [
    {
      tracks: totalCount,
      content: (done) => {
        let stepInterval = 0.1 * interval;
        let color = (d,i) => {
          return i > map.get(d[xField]).medianIndex ? orange :
          (i !== map.get(d[xField]).medianIndex ? green : blue);
        };
        let offset = 0;
        let cx = (d,i) => {
          return (i / (map.get(d[xField]).len - 1) - 0.5) * shift +
            (map.get(d[xField]).medianIndex > i ? -offset :
              (map.get(d[xField]).medianIndex < i ? +offset : 0)
            );
        };
        lines
          .style("stroke-opacity", 1)
         .transition()
          .duration(stepInterval)
          .ease(d3.easeQuad)
          .attr("x1", - shift/2)
          .attr("x2", shift/2);

        dotPlots.exit().selectAll(".point")
         .transition()
          .duration(stepInterval)
          .ease(d3.easeQuad)
          .style("stroke", color)
          .style("fill", color)
          .attr("cx", cx)
          .on("end",done);

        }
      },
      {
        tracks: totalCount,
        content: (done) => {
          let stepInterval = 0.1 * interval;
          let stepDelay = 0.2 * interval;
          let offset = 0;
          let cy = (d,i) => {
            return y(map.get(d[xField]).median) +
              (map.get(d[xField]).medianIndex > i ? offset :
                (map.get(d[xField]).medianIndex < i ? -offset : 0 )
              );
          };
          let neatR = (d,i) => { return Math.max(Math.min(shift / map.get(d[xField]).len / 2, radius) , 1.5) };
          dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepInterval)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .attr("cy", cy)
            .attr("r", neatR)
            .on("end",done);

          lines
           .transition()
            .duration(stepInterval)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("stroke-opacity", 0)
            .remove();
        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepDuration = 0.15 * interval;
          let stepDelay = 0.45 * interval;


          dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("opacity", 0)
            .style("stroke-opacity", 0)
            .on("end",done)
            .remove();


          medians
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("opacity", 0.7)
            .style("stroke-opacity", 1)
            .on("end",done);


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

function median10(svg, opt, cb){
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
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");


  let medians = newDotPlots
    .append("circle")
    .attr("cx", 0)
    .attr("cy", d => y(d.median))
    .attr("r", radius)
    .style("opacity", 0)
    .style("stroke-opacity", 0);

  let lines = newDotPlots
    .append("line")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", (d,i) => y(d.median))
    .attr("y2", (d,i) => y(d.median))
    .attr("stroke-opacity", 0);

  let shift = 30;
  let xOffset = radius;
  let yOffset = radius + 3;


  let steps = [
    {
      tracks: totalCount,
      content: (done) => {
        let stepInterval = 0.2 * interval;
        let color = (d,i) => {
          return i > map.get(d[xField]).medianIndex ? orange :
          (i !== map.get(d[xField]).medianIndex ? green : blue);
        };

        lines
          .style("stroke-opacity", 1)
         .transition()
          .duration(stepInterval)
          .ease(d3.easeQuad)
          .attr("x1", - shift/2)
          .attr("x2", shift/2);

        dotPlots.exit().selectAll(".point")
         .transition()
          .duration(stepInterval)
          .ease(d3.easeQuad)
          .style("stroke", color)
          .style("fill", color)
          .on("end",done);

        }
      },
      {
        tracks: totalCount,
        content: (done) => {
          let stepInterval = 0.2 * interval;
          let offset = 0;
          let cx = (d,i) => {
            if (i === map.get(d[xField]).medianIndex) {
              return 0;
            }
            return (i / (map.get(d[xField]).len - 1) - 0.25) * 2 * shift +
              (map.get(d[xField]).medianIndex > i ? -offset :
                (map.get(d[xField]).medianIndex < i ? +offset - shift : 0)
              );
          };
          let cy = (d, i) => {
            let g = map.get(d[xField]);
            if (i === g.medianIndex) {
              return y(g.median);
            }
            return y(g.median) + (g.medianIndex > i ? + yOffset : - yOffset);
          };

          dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("cx", cx)
            .attr("cy", cy)
            .on("end",done);
        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepDuration = 0.15 * interval;
          let stepDelay = 0.35 * interval;

          lines
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .style("stroke-opacity", 0)
            .remove();

          dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("opacity", 0)
            .style("stroke-opacity", 0)
            .on("end",done)
            .remove();


          medians
           .transition()
            .duration(stepDuration)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("opacity", 0.7)
            .style("stroke-opacity", 1)
            .on("end",done);


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
function avg(svg, opt, cb){
  let data = svg.data;
  let interval = opt.interval || 1000;
  let xField = svg.xField;
  let yField = svg.yField;
  let x = svg.x;
  let y = svg.y;
  let radius = 4;

  let dotPlots = svg.selectAll(".dotPlot");

  let grouped = d3.nest()
    .key(d => d[xField]).sortKeys(d3.ascending)
    .sortValues( (a,b) => a[yField] - b[yField])
    .entries(data);
  let map = d3.map(grouped, d=>d.key);
  let maxCount = d3.max(grouped, g => g.values.length);
  grouped.forEach(group => {
    group.len = group.values.length;
    group.avg = d3.mean(group.values, d => d[yField]);
    let connectedI = 0;
    for (var i = 0; i < group.values.length - 1; i++) {
      let curr = group.values[i];
      let next = group.values[i+1];
      curr.connectedI = connectedI;
      if ( Math.abs(y(next[yField]) - y(curr[yField])) > 2*(radius+1)) {
        connectedI += 1;
      }
    }
    group.values[group.len -1].connectedI = connectedI;
    group.subGroups = d3.nest()
      .key(d => d.connectedI)
      .entries(group.values);
    group.subGroups.forEach(subG => {
      subG.parent = group;
      subG.avg = d3.mean(subG.values, d => d[yField]);
      subG.len = subG.values.length;
      subG.motherKey = group.key;
    });
    group.subGroups = group.subGroups.sort((a,b) => a.len - b.len);
    group.subMap = d3.map(group.subGroups, d => d.key);
  });
  
  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  dotPlots.exit().remove();
  dotPlots = dotPlots.enter()
    .append("g")
    .attr("class", "dotPlot")
    .attr("transform", d => "translate(" + x(d.key) + ",0)")
    .style('filter', function (d) { return 'url(#gooeyCodeFilter-' + d.key + opt.gooey + ')'; });



  let r = d3.scalePow().range([radius, radius*4]).domain([1, maxCount]).exponent(0.5);

  let subGroups = dotPlots.selectAll(".subGroup")
    .data(d => d.subGroups)
   .enter()
    .append("g")
    .attr("class", "subGroup")
    .attr("transform", d => "translate(0, 0)");

  avgCircles = dotPlots.append("circle")
    .attr("class", "avgCircle")
    .attr("cy", d => y(d.avg))
    .attr("r", 0)
    .style("opacity", 1)
    .style("stroke-opacity", 1)

  
  subGroups.selectAll(".point")
    .data(d => d.values)
   .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cy", d => y(d[yField]))
    .style("opacity", 1)
    .style("stroke-opacity", 1)
    .attr("r", radius);

  let v = d3.max(grouped, g => d3.max(g.subGroups, subG => d3.max(subG.values, val => Math.abs(y(subG.avg) - y(val[yField]))))) / (interval * 0.4);
  // local movement
  subGroups.selectAll(".point")
   .transition()
    .duration(d => Math.abs(y(map.get(d[xField]).subMap.get(d.connectedI).avg) - y(d[yField])) / v)
    .attr("cy", d => y(map.get(d[xField]).subMap.get(d.connectedI).avg))
    .style("opacity", 0)
    .style("stroke-opacity", 0)
    .remove();

  //local center of mass
  subGroups.append("circle")
    .attr("cy", d => y(d.avg))
    .attr("r", radius)
    .style("opacity", 1)
    .style("stroke-opacity", 1)
   .transition()
    .duration(interval * 0.8)
    .ease(d3.easeQuadOut)
    .attr("r", d => r(d.len));

  //subGroup movement
  subGroups.transition()
    .duration(interval * 0.8)
    .attr("transform", d => "translate(0, "+(y(d.parent.avg) - y(d.avg))+")")
    .remove();

  //global center of mass
  let N = avgCircles.data().length;
  avgCircles
   .transition()
    .delay(interval * 0.4)
    .duration(0)
    .attr("r",e => r(d3.max(e.subGroups, subG => subG.len) * 0.3))
   .transition()
    .duration(interval * 0.3)
    .attr("r",e => r(e.len) )
   .transition()
    .duration(0)
    .style("opacity", 0.7)
    .style("stroke-opacity", 0.7)
   .transition()
    .delay(interval * 0.1)
    .duration(interval * 0.1)
    .attr("r",e => radius )
    .on("end", ()=>{
    N--;
    if(N===0){
      cb();
    }
  });

  svg.blurValues
    .transition()
    .duration(interval * 0.4)
    .attrTween('values', function (d) {
      return d3.interpolateString(svg.blurStable, svg.blurIn);
  }).transition()
    .delay(interval * 0.2)
    .duration(interval * 0.4)
    .attrTween('values', function (d) {
      return d3.interpolateString(svg.blurIn, svg.blurStable);
  });

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

function avg4(svg, opt, cb){
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
  let shift = 30;

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");

  dotPlots.exit().remove();




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
    .style("stroke-opacity", 0)
    .style("opacity", 0);

  let newDots = newDotPlots.selectAll(".point").data(d => d.values).enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", 0)
    .attr("cy", d => y(d[yField]))
    .attr("r", radius);

  // let lines = newDotPlots
  //           .append("line")
  //           .attr("x1", 0)
  //           .attr("x2", 0)
  //           .attr("y1", (d,i) => y(d.mean))
  //           .attr("y2", (d,i) => y(d.mean))
  //           .attr("stroke-opacity", 1);

  let v2 = d3.max(grouped, g => {
    return d3.max(g.values, v => Math.abs(y(v[yField]) - y(0)));
  }) / (interval * 0.15);

  let steps = [

      {
        tracks: newDots.data().length,
        content: (done) => {

          // lines.transition()
          //   .duration(interval * 0.2)
          //   .ease(d3.easeQuad)
          //   .attr("x1", - 15  - radius)
          //   .attr("x2", 15 +  radius);

          newDots
           .transition()
            .duration(interval * 0.2)
            .ease(d3.easeQuad)
            .attr("cx", (d,i) => (i / (map.get(d[xField]).len) - 0.5) * shift + Math.max(shift / map.get(d[xField]).len, 2) /2)
            .on("end", done);
        }
      },
      {
        tracks: newDots.filter(d => d[yField] > map.get(d[xField]).mean).data().length,
        content: (done) => {

          // newDots
          //   .filter(d => d[yField] > map.get(d[xField]).mean)
          //  .transition()
          //   .duration(interval * 0.2)
          //   .ease(d3.easeQuad)
          //   .attr("r",0 )
          //   .on("end", done)
          //   .remove();


          vBoxes
            .style("opacity", 0.7)
            .style("stroke-opacity", 1)
           .transition()
            .duration((d,i) => Math.abs(y(d[yField]) - y(0)) / v2)
            .delay((d,i) => interval * 0.15 - Math.abs(y(d[yField]) - y(0)) / v2)
            .ease(d3.easeQuadIn)
            .attr("height", (d,i) => Math.abs(y(d[yField]) - y(0)))
            .on("end", done);

        }
      },
      {
        tracks: newDots.data().length,
        content: (done) => {
          let offset = 0.15 * interval;
          let stepInterval = interval * 0.15;

          newDots
           .transition()
            .delay(offset)
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("cy", (d,i) => y(map.get(d[xField]).mean))

          vBoxes.transition()
            .delay(offset)
            .duration(stepInterval)
            .attr("y", (d,i) => y(map.get(d[xField]).mean))
            .attr("height", (d,i) => Math.abs(y(map.get(d[xField]).mean) - y(0)))
            .on("end", done);

        }
      },

      {
        tracks: grouped.length,
        content: (done) => {
          let offset = 0.15 * interval;
          let stepInterval = interval * 0.15;
          // lines.transition()
          //   .delay(interval * 0.2)
          //   .duration(interval * 0.1)
          //   .ease(d3.easeQuad)
          //   .attr("x1", 0)
          //   .attr("x2", 0)
          //   .on("end", done)
          //   .remove();

          newDots
           .transition()
            .delay(offset)
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("r", 0 )
            .remove();

          vBoxes.transition()
            .delay(offset)
            .duration(stepInterval)
            .style("opacity", 0)
            .style("stroke-opacity", 0)
            .remove();

          means
           .transition()
            .delay(offset)
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .style("opacity", 0.7)
            .style("stroke-opacity", 0.7)
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

function avg5(svg, opt, cb){
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
    .style("stroke-opacity", 0)
    .style("opacity", 0);

  let deltaBoxes = newDotPlots.selectAll(".vDeltaBox").data(d => d.values).enter()
    .append("rect")
    .attr("class", 'vBox')
    .attr("x", (d,i) => (i / (map.get(d[xField]).len) - 0.5) * shift )
    .attr("width", (d, i) => Math.max(shift / map.get(d[xField]).len, 2))
    .attr("y", (d,i) => y(d[yField]))
    .attr("height", 0)
    .style("fill", orange)
    .style("stroke-opacity", 0)
    .style("opacity", 0);

  let newDots = newDotPlots.selectAll(".point").data(d => d.values).enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", 0)
    .attr("cy", d => y(d[yField]))
    .attr("r", radius);

  // let lines = newDotPlots
  //           .append("line")
  //           .attr("x1", 0)
  //           .attr("x2", 0)
  //           .attr("y1", (d,i) => y(d.mean))
  //           .attr("y2", (d,i) => y(d.mean))
  //           .attr("stroke-opacity", 1);

  let v2 = d3.max(grouped, g => {
    return d3.max(g.values, v => Math.abs(y(v[yField]) - y(0)));
  }) / (interval * 0.15);

  let steps = [

      {
        tracks: newDots.data().length,
        content: (done) => {

          // lines.transition()
          //   .duration(interval * 0.2)
          //   .ease(d3.easeQuad)
          //   .attr("x1", - 15  - radius)
          //   .attr("x2", 15 +  radius);

          newDots
           .transition()
            .duration(interval * 0.2)
            .ease(d3.easeQuad)
            .attr("cx", (d,i) => (i / (map.get(d[xField]).len) - 0.5) * shift + Math.max(shift / map.get(d[xField]).len, 2) /2)
            .on("end", done);
        }
      },
      {
        tracks: newDots.filter(d => d[yField] > map.get(d[xField]).mean).data().length,
        content: (done) => {

          // newDots
          //  .transition()
          //   .duration(interval * 0.2)
          //   .ease(d3.easeQuad)
          //   .attr("r",radius/4)

          vBoxes
            .style("opacity", 0.7)
            .style("stroke-opacity", 1)
           .transition()
            .duration((d,i) => Math.abs(y(d[yField]) - y(0)) / v2)
            .delay((d,i) => interval * 0.15 - Math.abs(y(d[yField]) - y(0)) / v2)
            .ease(d3.easeQuadIn)
            .attr("height", (d,i) => Math.abs(y(d[yField]) - y(0)))
            .on("end", done);

        }
      },
      {
        tracks: newDots.data().length,
        content: (done) => {
          let offset = 0.15 * interval;
          let stepInterval = interval * 0.15;
          newDots
           .transition()
            .delay(offset)
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("cy", (d,i) => y(map.get(d[xField]).mean))
            .attr("r", radius/4);


          deltaBoxes
            .style("opacity", 0.7)
            .style("stroke-opacity", 1)
           .transition()
            .delay(offset)
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("y", (d,i) => Math.min(y(map.get(d[xField]).mean), y(d[yField])))
            .attr("height", (d,i) => Math.abs(y(map.get(d[xField]).mean) - y(d[yField])))
            .on("end", done);


        }
      },

      {
        tracks: grouped.length,
        content: (done) => {
          let offset = 0.15 * interval;
          let stepInterval = interval * 0.15;

          newDots
           .transition()
            .delay(offset)
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("r", 0 )
            .remove();

          deltaBoxes.transition()
            .delay(offset)
            .duration(stepInterval)
            .style("opacity", 0)
            .style("stroke-opacity", 0)
            .remove();

          vBoxes.transition()
            .delay(offset)
            .duration(stepInterval)
            .style("opacity", 0)
            .style("stroke-opacity", 0)
            .remove();

          means
           .transition()
            .delay(offset)
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .style("opacity", 0.7)
            .style("stroke-opacity", 0.7)
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

function stdev3(svg, opt, cb){
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

  let box = newDotPlots.append("rect")
    // .attr("x",  0)
    // .attr("width", 0)
    .attr("x",  -2)
    .attr("width", +4)
    .attr("y", d => y(d.mean))
    .attr("height", 0)
    .style("opacity", 0);

  let shift = 30;



  let vLines = newDotPlots.selectAll(".vLine").data(d => d.values).enter()
    .append("line")
    .attr("class", 'vLine')
    .attr("x1", (d,i) => (i / (map.get(d[xField]).len-1) - 0.5) * shift)
    .attr("x2", (d,i) => (i / (map.get(d[xField]).len-1) - 0.5) * shift)
    .attr("y1", (d,i) => y(d[yField]))
    .attr("y2", (d,i) => y(d[yField]))
    .attr("stroke-opacity", 0);

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
            .attr("x1", -shift/2)
            .attr("x2", shift/2);

          newDots
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("cx", (d,i) => (i / (map.get(d[xField]).len-1) - 0.5) * shift)
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

          vLines
            .attr("stroke-opacity", 0.3)
           .transition()
            .duration(stepInterval)
            .attr("x1", (d,i) => (i / (map.get(d[xField]).len-1) - 0.5) * shift)
            .attr("x2", (d,i) => (i / (map.get(d[xField]).len-1) - 0.5) * shift)
            .attr("y1", (d,i) => y(map.get(d[xField]).mean));

        }
      },
      {
        tracks: newDots.data().length,
        content: (done) => {
          let stepInterval = interval * 0.2;
          let v2 = d3.max(grouped, g=> d3.max(g.values, v => Math.abs(y(v[yField]) - y(g.mean)))) / stepInterval;
          let offsetDelay = interval * 0.1;
          vLines
           .transition()
            .delay(offsetDelay)
            .duration((d,i) => Math.abs(y(d[yField]) - y(map.get(d[xField]).mean)) / v2)
            .ease(d3.easeQuad)
          //   .attr("y2", (d,i) => {
          //     return d[yField] > map.get(d[xField]).mean ?
          //     ( y(map.get(d[xField]).mean) + y(d[yField]) ) / 2 :
          //     (3 * y(map.get(d[xField]).mean) - y(d[yField]))/2;
          // }).attr("y1", (d,i) => {
          //     return d[yField] > map.get(d[xField]).mean ?
          //     (3 * y(map.get(d[xField]).mean) - y(d[yField]))/2 :
          //     ( y(map.get(d[xField]).mean) + y(d[yField]) ) / 2;
          // })
            .attr("y2", d => y(map.get(d[xField]).mean)).attr("y1", d => y(map.get(d[xField]).mean))
            .attr("x1", 0)
            .attr("x2", 0)
            .on("end", done)
            .remove();

          box.style("opacity", 0.7)
           .transition()
            .delay(offsetDelay)
            .duration(stepInterval)
            // .attr("x",  -radius * 4)
            // .attr("width", +radius * 8)
            .attr("x",  -2)
            .attr("width", +4)
            .attr("y", d => y(d.mean + d.stdevSamp))
            .attr("height", d => y(d.mean - d.stdevSamp) - y(d.mean + d.stdevSamp))
            .on("end", done);


        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepInterval = interval * 0.2;
          let delay = stepInterval/2;
          box
            .style("opacity", 0.7)
           .transition()
            .duration(stepInterval)
            .delay(delay)
            .attr("x",  -shift/2)
            .attr("width", +shift)
            .on("end", done);
          // lines
          //  .transition()
          //   .duration(stepInterval)
          //   .delay(delay)
          //   .style("stroke-opacity", 0)
          //   .remove();
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


function stdev5(svg, opt, cb){
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
            .attr("x1", - shift/2)
            .attr("x2", shift/2);

          newDots
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("cx", (d,i) => (i / (map.get(d[xField]).len) - 0.5) * shift + Math.max(shift / map.get(d[xField]).len, 2)/2)
            // .attr("cx", (d,i) => (i / (map.get(d[xField]).len-1) - 0.5) * shift)
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
           .transition()
            .duration(stepInterval)
            .attr("y", (d,i) => Math.min(y(map.get(d[xField]).mean), y(d[yField])))
            .attr("height", (d,i) => Math.abs(y(map.get(d[xField]).mean) - y(d[yField])));


        }
      },
      {
        tracks: vBoxes.data().length,
        content: (done) => {
          let stepInterval = interval * 0.4;
          let offsetDelay = interval * 0.2;

          vBoxes
            .style("opacity", 0.7)
           .transition()
            .delay(offsetDelay)
            .duration(stepInterval)
            .attr("y", (d,i) => y((d.__accContribution * 2 - 1) * map.get(d[xField]).stdevSamp + map.get(d[xField]).mean))
            .attr("height", (d,i) => Math.max(Math.abs(y(d.__stdevContribution * map.get(d[xField]).stdevSamp * 2) -y(0)), 2))
            .attr("x",  -shift/2)
            .attr("width", +shift)
            .on("end", done);





          // lines
          //  .transition()
          //   .duration(stepInterval)
          //   .delay(offsetDelay)
          //   .style("stroke-opacity", 1)
          //   .remove();
        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          vBoxes.remove();
          box
            .style("opacity", 0.7)
            .attr("x",  -shift/2)
            .attr("width", +shift)
            .attr("y", d => y(d.mean + d.stdevSamp))
            .attr("height", d => y(d.mean - d.stdevSamp) - y(d.mean + d.stdevSamp))
            .on("end", done)
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

function stdev6(svg, opt, cb){
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
      v.__varianceContribution = Math.pow(v[yField]-group.mean,2) / group.len;
      acc += v.__varianceContribution;
      return v.__accContribution = acc;
    }, 0);
    group.variance = group.values[group.len - 1].__accContribution;
  });
  let map = d3.map(grouped, d=>d.key);

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");

  dotPlots.exit().remove();
  let shift = 30;

  let mirroredBox  = newDotPlots.append("rect")
    .attr("transform", d => `translate(0 ${y(d.mean)}) rotate(180)`)
    .attr("y", 0)
    .attr("height", d => y(d.mean) - y(d.mean + d.stdevSamp))
    .attr("x",  -shift/2)
    .attr("width", +shift)
    .style("opacity", 0);

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

  let steps = [

      {
        tracks: newDots.data().length,
        content: (done) => {
          let stepInterval = interval * 0.15;
          lines.transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("x1", - shift/2)
            .attr("x2", shift/2);

          newDots
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("cx", (d,i) => (i / (map.get(d[xField]).len) - 0.5) * shift + Math.max(shift / map.get(d[xField]).len, 2) /2)
            .on("end", done);
        }
      },
      {
        tracks: newDots.data().length,
        content: (done) => {
          let stepInterval = interval * 0.15;
          newDots
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("r",0 )
            .on("end", done)
            .remove();

          vBoxes
            .style("opacity", 0.7)
            .style("stroke-opacity", 0.7)
           .transition()
            .duration(stepInterval)
            .attr("y", (d,i) => Math.min(y(map.get(d[xField]).mean), y(d[yField])))
            .attr("height", (d,i) => Math.abs(y(map.get(d[xField]).mean) - y(d[yField])));


        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepInterval = interval * 0.2;
          let offsetDelay = interval * 0.15;

          vBoxes
           .transition()
            .delay(offsetDelay)
            .duration(stepInterval)
            .attr("y", (d,i) => y(d.__accContribution + map.get(d[xField]).mean))
            .attr("height", (d,i) => Math.abs(y(d.__varianceContribution) - y(0)))
            .attr("x",  -shift/2)
            .attr("width", +shift)
            .remove();

          box
           .transition()
            .delay(stepInterval + offsetDelay)
            .duration(0)
            .attr("x",  -shift/2)
            .attr("width", +shift)
            .attr("y", d => y(d.mean + d.variance))
            .attr("height", d => y(d.mean) - y(d.mean + d.variance))
            .style("opacity", 0.7)
            .on("end", done);

          // lines
          //  .transition()
          //   .duration(stepInterval)
          //   .delay(offsetDelay)
          //   .style("stroke-opacity", 1)
          //   .remove();
        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepInterval = interval * 0.1;
          box
           .transition()
            .duration(stepInterval)
            .attr("y", d => y(d.mean + d.stdevSamp))
            .attr("height", d => y(d.mean) - y(d.mean + d.stdevSamp))
            .on("end", done);
        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepInterval = interval*0.1;
          let offsetDelay = interval*0.1;
          mirroredBox
           .transition()
           .delay(offsetDelay)
           .duration(0)
           .style("opacity", 0.7);

          box
            .attr("transform", d => `translate(0 ${y(d.mean)}) rotate(180)`)
            .attr("y", 0)
           .transition()
            .delay(offsetDelay)
            .duration(stepInterval)
            .attr("transform", d => `translate(0 ${y(d.mean)}) rotate(0)`)
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

function stdev7(svg, opt, cb){
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
        tracks: newDots.data().length,
        content: (done) => {
          let stepInterval = interval * 0.2;
          lines.transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("x1", - shift/2)
            .attr("x2", shift/2);

          newDots
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("cx", (d,i) => (i / (map.get(d[xField]).len) - 0.5) * shift + Math.max(shift / map.get(d[xField]).len, 2)/2)
            // .attr("cx", (d,i) => (i / (map.get(d[xField]).len-1) - 0.5) * shift)
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


        }
      },
      {
        tracks: grouped.length,
        content: (done) => {
          let stepInterval = interval * 0.2;
          let offsetDelay = interval * 0.1;

          vBoxes
           .transition()
            .delay(offsetDelay)
            .duration(stepInterval)
            .attr("y", (d,i) => y((d.__accContribution) * map.get(d[xField]).stdevSamp + map.get(d[xField]).mean))
            .attr("height", (d,i) => Math.max(Math.abs(y(d.__stdevContribution * map.get(d[xField]).stdevSamp) -y(0)),1))
            .attr("x",  -shift/2)
            .attr("width", +shift)
            .remove();

          box
            .style("opacity", 0.7)
           .transition()
            .delay(stepInterval + offsetDelay)
            .duration(0)
            .attr("x",  -shift/2)
            .attr("width", +shift)
            .attr("y", d => y(d.mean + d.stdevSamp))
            .attr("height", d => y(d.mean) - y(d.mean+ d.stdevSamp))
            .on("end", done);

          // lines
          //  .transition()
          //   .duration(stepInterval)
          //   .delay(offsetDelay)
          //   .style("stroke-opacity", 1)
          //   .remove();
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
              .style("opacity", 0.7)
              .on("end", done);
          } else {
            mirroredBox
              .style("opacity", 0.7)
             .transition()
              .delay(offsetDelay)
              .duration(stepInterval)
              .attr("transform", d => `translate(0 ${y(d.mean)}) rotate(0)`)
              .on("end", done);
          }
        }
      },
      {
        tracks: grouped.length,
        content: (done) => cb()
      }
    ];

  play(steps,0);
}


function IQR2(svg, opt, cb){
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

  let lines = newDotPlots
            .append("line")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", (d,i) => y(d.min))
            .attr("y2", (d,i) => y(d.min))
            .attr("stroke-opacity", 1);

  let textsMedian = newDotPlots
            .append("text")
            .attr("x", 14)
            .attr("y", d => y(d.median))
            .attr("dy", ".35em")
            .text("50%")
            .style("opacity", 0);


  let textsQ1 = newDotPlots
            .append("text")
            .attr("x", 10)
            .attr("y", d => y(d.Q1) + 8)
            .attr("dy", ".35em")
            .text("25%")
            .style("opacity", 0);

  let textsQ3 = newDotPlots
            .append("text")
            .attr("x", 10)
            .attr("y", d => y(d.Q3) - 8)
            .attr("dy", ".35em")
            .text("75%")
            .style("opacity", 0);

  let steps = [
    {
      tracks: grouped.length,
      content: (done) => {
        lines.transition()
          .duration(0)
          .ease(d3.easeQuad)
          .attr("x1", - 4 *radius)
          .attr("x2", shift/2)
          .on("end", done);
      }
    },
    {
      tracks: totalCount,
      content: (done) => {
        let stepInterval = interval * 0.2;
        let v = d3.max(grouped, g => g.Q3 - g.min) / (stepInterval);
        let color = (d, i) => {
          return map.get(d[xField]).Q1Index >= i ? red :
            (map.get(d[xField]).Q1Index < i && Math.floor(map.get(d[xField]).medianIndex) >= i ? blue :
            (map.get(d[xField]).medianIndex < i && map.get(d[xField]).Q3Index >= i ? orange : green));
        };

        dotPlots.exit().selectAll(".point")
         .transition()
          .duration(0)
          .ease(d3.easeQuad)
          .delay(d=> Math.abs(d[yField] - map.get(d[xField]).min) / v )
          .style("fill",  color)
          .style("stroke", color)
          .on("end", done);

        lines.transition()
          .duration(stepInterval)
          .ease(d3.easeQuad)
          .attr("y1", (d,i) => y(d.Q3))
          .attr("y2", (d,i) => y(d.Q3))
          .on("end", done)
          .remove();

        linesQ1.transition()
          .duration(0)
          .delay(d => Math.abs(d.Q1 - d.min) /v)
          .style("stroke-opacity", 1);

        linesQ3.transition()
          .duration(0)
          .delay(d => Math.abs(d.Q3 - d.min) /v)
          .style("stroke-opacity", 1);

        linesMedian.transition()
          .duration(0)
          .delay(d => Math.abs(d.median - d.min) /v)
          .style("stroke-opacity", 1);

        if(!opt.noText){
          textsMedian
           .transition()
            .duration(stepInterval)
            .delay(d => Math.abs(d.median - d.min) /v)
            .ease(d3.easeQuad)
            .style("opacity", 0.7)
            .on("end", done);

          textsQ1
           .transition()
            .duration(stepInterval)
            .delay(d => Math.abs(d.Q1 - d.min) /v)
            .ease(d3.easeQuad)
            .style("opacity", 0.7)
            .on("end", done);

          textsQ3
           .transition()
            .duration(stepInterval)
            .delay(d => Math.abs(d.Q3 - d.min) /v)
            .ease(d3.easeQuad)
            .style("opacity", 0.7)
            .on("end", done);
        }

      }
    },
    {
      tracks: grouped.length,
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
      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        let stepInterval = interval * 0.2;
        let stepDelay = interval * 0.15;


        dotPlots.exit().selectAll(".point")
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("opacity", 0)
          .style("stroke-opacity", 0)
          .remove();

        textsMedian
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("opacity", 0)
          .remove();


        textsQ1
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("opacity", 0)
          .remove();


        textsQ3
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("opacity", 0)
          .remove();


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

        // linesMedian.transition()
        //   .duration(stepInterval)
        //   .delay(stepDelay)
        //   .ease(d3.easeQuad)
        //   .style("stroke-opacity", 0.7)
        //   .remove();

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
function IQR3(svg, opt, cb){
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
    group.max =  d3.max(group.values, v => v[yField]);
    group.median = d3.median(group.values, v => v[yField]);
    group.Q1 = d3.quantile(group.values, 0.25, v => v[yField]);
    group.Q3 = d3.quantile(group.values, 0.75, v => v[yField]);
    group.medianIndex = (group.values.length - 1) / 2;
    group.Q1Index = group.values.filter( v=> v[yField] < group.Q1).length - 1;
    group.Q3Index = group.values.filter( v=> v[yField] < group.Q3).length - 1;
    group.values.forEach((d,i) => {
      d.__quantile = group.Q1Index >= i ? 0 :
            (group.Q1Index < i && Math.floor(group.medianIndex) >= i ? 1 :
            (group.medianIndex < i && group.Q3Index >= i ? 2 : 3));
    });
  });
  let map = d3.map(grouped, d=>d.key);
  let totalCount = d3.sum(grouped, g => g.len);

  dotPlots = dotPlots.data(grouped, d => d.len ? "agg" + d.key : d.key);
  let newDotPlots = dotPlots.enter()
     .append("g")
      .attr("class", "dotPlot")
      .attr("transform", d => "translate(" + x(d.key) + ",0)");

  let shift = 30;
  let offset = 3;
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

  let leftLines = newDotPlots
            .append("line")
            .attr("x1", -offset)
            .attr("x2", -(offset + shift/2))
            .attr("y1", (d,i) => y(d.median) - 5)
            .attr("y2", (d,i) => y(d.median) - 5)
            .attr("stroke-opacity", 0);

  let rightLines = newDotPlots
            .append("line")
            .attr("x1", offset)
            .attr("x2", offset + shift/2)
            .attr("y1", (d,i) => y(d.median) - 5)
            .attr("y2", (d,i) => y(d.median) - 5)
            .attr("stroke-opacity", 0);
  let leftCross = newDotPlots
    .append("line")
    .attr("x1", -shift/4 + 1 - 2)
    .attr("x2", -shift/4 - 1 - 2)
    .attr("y1", (d,i) => y(d.median)+3 - 5)
    .attr("y2", (d,i) => y(d.median)-3 - 5)
    .attr("stroke-opacity", 0);
  let rightCross = newDotPlots
    .append("line")
    .attr("x1", shift/4 + 1 + 2)
    .attr("x2", shift/4 - 1 + 2)
    .attr("y1", (d,i) => y(d.median)+3 - 5)
    .attr("y2", (d,i) => y(d.median)-3 - 5)
    .attr("stroke-opacity", 0);







  let steps = [
    {
      tracks: totalCount,
      content: (done) => {
        let stepInterval = interval * 0.2;
        let color = (d, i) => {
          return [green, orange, orange, green][d.__quantile];
        };

        linesQ1.transition()
          .duration(0)
          .style("stroke-opacity", 0.7);

        linesQ3.transition()
          .duration(0)
          .style("stroke-opacity", 0.7)
          .on("end", done);

        dotPlots.exit().selectAll(".point")
         .transition()
          .duration(stepInterval)
          .ease(d3.easeQuad)
          .style("fill",  color)
          .style("stroke", color)
          .on("end", done);

      }
    },
    {
      tracks: totalCount,
      content: (done) => {
        let stepInterval = interval * 0.2;

        let cx = (d, i) => {
          let offset = 3;
          let g = map.get(d[xField]);
          if ([1,2].indexOf(d.__quantile) >= 0) {
            return (i - g.Q1Index + 1) / (g.Q3Index - g.Q1Index + 1) * shift/2 + offset;
          } else if (d.__quantile === 0) {
            return -((i + 1) / (g.Q1Index + 1 + g.len - 1 - g.Q3Index)) * shift/2 - offset;
          } else {
            return -(g.Q1Index + 1 + i - g.Q3Index) / (g.Q1Index + 1 + g.len - 1 - g.Q3Index) * shift/2 - offset;
          }
        };

        dotPlots.exit().selectAll(".point")
         .transition()
          .duration(stepInterval)
          .delay(stepInterval/2)
          .ease(d3.easeQuad)
          .attr("cy", d => y(map.get(d[xField]).median))
          .attr("cx", cx)
          .on("end", done);

      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        let stepDuration = interval * 0.2;
        let stepDelay = interval * 0;


        leftCross
         .transition()
          .duration(stepDuration)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 1)
          .on("end", done);

        rightCross
         .transition()
          .duration(stepDuration)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 1);

        leftLines
         .transition()
          .duration(stepDuration)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 1);
        rightLines
         .transition()
          .duration(stepDuration)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 1);
      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        let stepDuration = interval * 0.15;
        let stepDelay = interval * 0.15;


        dotPlots.exit().selectAll(".point")
         .transition()
          .duration(stepDuration)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("opacity", 0)
          .style("stroke-opacity", 0)
          .remove();

        leftCross
         .transition()
          .duration(stepDuration)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0)
          .on("end", done);

        rightCross
         .transition()
          .duration(stepDuration)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0);

        leftLines
         .transition()
          .duration(stepDuration)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0);
        rightLines
         .transition()
          .duration(stepDuration)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0);

        linesMedian
         .transition()
          .duration(stepDuration)
          .delay(stepDelay)
          .style("stroke-opacity", 1);
        box
          .style("opacity", 0.7)
         .transition()
          .duration(stepDuration)
          .delay(stepDelay)
          .attr("y", d => y(d.Q3))
          .attr("height", d => Math.abs(y(d.Q3) - y(d.Q1)))
          .on("end", done);

        linesQ1.transition()
          .duration(stepDuration/2)
          .delay(stepDelay + stepDuration)
          .style("stroke-opacity", 0)
          .remove();

        linesQ3.transition()
          .duration(stepDuration/2)
          .delay(stepDelay + stepDuration)
          .style("stroke-opacity", 0)
          .remove();
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

function IQR4(svg, opt, cb){
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
    return map.get(d[xField]).Q1Index >= i ? -shift/2 :
      (map.get(d[xField]).Q1Index < i && Math.floor(map.get(d[xField]).medianIndex) >= i ? -shift/6 :
      (map.get(d[xField]).medianIndex < i && map.get(d[xField]).Q3Index >= i ? shift/6 : shift/2));
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
    .attr("cx", cx)
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

        let stepInterval = 0.1 * interval;


        dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("cx", cx)
            .style("fill", grey)
            .style("stroke", grey)
            .style("opacity", 0.3)
            .on("end",done);

        linesQ1.transition()
          .duration(stepInterval)
          .style("stroke-opacity", 1);

        linesQ3.transition()
          .duration(stepInterval)
          .style("stroke-opacity", 1);

        linesMedian.transition()
          .duration(stepInterval)
          .style("stroke-opacity", 1);


      }
    },
    {
      tracks: totalCount,
      content: (done) => {
        // TODO :
        // 1) Re-coloring with proper delays.

        let stepInterval = 0.1 * interval;
        let offsetInterval = 0.2 * interval;

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
          return delayScale(qI  / (quantileStartIndcies[quantile+1] - quantileStartIndcies[quantile])) + offsetInterval*2;
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
            .style("stroke", color)
            .style("opacity", 0.7)
            .style("stroke-opacity", 1)
           .transition()
            .duration(offsetInterval/2)
            .delay(stepInterval*0.1)
            .ease(d3.easeQuad)
            .style("fill", color)
            .style("stroke", color)
            .style("opacity", 0.7)
            .style("stroke-opacity", 0.7)
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
          .style("opacity", 0.7)
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .attr("y", d => y(d.Q3))
          .attr("height", d => Math.abs(y(d.Q3) - y(d.Q1)))
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


function IQR5(svg, opt, cb){
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

  let cx = (d,i) => { return (i / (map.get(d[xField]).len-1) - 0.5) * shift };

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

  let color = (d, i) => {
    return map.get(d[xField]).Q1Index >= i ? red :
      (map.get(d[xField]).Q1Index < i && Math.floor(map.get(d[xField]).medianIndex) >= i ? blue :
      (map.get(d[xField]).medianIndex < i && map.get(d[xField]).Q3Index >= i ? orange : green));
  };

  let steps = [
    {
      tracks: totalCount,
      content: (done) => {

        let stepInterval = 0.2 * interval;


        dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .attr("cx", cx)
            .style("fill", color)
            .style("stroke", color)
            .on("end",done);


      }
    },
    {
      tracks: grouped.length,
      content: (done) => {

        let stepInterval = 0.1 * interval;
        let stepDelay = interval * 0;


        linesQ1.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 1);

        linesQ3.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 1);

        linesMedian.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 1)
          .on("end", done);


      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        // TODO :
        // 1) Remove the points and introduce the box

        let stepInterval = interval * 0.2;
        let stepDelay = interval * 0.2;

        box
          .style("opacity", 0.7)
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
          .style("stroke-opacity", 0)
          .style("opacity", 0)
          .remove();



      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        let stepInterval = interval * 0.2;
        let stepDelay = interval * 0.1;

        linesQ1.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0)
          .on("end",done)
          .remove()
          .on("end", done);

        linesQ3.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0)
          .remove();
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


function IQR6(svg, opt, cb){
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

  let extendedShift = 50;
  let cx = (d,i) => { return (i / (map.get(d[xField]).len-1) - 0.5) * extendedShift };

  dotPlots.exit().selectAll(".point").remove();



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

  let newDots = newDotPlots.selectAll(".point")
    .data(d => d.values)
    .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", 0)
    .attr("cy", d => y(d[yField]))
    .attr("r", radius);

  let color = (d, i) => {
    return map.get(d[xField]).Q1Index >= i ? red :
      (map.get(d[xField]).Q1Index < i && Math.floor(map.get(d[xField]).medianIndex) >= i ? blue :
      (map.get(d[xField]).medianIndex < i && map.get(d[xField]).Q3Index >= i ? orange : green));
  };

  let steps = [
    {
      tracks: totalCount,
      content: (done) => {

        let stepInterval = 0.2 * interval;
        let stepDelay = interval * 0;


        newDots
           .transition()
            .duration(stepInterval)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .attr("cx", cx)
            .style("fill", color)
            .style("stroke", color)
            .on("end",done);


        linesQ1.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 1);

        linesQ3.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 1);

        linesMedian.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 1);


      }
    },
    {
      tracks: totalCount,
      content: (done) => {

        let stepInterval = 0.2 * interval;
        let stepDelay = interval * 0.1;

        let cy = (d,i) => {
          let g = map.get(d[xField]);
          return Math.floor(g.medianIndex) >= i ? y(g.Q1) : y(g.Q3);
        };
        let neatR = (d,i) => { return Math.max(Math.min(extendedShift / map.get(d[xField]).len / 2, radius) , 1.5) };

        newDots
           .transition()
            .duration(stepInterval)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .attr("cy", cy)
            .attr("r", neatR)
            .on("end", done);
      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        // TODO :
        // 1) Remove the points and introduce the box

        let stepInterval = interval * 0.2;
        let stepDelay = interval * 0.3;

        linesQ1.transition()
          .duration(0)
          .style("stroke-opacity", 0)
          .remove();

        linesQ3.transition()
          .duration(0)
          .style("stroke-opacity", 0)
          .remove();

        box
          .style("opacity", 0.7)
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .attr("y", d => y(d.Q3))
          .attr("height", d => Math.abs(y(d.Q3) - y(d.Q1)))
          .on("end", done);

        newDots
         .transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 0)
          .style("opacity", 0)
          .remove()
          // .on("end", done);
      }
    },
    {
      tracks: totalCount,
      content: (done) => {
        cb();

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

function IQR7(svg, opt, cb){
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

  let binaryCx = (d,i) => {
    let g = map.get(d[xField]);

    return g.medianIndex < i ? shift/4 : -shift/4;
  };
  // let binaryCx = (d,i) => {
  //   let g = map.get(d[xField]);
  //   return (i / (g.len-1) - 0.5) * shift / 2;
  // };
  // let cx = (d,i) => {
  //   let g = map.get(d[xField]);
  //   let offset = g.medianIndex < i ? shift : 0;
  //   return (i / (g.len-1) - 0.25) * 2 * shift - offset;
  // };
  // let cx = (d,i) => {
  //   let g = map.get(d[xField]);
  //   return (i / (g.len-1) - 0.5) * shift;
  // };
  let cx = (d,i) => {
    let g = map.get(d[xField]);
    return g.Q1Index >= i ? -shift/2 :
      (g.Q1Index < i && Math.floor(g.medianIndex) >= i ? -shift/6 :
      (g.medianIndex < i && g.Q3Index >= i ? shift/6 : shift/2));
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

  let color = (d, i) => {
    let g = map.get(d[xField]);
    return g.Q1Index >= i ? red :
      (g.Q1Index < i && Math.floor(g.medianIndex) >= i ? orange :
      (g.medianIndex < i && g.Q3Index >= i ? green : blue));
  };

  let binaryColor = (d, i) => {
    return Math.floor(map.get(d[xField]).medianIndex) >= i ? orange : green;
  };

  let steps = [
    {
      tracks: totalCount,
      content: (done) => {

        let stepInterval = 0.15 * interval;


        dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepInterval)
            .ease(d3.easeQuad)
            .style("fill", binaryColor)
            .attr("cx", binaryCx)
            .on("end",done);

        linesMedian.transition()
          .duration(stepInterval)
          .style("stroke-opacity", 1)
          .on("end", done);

      }
    },
    {
      tracks: grouped.length,
      content: (done) => {

        let stepInterval = 0.15 * interval;
        let stepDelay = interval * 0.1;


        dotPlots.exit().selectAll(".point")
           .transition()
            .duration(stepInterval)
            .delay(stepDelay)
            .ease(d3.easeQuad)
            .style("fill", color)
            .attr("cx", cx)
            .on("end",done);

        linesQ1.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 1);

        linesQ3.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .style("stroke-opacity", 1);




      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        // TODO :
        // 1) Remove the points and introduce the box

        let stepInterval = interval * 0.15;
        let stepDelay = interval * 0.15;

        box
          .style("opacity", 0.7)
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
          .style("stroke-opacity", 0)
          .style("opacity", 0)
          .remove();



      }
    },
    {
      tracks: grouped.length,
      content: (done) => {
        let stepInterval = interval * 0.2;
        let stepDelay = interval * 0.1;

        linesQ1.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0)
          .on("end",done)
          .remove()
          .on("end", done);

        linesQ3.transition()
          .duration(stepInterval)
          .delay(stepDelay)
          .ease(d3.easeQuad)
          .style("stroke-opacity", 0)
          .remove();
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
          return delayScale(qI  / (quantileStartIndcies[quantile+1] - quantileStartIndcies[quantile])) + offsetInterval*2;
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
            .delay(stepInterval*0.1)
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