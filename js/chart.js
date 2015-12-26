Chart = function(_element, _record, _chartType, _aggType, _fillColor){
//Create new chart
	this.element = _element;
    this.record = _record;
    this.chartType = _chartType;
    this.aggType = _aggType;
    this.fillColor = _fillColor;

    this.margin = {top: 20, right: 175, bottom: 50, left: 50},
    this.width = 500 - this.margin.left - this.margin.right,
    this.height = 190 - this.margin.top - this.margin.bottom;

    this.initChart();
}

Chart.prototype.initChart = function(){
	//Set all static properties
    var that = this;
    this.x = d3.scale.ordinal().rangeRoundBands([0, this.width], .1);
    this.y = d3.scale.linear().range([this.height, 0]);

    this.xAxis = d3.svg.axis().scale(this.x)
    	.orient("bottom").ticks(5);

	this.yAxis = d3.svg.axis().scale(this.y)
    	.orient("left").ticks(4).tickFormat(d3.format("d"));

	this.svg = d3.select(this.element)
    	.append("svg")
        	.attr("width", this.width + this.margin.left + this.margin.right)
        	.attr("height", this.height + this.margin.top + this.margin.bottom)
    	.append("g")
        	.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

	this.title = (this.chartType == "AB") ? "H out of AB" : this.chartType;

	this.svg.append("text")
    	.attr("x", this.width/2)
    	.attr("y", -5)
    	.style("text-anchor", "middle")
    	.append("tspan")
        	.attr("id", "chartTitle")
        	.style("font-weight", "bold")
        	.text("Total " + this.title + " by " + this.aggType);

	this.bar = this.svg.append("g").selectAll(".bar")
        	.data(this.record)
        	.enter()
        	.append("rect")
        	.attr("class", "bar")
//        	.attr("fill", (this.chartType == "AB") ? "lightblue" : "steelblue")
			.style("fill", this.fillColor)
        	.attr("x", 0)
        	.attr("y", 0)
        	.attr("width", (this.width/this.record.length) - 3);
    //If hits/at bats chart add at bats
	if (this.chartType == "AB") {
    	this.barbg = this.svg.append("g").selectAll(".barh")
        	.data(this.record)
        	.enter()
        	.append("rect")
        	.attr("class", "barh")
        	.attr("fill", "steelblue")
        	.attr("x", 0)
        	.attr("y", 0)
        	.attr("width", (this.width/this.record.length) - 3);  
	}

    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")");

    this.svg.append("g")
        .attr("class", "y axis");

    this.updateChart(this.record);
}

Chart.prototype.updateChart = function(_record){
	this.record = _record;
	var that = this;

	if (this.aggType == "Opponent") {
		this.record.sort(function(b, a) { return eval("a." + that.chartType) - eval("b." + that.chartType); });
	}
    
    this.cval = "d." + this.chartType;

    this.x.domain(this.record.map(function(d) { return d.month; }));
    this.y.domain([0, d3.max(that.record, function(d) { return eval(that.cval); })]); 

    this.svg.selectAll(".bar")
        .data(this.record)
        .transition()
        .attr("height", function(d){return that.height - that.y(eval(that.cval));})
        .attr("transform", function(d) {return "translate(" + that.x(d.month) + "," + that.y(eval(that.cval)) + ")"; });

    if (this.chartType == "AB") {
        this.svg.selectAll(".barh")
            .data(this.record)
            .transition()
            .attr("height", function(d){return that.height - that.y(d.H);})
        .attr("transform", function(d) {return "translate(" + that.x(d.month) + "," + that.y(d.H) + ")"; });
    }
            
    this.svg.select(".y.axis")
        .call(this.yAxis);

    this.svg.select(".x.axis")
        .call(this.xAxis)
        .selectAll("text")  
            .style("text-anchor", "end")
            .attr("dx", "-.6em")
            .attr("dy", "-.15em")
            .attr("transform", function(d) {
                return "rotate(-65)" 
                });
}