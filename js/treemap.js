const width = 1100;
const height = 720;

const chart = d3.select("#chart");

const svg = chart
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("class", "absolute inset-0 h-full w-full")
  .style("pointer-events", "none");

const color = d3.scaleOrdinal(d3.schemeTableau10);

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

d3.csv("global_human_day.csv", d3.autoType).then((data) => {
  const root = d3
    .hierarchy({
      name: "Global Human Day",
      children: data.map((d) => ({
        name: d.subcategory,
        value: d.hoursPerDay,
        uncertainty: d.uncertainty,
      })),
    })
    .sum((d) => d.value)
    .sort((a, b) => b.value - a.value);

  d3.treemap().size([width, height]).paddingInner(4).round(true)(root);

  const nodes = svg
    .selectAll("g")
    .data(root.leaves())
    .join("g")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  nodes
    .append("rect")
    .attr("class", "treemap-rect")
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("rx", (d) => (d.x1 - d.x0 < 20 ? 4 : 8))
    .attr("fill", (d) => color(d.data.name))
    .attr("opacity", 0.9)
    .style("cursor", "pointer")
    .attr("pointer-events", "all")
    .on("mouseenter", function (event, d) {
      d3.select(this).attr("opacity", 1).raise();

      tooltip
        .style("display", "block")
        .style("left", `${event.clientX}px`)
        .style("top", `${event.clientY - 14}px`).html(`
          <div style="font-size:18px; font-weight:500">${formatLabel(d.data.name)}</div>
          <div style="font-size:16px; font-weight:200">${Number(d.data.value).toFixed(2)} hours/day</div>
          <div style="font-size:16px; font-weight:200">${Math.round(d.data.value * 60)} min/day</div>
          <div style="font-size:16px; font-weight:200">Uncertainty: ±${d.data.uncertainty}</div>
        `);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", `${event.clientX}px`)
        .style("top", `${event.clientY - 14}px`);
    })
    .on("mouseleave", function () {
      d3.select(this).attr("opacity", 0.9).attr("stroke", "none");

      tooltip.style("display", "none");
    });

  chart
    .selectAll(".treemap-label")
    .data(root.leaves())
    .join("div")
    .attr("class", "treemap-label absolute overflow-hidden pointer-events-none")
    .style("pointer-events", "none")
    .style("left", (d) => `${(d.x0 / width) * 100}%`)
    .style("top", (d) => `${(d.y0 / height) * 100}%`)
    .style("width", (d) => `${((d.x1 - d.x0) / width) * 100}%`)
    .style("height", (d) => `${((d.y1 - d.y0) / height) * 100}%`)
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "flex-start")
    .style("justify-content", (d) => {
      const rectHeight = d.y1 - d.y0;

      return rectHeight < 80 ? "center" : "flex-start";
    })
    .style("padding", (d) => {
      const rectHeight = d.y1 - d.y0;

      return rectHeight < 80 ? "0 12px" : "12px";
    })
    .html((d) => {
      const rectWidth = d.x1 - d.x0;
      const rectHeight = d.y1 - d.y0;

      if (rectWidth < 75 || rectHeight < 50) return "";

      const titleSize = Math.min(rectWidth / 5, rectHeight / 4);
      const valueSize = Math.min(rectWidth / 8, rectHeight / 5);

      return `
      <div
        class="font-medium leading-tight text-black"
        style="font-size: clamp(14px, ${titleSize}px, 30px);"
      >
        ${formatLabel(d.data.name)}
      </div>

      <div
        class="mt-0.5 font-light leading-tight text-black/80"
        style="font-size: clamp(12px, ${valueSize}px, 20px);"
      >
        ${Math.round(d.data.value * 60)} min/day
      </div>
    `;
    });
});

function formatLabel(text) {
  return String(text)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
