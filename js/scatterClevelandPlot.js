document.addEventListener("DOMContentLoaded", () => {
  const width = 1100;
  const height = 700;
  const margin = { top: 90, right: 80, bottom: 90, left: 100 };

  const container = d3.select("#tradeoff-scatter");

  if (container.empty()) {
    console.error("Could not find #tradeoff-scatter");
    return;
  }

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "h-full w-full")
    .attr("font-family", "'Oswald', sans-serif")
    .style("pointer-events", "auto");

  const chart = svg.append("g");

  const xAxisGroup = svg.append("g");
  const yAxisGroup = svg.append("g");

  const statusColor = d3
    .scaleOrdinal()
    .domain(["Developed", "Developing", "Not classified"])
    .range(["#4c78a8", "#f58518", "#bab0ac"]);

  const activityColor = d3
    .scaleOrdinal()
    .domain(["Allocation", "Social", "Meals"])
    .range(["#9c755f", "#3b9c95", "#8e6bbf"]);

  const tooltip = d3
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
    .style("transform", "translate(-50%, -120%)")
    .style("font-family", "'Oswald', sans-serif");

  d3.csv("all_countries_extended.csv", d3.autoType).then((rows) => {
    const wideData = d3
      .rollups(
        rows.filter(
          (d) =>
            ["allocation", "social", "meals"].includes(d.subcategory) &&
            d.countryISO3 &&
            Number.isFinite(d.hoursPerDayCombined),
        ),
        (group) => {
          const values = Object.fromEntries(
            group.map((d) => [d.subcategory, d.hoursPerDayCombined * 60]),
          );

          return {
            countryISO3: group[0].countryISO3,
            countryName: group[0].country_name || group[0].countryISO3,
            economicStatus: group[0].economic_status || "Not classified",
            regionCode: group[0].region_code,
            allocation: values.allocation,
            social: values.social,
            meals: values.meals,
          };
        },
        (d) => d.countryISO3,
      )
      .map(([, value]) => value);

    const scatterData = wideData.filter(
      (d) => Number.isFinite(d.allocation) && Number.isFinite(d.social),
    );

    const europeDataBase = wideData
      .filter(
        (d) =>
          (d.regionCode === "EU_W" || d.regionCode === "EU_S") &&
          Number.isFinite(d.allocation) &&
          Number.isFinite(d.social),
      )
      .sort((a, b) => b.allocation - a.allocation);

    console.log("Scatter rows:", scatterData.length);
    console.log("Europe rows:", europeDataBase.length);

    if (scatterData.length === 0) {
      console.error("No scatter data found. Check allocation/social columns.");
      return;
    }

    const scatterX = d3
      .scaleLinear()
      .domain([20, d3.max(scatterData, (d) => d.allocation) + 10])
      .range([margin.left, width - margin.right])
      .clamp(true);

    const scatterY = d3
      .scaleLinear()
      .domain([0, d3.max(scatterData, (d) => d.social) + 10])
      .range([height - margin.bottom, margin.top]);

    updateChart(0);

    const scroller = scrollama();

    scroller
      .setup({
        step: ".tradeoff-step",
        offset: 0.6,
      })
      .onStepEnter((response) => {
        d3.selectAll(".tradeoff-step").classed("opacity-40", true);
        d3.select(response.element).classed("opacity-40", false);

        const stepIndex = Number(response.element.dataset.step);
        updateChart(Number.isFinite(stepIndex) ? stepIndex : response.index);
      });

    window.addEventListener("resize", scroller.resize);

    function updateChart(stepIndex) {
      if (stepIndex >= 4) {
        updateEuropeCleveland(stepIndex);
      } else {
        updateScatter(stepIndex);
      }
    }

    function updateScatter(stepIndex) {
      clearEurope();
      drawScatterAxes(scatterX, scatterY);

      const developedCountries = ["DEU", "JPN", "CAN", "FRA"];
      const developingCountries = ["IND", "ERI", "LBN", "MAR"];

      const selectedCountries = [...developedCountries, ...developingCountries];

      const isEuropeFocus = (d) =>
        d.regionCode === "EU_W" || d.regionCode === "EU_S";

      const europeCountries = scatterData
        .filter(isEuropeFocus)
        .map((d) => d.countryISO3);

      const visibleByStep = [
        developedCountries,
        selectedCountries,
        scatterData.map((d) => d.countryISO3),
        europeCountries,
      ];

      const labelByStep = [
        developedCountries,
        selectedCountries,
        selectedCountries,
        [],
      ];

      const visibleSet = new Set(visibleByStep[stepIndex]);
      const labelSet = new Set(labelByStep[stepIndex]);

      const visibleData = scatterData.filter((d) =>
        visibleSet.has(d.countryISO3),
      );

      chart
        .selectAll(".scatter-dot")
        .data(visibleData, (d) => d.countryISO3)
        .join(
          (enter) =>
            enter
              .append("circle")
              .attr("class", "scatter-dot")
              .attr("cx", (d) => scatterX(d.allocation))
              .attr("cy", (d) => scatterY(d.social))
              .attr("r", 0)
              .attr("fill", (d) => statusColor(d.economicStatus))
              .attr("opacity", (d) => {
                if (stepIndex !== 3) return 1;
                return isEuropeFocus(d) ? 1 : 0.18;
              })
              .style("cursor", "pointer")
              .call(addScatterHover)
              .call((enter) =>
                enter
                  .transition()
                  .duration(700)
                  .attr("r", stepIndex >= 2 ? 5 : 8),
              ),
          (update) =>
            update.call(addScatterHover).call((update) =>
              update
                .transition()
                .duration(700)
                .attr("cx", (d) => scatterX(d.allocation))
                .attr("cy", (d) => scatterY(d.social))
                .attr("r", stepIndex >= 2 ? 5 : 8)
                .attr("opacity", 1)
                .attr("stroke", "none")
                .attr("stroke-width", 0)
                .attr("fill", (d) => statusColor(d.economicStatus))
                .attr("opacity", 1),
            ),
          (exit) =>
            exit.call((exit) =>
              exit.transition().duration(300).attr("r", 0).remove(),
            ),
        );

      chart
        .selectAll(".scatter-label")
        .data(
          visibleData.filter((d) => labelSet.has(d.countryISO3)),
          (d) => d.countryISO3,
        )
        .join(
          (enter) =>
            enter
              .append("text")
              .attr("class", "scatter-label")
              .attr("x", (d) => scatterX(d.allocation))
              .attr("y", (d) => scatterY(d.social) - 18)
              .attr("text-anchor", "middle")
              .attr("dominant-baseline", "middle")
              .attr("font-size", 16)
              .attr("font-weight", 500)
              .attr("opacity", 0)
              .style("pointer-events", "none")
              .text((d) => d.countryName)
              .call((enter) =>
                enter.transition().duration(700).attr("opacity", 1),
              ),
          (update) =>
            update.call((update) =>
              update
                .transition()
                .duration(700)
                .attr("x", (d) => scatterX(d.allocation))
                .attr("y", (d) => scatterY(d.social) - 18)
                .attr("opacity", 1),
            ),
          (exit) =>
            exit.call((exit) =>
              exit.transition().duration(300).attr("opacity", 0).remove(),
            ),
        );
      const europeFocusData = visibleData.filter(isEuropeFocus);

      const europeLabelData =
        stepIndex === 3 && europeFocusData.length
          ? [
              {
                x: d3.mean(europeFocusData, (d) => scatterX(d.allocation)),
                y: d3.mean(europeFocusData, (d) => scatterY(d.social)),
              },
            ]
          : [];

      chart
        .selectAll(".region-highlight-label")
        .data(europeLabelData)
        .join(
          (enter) =>
            enter
              .append("text")
              .attr("class", "region-highlight-label")
              .attr("x", (d) => d.x)
              .attr("y", (d) => d.y - 35)
              .attr("text-anchor", "middle")
              .attr("font-size", 20)
              .attr("font-weight", 500)
              .attr("opacity", 0)
              .style("pointer-events", "none")
              .text((d) => d.label)
              .call((enter) =>
                enter.transition().duration(700).attr("opacity", 1),
              ),
          (update) =>
            update.call((update) =>
              update
                .transition()
                .duration(700)
                .attr("x", (d) => d.x)
                .attr("y", (d) => d.y - 35)
                .attr("opacity", 1),
            ),
          (exit) =>
            exit.call((exit) =>
              exit.transition().duration(300).attr("opacity", 0).remove(),
            ),
        );
      chart.selectAll(".scatter-label").raise();
    }

    function updateEuropeCleveland(stepIndex) {
      chart.selectAll(".scatter-label").remove();
      chart.selectAll(".region-highlight-label").remove();

      const showMeals = stepIndex >= 5;

      const europeData = europeDataBase.filter(
        (d) => !showMeals || Number.isFinite(d.meals),
      );

      const europeX = d3
        .scaleLinear()
        .domain([
          30,
          d3.max(europeData, (d) =>
            Math.max(d.allocation, d.social, showMeals ? d.meals : 0),
          ) + 10,
        ])
        .range([margin.left, width - margin.right]);

      const europeY = d3
        .scaleBand()
        .domain(europeData.map((d) => d.countryISO3))
        .range([margin.top + 70, height - margin.bottom])
        .padding(0.35);

      drawEuropeAxes(europeX, europeY, europeData);

      const allocationDotData = europeData.map((d) => ({
        countryISO3: d.countryISO3,
        countryName: d.countryName,
        category: "Allocation",
        value: d.allocation,
      }));
      chart
        .selectAll(".scatter-dot")
        .data(allocationDotData, (d) => d.countryISO3)
        .join(
          (enter) =>
            enter
              .append("circle")
              .attr("class", "scatter-dot")
              .attr("cx", (d) => europeX(d.value))
              .attr(
                "cy",
                (d) => europeY(d.countryISO3) + europeY.bandwidth() / 2,
              )
              .attr("r", 0)
              .attr("fill", activityColor("Allocation"))
              .attr("opacity", 1)
              .style("cursor", "pointer")
              .call(addEuropeHover)
              .call((enter) => enter.transition().duration(700).attr("r", 6)),
          (update) =>
            update.call(addEuropeHover).call((update) =>
              update
                .transition()
                .duration(700)
                .attr("cx", (d) => europeX(d.value))
                .attr(
                  "cy",
                  (d) => europeY(d.countryISO3) + europeY.bandwidth() / 2,
                )
                .attr("r", 6)
                .attr("fill", activityColor("Allocation"))
                .attr("opacity", 1),
            ),
          (exit) =>
            exit.call((exit) =>
              exit.transition().duration(300).attr("r", 0).remove(),
            ),
        );

      const lineData = europeData.map((d) => {
        const values = showMeals
          ? [d.allocation, d.social, d.meals]
          : [d.allocation, d.social];

        return {
          countryISO3: d.countryISO3,
          start: d3.min(values),
          end: d3.max(values),
        };
      });

      chart
        .selectAll(".europe-line")
        .data(lineData, (d) => d.countryISO3)
        .join(
          (enter) =>
            enter
              .append("line")
              .attr("class", "europe-line")
              .attr("x1", (d) => europeX(d.start))
              .attr("x2", (d) => europeX(d.end))
              .attr(
                "y1",
                (d) => europeY(d.countryISO3) + europeY.bandwidth() / 2,
              )
              .attr(
                "y2",
                (d) => europeY(d.countryISO3) + europeY.bandwidth() / 2,
              )
              .attr("stroke", "#dedede")
              .attr("stroke-width", 2)
              .attr("opacity", 0)
              .call((enter) =>
                enter.transition().duration(700).attr("opacity", 1),
              ),
          (update) =>
            update.call((update) =>
              update
                .transition()
                .duration(700)
                .attr("x1", (d) => europeX(d.start))
                .attr("x2", (d) => europeX(d.end))
                .attr(
                  "y1",
                  (d) => europeY(d.countryISO3) + europeY.bandwidth() / 2,
                )
                .attr(
                  "y2",
                  (d) => europeY(d.countryISO3) + europeY.bandwidth() / 2,
                )
                .attr("opacity", 1),
            ),
          (exit) =>
            exit.call((exit) =>
              exit.transition().duration(300).attr("opacity", 0).remove(),
            ),
        );

      const dotData = europeData.flatMap((d) => {
        const dots = [
          {
            countryISO3: d.countryISO3,
            countryName: d.countryName,
            category: "Social",
            value: d.social,
          },
        ];

        if (showMeals) {
          dots.push({
            countryISO3: d.countryISO3,
            countryName: d.countryName,
            category: "Meals",
            value: d.meals,
          });
        }

        return dots;
      });

      chart
        .selectAll(".europe-dot")
        .data(dotData, (d) => `${d.countryISO3}-${d.category}`)
        .join(
          (enter) =>
            enter
              .append("circle")
              .attr("class", "europe-dot")
              .attr("cx", (d) => europeX(d.value))
              .attr(
                "cy",
                (d) => europeY(d.countryISO3) + europeY.bandwidth() / 2,
              )
              .attr("r", 0)
              .attr("fill", (d) => activityColor(d.category))
              .attr("opacity", 1)
              .style("cursor", "pointer")
              .call(addEuropeHover)
              .call((enter) => enter.transition().duration(700).attr("r", 6)),
          (update) =>
            update.call(addEuropeHover).call((update) =>
              update
                .transition()
                .duration(700)
                .attr("cx", (d) => europeX(d.value))
                .attr(
                  "cy",
                  (d) => europeY(d.countryISO3) + europeY.bandwidth() / 2,
                )
                .attr("fill", (d) => activityColor(d.category))
                .attr("r", 6),
            ),
          (exit) =>
            exit.call((exit) =>
              exit.transition().duration(300).attr("r", 0).remove(),
            ),
        );

      drawEuropeLegend(
        showMeals
          ? ["Allocation", "Social", "Meals"]
          : ["Allocation", "Social"],
      );

      chart.selectAll(".europe-line").lower();
      chart.selectAll(".scatter-dot").raise();
      chart.selectAll(".europe-dot").raise();
      chart.selectAll(".europe-legend").raise();
    }

    function drawScatterAxes(x, y) {
      xAxisGroup
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(
          d3
            .axisBottom(x)
            .tickValues([20, 40, 60, 80, 100, 120])
            .tickFormat((d) => `${d} min`),
        );

      yAxisGroup.attr("transform", `translate(${margin.left}, 0)`).call(
        d3
          .axisLeft(y)
          .ticks(6)
          .tickFormat((d) => (d === 0 ? "" : `${d} min`)),
      );

      styleAxes();
      drawCustomAxisLines(margin.left, true);

      svg.selectAll(".axis-title").remove();

      svg
        .append("text")
        .attr("class", "axis-title")
        .attr("x", width / 2)
        .attr("y", height - 35)
        .attr("text-anchor", "middle")
        .attr("font-size", 18)
        .attr("font-weight", 200)
        .text("Time spent allocating / min");

      svg
        .append("text")
        .attr("class", "axis-title")
        .attr("x", -height / 2)
        .attr("y", 35)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("font-size", 18)
        .attr("font-weight", 200)
        .text("Time spent socializing / min");
    }

    function drawEuropeAxes(x, y, europeData) {
      const xStart = margin.left;

      xAxisGroup
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(
          d3
            .axisBottom(x)
            .ticks(8)
            .tickFormat((d) => `${d} min`),
        );

      yAxisGroup.attr("transform", `translate(${xStart}, 0)`).call(
        d3
          .axisLeft(y)
          .tickSize(0)
          .tickFormat((iso) => {
            const country = europeData.find((d) => d.countryISO3 === iso);
            return country ? country.countryName : iso;
          }),
      );

      styleAxes();

      yAxisGroup.selectAll("text").attr("font-size", 13);

      drawCustomAxisLines(xStart, false);

      svg.selectAll(".axis-title").remove();

      svg
        .append("text")
        .attr("class", "axis-title")
        .attr("x", width / 2)
        .attr("y", height - 35)
        .attr("text-anchor", "middle")
        .attr("font-size", 18)
        .attr("font-weight", 200)
        .text("Minutes per day");
    }

    function styleAxes() {
      xAxisGroup.selectAll(".tick line").remove();
      yAxisGroup.selectAll(".tick line").remove();

      xAxisGroup.select(".domain").remove();
      yAxisGroup.select(".domain").remove();

      xAxisGroup
        .selectAll("text")
        .attr("font-size", 12)
        .attr("font-family", "'Oswald', sans-serif")
        .attr("font-weight", 200);

      yAxisGroup
        .selectAll("text")
        .attr("font-size", 12)
        .attr("font-family", "'Oswald', sans-serif")
        .attr("font-weight", 200);
    }

    function drawCustomAxisLines(xStart, showYLine) {
      svg.selectAll(".custom-axis-line").remove();

      svg
        .append("line")
        .attr("class", "custom-axis-line")
        .attr("x1", xStart)
        .attr("x2", width - margin.right)
        .attr("y1", height - margin.bottom)
        .attr("y2", height - margin.bottom)
        .attr("stroke", "#111")
        .attr("stroke-width", 1);

      if (showYLine) {
        svg
          .append("line")
          .attr("class", "custom-axis-line")
          .attr("x1", xStart)
          .attr("x2", xStart)
          .attr("y1", margin.top)
          .attr("y2", height - margin.bottom)
          .attr("stroke", "#111")
          .attr("stroke-width", 1);
      }
    }

    function drawEuropeLegend(categories) {
      chart
        .selectAll(".europe-legend")
        .data(categories, (d) => d)
        .join(
          (enter) => {
            const group = enter
              .append("g")
              .attr("class", "europe-legend")
              .attr(
                "transform",
                (d, i) => `translate(${margin.left + i * 140}, ${margin.top})`,
              )
              .attr("opacity", 0);

            group
              .append("circle")
              .attr("r", 7)
              .attr("fill", (d) => activityColor(d));

            group
              .append("text")
              .attr("x", 14)
              .attr("y", 5)
              .attr("font-size", 14)
              .attr("font-weight", 200)
              .text((d) => d);

            group.transition().duration(700).attr("opacity", 1);

            return group;
          },
          (update) =>
            update.call((update) =>
              update
                .transition()
                .duration(700)
                .attr(
                  "transform",
                  (d, i) =>
                    `translate(${margin.left + i * 140}, ${margin.top})`,
                )
                .attr("opacity", 1),
            ),
          (exit) =>
            exit.call((exit) =>
              exit.transition().duration(300).attr("opacity", 0).remove(),
            ),
        );
    }

    function clearScatter() {
      chart.selectAll(".scatter-dot").remove();
      chart.selectAll(".scatter-label").remove();
      chart.selectAll(".region-highlight-label").remove();
    }

    function clearEurope() {
      chart.selectAll(".europe-line").remove();
      chart.selectAll(".europe-dot").remove();
      chart.selectAll(".europe-legend").remove();
    }

    function addScatterHover(selection) {
      selection
        .on("mouseenter", function (event, d) {
          d3.select(this)
            .attr("stroke", "#111")
            .attr("stroke-width", 2)
            .raise();

          tooltip
            .style("display", "block")
            .style("left", `${event.clientX}px`)
            .style("top", `${event.clientY - 10}px`).html(`
              <div style="font-size:18px; font-weight:500">${d.countryName}</div>
              <div style="font-size:16px; font-weight:200">${d.economicStatus}</div>
              <div style="font-size:16px; font-weight:200">Allocation: ${Math.round(d.allocation)} min/day</div>
              <div style="font-size:16px; font-weight:200">Social: ${Math.round(d.social)} min/day</div>
            `);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", `${event.clientX}px`)
            .style("top", `${event.clientY - 10}px`);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("stroke", "none");
          tooltip.style("display", "none");
        });
    }

    function addEuropeHover(selection) {
      selection
        .on("mouseenter", function (event, d) {
          d3.select(this)
            .attr("stroke", "#111")
            .attr("stroke-width", 2)
            .raise();

          tooltip
            .style("display", "block")
            .style("left", `${event.clientX}px`)
            .style("top", `${event.clientY - 10}px`).html(`
              <div style="font-size:18px; font-weight:500">${d.countryName}</div>
              <div style="font-size:16px; font-weight:200">${d.category}: ${Math.round(d.value)} min/day</div>
            `);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", `${event.clientX}px`)
            .style("top", `${event.clientY - 10}px`);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("stroke", "none");
          tooltip.style("display", "none");
        });
    }
  });
});
