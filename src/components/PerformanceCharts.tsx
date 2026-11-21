import React, {useState} from 'react';
import type {
  PaperPerformanceStat,
  QuestionItem,
  SubmissionTimelinePoint,
  TeacherPerformanceStat,
} from '../shared/types';

interface TeacherPerformanceChartProps {
  teacherStats: TeacherPerformanceStat[];
  questions: QuestionItem[];
  onSelectTeacher: (stat: TeacherPerformanceStat) => void;
}

function getBarColor(band: TeacherPerformanceStat['performanceBand']): string {
  switch (band) {
    case 'Exemplary':
      return '#16a34a';
    case 'Proficient':
      return '#1d4ed8';
    case 'Developing':
      return '#d97706';
    case 'Needs Attention':
      return '#dc2626';
    default:
      return '#94a3b8';
  }
}

export const TeacherPerformanceChart: React.FC<TeacherPerformanceChartProps> = ({
  teacherStats,
  questions,
  onSelectTeacher,
}) => {
  const [sortBy, setSortBy] = useState<'score' | 'paper'>('score');
  const [paperFilter, setPaperFilter] = useState<number | 'all'>('all');
  const [hovered, setHovered] = useState<TeacherPerformanceStat | null>(null);

  const activeQuestions = questions.filter((q) => q.active);

  const filtered =
    paperFilter === 'all'
      ? teacherStats
      : teacherStats.filter((t) => t.teacher.paperNumber === paperFilter);

  const ordered = [...filtered].sort((a, b) => {
    if (sortBy === 'score') {
      if (b.overallAverage !== a.overallAverage) return b.overallAverage - a.overallAverage;
      return a.teacher.id.localeCompare(b.teacher.id);
    }
    if (a.teacher.paperNumber !== b.teacher.paperNumber) {
      return a.teacher.paperNumber - b.teacher.paperNumber;
    }
    return a.teacher.id.localeCompare(b.teacher.id);
  });

  const barHeight = 28;
  const rowGap = 6;
  const labelWidth = 220;
  const valueWidth = 68;
  const plotWidth = 520;
  const svgWidth = labelWidth + plotWidth + valueWidth;
  const svgHeight = Math.max(180, ordered.length * (barHeight + rowGap) + 32);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900">
            Faculty Performance Comparison ({teacherStats.length} Teachers · 1.0 – 5.0 Scale)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any teacher bar to inspect question-by-question breakdown and trainee remarks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="chart-paper-filter" className="sr-only">
            Filter chart by paper
          </label>
          <select
            id="chart-paper-filter"
            value={paperFilter}
            onChange={(e) => setPaperFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700"
          >
            <option value="all">All 12 Papers ({teacherStats.length} Teachers)</option>
            {Array.from({length: 12}, (_, i) => i + 1).map((p) => (
              <option key={p} value={p}>
                Paper {p}
              </option>
            ))}
          </select>

          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setSortBy('score')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                sortBy === 'score' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rank by Score
            </button>
            <button
              type="button"
              onClick={() => setSortBy('paper')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                sortBy === 'paper' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paper Order
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Live Hover Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-600" aria-hidden="true" />
            Exemplary (4.2+)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-700" aria-hidden="true" />
            Proficient (3.5–4.19)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-600" aria-hidden="true" />
            Developing (2.8–3.49)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-600" aria-hidden="true" />
            Needs Attention (&lt;2.8)
          </span>
        </div>
        {hovered && (
          <div className="font-mono text-xs text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md tabular-nums">
            {hovered.teacher.name} ·{' '}
            {activeQuestions
              .map((q) => `${q.shortLabel} ${(hovered.criteriaAverages[q.id] ?? 0).toFixed(2)}`)
              .join(' · ')}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[680px] h-auto"
          role="img"
          aria-label="Bar chart comparing average rating of faculty members"
        >
          {[1, 2, 3, 4, 5].map((tick) => {
            const x = labelWidth + (tick / 5) * plotWidth;
            return (
              <g key={tick}>
                <line
                  x1={x}
                  y1={8}
                  x2={x}
                  y2={svgHeight - 22}
                  stroke={tick === 4 ? '#94a3b8' : '#e2e8f0'}
                  strokeDasharray={tick === 4 ? '4 3' : undefined}
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={svgHeight - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748b"
                  className="font-mono"
                >
                  {tick}.0
                </text>
              </g>
            );
          })}

          {ordered.map((stat, idx) => {
            const y = 10 + idx * (barHeight + rowGap);
            const barW = Math.max(4, (stat.overallAverage / 5) * plotWidth);
            const fill = getBarColor(stat.performanceBand);
            const shortName =
              stat.teacher.name.length > 26
                ? `${stat.teacher.name.slice(0, 24)}…`
                : stat.teacher.name;

            return (
              <g
                key={stat.teacher.id}
                onMouseEnter={() => setHovered(stat)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectTeacher(stat)}
                className="cursor-pointer group"
              >
                <rect
                  x={0}
                  y={y}
                  width={svgWidth}
                  height={barHeight}
                  rx={6}
                  fill="transparent"
                  className="group-hover:fill-slate-50 transition-colors"
                />
                <text x={8} y={y + barHeight / 2 + 4} fontSize="12" fill="#0f172a" fontWeight={500}>
                  <tspan className="font-mono" fill="#64748b" fontSize="11">
                    P{stat.teacher.paperNumber}{' '}
                  </tspan>
                  {shortName}
                </text>

                <rect
                  x={labelWidth}
                  y={y + 5}
                  width={plotWidth}
                  height={barHeight - 10}
                  rx={4}
                  fill="#f1f5f9"
                />
                <rect
                  x={labelWidth}
                  y={y + 5}
                  width={barW}
                  height={barHeight - 10}
                  rx={4}
                  fill={fill}
                />
                <text
                  x={labelWidth + plotWidth + 10}
                  y={y + barHeight / 2 + 4}
                  fontSize="12"
                  fontWeight={600}
                  fill="#0f172a"
                  className="font-mono tabular-nums"
                >
                  {stat.overallAverage.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

interface PaperComparisonChartProps {
  paperStats: PaperPerformanceStat[];
}

export const PaperComparisonChart: React.FC<PaperComparisonChartProps> = ({paperStats}) => {
  const width = 560;
  const height = 240;
  const padLeft = 36;
  const padBottom = 32;
  const padTop = 18;
  const plotW = width - padLeft - 16;
  const plotH = height - padTop - padBottom;
  const colW = plotW / paperStats.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="pb-4 border-b border-slate-200">
        <h3 className="font-display text-base font-bold text-slate-900">
          Paper-Wise Average Rating (Paper 1 – 12)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Aggregate faculty score across all 12 curriculum papers
        </p>
      </div>
      <div className="pt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[440px] h-auto"
          role="img"
          aria-label="Column chart of average teacher ratings by Paper 1 through 12"
        >
          {[1, 2, 3, 4, 5].map((tick) => {
            const y = padTop + plotH - (tick / 5) * plotH;
            return (
              <g key={tick}>
                <line x1={padLeft} y1={y} x2={width - 12} y2={y} stroke="#e2e8f0" strokeWidth={1} />
                <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b" className="font-mono">
                  {tick}.0
                </text>
              </g>
            );
          })}

          {paperStats.map((p, idx) => {
            const barW = Math.max(18, colW - 14);
            const x = padLeft + idx * colW + (colW - barW) / 2;
            const barH = Math.max(2, (p.averageScore / 5) * plotH);
            const y = padTop + plotH - barH;
            const color =
              p.averageScore === 0
                ? '#cbd5e1'
                : p.averageScore >= 4.2
                  ? '#16a34a'
                  : p.averageScore >= 3.5
                    ? '#1d4ed8'
                    : '#d97706';

            return (
              <g key={p.paperNumber}>
                <rect x={x} y={y} width={barW} height={barH} rx={4} fill={color} />
                <text
                  x={x + barW / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={600}
                  fill="#0f172a"
                  className="font-mono tabular-nums"
                >
                  {p.averageScore > 0 ? p.averageScore.toFixed(1) : '—'}
                </text>
                <text
                  x={x + barW / 2}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#475569"
                  className="font-mono"
                >
                  P{p.paperNumber}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

interface SubmissionVelocityChartProps {
  timeline: SubmissionTimelinePoint[];
  submittedCount: number;
  draftCount: number;
  pendingCount: number;
  totalTrainees: number;
}

export const SubmissionVelocityChart: React.FC<SubmissionVelocityChartProps> = ({
  timeline,
  submittedCount,
  draftCount,
  pendingCount,
  totalTrainees,
}) => {
  const width = 560;
  const height = 190;
  const padLeft = 38;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxCum = Math.max(10, ...timeline.map((t) => t.cumulativeCount));

  const points = timeline.map((pt, i) => {
    const x =
      timeline.length === 1
        ? padLeft + plotW / 2
        : padLeft + (i / (timeline.length - 1)) * plotW;
    const y = padTop + plotH - (pt.cumulativeCount / maxCum) * plotH;
    return {x, y, ...pt};
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath =
    points.length > 0
      ? `M ${points[0].x},${padTop + plotH} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${padTop + plotH} Z`
      : '';

  const subPct = ((submittedCount / totalTrainees) * 100).toFixed(1);
  const draftPct = ((draftCount / totalTrainees) * 100).toFixed(1);
  const pendPct = ((pendingCount / totalTrainees) * 100).toFixed(1);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
      <div className="pb-4 border-b border-slate-200">
        <h3 className="font-display text-base font-bold text-slate-900">
          Trainee Completion Breakdown & Velocity (IST)
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Live submission progress across {totalTrainees} chest numbers in Kolkata Standard Time
        </p>
      </div>

      <div className="py-4 space-y-2.5">
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div style={{width: `${subPct}%`}} className="bg-green-600 h-full" />
          <div style={{width: `${draftPct}%`}} className="bg-amber-500 h-full" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-500">Submitted</span>
            <div className="font-mono font-semibold text-green-700 tabular-nums">
              {submittedCount} ({subPct}%)
            </div>
          </div>
          <div>
            <span className="text-slate-500">In Progress</span>
            <div className="font-mono font-semibold text-amber-700 tabular-nums">
              {draftCount} ({draftPct}%)
            </div>
          </div>
          <div>
            <span className="text-slate-500">Pending</span>
            <div className="font-mono font-semibold text-slate-700 tabular-nums">
              {pendingCount} ({pendPct}%)
            </div>
          </div>
        </div>
      </div>

      {points.length > 0 ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          role="img"
          aria-label="Line chart of cumulative trainee submissions over IST time"
        >
          {[0, 0.5, 1].map((ratio) => {
            const y = padTop + plotH - ratio * plotH;
            const val = Math.round(maxCum * ratio);
            return (
              <g key={ratio}>
                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#e2e8f0" strokeWidth={1} />
                <text x={padLeft - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b" className="font-mono">
                  {val}
                </text>
              </g>
            );
          })}
          {areaPath && <path d={areaPath} fill="#1d4ed8" fillOpacity={0.08} />}
          {polyline && <polyline fill="none" stroke="#1d4ed8" strokeWidth={2.5} points={polyline} />}
          {points.map((pt, idx) => (
            <g key={idx}>
              <circle cx={pt.x} cy={pt.y} r={3.5} fill="#1d4ed8" />
              <text
                x={pt.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
                className="font-mono"
              >
                {pt.label}
              </text>
            </g>
          ))}
        </svg>
      ) : (
        <div className="py-8 text-center text-xs text-slate-500">
          Submission velocity timeline will appear once trainees submit feedback.
        </div>
      )}
    </div>
  );
};
