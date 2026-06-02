document.addEventListener("DOMContentLoaded", () => {
  const width = 1100;
  const height = 520;

  const baselineY = 400;
  const leftPad = 70;
  const rightPad = 70;

  const container = d3.select("#connections-chart");

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "h-full w-full")
    .attr("font-family", "'Oswald', sans-serif");

  const arcLayer = svg.append("g");
  const pointLayer = svg.append("g");

  const pointCount = 26;

  const points = d3.range(pointCount).map((_, i) => ({
    id: i,
    x: leftPad + (i / (pointCount - 1)) * (width - leftPad - rightPad),
    y: baselineY,
  }));

  const fixedFirstArc = {
    id: "first-arc",
    source: 0,
    target: 4,
  };

  function makeLink(source, target, id = `${source}-${target}`) {
    const p1 = points[source];
    const p2 = points[target];

    const distance = Math.abs(p2.x - p1.x);
    const lift = Math.max(55, Math.min(170, distance * 0.45));

    return {
      id,
      source,
      target,
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      lift,
    };
  }

  function buildConnections(count) {
    const links = [
      makeLink(fixedFirstArc.source, fixedFirstArc.target, fixedFirstArc.id),
    ];
    const used = new Set([`${fixedFirstArc.source}-${fixedFirstArc.target}`]);

    while (links.length < count) {
      const source = Math.floor(Math.random() * (pointCount - 3));
      const jump = 3 + Math.floor(Math.random() * 9);
      const target = Math.min(pointCount - 1, source + jump);

      if (source === target) continue;

      const key = `${source}-${target}`;
      if (used.has(key)) continue;

      used.add(key);
      links.push(makeLink(source, target));
    }

    return links;
  }

  const allConnections = buildConnections(46);

  const connectionsByStep = [
    allConnections.slice(0, 1),
    allConnections.slice(0, 9),
    allConnections.slice(0, 46),
  ];

  pointLayer
    .selectAll("circle")
    .data(points)
    .join("circle")
    .attr("cx", (d) => d.x)
    .attr("cy", (d) => d.y)
    .attr("r", 8)
    .attr("fill", "#f58518")
    .attr("opacity", 1);

  function arcPath(d) {
    const midX = (d.x1 + d.x2) / 2;
    const peakY = Math.min(d.y1, d.y2) - d.lift;

    return `M ${d.x1} ${d.y1} Q ${midX} ${peakY} ${d.x2} ${d.y2}`;
  }

  function updateConnections(stepIndex) {
    const visibleConnections = connectionsByStep[stepIndex];

    arcLayer
      .selectAll("path")
      .data(visibleConnections, (d) => d.id)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("d", arcPath)
            .attr("fill", "none")
            .attr("stroke", "#787878")
            .attr("stroke-width", 0.75)
            .attr("stroke-linecap", "round")
            .attr("opacity", 0)
            .call((enter) =>
              enter.transition().duration(700).attr("opacity", 1),
            ),
        (update) =>
          update.call((update) =>
            update
              .transition()
              .duration(700)
              .attr("d", arcPath)
              .attr("opacity", 0.75),
          ),
        (exit) =>
          exit.call((exit) =>
            exit.transition().duration(300).attr("opacity", 0).remove(),
          ),
      );

    arcLayer.lower();
    pointLayer.raise();
  }

  updateConnections(0);

  const scroller = scrollama();

  scroller
    .setup({
      step: ".connections-step",
      offset: 0.6,
    })
    .onStepEnter((response) => {
      d3.selectAll(".connections-step").classed("opacity-40", true);
      d3.select(response.element).classed("opacity-40", false);

      const stepIndex = Number(response.element.dataset.step);
      updateConnections(stepIndex);
    });

  window.addEventListener("resize", scroller.resize);
});
