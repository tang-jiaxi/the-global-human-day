document.addEventListener("DOMContentLoaded", () => {
  const width = 1000;
  const defaultHeight = 760;
  const margin = { top: 20, right: 120, bottom: 80, left: 200 };

  const SELECT_CATEGORIES = "__select_categories__";
  const SELECT_COUNTRIES = "__select_countries__";

  const container = d3.select("#dataset-explorer");
  const caption = d3.select("#explorer-caption");

  const categorySelect = d3.select("#filter-category");
  const countrySelect = d3.select("#filter-country");

  if (container.empty()) {
    console.error("Could not find #dataset-explorer");
    return;
  }

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${defaultHeight}`)
    .attr("width", "100%")
    .attr("height", "auto")
    .attr("font-family", "'Oswald', sans-serif")
    .style("display", "block");

  const chart = svg.append("g");
  const xAxisGroup = svg.append("g");
  const yAxisGroup = svg.append("g");

  const statusColor = d3
    .scaleOrdinal()
    .domain(["Developed", "Developing", "Not classified"])
    .range(["#4c78a8", "#f58518", "#bab0ac"]);

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
    .style("font-family", "'Oswald', sans-serif");

  d3.csv("all_countries_extended.csv", d3.autoType).then((rows) => {
    const data = rows
      .filter(
        (d) =>
          d.countryISO3 &&
          d.country_name &&
          d.subcategory &&
          Number.isFinite(d.hoursPerDayCombined),
      )
      .map((d) => ({
        countryISO3: d.countryISO3,
        countryName: d.country_name,
        category: d.subcategory,
        economicStatus: d.economic_status || "Not classified",
        minutes: d.hoursPerDayCombined * 60,
      }));

    const categories = [...new Set(data.map((d) => d.category))].sort();

    const countries = d3
      .rollups(
        data,
        (group) => group[0].countryName,
        (d) => d.countryISO3,
      )
      .map(([iso, name]) => ({ iso, name }))
      .sort((a, b) => d3.ascending(a.name, b.name));

    categorySelect
      .selectAll("option")
      .data([
        { value: SELECT_CATEGORIES, label: "Select category" },
        ...categories.map((d) => ({
          value: d,
          label: formatLabel(d),
        })),
      ])
      .join("option")
      .attr("value", (d) => d.value)
      .text((d) => d.label);

    countrySelect
      .selectAll("option")
      .data([
        { value: SELECT_COUNTRIES, label: "Select country" },
        ...countries.map((d) => ({
          value: d.iso,
          label: d.name,
        })),
      ])
      .join("option")
      .attr("value", (d) => d.value)
      .text((d) => d.label);

    categorySelect.property("value", "allocation");
    countrySelect.property("value", SELECT_COUNTRIES);

    categorySelect.on("change", () => {
      const selectedCategory = categorySelect.property("value");

      if (selectedCategory !== SELECT_CATEGORIES) {
        countrySelect.property("value", SELECT_COUNTRIES);
      }

      updateExplorer();
    });

    countrySelect.on("change", () => {
      const selectedCountry = countrySelect.property("value");

      if (selectedCountry !== SELECT_COUNTRIES) {
        categorySelect.property("value", SELECT_CATEGORIES);
      }

      updateExplorer();
    });

    updateExplorer();

    function updateExplorer() {
      clearChart();

      const selectedCategory = categorySelect.property("value");
      const selectedCountry = countrySelect.property("value");

      if (selectedCountry !== SELECT_COUNTRIES) {
        drawCountryBar(selectedCountry);
        return;
      }

      const category =
        selectedCategory === SELECT_CATEGORIES
          ? "allocation"
          : selectedCategory;

      if (selectedCategory === SELECT_CATEGORIES) {
        categorySelect.property("value", category);
      }

      drawCategoryBar(category);
    }

    function drawCategoryBar(category) {
      const chartData = data
        .filter((d) => d.category === category)
        .sort((a, b) => b.minutes - a.minutes)
        .map((d) => ({
          ...d,
          label: d.countryName,
        }));

      drawBarChart({
        chartData,
        labelKey: "label",
        xTitle: "Minutes per day",
      });
    }

    function drawCountryBar(countryISO3) {
      const countryName =
        countries.find((d) => d.iso === countryISO3)?.name || countryISO3;

      const chartData = data
        .filter((d) => d.countryISO3 === countryISO3)
        .sort((a, b) => b.minutes - a.minutes)
        .map((d) => ({
          ...d,
          label: formatLabel(d.category),
        }));

      caption.text(`By country: sorted time-use breakdown for ${countryName}.`);

      drawBarChart({
        chartData,
        labelKey: "label",
        xTitle: "Minutes per day",
      });
    }

    function drawBarChart({ chartData, labelKey, xTitle }) {
      const rowHeight = 26;
      const dynamicHeight = Math.max(
        defaultHeight,
        margin.top + margin.bottom + chartData.length * rowHeight,
      );

      svg.attr("viewBox", `0 0 ${width} ${dynamicHeight}`);

      const x = d3
        .scaleLinear()
        .domain([0, d3.max(chartData, (d) => d.minutes) || 1])
        .nice()
        .range([margin.left, width - margin.right]);

      const y = d3
        .scaleBand()
        .domain(chartData.map((d) => d[labelKey]))
        .range([margin.top, dynamicHeight - margin.bottom])
        .padding(0.22);

      xAxisGroup
        .attr("transform", `translate(0, ${dynamicHeight - margin.bottom})`)
        .call(
          d3
            .axisBottom(x)
            .ticks(6)
            .tickFormat((d) => `${d} min`),
        );

      yAxisGroup
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y).tickSize(0).tickPadding(5));

      styleAxes();

      chart
        .selectAll(".explorer-bar")
        .data(chartData, (d) => `${d.countryISO3}-${d.category}`)
        .join(
          (enter) =>
            enter
              .append("rect")
              .attr("class", "explorer-bar")
              .attr("x", margin.left)
              .attr("y", (d) => y(d[labelKey]))
              .attr("width", 0)
              .attr("height", y.bandwidth())
              .attr("fill", (d) => statusColor(d.economicStatus))
              .attr("opacity", 0.85)
              .style("cursor", "pointer")
              .call(addHover)
              .call((enter) =>
                enter
                  .transition()
                  .duration(500)
                  .attr("width", (d) => x(d.minutes) - margin.left),
              ),
          (update) =>
            update.call(addHover).call((update) =>
              update
                .transition()
                .duration(500)
                .attr("x", margin.left)
                .attr("y", (d) => y(d[labelKey]))
                .attr("width", (d) => x(d.minutes) - margin.left)
                .attr("height", y.bandwidth())
                .attr("fill", (d) => statusColor(d.economicStatus)),
            ),
          (exit) =>
            exit.call((exit) =>
              exit.transition().duration(250).attr("width", 0).remove(),
            ),
        );

      chart
        .selectAll(".value-label")
        .data(chartData, (d) => `${d.countryISO3}-${d.category}-value`)
        .join("text")
        .attr("class", "value-label")
        .attr("x", (d) => x(d.minutes) + 6)
        .attr("y", (d) => y(d[labelKey]) + y.bandwidth() / 2)
        .attr("dominant-baseline", "middle")
        .attr("font-size", 12)
        .attr("font-weight", 200)
        .text((d) => `${Math.round(d.minutes)} min`);

      drawAxisLine(dynamicHeight);
      drawAxisTitle(xTitle, dynamicHeight);
    }

    function clearChart() {
      chart.selectAll("*").remove();
      svg.selectAll(".explorer-axis-line").remove();
      svg.selectAll(".explorer-title").remove();
      xAxisGroup.selectAll("*").remove();
      yAxisGroup.selectAll("*").remove();
    }

    function styleAxes() {
      xAxisGroup.selectAll(".tick line").remove();
      yAxisGroup.selectAll(".tick line").remove();

      xAxisGroup.select(".domain").remove();
      yAxisGroup.select(".domain").remove();

      xAxisGroup
        .selectAll("text")
        .attr("font-family", "'Oswald', sans-serif")
        .attr("font-size", 12)
        .attr("font-weight", 200);

      yAxisGroup
        .selectAll("text")
        .attr("font-family", "'Oswald', sans-serif")
        .attr("font-size", 12)
        .attr("font-weight", 350);
    }

    function drawAxisLine(chartHeight) {
      svg
        .append("line")
        .attr("class", "explorer-axis-line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", chartHeight - margin.bottom)
        .attr("y2", chartHeight - margin.bottom)
        .attr("stroke", "#111")
        .attr("stroke-width", 1);
    }

    function drawAxisTitle(text, chartHeight) {
      svg
        .append("text")
        .attr("class", "explorer-title")
        .attr("x", width / 2)
        .attr("y", chartHeight - 35)
        .attr("text-anchor", "middle")
        .attr("font-size", 18)
        .attr("font-weight", 200)
        .text(text);
    }

    function addHover(selection) {
      selection
        .on("mouseenter", function (event, d) {
          d3.select(this)
            .attr("opacity", 1)
            .attr("stroke", "#111")
            .attr("stroke-width", 1.5);

          tooltip
            .style("display", "block")
            .style("left", `${event.clientX}px`)
            .style("top", `${event.clientY - 10}px`).html(`
              <div style="font-size:18px; font-weight:500">${d.countryName}</div>
              <div style="font-size:16px; font-weight:200">${formatLabel(d.category)}</div>
              <div style="font-size:16px; font-weight:200">${d.economicStatus}</div>
              <div style="font-size:16px; font-weight:200">${Math.round(d.minutes)} min/day</div>
            `);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", `${event.clientX}px`)
            .style("top", `${event.clientY - 10}px`);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("opacity", 0.85).attr("stroke", "none");
          tooltip.style("display", "none");
        });
    }

    function formatLabel(text) {
      return String(text)
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }
  });
});
