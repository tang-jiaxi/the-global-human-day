const allocationWidth = 1100;
const allocationHeight = 620;
const allocationMargin = { top: 120, right: 80, bottom: 90, left: 80 };

const allocationContainer = d3.select("#allocation-beeswarm");

const allocationSvg = allocationContainer
  .append("svg")
  .attr("viewBox", `0 0 ${allocationWidth} ${allocationHeight}`)
  .attr("class", "h-full w-full")
  .style("pointer-events", "auto");

const allocationChart = allocationSvg.append("g");

const allocationXAxisGroup = allocationSvg
  .append("g")
  .attr(
    "transform",
    `translate(0, ${allocationHeight - allocationMargin.bottom})`,
  );

const allocationColor = d3
  .scaleOrdinal()
  .domain(["Developed", "Developing", "Not classified"])
  .range(["#4c78a8", "#f58518", "#bab0ac"]);

const allocationTooltip = d3
  .select("body")
  .append("div")
  .style("position", "fixed")
  .style("z-index", "9999")
  .style("display", "none")
  .style("background", "rgba(255,255,255,0.96)")
  .style("padding", "10px 14px")
  .style("border-radius", "10px")
  .style("box-shadow", "0 4px 18px rgba(0,0,0,0.15)")
  .style("line-height", "1.25")
  .style("pointer-events", "none")
  .style("transform", "translate(-50%, -120%)");

d3.csv("all_countries_extended.csv", d3.autoType).then((rows) => {
  const allocationData = rows
    .filter(
      (d) =>
        d.subcategory === "allocation" &&
        d.countryISO3 &&
        Number.isFinite(d.hoursPerDayCombined),
    )
    .map((d) => ({
      countryISO3: d.countryISO3,
      countryName: d.country_name || d.countryISO3,
      allocationHours: d.hoursPerDayCombined,
      allocationMinutes: d.hoursPerDayCombined * 60,
      economicStatus: d.economic_status || "Not classified",
    }))
    .sort((a, b) => b.allocationMinutes - a.allocationMinutes);

  const allocationX = d3
    .scaleLinear()
    .domain([25, d3.max(allocationData, (d) => d.allocationMinutes) + 10])
    .range([allocationMargin.left, allocationWidth - allocationMargin.right]);

  updateAllocationBeeswarm(0);

  const allocationScroller = scrollama();

  allocationScroller
    .setup({
      step: ".allocation-step",
      offset: 0.6,
    })
    .onStepEnter((response) => {
      d3.selectAll(".allocation-step").classed("opacity-40", true);
      d3.select(response.element).classed("opacity-40", false);

      updateAllocationBeeswarm(response.index);
    });

  function updateAllocationBeeswarm(stepIndex) {
    const visibleISOsByStep = [
      ["CAN", "DEU"],
      ["CAN", "DEU", "IND", "UGA", "LBN"],
      allocationData.map((d) => d.countryISO3),
    ];

    const labelISOsByStep = [
      ["CAN", "DEU"],
      ["CAN", "DEU", "IND", "UGA", "LBN"],
      ["CAN", "DEU", "IND", "UGA", "LBN"],
    ];

    const visibleISOs = new Set(visibleISOsByStep[stepIndex]);
    const labelISOs = new Set(labelISOsByStep[stepIndex]);

    const visibleData = allocationData.filter((d) =>
      visibleISOs.has(d.countryISO3),
    );

    const simulationNodes = visibleData.map((d) => ({
      ...d,
      radius: stepIndex === 2 ? 6 : 10,
      x: allocationX(d.allocationMinutes),
      y: allocationHeight / 2,
    }));

    const simulation = d3
      .forceSimulation(simulationNodes)
      .force(
        "x",
        d3.forceX((d) => allocationX(d.allocationMinutes)).strength(0.9),
      )
      .force("y", d3.forceY(allocationHeight / 2).strength(0.12))
      .force(
        "collide",
        d3.forceCollide((d) => d.radius + 2),
      )
      .stop();

    for (let i = 0; i < 220; i++) simulation.tick();

    allocationChart
      .selectAll(".allocation-dot")
      .data(simulationNodes, (d) => d.countryISO3)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("class", "allocation-dot")
            .attr("cx", (d) => allocationX(d.allocationMinutes))
            .attr("cy", allocationHeight / 2)
            .attr("r", 0)
            .attr("fill", (d) => allocationColor(d.economicStatus))
            .attr("opacity", 0.75)
            .style("cursor", "pointer")
            .style("pointer-events", "all")
            .call(addDotHover)
            .call((enter) =>
              enter
                .transition()
                .duration(700)
                .attr("r", (d) => d.radius)
                .attr("cx", (d) => d.x)
                .attr("cy", (d) => d.y),
            ),
        (update) =>
          update
            .style("pointer-events", "all")
            .call(addDotHover)
            .call((update) =>
              update
                .transition()
                .duration(700)
                .attr("r", (d) => d.radius)
                .attr("fill", (d) => allocationColor(d.economicStatus))
                .attr("cx", (d) => d.x)
                .attr("cy", (d) => d.y),
            ),
        (exit) =>
          exit.call((exit) =>
            exit.transition().duration(400).attr("r", 0).remove(),
          ),
      );

    allocationChart
      .selectAll(".allocation-country-label")
      .data(
        simulationNodes.filter((d) => labelISOs.has(d.countryISO3)),
        (d) => d.countryISO3,
      )
      .join(
        (enter) => {
          const group = enter
            .append("g")
            .attr("class", "allocation-country-label")
            .attr(
              "transform",
              (d) =>
                `translate(${allocationX(d.allocationMinutes)}, ${allocationHeight / 2})`,
            )
            .attr("opacity", 0)
            .style("pointer-events", "none");

          group
            .append("text")
            .attr("text-anchor", "middle")
            .attr("y", -28)
            .attr("font-size", 24)
            .attr("font-weight", 500)
            .text((d) => d.countryName);

          group
            .append("text")
            .attr("text-anchor", "middle")
            .attr("y", -8)
            .attr("font-size", 14)
            .attr("font-weight", 200)
            .text((d) => `${Math.round(d.allocationMinutes)} min/day`);

          group
            .transition()
            .duration(700)
            .attr("opacity", 1)
            .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

          return group;
        },
        (update) =>
          update.style("pointer-events", "none").call((update) =>
            update
              .transition()
              .duration(700)
              .attr("opacity", 1)
              .attr("transform", (d) => `translate(${d.x}, ${d.y})`),
          ),
        (exit) =>
          exit.call((exit) =>
            exit.transition().duration(300).attr("opacity", 0).remove(),
          ),
      );

    allocationChart.selectAll(".allocation-country-label").raise();
  }

  function addDotHover(selection) {
    selection
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .attr("stroke", "#111")
          .attr("stroke-width", 2)
          .attr("opacity", 1)
          .raise();

        allocationTooltip
          .style("display", "block")
          .style("left", `${event.clientX}px`)
          .style("top", `${event.clientY}px`).html(`
            <div style="font-size:24px; font-weight:500">${d.countryName}</div>
            <div style="font-size:24px; font-weight:200">${d.economicStatus}</div>
            <div style="font-size:24px; font-weight:200">${Math.round(d.allocationMinutes)} min/day</div>
          `);
      })
      .on("mousemove", function (event) {
        allocationTooltip
          .style("left", `${event.clientX}px`)
          .style("top", `${event.clientY}px`);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke", "none").attr("opacity", 0.75);
        allocationTooltip.style("display", "none");
      });
  }
});
