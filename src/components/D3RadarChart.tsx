import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
// --- D3.JS RADAR CHART COMPONENT FOR MOOD DISTRIBUTION ---
interface D3RadarChartProps {
  data: { mood: string; count: number; percentage: number }[];
  selectedMood: string | null;
  onSelectMood: (mood: string | null) => void;
}

const D3RadarChart: React.FC<D3RadarChartProps> = ({ data, selectedMood, onSelectMood }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 340;
    const height = 300;
    const margin = 50;
    const radius = Math.min(width, height) / 2 - margin;
    const totalAxes = data.length;
    const angleSlice = (Math.PI * 2) / totalAxes;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const maxVal: number = Number(d3.max(data, (d: { count: number }) => d.count)) || 1;
    const rScale = d3.scaleLinear().domain([0, maxVal]).range([0, radius]);

    // Concentric grid circles (3 levels)
    const levels = 3;
    for (let level = 1; level <= levels; level++) {
      const levelRadius = (radius / levels) * level;
      g.append('circle')
        .attr('r', levelRadius)
        .attr('fill', 'none')
        .attr('stroke', '#374151')
        .attr('stroke-dasharray', '2,2')
        .attr('stroke-width', 1);

      g.append('text')
        .attr('x', 4)
        .attr('y', -levelRadius + 2)
        .attr('fill', '#9CA3AF')
        .style('font-size', '8px')
        .style('font-weight', 'bold')
        .text(Math.round((maxVal / levels) * level));
    }

    // Axes lines & labels
    const axis = g
      .selectAll('.axis')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'axis');

    axis
      .append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', (_d: any, i: number) => rScale(maxVal) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr('y2', (_d: any, i: number) => rScale(maxVal) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr('stroke', (d: any) => selectedMood === d.mood ? '#2DD4BF' : '#4B5563')
      .attr('stroke-width', (d: any) => selectedMood === d.mood ? 2 : 1.2);

    // Axis interactive labels
    axis
      .append('text')
      .attr('class', 'legend')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .attr('text-anchor', (_d: any, i: number) => {
        const x = Math.cos(angleSlice * i - Math.PI / 2);
        if (Math.abs(x) < 0.1) return 'middle';
        return x > 0 ? 'start' : 'end';
      })
      .attr('dy', '0.35em')
      .attr('x', (_d: any, i: number) => (rScale(maxVal) + 18) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr('y', (_d: any, i: number) => (rScale(maxVal) + 18) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr('fill', (d: any) => selectedMood === d.mood ? '#2DD4BF' : '#E5E7EB')
      .style('cursor', 'pointer')
      .text((d: any) => `${d.mood} (${d.count})`)
      .on('click', (_event: any, d: any) => {
        if (selectedMood === d.mood) {
          onSelectMood(null);
        } else {
          onSelectMood(d.mood);
        }
      });

    // Radar polygon path generator
    const radarLine = d3
      .lineRadial<{ mood: string; count: number }>()
      .radius((d: any) => rScale(d.count))
      .angle((_d: any, i: number) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    // Draw Radar Blob
    g.append('path')
      .datum(data)
      .attr('d', radarLine as any)
      .style('fill', '#14B8A6')
      .style('fill-opacity', 0.35)
      .style('stroke', '#2DD4BF')
      .style('stroke-width', 2.5);

    // Add interactive data points
    g.selectAll('.radarCircle')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'radarCircle')
      .attr('r', (d: any) => selectedMood === d.mood ? 6 : 4)
      .attr('cx', (d: any, i: number) => rScale(d.count) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr('cy', (d: any, i: number) => rScale(d.count) * Math.sin(angleSlice * i - Math.PI / 2))
      .style('fill', (d: any) => selectedMood === d.mood ? '#5EEAD4' : '#0F766E')
      .style('stroke', '#2DD4BF')
      .style('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (_event: any, d: any) => {
        onSelectMood(selectedMood === d.mood ? null : d.mood);
      });

  }, [data, selectedMood]);

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-gray-900/90 rounded-2xl border border-gray-700/80">
      <div className="flex items-center justify-between w-full px-2 mb-1">
        <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">
          📊 Interactive Mood Distribution Radar
        </span>
        {selectedMood && (
          <button
            onClick={() => onSelectMood(null)}
            className="text-[10px] text-teal-300 hover:text-white underline font-semibold"
          >
            Clear Mood Filter ({selectedMood})
          </button>
        )}
      </div>
      <svg ref={svgRef}></svg>
      <p className="text-[10px] text-gray-400 italic text-center mt-1">
        💡 Click on any mood axis or point to filter songs by emotional sentiment
      </p>
    </div>
  );
};
export default D3RadarChart;
