var margin = {top: 30, right: 175, bottom: 45, left: 50},
    width = 1350 - margin.left - margin.right,
    height = 270 - margin.top - margin.bottom;

var parseDate = d3.time.format("%Y-%m-%d").parse;

var avgend = 0;

var x = d3.time.scale().range([0, width]);
var y = d3.scale.linear().range([height, 0]).domain([0,1]);

var xAxis = d3.svg.axis().scale(x)
    .orient("bottom").ticks(5);

var yAxis = d3.svg.axis().scale(y)
    .orient("left").ticks(5);

var line = d3.svg.line()
    .interpolate("monotone")
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.totalAvg); });
    
var svg = d3.select("#battingavg")
    .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", 
              "translate(" + margin.left + "," + margin.top + ")");

svg.append("text")
    .attr("x", width/2)
    .attr("y", -5)
    .style("text-anchor", "middle")
    .append("tspan")
        .style("font-weight", "bold")
        .text("Batting Average by Game")
        .append("tspan")
            .style("font-weight", "normal")
            .text(" (mouse over for individual game statistics)");

loadBatter("452655", true);
var abChart;
var hrChart;
var rbiChart;
var oppHChart;
var oppHRChart;
var oppRBIChart;

function loadBatter(batter, initial) {
    //load batter file
    var source = batter + ".json"
    d3.json(source, function(error, data) {
        var record = calculateAvg(data);
        //aggregate dat by month
        var aggregated = aggregateData(record, "month");
        var agg_opp = aggregateData(record, "opp");
        agg_opp.sort(function(a, b) { return a.H - b.H; });

        //if first record do initial drawing otherwise update
        if (initial) {
            //draw batting average chart
            drawBatter(record);
            //draw metrics charts
            abChart = new Chart("#AB", aggregated, "AB", "Month", "lightblue");
            hrChart = new Chart("#HR", aggregated, "HR", "Month", "orange");
            rbiChart = new Chart("#RBI", aggregated, "RBI", "Month", "green");
            oppHChart = new Chart("#oppH", agg_opp, "H", "Opponent", "steelblue");
            oppHRChart = new Chart("#oppHR", agg_opp, "HR", "Opponent", "orange");
            oppRBIChart = new Chart("#oppRBI", agg_opp, "RBI", "Opponent", "green");

        } else {
            //update all charts with new batter
            updateBatter(record);
            abChart.updateChart(aggregated);
            hrChart.updateChart(aggregated);
            rbiChart.updateChart(aggregated);
            oppHChart.updateChart(agg_opp);
            oppHRChart.updateChart(agg_opp);
            oppRBIChart.updateChart(agg_opp); 
        }
    }); 
}
     
function calculateAvg(data) {
    var record = data.games;
    var totalH = 0;
    var totalAB = 0;
    record.forEach(function(d) {
        d.date = parseDate(d.date);
        totalH += d.H;
        totalAB += d.AB;
        //Account for player not batting the first game(s)
        if (totalAB > 0) {
            //Calculate cumulative batting average
            d.totalAvg = parseFloat(totalH/totalAB).toFixed(3);
        } else {
            d.totalAvg = 0;
        }
        if (d.AB > 0) {
            d.avg = d.H/d.AB;
        } else {
            d.avg = 0;
        }
    }); 
    avgend = totalH/totalAB;
    //sort data by date for bisector
    record.sort(function(a, b) { return a.date - b.date; });
    return record;
}

function drawBatter(record) {
    //draw per game avg bars   
    var bar = svg.append("g").selectAll(".bar")
        .data(record)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("fill", "yellow")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 5);

    svg.append("path")
        .attr("class", "line")
        .attr("d", line(record))
        .style("stroke", "steelblue");

    svg.append("text")
        .attr("id", "cumulative")
        .attr("x", 1130)
        .attr("y", 0)
            .style("fill", "steelblue")
            .text("Cumulative AVG");
    //draw mouseover on batting avg graph
    var point = svg.append("g")
        .attr("id", "mpoint")
        .style("display", "none");

    point.append("circle")
        .attr("id", "mcircle")
        .attr("r", 5);

    point.append("image")
        .attr("width", 40)
        .attr("height", 40);

    point.append("text")
        .attr("id", "gamedate")
        .attr("x", 40)
        .attr("dy", "10px");

    point.append("text")
        .attr("id", "gameavg")
        .attr("x", 40)
        .attr("dy", "30px")
        .style("fill", "red")
        .style("font-weight", "bold");

    point.append("text")
        .attr("id", "gamestats")
        .attr("x", 40)
        .attr("dy", "20px");
    //draw mouse sensor layer
    svg.append("rect")
        .attr("class", "mousetrack")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function() { point.style("display", null); })
        .on("mouseout", function() { point.style("display", "none"); });
    //apply data
    updateBatter(record);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);
}

function updateBatter(record) {
    x.domain(d3.extent(record, function(d) { return d.date; })); 

    svg.selectAll(".bar")
        .data(record)
        .transition()
        .attr("height", function(d){return height - y(d.avg)})
        .attr("transform", function(d) {return "translate(" + x(d.date) + "," + y(d.avg) + ")"; });  
    
    svg.select("path")
        .transition()
        .attr("d", line(record)); 

    svg.select("#cumulative")
        .attr("y", y(avgend));

    var point = d3.select("#mpoint")

    d3.select(".mousetrack")
        .on("mousemove", function(d) {
            //get date corresponding to mouse position
            var xdate = x.invert(d3.mouse(this)[0]);
            //use bisector to find item in data
            var bisect = d3.bisector(function(d) { return d.date; }).left;
            var i = bisect(record, xdate, 1);
            if (record[i].date - xdate < xdate - record[i - 1].date) {
                d = record[i];
            } else {
                d = record[i-1];
            }
            //update mouseover with opponent logo and game data
            point.attr("transform", "translate(" + (x(d.date) + 3) + "," + y(d.totalAvg) + ")");
            point.select("#gamedate").text(d.date.toDateString());
            point.select("#gamestats").text("AB:" + d.AB + " H:" + d.H + " HR:" + d.HR + " RBI:" + d.RBI);
            point.select("#gameavg").text("AVG: " + d.totalAvg);
            point.select("image").attr("xlink:href", d.oppImage);
      });
}

function aggregateData(record, aggType) {
    var aggregated;          
    if (aggType == "month") {
        //aggregate data by month
        aggregated = d3.nest()
            .key(function(d) { return d.date.getMonth();})
            .rollup(function(d) {return {
                            HR: d3.sum(d, function(e) {return e.HR;}),
                            H: d3.sum(d, function(e) {return e.H;}),
                            AB: d3.sum(d, function(e) {return e.AB;}),
                            RBI: d3.sum(d, function(e) {return e.RBI;}),
                            avg: d3.sum(d, function(e) {return e.H;})/d3.sum(d, function(e) {return e.AB;}),
                            games: d.length
                        }})
            .entries(record);        
            aggregated = aggregated.map(function(d) {
                var res = {
                    month: (new Date(2014, d.key)).toLocaleString("en-us", { month: "short" }),
                    HR: d.values.HR,
                    H: d.values.H,
                    AB: d.values.AB,
                    RBI: d.values.RBI,
                    avg: d.values.avg,
                    games: d.values.games
                } 
                return res;                
            }); 
    } else {
        //aggregate data by opponent
        aggregated = d3.nest()
            .key(function(d) { return d.opp;})
            .rollup(function(d) {return {
                            HR: d3.sum(d, function(e) {return e.HR;}),
                            H: d3.sum(d, function(e) {return e.H;}),
                            AB: d3.sum(d, function(e) {return e.AB;}),
                            RBI: d3.sum(d, function(e) {return e.RBI;}),
                            avg: d3.sum(d, function(e) {return e.H;})/d3.sum(d, function(e) {return e.AB;}),
                            games: d.length
                        }})
            .entries(record);        
            aggregated = aggregated.map(function(d) {
                var res = {
                    month: d.key,
                    HR: d.values.HR,
                    H: d.values.H,
                    AB: d.values.AB,
                    RBI: d.values.RBI,
                    avg: d.values.avg,
                    games: d.values.games
                } 
                return res;                
            });        
    }
    return aggregated;
}

//batter selection listener
d3.selectAll("input.batter")
    .on("change", function() {
        var batter = d3.select(this).property("value");
        loadBatter(batter, false);
    });