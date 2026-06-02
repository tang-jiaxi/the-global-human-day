const regionBubbleWidth = 1100;
const regionBubbleHeight = 850;

const regionNameByCode = {
  AF_E: "Eastern Africa",
  AF_M: "Middle Africa",
  AF_N: "Northern Africa",
  AF_S: "Southern Africa",
  AF_W: "Western Africa",
  AM_C: "Central America & Caribbean",
  AM_N: "Northern America",
  AM_S: "South America",
  AS_C: "Central Asia",
  AS_E: "Eastern Asia",
  AS_S: "Southern Asia",
  AS_SE: "Southeast Asia",
  AS_W: "Western Asia / Middle East",
  EU_E: "Eastern Europe",
  EU_N: "Northern Europe",
  EU_S: "Southern Europe",
  EU_W: "Western Europe",
  ANZ: "Australia and NZ",
  OC: "Oceania",
};

const regionBubbleSvg = d3
  .select("#region-bubbles")
  .append("svg")
  .attr("viewBox", `0 0 ${regionBubbleWidth} ${regionBubbleHeight}`)
  .attr("class", "h-full w-full");

const regionBubbleColor = d3.scaleOrdinal(d3.schemeTableau10);

d3.csv("all_countries_extended.csv", d3.autoType).then((rows) => {
  const countries = Array.from(
    d3
      .rollup(
        rows,
        (group) => group[0],
        (d) => d.countryISO3,
      )
      .values(),
  ).filter((d) => d.region_code && d.population);

  const regions = d3
    .rollups(
      countries,
      (group) => d3.sum(group, (d) => d.population),
      (d) => d.region_code,
    )
    .map(([regionCode, population]) => ({
      regionCode,
      regionName: regionNameByCode[regionCode] || regionCode,
      population,
      totalDailyHours: population * 24,
    }));

  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(regions, (d) => d.totalDailyHours)])
    .range([24, 155]);

  const bubbles = regions.map((d) => ({
    ...d,
    radius: radiusScale(d.totalDailyHours),
    x: regionBubbleWidth / 2 + Math.random() * 80 - 40,
    y: regionBubbleHeight / 2 + Math.random() * 80 - 40,
  }));

  const bubbleGroups = regionBubbleSvg.selectAll("g").data(bubbles).join("g");

  bubbleGroups
    .append("circle")
    .attr("r", (d) => d.radius)
    .attr("fill", (d) => regionBubbleColor(d.regionCode))
    .attr("opacity", 0.9);

  bubbleGroups.append("title").text(
    (d) =>
      `${d.regionName}
Population: ${d3.format(",.0f")(d.population)}
24h × population: ${d3.format(",.0f")(d.totalDailyHours)} hours`,
  );

  bubbleGroups.each(function (d) {
    if (d.radius < 34) return;

    const group = d3.select(this);

    const fontSize = Math.min(d.radius / 5.2, 20);
    const titleFontSize = Math.min(d.radius / 4.4, 24);
    const lineHeight = fontSize * 1.25;

    const titleLines = wrapTextByWords(d.regionName, d.radius > 80 ? 28 : 12);

    const lines = [
      ...titleLines.map((line) => ({
        text: line,
        weight: 500,
        size: titleFontSize,
      })),
      {
        text: `${formatHours(d.totalDailyHours)} hours`,
        weight: 200,
        size: fontSize,
      },
      {
        text: `${formatPopulation(d.population)} people`,
        weight: 200,
        size: fontSize,
      },
    ];

    const startY = -((lines.length - 1) * lineHeight) / 2;

    const label = group
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "black")
      .style("pointer-events", "none");

    lines.forEach((line, i) => {
      label
        .append("tspan")
        .attr("x", 0)
        .attr("y", startY + i * lineHeight)
        .attr("font-size", line.size)
        .attr("font-weight", line.weight)
        .text(line.text);
    });
  });

  const simulation = d3
    .forceSimulation(bubbles)
    .force("x", d3.forceX(regionBubbleWidth / 2).strength(0.04))
    .force("y", d3.forceY(regionBubbleHeight / 2).strength(0.04))
    .force("collide", d3.forceCollide((d) => d.radius + 8).iterations(4))
    .force("bounds", keepBubblesInside)
    .force("jiggle", addConstantMovement)
    .alpha(1)
    .alphaDecay(0)
    .velocityDecay(0.45)
    .on("tick", () => {
      bubbleGroups.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

  function keepBubblesInside() {
    for (const d of bubbles) {
      d.x = Math.max(
        d.radius + 10,
        Math.min(regionBubbleWidth - d.radius - 10, d.x),
      );

      d.y = Math.max(
        d.radius + 10,
        Math.min(regionBubbleHeight - d.radius - 10, d.y),
      );
    }
  }

  function addConstantMovement() {
    for (const d of bubbles) {
      d.vx += (Math.random() - 0.5) * 0.12;
      d.vy += (Math.random() - 0.5) * 0.12;
    }
  }
});

function wrapTextByWords(text, maxCharsPerLine) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;

    if (testLine.length > maxCharsPerLine && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function formatHours(value) {
  if (value >= 1e9) return `${d3.format(".2f")(value / 1e9)}B`;
  if (value >= 1e6) return `${d3.format(".1f")(value / 1e6)}M`;
  return d3.format(",.0f")(value);
}

function formatPopulation(value) {
  if (value >= 1e9) return `${d3.format(".2f")(value / 1e9)}B`;
  if (value >= 1e6) return `${d3.format(".1f")(value / 1e6)}M`;
  return d3.format(",.0f")(value);
}
