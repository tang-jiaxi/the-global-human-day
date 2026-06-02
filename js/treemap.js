const width = 1100;
const height = 720;

const chart = d3.select("#chart");

const svg = chart
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("class", "absolute inset-0 h-full w-full");

const color = d3.scaleOrdinal(d3.schemeTableau10);

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
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("rx", 8)
    .attr("fill", (d) => color(d.data.name))
    .attr("opacity", 0.9);

  nodes.append("title").text(
    (d) =>
      `${formatLabel(d.data.name)}
          ${d.data.value} hours/day
          ${Math.round(d.data.value * 60)} min/day
          Uncertainty: ±${d.data.uncertainty}`,
  );

  chart
    .selectAll(".treemap-label")
    .data(root.leaves())
    .join("div")
    .attr(
      "class",
      "treemap-label absolute overflow-hidden p-3 pointer-events-none",
    )
    .style("left", (d) => `${(d.x0 / width) * 100}%`)
    .style("top", (d) => `${(d.y0 / height) * 100}%`)
    .style("width", (d) => `${((d.x1 - d.x0) / width) * 100}%`)
    .style("height", (d) => `${((d.y1 - d.y0) / height) * 100}%`)
    .html((d) => {
      const rectWidth = d.x1 - d.x0;
      const rectHeight = d.y1 - d.y0;

      if (rectWidth < 75 || rectHeight < 50) return "";

      return `
          <div class="font-medium leading-tight text-black text-[clamp(0.65rem,1.1vw,1.25rem)]">
            ${formatLabel(d.data.name)}
          </div>
          <div class="mt-1 font-light leading-tight text-black/80 text-[clamp(0.55rem,0.85vw,0.95rem)]">
            ${Math.round(d.data.value * 60)} min/day
          </div>
        `;
    });
});

function formatLabel(text) {
  return text
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
