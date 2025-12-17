import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import type {
  ApiData,
  EnhancedBenchmarkResult,
  SectionResult,
  QuestionResult,
  ViewMode,
  CostTier,
  SortOption,
  SortDirection,
  RegressionResult,
} from "./types";
import {
  getScoreClass,
  formatScore,
  formatLatency,
  getProviderClass,
  getCostValue,
  getCostTierLabel,
  calculateCostPerformanceRegression,
  calculateLatencyPerformanceRegression,
  getUniqueProviders,
  getUniqueCostTiers,
  COST_VALUES,
} from "./types";

// Helper to truncate text
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// Components
function Loading() {
  return (
    <div className="loading" role="status" aria-label="Loading">
      <div className="loading-spinner" aria-hidden="true" />
      <div className="loading-text">Loading benchmark results...</div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="loading" role="alert">
      <div className="empty-icon" aria-hidden="true">!</div>
      <div className="empty-text">Error loading data: {message}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="loading" role="status">
      <div className="empty-icon" aria-hidden="true">?</div>
      <div className="empty-text">No benchmark data available</div>
    </div>
  );
}

// Filter Controls Component
function FilterControls({
  providers,
  costTiers,
  selectedProviders,
  selectedCostTiers,
  searchQuery,
  onProviderChange,
  onCostTierChange,
  onSearchChange,
  onClearFilters,
}: {
  providers: string[];
  costTiers: CostTier[];
  selectedProviders: string[];
  selectedCostTiers: CostTier[];
  searchQuery: string;
  onProviderChange: (providers: string[]) => void;
  onCostTierChange: (tiers: CostTier[]) => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
}) {
  const handleProviderToggle = (provider: string) => {
    if (selectedProviders.includes(provider)) {
      onProviderChange(selectedProviders.filter((p) => p !== provider));
    } else {
      onProviderChange([...selectedProviders, provider]);
    }
  };

  const handleCostTierToggle = (tier: CostTier) => {
    if (selectedCostTiers.includes(tier)) {
      onCostTierChange(selectedCostTiers.filter((t) => t !== tier));
    } else {
      onCostTierChange([...selectedCostTiers, tier]);
    }
  };

  const hasFilters = selectedProviders.length > 0 || selectedCostTiers.length > 0 || searchQuery.length > 0;

  return (
    <div className="filter-controls">
      <div className="search-group">
        <input
          type="text"
          className="search-input"
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search models"
        />
        {searchQuery && (
          <button
            className="search-clear"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      <div className="filter-group">
        <span className="filter-label">Provider:</span>
        <div className="filter-chips">
          {providers.map((provider) => (
            <button
              key={provider}
              className={`filter-chip ${selectedProviders.includes(provider) ? "active" : ""} ${getProviderClass(provider)}`}
              onClick={() => handleProviderToggle(provider)}
            >
              {provider}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <span className="filter-label">Cost:</span>
        <div className="filter-chips">
          {costTiers.map((tier) => (
            <button
              key={tier}
              className={`filter-chip cost-${tier} ${selectedCostTiers.includes(tier) ? "active" : ""}`}
              onClick={() => handleCostTierToggle(tier)}
            >
              {getCostTierLabel(tier)}
            </button>
          ))}
        </div>
      </div>
      {hasFilters && (
        <button className="clear-filters-btn" onClick={onClearFilters}>
          Clear all
        </button>
      )}
    </div>
  );
}

// Sort Controls Component
function SortControls({
  sortBy,
  sortDirection,
  onSortChange,
}: {
  sortBy: SortOption;
  sortDirection: SortDirection;
  onSortChange: (option: SortOption) => void;
}) {
  const options: { value: SortOption; label: string }[] = [
    { value: "score", label: "Score" },
    { value: "name", label: "Name" },
    { value: "provider", label: "Provider" },
    { value: "latency", label: "Latency" },
    { value: "cost", label: "Cost" },
  ];

  return (
    <div className="sort-controls">
      <span className="sort-label">Sort by:</span>
      <div className="sort-buttons">
        {options.map((option) => (
          <button
            key={option.value}
            className={`sort-btn ${sortBy === option.value ? "active" : ""}`}
            onClick={() => onSortChange(option.value)}
          >
            {option.label}
            {sortBy === option.value && (
              <span className="sort-arrow">
                {sortDirection === "desc" ? "↓" : "↑"}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatsOverview({ results }: { results: EnhancedBenchmarkResult[] }) {
  const stats = useMemo(() => {
    if (results.length === 0) {
      return {
        modelCount: 0,
        avgScore: 0,
        bestModel: "N/A",
        bestScore: 0,
        totalQuestions: 0,
        avgLatency: 0,
      };
    }

    const avgScore =
      results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
    const bestResult = results.reduce<EnhancedBenchmarkResult | null>(
      (best, r) => (!best || r.overallScore > best.overallScore ? r : best),
      null
    );
    const totalQuestions =
      results[0]?.sections.reduce((sum, s) => sum + s.totalQuestions, 0) ?? 0;
    const totalLatency = results.reduce((sum, r) => sum + r.totalLatencyMs, 0);

    return {
      modelCount: results.length,
      avgScore,
      bestModel: bestResult?.modelName ?? "N/A",
      bestScore: bestResult?.overallScore ?? 0,
      totalQuestions,
      avgLatency: totalLatency / results.length,
    };
  }, [results]);

  return (
    <section className="stats-grid" aria-label="Benchmark Statistics">
      <div className="stat-card">
        <div className="stat-label">Models Tested</div>
        <div className="stat-value">{stats.modelCount}</div>
        <div className="stat-detail">AI models benchmarked</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Questions</div>
        <div className="stat-value">{stats.totalQuestions}</div>
        <div className="stat-detail">Across all sections</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Best Performer</div>
        <div className="stat-value">{formatScore(stats.bestScore)}</div>
        <div className="stat-detail">{stats.bestModel}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Average Score</div>
        <div className="stat-value">{formatScore(stats.avgScore)}</div>
        <div className="stat-detail">Across all models</div>
      </div>
    </section>
  );
}

function Leaderboard({
  results,
  selectedModel,
  onSelectModel,
  sortBy,
  sortDirection,
}: {
  results: EnhancedBenchmarkResult[];
  selectedModel: string | null;
  onSelectModel: (modelId: string | null) => void;
  sortBy: SortOption;
  sortDirection: SortDirection;
}) {
  const sortedResults = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "score":
          comparison = b.overallScore - a.overallScore;
          break;
        case "name":
          comparison = a.modelName.localeCompare(b.modelName);
          break;
        case "provider":
          comparison = a.provider.localeCompare(b.provider);
          break;
        case "latency":
          comparison = a.totalLatencyMs - b.totalLatencyMs;
          break;
        case "cost":
          comparison = getCostValue(a.costTier) - getCostValue(b.costTier);
          break;
      }
      return sortDirection === "asc" ? -comparison : comparison;
    });
    return sorted;
  }, [results, sortBy, sortDirection]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, modelId: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelectModel(selectedModel === modelId ? null : modelId);
      } else if (e.key === "Escape") {
        onSelectModel(null);
      }
    },
    [onSelectModel, selectedModel]
  );

  const handleClick = useCallback(
    (modelId: string) => {
      onSelectModel(selectedModel === modelId ? null : modelId);
    },
    [onSelectModel, selectedModel]
  );

  // Calculate rank based on score
  const rankedResults = useMemo(() => {
    const byScore = [...results].sort((a, b) => b.overallScore - a.overallScore);
    const rankMap = new Map<string, number>();
    byScore.forEach((r, i) => rankMap.set(r.modelId, i + 1));
    return sortedResults.map((r) => ({
      ...r,
      rank: rankMap.get(r.modelId) ?? 0,
    }));
  }, [results, sortedResults]);

  return (
    <section
      className="leaderboard animate-fade-in"
      aria-label="Model Leaderboard"
    >
      <div className="leaderboard-header">
        <div>
          <h2 className="leaderboard-title">Model Leaderboard</h2>
          <div className="leaderboard-subtitle">
            {results.length} models - Click to view details
          </div>
        </div>
      </div>
      <div className="leaderboard-list" role="list">
        {rankedResults.map((result) => {
          const scoreClass = getScoreClass(result.overallScore);
          const isSelected = selectedModel === result.modelId;

          return (
            <div
              key={result.modelId}
              role="listitem"
              tabIndex={0}
              className={`leaderboard-item ${isSelected ? "selected" : ""}`}
              onClick={() => handleClick(result.modelId)}
              onKeyDown={(e) => handleKeyDown(e, result.modelId)}
              aria-selected={isSelected}
              aria-label={`${result.modelName}, rank ${result.rank}, score ${formatScore(result.overallScore)}`}
            >
              <div className={`rank ${result.rank <= 3 ? "top-3" : ""}`}>
                #{result.rank}
              </div>
              <div className="model-info">
                <div className="model-name">{result.modelName}</div>
                <div className="model-meta">
                  <span
                    className={`provider-badge ${getProviderClass(result.provider)}`}
                  >
                    {result.provider}
                  </span>
                  {result.costTier && (
                    <span className={`cost-badge cost-${result.costTier}`}>
                      {getCostTierLabel(result.costTier)}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="score-bar-container"
                role="progressbar"
                aria-valuenow={Math.round(result.overallScore * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`score-bar ${scoreClass}`}
                  style={{ width: `${result.overallScore * 100}%` }}
                >
                  <div className="score-bar-glow" />
                </div>
              </div>
              <div className={`score-value ${scoreClass}`}>
                {formatScore(result.overallScore)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SectionBreakdown({ sections }: { sections: SectionResult[] }) {
  return (
    <div className="section-grid animate-slide-up" role="list">
      {sections.map((section) => {
        const scoreClass = getScoreClass(section.averageScore);
        return (
          <div key={section.section} className="section-card" role="listitem">
            <div className="section-header">
              <h3 className="section-name">{section.section}</h3>
              <div className={`section-score ${scoreClass}`}>
                {formatScore(section.averageScore)}
              </div>
            </div>
            <div
              className="score-bar-container"
              role="progressbar"
              aria-valuenow={Math.round(section.averageScore * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${section.section} score`}
            >
              <div
                className={`score-bar ${scoreClass}`}
                style={{ width: `${section.averageScore * 100}%` }}
              >
                <div className="score-bar-glow" />
              </div>
            </div>
            <div className="section-stats">
              <div className="section-stat">
                <div className="section-stat-label">Correct</div>
                <div className="section-stat-value">
                  {section.correctCount}/{section.totalQuestions}
                </div>
              </div>
              <div className="section-stat">
                <div className="section-stat-label">Questions</div>
                <div className="section-stat-value">
                  {section.totalQuestions}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuestionsList({ results }: { results: QuestionResult[] }) {
  return (
    <div className="questions-list" role="list">
      {results.map((result) => {
        const statusClass = result.correct
          ? "correct"
          : result.score > 0
            ? "partial"
            : "incorrect";
        const scoreClass = getScoreClass(result.score);
        const statusLabel = result.correct
          ? "Correct"
          : result.score > 0
            ? "Partially correct"
            : "Incorrect";

        return (
          <article
            key={result.questionId}
            className="question-item"
            role="listitem"
          >
            <div
              className={`question-status ${statusClass}`}
              aria-label={statusLabel}
              title={statusLabel}
            />
            <div className="question-content">
              <div className="question-id">{result.questionId}</div>
              <div className="question-answers">
                <div className="question-answer">
                  <span className="answer-label">Expected:</span>
                  <span className="answer-value correct">
                    {truncateText(result.expectedAnswer, 200)}
                  </span>
                </div>
                <div className="question-answer">
                  <span className="answer-label">Response:</span>
                  <span
                    className={`answer-value ${result.correct ? "correct" : "incorrect"}`}
                  >
                    {truncateText(result.modelResponse, 200)}
                  </span>
                </div>
              </div>
              <div className="question-latency">
                {formatLatency(result.latencyMs)}
                {result.timedOut && (
                  <span className="timeout-badge"> (timed out)</span>
                )}
              </div>
            </div>
            <div className={`question-score ${scoreClass}`}>
              {formatScore(result.score)}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ModelDetail({ result }: { result: EnhancedBenchmarkResult }) {
  const [activeSection, setActiveSection] = useState(
    result.sections[0]?.section || ""
  );

  useEffect(() => {
    setActiveSection(result.sections[0]?.section || "");
  }, [result.modelId, result.sections]);

  const currentSection = result.sections.find(
    (s) => s.section === activeSection
  );

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, sectionName: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setActiveSection(sectionName);
      }
    },
    []
  );

  return (
    <section className="detail-panel animate-slide-up" aria-label="Model Details">
      <div className="detail-header">
        <div className="detail-title">
          <h2 className="detail-name">{result.modelName}</h2>
          <div className="detail-meta">
            <span
              className={`provider-badge ${getProviderClass(result.provider)}`}
            >
              {result.provider}
            </span>
            {result.costTier && (
              <span className={`cost-badge cost-${result.costTier}`}>
                {getCostTierLabel(result.costTier)}
              </span>
            )}
            <span className="detail-separator"> | </span>
            <time dateTime={result.timestamp}>
              {new Date(result.timestamp).toLocaleDateString()}
            </time>
            <span className="detail-separator"> | </span>
            <span>Total: {formatLatency(result.totalLatencyMs)}</span>
          </div>
        </div>
        <div className="detail-score">
          <div
            className={`detail-score-value ${getScoreClass(result.overallScore)}`}
          >
            {formatScore(result.overallScore)}
          </div>
          <div className="detail-score-label">Overall Score</div>
        </div>
      </div>

      <SectionBreakdown sections={result.sections} />

      <div className="detail-tabs" role="tablist" aria-label="Result sections">
        {result.sections.map((section) => (
          <button
            key={section.section}
            role="tab"
            aria-selected={activeSection === section.section}
            aria-controls={`tabpanel-${section.section}`}
            className={`detail-tab ${activeSection === section.section ? "active" : ""}`}
            onClick={() => setActiveSection(section.section)}
            onKeyDown={(e) => handleTabKeyDown(e, section.section)}
          >
            {section.section} ({section.correctCount}/{section.totalQuestions})
          </button>
        ))}
      </div>

      <div
        className="detail-content"
        role="tabpanel"
        id={`tabpanel-${activeSection}`}
        aria-label={`${activeSection} questions`}
      >
        {currentSection ? (
          <QuestionsList results={currentSection.results} />
        ) : (
          <div className="empty-state">No questions in this section</div>
        )}
      </div>
    </section>
  );
}

// Enhanced Bar Chart with gradients and animations
function EnhancedBarChart({
  data,
  title,
  subtitle,
  showProvider,
}: {
  data: { label: string; value: number; provider?: string; sublabel?: string }[];
  title: string;
  subtitle?: string;
  showProvider?: boolean;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 0.01);

  return (
    <div className="chart-card enhanced">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        {subtitle && <p className="chart-subtitle">{subtitle}</p>}
      </div>
      <div className="enhanced-bar-chart" role="list">
        {data.map((item, index) => {
          const scoreClass = getScoreClass(item.value);
          const widthPercent = (item.value / maxValue) * 100;

          return (
            <div
              key={item.label}
              className="enhanced-bar-row"
              role="listitem"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="bar-info">
                <div className="bar-label" title={item.label}>
                  {item.label}
                </div>
                {item.sublabel && (
                  <div className="bar-sublabel">{item.sublabel}</div>
                )}
                {showProvider && item.provider && (
                  <span
                    className={`provider-badge small ${getProviderClass(item.provider)}`}
                  >
                    {item.provider}
                  </span>
                )}
              </div>
              <div className="bar-container">
                <div className="bar-track-enhanced">
                  <div
                    className={`bar-fill-enhanced ${scoreClass}`}
                    style={{ width: `${widthPercent}%` }}
                  >
                    <div className="bar-shine" />
                  </div>
                </div>
                <div className={`bar-value-enhanced ${scoreClass}`}>
                  {formatScore(item.value)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Scatter Plot Component
function ScatterPlot({
  regression,
  title,
  xLabel,
  yLabel,
  xFormat,
}: {
  regression: RegressionResult;
  title: string;
  xLabel: string;
  yLabel: string;
  xFormat?: (x: number) => string;
}) {
  const { points, slope, intercept, rSquared, correlation } = regression;

  if (points.length === 0) {
    return (
      <div className="chart-card">
        <h3 className="chart-title">{title}</h3>
        <div className="empty-state">No data available</div>
      </div>
    );
  }

  // Calculate bounds
  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = 0;
  const yMax = 1;

  // Chart dimensions
  const width = 100;
  const height = 100;
  const padding = 15;

  // Scale functions
  const scaleX = (x: number) =>
    padding + ((x - xMin) / (xMax - xMin || 1)) * (width - 2 * padding);
  const scaleY = (y: number) =>
    height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);

  // Regression line points
  const lineX1 = xMin;
  const lineX2 = xMax;
  const lineY1 = slope * lineX1 + intercept;
  const lineY2 = slope * lineX2 + intercept;

  // Clamp Y values to visible range
  const clampY = (y: number) => Math.max(yMin, Math.min(yMax, y));

  return (
    <div className="chart-card scatter">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        <div className="regression-stats">
          <span className="stat-pill">
            R² = {rSquared.toFixed(3)}
          </span>
          <span className="stat-pill">
            r = {correlation.toFixed(3)}
          </span>
        </div>
      </div>

      <div className="scatter-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="scatter-svg">
          {/* Grid lines */}
          <g className="grid-lines">
            {[0, 0.25, 0.5, 0.75, 1].map((y) => (
              <line
                key={y}
                x1={padding}
                y1={scaleY(y)}
                x2={width - padding}
                y2={scaleY(y)}
                className="grid-line"
              />
            ))}
          </g>

          {/* Y-axis labels */}
          <g className="axis-labels">
            {[0, 0.5, 1].map((y) => (
              <text
                key={y}
                x={padding - 2}
                y={scaleY(y)}
                className="axis-label"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {formatScore(y)}
              </text>
            ))}
          </g>

          {/* Regression line */}
          <line
            x1={scaleX(lineX1)}
            y1={scaleY(clampY(lineY1))}
            x2={scaleX(lineX2)}
            y2={scaleY(clampY(lineY2))}
            className="regression-line"
          />

          {/* Data points */}
          {points.map((point, i) => {
            const scoreClass = getScoreClass(point.y);
            return (
              <g key={i} className="scatter-point-group">
                <circle
                  cx={scaleX(point.x)}
                  cy={scaleY(point.y)}
                  r={3}
                  className={`scatter-point ${scoreClass}`}
                />
                <title>
                  {point.label}: {xFormat ? xFormat(point.x) : point.x.toFixed(1)} → {formatScore(point.y)}
                </title>
              </g>
            );
          })}
        </svg>

        <div className="scatter-labels">
          <span className="x-label">{xLabel}</span>
          <span className="y-label">{yLabel}</span>
        </div>
      </div>

      <div className="regression-interpretation">
        {correlation > 0.3 ? (
          <p className="insight positive">
            Positive correlation: Higher {xLabel.toLowerCase()} tends to associate with better performance.
          </p>
        ) : correlation < -0.3 ? (
          <p className="insight negative">
            Negative correlation: Higher {xLabel.toLowerCase()} tends to associate with worse performance.
          </p>
        ) : (
          <p className="insight neutral">
            Weak correlation: {xLabel} does not strongly predict performance.
          </p>
        )}
      </div>
    </div>
  );
}

function ComparisonChart({ results }: { results: EnhancedBenchmarkResult[] }) {
  const [selectedSection, setSelectedSection] = useState("overall");

  const sections = useMemo(() => {
    const allSections = new Set<string>();
    results.forEach((r) =>
      r.sections.forEach((s) => allSections.add(s.section))
    );
    return ["overall", ...Array.from(allSections)];
  }, [results]);

  const getScore = useCallback(
    (result: EnhancedBenchmarkResult) => {
      if (selectedSection === "overall") {
        return result.overallScore;
      }
      const section = result.sections.find(
        (s) => s.section === selectedSection
      );
      return section?.averageScore ?? 0;
    },
    [selectedSection]
  );

  const chartData = useMemo(() => {
    return [...results]
      .sort((a, b) => getScore(b) - getScore(a))
      .map((r) => ({
        label: r.modelName,
        value: getScore(r),
        provider: r.provider,
      }));
  }, [results, getScore]);

  return (
    <div className="chart-card enhanced">
      <div className="chart-header">
        <h3 className="chart-title">Score by Section</h3>
        <div className="chart-controls">
          <div className="select-wrapper">
            <label htmlFor="section-select" className="sr-only">
              Select section
            </label>
            <select
              id="section-select"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="enhanced-bar-chart" role="list">
        {chartData.map((item, index) => {
          const scoreClass = getScoreClass(item.value);
          return (
            <div
              key={item.label}
              className="enhanced-bar-row"
              role="listitem"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="bar-info">
                <div className="bar-label" title={item.label}>
                  {item.label}
                </div>
                <span
                  className={`provider-badge small ${getProviderClass(item.provider)}`}
                >
                  {item.provider}
                </span>
              </div>
              <div className="bar-container">
                <div className="bar-track-enhanced">
                  <div
                    className={`bar-fill-enhanced ${scoreClass}`}
                    style={{ width: `${item.value * 100}%` }}
                  >
                    <div className="bar-shine" />
                  </div>
                </div>
                <div className={`bar-value-enhanced ${scoreClass}`}>
                  {formatScore(item.value)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProviderComparison({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const providerStats = useMemo(() => {
    const providers = new Map<
      string,
      { total: number; count: number; best: number; worst: number }
    >();

    results.forEach((r) => {
      const current = providers.get(r.provider) || {
        total: 0,
        count: 0,
        best: 0,
        worst: 1,
      };
      current.total += r.overallScore;
      current.count += 1;
      current.best = Math.max(current.best, r.overallScore);
      current.worst = Math.min(current.worst, r.overallScore);
      providers.set(r.provider, current);
    });

    return Array.from(providers.entries())
      .map(([provider, stats]) => ({
        provider,
        avgScore: stats.total / stats.count,
        bestScore: stats.best,
        worstScore: stats.worst,
        modelCount: stats.count,
      }))
      .sort((a, b) => b.bestScore - a.bestScore);
  }, [results]);

  return (
    <div className="chart-card enhanced">
      <div className="chart-header">
        <h3 className="chart-title">Performance by Provider</h3>
        <p className="chart-subtitle">Best score per provider</p>
      </div>
      <div className="enhanced-bar-chart" role="list">
        {providerStats.map((stat, index) => {
          const scoreClass = getScoreClass(stat.bestScore);
          return (
            <div
              key={stat.provider}
              className="enhanced-bar-row"
              role="listitem"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="bar-info">
                <span
                  className={`provider-badge ${getProviderClass(stat.provider)}`}
                >
                  {stat.provider}
                </span>
                <div className="bar-sublabel">
                  {stat.modelCount} model{stat.modelCount > 1 ? "s" : ""}
                </div>
              </div>
              <div className="bar-container">
                <div className="bar-track-enhanced">
                  <div
                    className={`bar-fill-enhanced ${scoreClass}`}
                    style={{ width: `${stat.bestScore * 100}%` }}
                  >
                    <div className="bar-shine" />
                  </div>
                </div>
                <div className={`bar-value-enhanced ${scoreClass}`}>
                  {formatScore(stat.bestScore)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CostTierComparison({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const tierStats = useMemo(() => {
    const tiers = new Map<
      CostTier,
      { total: number; count: number; best: number }
    >();

    results.forEach((r) => {
      if (!r.costTier) return;
      const current = tiers.get(r.costTier) || {
        total: 0,
        count: 0,
        best: 0,
      };
      current.total += r.overallScore;
      current.count += 1;
      current.best = Math.max(current.best, r.overallScore);
      tiers.set(r.costTier, current);
    });

    const order: CostTier[] = ["cheap", "medium", "expensive"];
    return order
      .filter((tier) => tiers.has(tier))
      .map((tier) => {
        const stats = tiers.get(tier)!;
        return {
          tier,
          avgScore: stats.total / stats.count,
          bestScore: stats.best,
          modelCount: stats.count,
          costValue: COST_VALUES[tier],
        };
      });
  }, [results]);

  return (
    <div className="chart-card enhanced">
      <div className="chart-header">
        <h3 className="chart-title">Performance by Cost Tier</h3>
        <p className="chart-subtitle">Average score per tier</p>
      </div>
      <div className="enhanced-bar-chart" role="list">
        {tierStats.map((stat, index) => {
          const scoreClass = getScoreClass(stat.avgScore);
          return (
            <div
              key={stat.tier}
              className="enhanced-bar-row"
              role="listitem"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="bar-info">
                <span className={`cost-badge large cost-${stat.tier}`}>
                  {getCostTierLabel(stat.tier)}
                </span>
                <div className="bar-sublabel">
                  {stat.modelCount} model{stat.modelCount > 1 ? "s" : ""} · Best: {formatScore(stat.bestScore)}
                </div>
              </div>
              <div className="bar-container">
                <div className="bar-track-enhanced">
                  <div
                    className={`bar-fill-enhanced ${scoreClass}`}
                    style={{ width: `${stat.avgScore * 100}%` }}
                  >
                    <div className="bar-shine" />
                  </div>
                </div>
                <div className={`bar-value-enhanced ${scoreClass}`}>
                  {formatScore(stat.avgScore)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Latency Distribution Chart
function LatencyDistribution({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const sortedByLatency = useMemo(() => {
    return [...results].sort((a, b) => a.totalLatencyMs - b.totalLatencyMs);
  }, [results]);

  const maxLatency = Math.max(...results.map((r) => r.totalLatencyMs));

  return (
    <div className="chart-card enhanced">
      <div className="chart-header">
        <h3 className="chart-title">Response Time Distribution</h3>
        <p className="chart-subtitle">Total latency per model (fastest first)</p>
      </div>
      <div className="latency-chart" role="list">
        {sortedByLatency.map((result, index) => {
          const widthPercent = (result.totalLatencyMs / maxLatency) * 100;
          const isSlowOutlier = result.totalLatencyMs > maxLatency * 0.7;
          const isFast = result.totalLatencyMs < maxLatency * 0.3;

          return (
            <div
              key={result.modelId}
              className="latency-row"
              role="listitem"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="latency-label">
                <span className="latency-name" title={result.modelName}>
                  {result.modelName}
                </span>
                <span
                  className={`provider-badge small ${getProviderClass(result.provider)}`}
                >
                  {result.provider}
                </span>
              </div>
              <div className="latency-bar-container">
                <div
                  className={`latency-bar ${isFast ? "fast" : isSlowOutlier ? "slow" : "normal"}`}
                  style={{ width: `${widthPercent}%` }}
                />
                <span className="latency-value">
                  {formatLatency(result.totalLatencyMs)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Section Performance Heatmap
function SectionHeatmap({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const sectionNames = useMemo(() => {
    const names = new Set<string>();
    results.forEach((r) => r.sections.forEach((s) => names.add(s.section)));
    return Array.from(names);
  }, [results]);

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => b.overallScore - a.overallScore).slice(0, 10);
  }, [results]);

  const getHeatmapColor = (score: number): string => {
    if (score >= 0.7) return "heatmap-excellent";
    if (score >= 0.4) return "heatmap-good";
    return "heatmap-poor";
  };

  return (
    <div className="chart-card heatmap-card">
      <div className="chart-header">
        <h3 className="chart-title">Section Performance Heatmap</h3>
        <p className="chart-subtitle">Top 10 models by section (darker = higher score)</p>
      </div>
      <div className="heatmap-container">
        <div className="heatmap-header">
          <div className="heatmap-corner" />
          {sectionNames.map((section) => (
            <div key={section} className="heatmap-section-label" title={section}>
              {section.substring(0, 3).toUpperCase()}
            </div>
          ))}
          <div className="heatmap-overall-label">AVG</div>
        </div>
        <div className="heatmap-body">
          {sortedResults.map((result, idx) => (
            <div key={result.modelId} className="heatmap-row">
              <div className="heatmap-model" title={result.modelName}>
                <span className="heatmap-rank">#{idx + 1}</span>
                {result.modelName}
              </div>
              {sectionNames.map((sectionName) => {
                const section = result.sections.find(
                  (s) => s.section === sectionName
                );
                const score = section?.averageScore ?? 0;
                return (
                  <div
                    key={sectionName}
                    className={`heatmap-cell ${getHeatmapColor(score)}`}
                    title={`${result.modelName} - ${sectionName}: ${formatScore(score)}`}
                  >
                    {Math.round(score * 100)}
                  </div>
                );
              })}
              <div className={`heatmap-cell overall ${getHeatmapColor(result.overallScore)}`}>
                {Math.round(result.overallScore * 100)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-legend">
        <span className="legend-item">
          <span className="legend-color heatmap-poor" /> &lt;40%
        </span>
        <span className="legend-item">
          <span className="legend-color heatmap-good" /> 40-70%
        </span>
        <span className="legend-item">
          <span className="legend-color heatmap-excellent" /> &gt;70%
        </span>
      </div>
    </div>
  );
}

// Quick Stats Row for dense information
function QuickStatsRow({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const stats = useMemo(() => {
    if (results.length === 0) return null;

    const scores = results.map((r) => r.overallScore);
    const latencies = results.map((r) => r.totalLatencyMs);

    const sorted = [...scores].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const stdDev = Math.sqrt(
      scores.reduce((sum, s) => sum + Math.pow(s - median, 2), 0) / scores.length
    );

    const best = results.reduce<EnhancedBenchmarkResult | null>(
      (b, r) => (!b || r.overallScore > b.overallScore ? r : b),
      null
    );
    const fastest = results.reduce<EnhancedBenchmarkResult | null>(
      (f, r) => (!f || r.totalLatencyMs < f.totalLatencyMs ? r : f),
      null
    );

    return {
      median,
      stdDev,
      best,
      fastest,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      range: Math.max(...scores) - Math.min(...scores),
    };
  }, [results]);

  if (!stats) return null;

  return (
    <div className="quick-stats-row">
      <div className="quick-stat">
        <span className="quick-stat-value">{formatScore(stats.median)}</span>
        <span className="quick-stat-label">Median Score</span>
      </div>
      <div className="quick-stat">
        <span className="quick-stat-value">±{formatScore(stats.stdDev)}</span>
        <span className="quick-stat-label">Std Deviation</span>
      </div>
      <div className="quick-stat">
        <span className="quick-stat-value">{formatScore(stats.range)}</span>
        <span className="quick-stat-label">Score Range</span>
      </div>
      <div className="quick-stat highlight">
        <span className="quick-stat-value">{stats.best?.modelName || "N/A"}</span>
        <span className="quick-stat-label">Best Model ({formatScore(stats.best?.overallScore ?? 0)})</span>
      </div>
      <div className="quick-stat highlight">
        <span className="quick-stat-value">{stats.fastest?.modelName || "N/A"}</span>
        <span className="quick-stat-label">Fastest ({formatLatency(stats.fastest?.totalLatencyMs ?? 0)})</span>
      </div>
    </div>
  );
}

// Top Performers per Section (compact table)
function TopPerformersTable({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const sectionLeaders = useMemo(() => {
    const sections = new Map<string, { model: string; provider: string; score: number }>();

    results.forEach((r) => {
      r.sections.forEach((s) => {
        const current = sections.get(s.section);
        if (!current || s.averageScore > current.score) {
          sections.set(s.section, {
            model: r.modelName,
            provider: r.provider,
            score: s.averageScore,
          });
        }
      });
    });

    return Array.from(sections.entries()).map(([section, data]) => ({
      section,
      ...data,
    }));
  }, [results]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">Section Leaders</h3>
        <p className="chart-subtitle">Best performing model per section</p>
      </div>
      <table className="leaders-table">
        <thead>
          <tr>
            <th>Section</th>
            <th>Model</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {sectionLeaders.map((leader) => (
            <tr key={leader.section}>
              <td className="section-cell">{leader.section}</td>
              <td className="model-cell">
                <span>{leader.model}</span>
                <span className={`provider-badge tiny ${getProviderClass(leader.provider)}`}>
                  {leader.provider}
                </span>
              </td>
              <td className={`score-cell ${getScoreClass(leader.score)}`}>
                {formatScore(leader.score)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Score Distribution Histogram
function ScoreDistribution({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const buckets = useMemo(() => {
    const bins: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 0-10, 10-20, ..., 90-100
    results.forEach((r) => {
      const idx = Math.min(9, Math.max(0, Math.floor(r.overallScore * 10)));
      const current = bins[idx];
      if (current !== undefined) {
        bins[idx] = current + 1;
      }
    });
    return bins;
  }, [results]);

  const maxCount = Math.max(...buckets, 1);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">Score Distribution</h3>
        <p className="chart-subtitle">Number of models in each score range</p>
      </div>
      <div className="histogram">
        {buckets.map((count, idx) => {
          const heightPercent = (count / maxCount) * 100;
          const isGood = idx >= 4;
          const isExcellent = idx >= 7;

          return (
            <div key={idx} className="histogram-bar-wrapper">
              <div
                className={`histogram-bar ${isExcellent ? "excellent" : isGood ? "good" : "poor"}`}
                style={{ height: `${heightPercent}%` }}
                title={`${idx * 10}-${(idx + 1) * 10}%: ${count} models`}
              >
                {count > 0 && <span className="histogram-count">{count}</span>}
              </div>
              <span className="histogram-label">{idx * 10}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Performance Quadrant Chart (Speed vs Accuracy)
function PerformanceQuadrant({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const data = useMemo(() => {
    const latencies = results.map((r) => r.totalLatencyMs);
    const scores = results.map((r) => r.overallScore);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    return {
      points: results.map((r) => ({
        x: r.totalLatencyMs,
        y: r.overallScore,
        label: r.modelName,
        provider: r.provider,
        quadrant:
          r.overallScore >= avgScore && r.totalLatencyMs <= avgLatency
            ? "star" // Fast & Accurate
            : r.overallScore >= avgScore && r.totalLatencyMs > avgLatency
              ? "thorough" // Slow but Accurate
              : r.overallScore < avgScore && r.totalLatencyMs <= avgLatency
                ? "quick" // Fast but Less Accurate
                : "avoid", // Slow & Less Accurate
      })),
      avgLatency,
      avgScore,
      maxLatency: Math.max(...latencies),
      minLatency: Math.min(...latencies),
    };
  }, [results]);

  const width = 200;
  const height = 200;
  const padding = 25;

  const scaleX = (x: number) =>
    padding +
    ((x - data.minLatency) / (data.maxLatency - data.minLatency || 1)) *
      (width - 2 * padding);
  const scaleY = (y: number) =>
    height - padding - y * (height - 2 * padding);

  const avgX = scaleX(data.avgLatency);
  const avgY = scaleY(data.avgScore);

  return (
    <div className="chart-card quadrant-card">
      <div className="chart-header">
        <h3 className="chart-title">Performance Quadrant</h3>
        <p className="chart-subtitle">Speed vs Accuracy tradeoffs</p>
      </div>
      <div className="quadrant-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="quadrant-svg">
          {/* Quadrant backgrounds */}
          <rect
            x={padding}
            y={padding}
            width={avgX - padding}
            height={avgY - padding}
            className="quadrant-bg star"
          />
          <rect
            x={avgX}
            y={padding}
            width={width - padding - avgX}
            height={avgY - padding}
            className="quadrant-bg thorough"
          />
          <rect
            x={padding}
            y={avgY}
            width={avgX - padding}
            height={height - padding - avgY}
            className="quadrant-bg quick"
          />
          <rect
            x={avgX}
            y={avgY}
            width={width - padding - avgX}
            height={height - padding - avgY}
            className="quadrant-bg avoid"
          />

          {/* Axis lines */}
          <line
            x1={avgX}
            y1={padding}
            x2={avgX}
            y2={height - padding}
            className="quadrant-axis"
          />
          <line
            x1={padding}
            y1={avgY}
            x2={width - padding}
            y2={avgY}
            className="quadrant-axis"
          />

          {/* Points */}
          {data.points.map((point, i) => (
            <g key={i} className="quadrant-point-group">
              <circle
                cx={scaleX(point.x)}
                cy={scaleY(point.y)}
                r={4}
                className={`quadrant-point ${point.quadrant}`}
              />
              <title>
                {point.label}: {formatScore(point.y)} in{" "}
                {formatLatency(point.x)}
              </title>
            </g>
          ))}
        </svg>
        <div className="quadrant-labels">
          <span className="ql-top-left">Fast & Accurate</span>
          <span className="ql-top-right">Thorough</span>
          <span className="ql-bottom-left">Quick</span>
          <span className="ql-bottom-right">Slow</span>
        </div>
      </div>
      <div className="quadrant-legend">
        <span className="ql-item star">
          {data.points.filter((p) => p.quadrant === "star").length} optimal
        </span>
        <span className="ql-item thorough">
          {data.points.filter((p) => p.quadrant === "thorough").length} thorough
        </span>
        <span className="ql-item quick">
          {data.points.filter((p) => p.quadrant === "quick").length} quick
        </span>
        <span className="ql-item avoid">
          {data.points.filter((p) => p.quadrant === "avoid").length} slow
        </span>
      </div>
    </div>
  );
}

// Section Difficulty Analysis
function SectionDifficulty({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const sectionStats = useMemo(() => {
    const sections = new Map<
      string,
      { scores: number[]; totalQuestions: number }
    >();

    results.forEach((r) => {
      r.sections.forEach((s) => {
        const current = sections.get(s.section) || {
          scores: [],
          totalQuestions: s.totalQuestions,
        };
        current.scores.push(s.averageScore);
        sections.set(s.section, current);
      });
    });

    return Array.from(sections.entries())
      .map(([section, data]) => {
        const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        const sorted = [...data.scores].sort((a, b) => a - b);
        const min = sorted[0] ?? 0;
        const max = sorted[sorted.length - 1] ?? 0;
        return {
          section,
          avgScore: avg,
          minScore: min,
          maxScore: max,
          spread: max - min,
          questions: data.totalQuestions,
        };
      })
      .sort((a, b) => a.avgScore - b.avgScore); // Hardest first
  }, [results]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">Section Difficulty</h3>
        <p className="chart-subtitle">Hardest sections first (with score range)</p>
      </div>
      <div className="difficulty-chart">
        {sectionStats.map((stat, idx) => {
          const scoreClass = getScoreClass(stat.avgScore);
          return (
            <div key={stat.section} className="difficulty-row">
              <div className="difficulty-info">
                <span className="difficulty-rank">#{idx + 1}</span>
                <span className="difficulty-name">{stat.section}</span>
                <span className="difficulty-questions">
                  {stat.questions} Q
                </span>
              </div>
              <div className="difficulty-bar-wrapper">
                <div className="difficulty-range">
                  <div
                    className="difficulty-range-bar"
                    style={{
                      left: `${stat.minScore * 100}%`,
                      width: `${stat.spread * 100}%`,
                    }}
                  />
                  <div
                    className={`difficulty-avg-marker ${scoreClass}`}
                    style={{ left: `${stat.avgScore * 100}%` }}
                  />
                </div>
                <span className={`difficulty-score ${scoreClass}`}>
                  {formatScore(stat.avgScore)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Provider Head-to-Head Comparison
function ProviderHeadToHead({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const providerData = useMemo(() => {
    const providers = new Map<
      string,
      {
        scores: number[];
        latencies: number[];
        costs: number[];
        models: string[];
      }
    >();

    results.forEach((r) => {
      const current = providers.get(r.provider) || {
        scores: [],
        latencies: [],
        costs: [],
        models: [],
      };
      current.scores.push(r.overallScore);
      current.latencies.push(r.totalLatencyMs);
      current.costs.push(getCostValue(r.costTier));
      current.models.push(r.modelName);
      providers.set(r.provider, current);
    });

    return Array.from(providers.entries())
      .map(([provider, data]) => ({
        provider,
        avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        bestScore: Math.max(...data.scores),
        avgLatency: data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length,
        avgCost: data.costs.reduce((a, b) => a + b, 0) / data.costs.length,
        modelCount: data.models.length,
        topModel: data.models[data.scores.indexOf(Math.max(...data.scores))],
      }))
      .sort((a, b) => b.bestScore - a.bestScore);
  }, [results]);

  return (
    <div className="chart-card provider-h2h">
      <div className="chart-header">
        <h3 className="chart-title">Provider Comparison</h3>
        <p className="chart-subtitle">Head-to-head metrics</p>
      </div>
      <div className="h2h-grid">
        {providerData.map((p) => (
          <div key={p.provider} className="h2h-card">
            <div className="h2h-header">
              <span className={`provider-badge ${getProviderClass(p.provider)}`}>
                {p.provider}
              </span>
              <span className="h2h-model-count">{p.modelCount} models</span>
            </div>
            <div className="h2h-stats">
              <div className="h2h-stat">
                <span className={`h2h-value ${getScoreClass(p.bestScore)}`}>
                  {formatScore(p.bestScore)}
                </span>
                <span className="h2h-label">Best</span>
              </div>
              <div className="h2h-stat">
                <span className={`h2h-value ${getScoreClass(p.avgScore)}`}>
                  {formatScore(p.avgScore)}
                </span>
                <span className="h2h-label">Avg</span>
              </div>
              <div className="h2h-stat">
                <span className="h2h-value">{formatLatency(p.avgLatency)}</span>
                <span className="h2h-label">Latency</span>
              </div>
            </div>
            <div className="h2h-top-model">
              Top: {p.topModel}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Compact Model Cards
function CompactModelCards({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => b.overallScore - a.overallScore);
  }, [results]);

  return (
    <div className="chart-card compact-cards-container">
      <div className="chart-header">
        <h3 className="chart-title">All Models</h3>
        <p className="chart-subtitle">{results.length} models ranked by score</p>
      </div>
      <div className="compact-cards-grid">
        {sortedResults.map((result, idx) => {
          const scoreClass = getScoreClass(result.overallScore);
          return (
            <div key={result.modelId} className="compact-card">
              <div className="compact-rank">#{idx + 1}</div>
              <div className="compact-main">
                <div className="compact-name" title={result.modelName}>
                  {result.modelName}
                </div>
                <div className="compact-meta">
                  <span
                    className={`provider-badge tiny ${getProviderClass(result.provider)}`}
                  >
                    {result.provider}
                  </span>
                  {result.costTier && (
                    <span className={`cost-badge tiny cost-${result.costTier}`}>
                      {result.costTier[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="compact-stats">
                <span className={`compact-score ${scoreClass}`}>
                  {formatScore(result.overallScore)}
                </span>
                <span className="compact-latency">
                  {formatLatency(result.totalLatencyMs)}
                </span>
              </div>
              <div className="compact-sparkline">
                {result.sections.map((s, i) => (
                  <div
                    key={i}
                    className={`spark-bar ${getScoreClass(s.averageScore)}`}
                    style={{ height: `${s.averageScore * 100}%` }}
                    title={`${s.section}: ${formatScore(s.averageScore)}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Mini Metrics Row (dense stats)
function MiniMetricsRow({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const metrics = useMemo(() => {
    if (results.length === 0) return null;

    const scores = results.map((r) => r.overallScore);
    const latencies = results.map((r) => r.totalLatencyMs);

    // Count by tier
    const tiers = { cheap: 0, medium: 0, expensive: 0 };
    results.forEach((r) => {
      if (r.costTier) tiers[r.costTier]++;
    });

    // Provider counts
    const providers = new Map<string, number>();
    results.forEach((r) => {
      providers.set(r.provider, (providers.get(r.provider) || 0) + 1);
    });

    // Perfect scores (100%)
    const perfect = results.filter((r) => r.overallScore >= 0.99).length;

    // Failing scores (<50%)
    const failing = results.filter((r) => r.overallScore < 0.5).length;

    return {
      total: results.length,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      tiers,
      providerCount: providers.size,
      perfect,
      failing,
    };
  }, [results]);

  if (!metrics) return null;

  return (
    <div className="mini-metrics">
      <div className="mm-group">
        <span className="mm-icon">📊</span>
        <span className="mm-value">{metrics.total}</span>
        <span className="mm-label">Models</span>
      </div>
      <div className="mm-group">
        <span className="mm-icon">🏆</span>
        <span className={`mm-value ${getScoreClass(metrics.maxScore)}`}>
          {formatScore(metrics.maxScore)}
        </span>
        <span className="mm-label">Best</span>
      </div>
      <div className="mm-group">
        <span className="mm-icon">📈</span>
        <span className={`mm-value ${getScoreClass(metrics.avgScore)}`}>
          {formatScore(metrics.avgScore)}
        </span>
        <span className="mm-label">Avg</span>
      </div>
      <div className="mm-group">
        <span className="mm-icon">⚡</span>
        <span className="mm-value">{formatLatency(metrics.minLatency)}</span>
        <span className="mm-label">Fastest</span>
      </div>
      <div className="mm-group tier">
        <span className="mm-tier cheap">{metrics.tiers.cheap}$</span>
        <span className="mm-tier medium">{metrics.tiers.medium}$$</span>
        <span className="mm-tier expensive">{metrics.tiers.expensive}$$$</span>
      </div>
      <div className="mm-group">
        <span className="mm-icon">🎯</span>
        <span className="mm-value">{metrics.perfect}</span>
        <span className="mm-label">Perfect</span>
      </div>
      <div className="mm-group">
        <span className="mm-icon">⚠️</span>
        <span className="mm-value warn">{metrics.failing}</span>
        <span className="mm-label">&lt;50%</span>
      </div>
    </div>
  );
}

// Radar Chart for Multi-dimensional Comparison
function RadarChart({
  results,
  selectedModels,
}: {
  results: EnhancedBenchmarkResult[];
  selectedModels: string[];
}) {
  const modelsToShow = useMemo(() => {
    if (selectedModels.length > 0) {
      return results.filter((r) => selectedModels.includes(r.modelId));
    }
    // Show top 5 by default
    return [...results].sort((a, b) => b.overallScore - a.overallScore).slice(0, 5);
  }, [results, selectedModels]);

  const sections = useMemo(() => {
    const names = new Set<string>();
    results.forEach((r) => r.sections.forEach((s) => names.add(s.section)));
    return Array.from(names);
  }, [results]);

  if (sections.length === 0 || modelsToShow.length === 0) {
    return null;
  }

  const centerX = 150;
  const centerY = 150;
  const radius = 100;
  const angleStep = (2 * Math.PI) / sections.length;

  // Generate points for each section axis
  const axisPoints = sections.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      labelX: centerX + (radius + 20) * Math.cos(angle),
      labelY: centerY + (radius + 20) * Math.sin(angle),
    };
  });

  // Generate polygon points for each model
  const modelPolygons = modelsToShow.map((model) => {
    const points = sections.map((section, i) => {
      const sectionData = model.sections.find((s) => s.section === section);
      const score = sectionData?.averageScore ?? 0;
      const angle = i * angleStep - Math.PI / 2;
      return {
        x: centerX + radius * score * Math.cos(angle),
        y: centerY + radius * score * Math.sin(angle),
      };
    });
    return {
      modelId: model.modelId,
      modelName: model.modelName,
      provider: model.provider,
      points: points.map((p) => `${p.x},${p.y}`).join(" "),
    };
  });

  const colors = ["#22c55e", "#3b82f6", "#a855f7", "#eab308", "#ef4444"];

  return (
    <div className="chart-card radar-card">
      <div className="chart-header">
        <h3 className="chart-title">Section Radar</h3>
        <p className="chart-subtitle">Multi-dimensional performance comparison</p>
      </div>
      <div className="radar-container">
        <svg viewBox="0 0 300 300" className="radar-svg">
          {/* Grid circles */}
          {[0.25, 0.5, 0.75, 1].map((scale) => (
            <circle
              key={scale}
              cx={centerX}
              cy={centerY}
              r={radius * scale}
              className="radar-grid-circle"
            />
          ))}

          {/* Axis lines */}
          {axisPoints.map((point, i) => (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={point.x}
              y2={point.y}
              className="radar-axis"
            />
          ))}

          {/* Model polygons */}
          {modelPolygons.map((model, idx) => (
            <polygon
              key={model.modelId}
              points={model.points}
              className="radar-polygon"
              style={{
                stroke: colors[idx % colors.length],
                fill: colors[idx % colors.length],
              }}
            />
          ))}

          {/* Section labels */}
          {sections.map((section, i) => (
            <text
              key={section}
              x={axisPoints[i]?.labelX ?? 0}
              y={axisPoints[i]?.labelY ?? 0}
              className="radar-label"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {section.substring(0, 4)}
            </text>
          ))}
        </svg>
      </div>
      <div className="radar-legend">
        {modelsToShow.map((model, idx) => (
          <div key={model.modelId} className="radar-legend-item">
            <span
              className="radar-legend-color"
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            <span className="radar-legend-name">{model.modelName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Section Correlation Matrix
function SectionCorrelationMatrix({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const { sections, correlationMatrix } = useMemo(() => {
    const sectionNames = new Set<string>();
    results.forEach((r) => r.sections.forEach((s) => sectionNames.add(s.section)));
    const sections = Array.from(sectionNames);

    // Build score vectors for each section
    const sectionScores: Record<string, number[]> = {};
    sections.forEach((s) => (sectionScores[s] = []));

    results.forEach((r) => {
      sections.forEach((section) => {
        const sectionData = r.sections.find((s) => s.section === section);
        sectionScores[section]?.push(sectionData?.averageScore ?? 0);
      });
    });

    // Calculate correlation between each pair of sections
    const calculateCorrelation = (a: number[], b: number[]): number => {
      const n = a.length;
      if (n === 0) return 0;
      const meanA = a.reduce((s, v) => s + v, 0) / n;
      const meanB = b.reduce((s, v) => s + v, 0) / n;
      let num = 0;
      let denomA = 0;
      let denomB = 0;
      for (let i = 0; i < n; i++) {
        const diffA = (a[i] ?? 0) - meanA;
        const diffB = (b[i] ?? 0) - meanB;
        num += diffA * diffB;
        denomA += diffA * diffA;
        denomB += diffB * diffB;
      }
      const denom = Math.sqrt(denomA) * Math.sqrt(denomB);
      return denom === 0 ? 0 : num / denom;
    };

    const matrix: number[][] = [];
    for (let i = 0; i < sections.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < sections.length; j++) {
        const sectionI = sections[i];
        const sectionJ = sections[j];
        if (sectionI && sectionJ) {
          row.push(calculateCorrelation(sectionScores[sectionI] ?? [], sectionScores[sectionJ] ?? []));
        } else {
          row.push(0);
        }
      }
      matrix.push(row);
    }

    return { sections, correlationMatrix: matrix };
  }, [results]);

  const getCorrelationColor = (value: number): string => {
    if (value >= 0.7) return "corr-high-pos";
    if (value >= 0.3) return "corr-med-pos";
    if (value >= -0.3) return "corr-neutral";
    if (value >= -0.7) return "corr-med-neg";
    return "corr-high-neg";
  };

  return (
    <div className="chart-card correlation-card">
      <div className="chart-header">
        <h3 className="chart-title">Section Correlation</h3>
        <p className="chart-subtitle">How section scores relate to each other</p>
      </div>
      <div className="correlation-container">
        <div className="correlation-matrix">
          <div className="corr-header-row">
            <div className="corr-corner" />
            {sections.map((s) => (
              <div key={s} className="corr-header-cell" title={s}>
                {s.substring(0, 3)}
              </div>
            ))}
          </div>
          {correlationMatrix.map((row, i) => (
            <div key={sections[i]} className="corr-row">
              <div className="corr-row-label" title={sections[i]}>
                {sections[i]?.substring(0, 3)}
              </div>
              {row.map((value, j) => (
                <div
                  key={j}
                  className={`corr-cell ${getCorrelationColor(value)}`}
                  title={`${sections[i]} ↔ ${sections[j]}: ${value.toFixed(2)}`}
                >
                  {i === j ? "1" : value.toFixed(1)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="correlation-legend">
        <span className="corr-legend-item corr-high-neg">-1</span>
        <span className="corr-legend-label">Negative</span>
        <span className="corr-legend-item corr-neutral">0</span>
        <span className="corr-legend-label">Positive</span>
        <span className="corr-legend-item corr-high-pos">+1</span>
      </div>
    </div>
  );
}

// Advanced Statistics Panel
function AdvancedStatsPanel({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const stats = useMemo(() => {
    if (results.length === 0) return null;

    const scores = results.map((r) => r.overallScore).sort((a, b) => a - b);
    const n = scores.length;

    // Percentiles
    const p25 = scores[Math.floor(n * 0.25)] ?? 0;
    const p50 = scores[Math.floor(n * 0.5)] ?? 0;
    const p75 = scores[Math.floor(n * 0.75)] ?? 0;
    const p90 = scores[Math.floor(n * 0.9)] ?? 0;

    // IQR
    const iqr = p75 - p25;

    // Mean and Variance
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Skewness (measure of asymmetry)
    const skewness =
      scores.reduce((sum, s) => sum + Math.pow((s - mean) / stdDev, 3), 0) / n;

    // Find outliers (beyond 1.5 * IQR)
    const lowerBound = p25 - 1.5 * iqr;
    const upperBound = p75 + 1.5 * iqr;
    const outliers = results.filter(
      (r) => r.overallScore < lowerBound || r.overallScore > upperBound
    );

    return {
      p25,
      p50,
      p75,
      p90,
      iqr,
      mean,
      variance,
      stdDev,
      skewness,
      outliers,
      min: scores[0] ?? 0,
      max: scores[n - 1] ?? 0,
    };
  }, [results]);

  if (!stats) return null;

  return (
    <div className="chart-card stats-panel">
      <div className="chart-header">
        <h3 className="chart-title">Statistical Analysis</h3>
        <p className="chart-subtitle">Distribution metrics and outliers</p>
      </div>
      <div className="stats-grid">
        <div className="stats-section">
          <h4 className="stats-section-title">Percentiles</h4>
          <div className="stats-row">
            <span className="stats-label">25th (Q1)</span>
            <span className={`stats-value ${getScoreClass(stats.p25)}`}>
              {formatScore(stats.p25)}
            </span>
          </div>
          <div className="stats-row">
            <span className="stats-label">50th (Median)</span>
            <span className={`stats-value ${getScoreClass(stats.p50)}`}>
              {formatScore(stats.p50)}
            </span>
          </div>
          <div className="stats-row">
            <span className="stats-label">75th (Q3)</span>
            <span className={`stats-value ${getScoreClass(stats.p75)}`}>
              {formatScore(stats.p75)}
            </span>
          </div>
          <div className="stats-row">
            <span className="stats-label">90th</span>
            <span className={`stats-value ${getScoreClass(stats.p90)}`}>
              {formatScore(stats.p90)}
            </span>
          </div>
        </div>
        <div className="stats-section">
          <h4 className="stats-section-title">Spread</h4>
          <div className="stats-row">
            <span className="stats-label">Range</span>
            <span className="stats-value">
              {formatScore(stats.min)} – {formatScore(stats.max)}
            </span>
          </div>
          <div className="stats-row">
            <span className="stats-label">IQR</span>
            <span className="stats-value">{formatScore(stats.iqr)}</span>
          </div>
          <div className="stats-row">
            <span className="stats-label">Std Dev</span>
            <span className="stats-value">±{formatScore(stats.stdDev)}</span>
          </div>
          <div className="stats-row">
            <span className="stats-label">Variance</span>
            <span className="stats-value">{stats.variance.toFixed(4)}</span>
          </div>
        </div>
        <div className="stats-section">
          <h4 className="stats-section-title">Shape</h4>
          <div className="stats-row">
            <span className="stats-label">Skewness</span>
            <span className="stats-value">
              {stats.skewness > 0 ? "+" : ""}
              {stats.skewness.toFixed(2)}
              <span className="stats-hint">
                {stats.skewness > 0.5
                  ? " (right-skewed)"
                  : stats.skewness < -0.5
                    ? " (left-skewed)"
                    : " (symmetric)"}
              </span>
            </span>
          </div>
          <div className="stats-row">
            <span className="stats-label">Outliers</span>
            <span className="stats-value">
              {stats.outliers.length}
              {stats.outliers.length > 0 && (
                <span className="stats-hint">
                  {" "}
                  ({stats.outliers.map((o) => o.modelName.split(" ")[0]).join(", ")})
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
      <div className="box-plot-container">
        <div className="box-plot">
          <div
            className="box-whisker-left"
            style={{ left: `${stats.min * 100}%`, width: `${(stats.p25 - stats.min) * 100}%` }}
          />
          <div
            className="box-main"
            style={{ left: `${stats.p25 * 100}%`, width: `${stats.iqr * 100}%` }}
          >
            <div
              className="box-median"
              style={{ left: `${((stats.p50 - stats.p25) / stats.iqr) * 100}%` }}
            />
          </div>
          <div
            className="box-whisker-right"
            style={{ left: `${stats.p75 * 100}%`, width: `${(stats.max - stats.p75) * 100}%` }}
          />
          {stats.outliers.map((o) => (
            <div
              key={o.modelId}
              className="box-outlier"
              style={{ left: `${o.overallScore * 100}%` }}
              title={`${o.modelName}: ${formatScore(o.overallScore)}`}
            />
          ))}
        </div>
        <div className="box-plot-labels">
          <span style={{ left: "0%" }}>0%</span>
          <span style={{ left: "50%" }}>50%</span>
          <span style={{ left: "100%" }}>100%</span>
        </div>
      </div>
    </div>
  );
}

// Model Consistency Chart
function ConsistencyChart({
  results,
}: {
  results: EnhancedBenchmarkResult[];
}) {
  const consistencyData = useMemo(() => {
    return results
      .map((r) => {
        const scores = r.sections.map((s) => s.averageScore);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance =
          scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        return {
          modelId: r.modelId,
          modelName: r.modelName,
          provider: r.provider,
          overallScore: r.overallScore,
          consistency: 1 - stdDev, // Higher = more consistent
          stdDev,
          range: max - min,
          min,
          max,
        };
      })
      .sort((a, b) => b.consistency - a.consistency);
  }, [results]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3 className="chart-title">Performance Consistency</h3>
        <p className="chart-subtitle">Score variance across sections (lower = more consistent)</p>
      </div>
      <div className="consistency-chart">
        {consistencyData.slice(0, 10).map((data, idx) => (
          <div key={data.modelId} className="consistency-row">
            <div className="consistency-info">
              <span className="consistency-rank">#{idx + 1}</span>
              <span className="consistency-name" title={data.modelName}>
                {data.modelName}
              </span>
              <span
                className={`provider-badge tiny ${getProviderClass(data.provider)}`}
              >
                {data.provider}
              </span>
            </div>
            <div className="consistency-visual">
              <div className="consistency-range-bg">
                <div
                  className="consistency-range"
                  style={{
                    left: `${data.min * 100}%`,
                    width: `${data.range * 100}%`,
                  }}
                />
                <div
                  className={`consistency-mean ${getScoreClass(data.overallScore)}`}
                  style={{ left: `${data.overallScore * 100}%` }}
                />
              </div>
              <span className="consistency-value">±{formatScore(data.stdDev)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Model Comparison Selector
function ModelComparisonSelector({
  results,
  selectedModels,
  onToggleModel,
  maxSelections = 4,
}: {
  results: EnhancedBenchmarkResult[];
  selectedModels: string[];
  onToggleModel: (modelId: string) => void;
  maxSelections?: number;
}) {
  return (
    <div className="comparison-selector">
      <div className="comparison-selector-header">
        <h4>Select models to compare ({selectedModels.length}/{maxSelections})</h4>
        {selectedModels.length > 0 && (
          <button
            className="clear-selection-btn"
            onClick={() => selectedModels.forEach(onToggleModel)}
          >
            Clear
          </button>
        )}
      </div>
      <div className="comparison-selector-grid">
        {results.map((r) => {
          const isSelected = selectedModels.includes(r.modelId);
          const isDisabled = !isSelected && selectedModels.length >= maxSelections;
          return (
            <button
              key={r.modelId}
              className={`comparison-model-btn ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
              onClick={() => !isDisabled && onToggleModel(r.modelId)}
              disabled={isDisabled}
            >
              <span className="cmb-name">{r.modelName}</span>
              <span className={`cmb-score ${getScoreClass(r.overallScore)}`}>
                {formatScore(r.overallScore)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Side-by-Side Model Comparison
function ModelComparisonView({
  results,
  selectedModels,
}: {
  results: EnhancedBenchmarkResult[];
  selectedModels: string[];
}) {
  const modelsToCompare = useMemo(() => {
    return selectedModels
      .map((id) => results.find((r) => r.modelId === id))
      .filter((r): r is EnhancedBenchmarkResult => r !== undefined);
  }, [results, selectedModels]);

  if (modelsToCompare.length === 0) {
    return (
      <div className="comparison-empty">
        <p>Select 2-4 models above to compare them side by side</p>
      </div>
    );
  }

  const sections = modelsToCompare[0]?.sections.map((s) => s.section) ?? [];

  return (
    <div className="model-comparison">
      <table className="comparison-table">
        <thead>
          <tr>
            <th className="comparison-metric-header">Metric</th>
            {modelsToCompare.map((m) => (
              <th key={m.modelId} className="comparison-model-header">
                <div className="cmh-name">{m.modelName}</div>
                <span
                  className={`provider-badge small ${getProviderClass(m.provider)}`}
                >
                  {m.provider}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="comparison-row highlight">
            <td className="comparison-metric">Overall Score</td>
            {modelsToCompare.map((m) => {
              const best = Math.max(...modelsToCompare.map((x) => x.overallScore));
              const isBest = m.overallScore === best;
              return (
                <td
                  key={m.modelId}
                  className={`comparison-value ${getScoreClass(m.overallScore)} ${isBest ? "is-best" : ""}`}
                >
                  {formatScore(m.overallScore)}
                  {isBest && <span className="best-badge">Best</span>}
                </td>
              );
            })}
          </tr>
          <tr className="comparison-row">
            <td className="comparison-metric">Total Latency</td>
            {modelsToCompare.map((m) => {
              const best = Math.min(...modelsToCompare.map((x) => x.totalLatencyMs));
              const isBest = m.totalLatencyMs === best;
              return (
                <td
                  key={m.modelId}
                  className={`comparison-value ${isBest ? "is-best" : ""}`}
                >
                  {formatLatency(m.totalLatencyMs)}
                  {isBest && <span className="best-badge">Fastest</span>}
                </td>
              );
            })}
          </tr>
          <tr className="comparison-row">
            <td className="comparison-metric">Cost Tier</td>
            {modelsToCompare.map((m) => (
              <td key={m.modelId} className="comparison-value">
                {m.costTier ? (
                  <span className={`cost-badge cost-${m.costTier}`}>
                    {getCostTierLabel(m.costTier)}
                  </span>
                ) : (
                  <span className="text-tertiary">N/A</span>
                )}
              </td>
            ))}
          </tr>
          <tr className="comparison-divider">
            <td colSpan={modelsToCompare.length + 1}>Section Scores</td>
          </tr>
          {sections.map((section) => {
            const sectionScores = modelsToCompare.map((m) => {
              const s = m.sections.find((x) => x.section === section);
              return s?.averageScore ?? 0;
            });
            const bestScore = Math.max(...sectionScores);
            return (
              <tr key={section} className="comparison-row">
                <td className="comparison-metric section-name">{section}</td>
                {modelsToCompare.map((m, idx) => {
                  const score = sectionScores[idx] ?? 0;
                  const isBest = score === bestScore && bestScore > 0;
                  return (
                    <td
                      key={m.modelId}
                      className={`comparison-value ${getScoreClass(score)} ${isBest ? "is-best" : ""}`}
                    >
                      {formatScore(score)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AnalysisView({ results }: { results: EnhancedBenchmarkResult[] }) {
  const topResults = useMemo(() => {
    return [...results].sort((a, b) => b.overallScore - a.overallScore).slice(0, 5);
  }, [results]);

  return (
    <div className="charts-container">
      {topResults.map((result) => {
        const chartData = result.sections.map((section) => ({
          label: section.section,
          value: section.averageScore,
        }));

        return (
          <EnhancedBarChart
            key={result.modelId}
            data={chartData}
            title={result.modelName}
            subtitle="Section Performance"
          />
        );
      })}
    </div>
  );
}

// New Insights View with Regression Analysis
function InsightsView({ results }: { results: EnhancedBenchmarkResult[] }) {
  const costRegression = useMemo(
    () => calculateCostPerformanceRegression(results),
    [results]
  );

  const latencyRegression = useMemo(
    () => calculateLatencyPerformanceRegression(results),
    [results]
  );

  // Value efficiency: score per cost unit
  const valueEfficiency = useMemo(() => {
    return [...results]
      .map((r) => ({
        label: r.modelName,
        value: r.overallScore / getCostValue(r.costTier),
        provider: r.provider,
        sublabel: `${formatScore(r.overallScore)} / ${getCostTierLabel(r.costTier || "medium")}`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [results]);

  // Speed efficiency: score per second of latency
  const speedEfficiency = useMemo(() => {
    return [...results]
      .map((r) => ({
        label: r.modelName,
        value: r.overallScore / (r.totalLatencyMs / 1000),
        provider: r.provider,
        sublabel: `${formatScore(r.overallScore)} in ${formatLatency(r.totalLatencyMs)}`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [results]);

  const formatCost = (x: number) => {
    if (x <= 1) return "Cheap";
    if (x <= 3) return "Medium";
    return "Expensive";
  };

  const formatLatencyX = (x: number) => `${x.toFixed(0)}s`;

  return (
    <div className="insights-view">
      <div className="insights-header">
        <h2>Performance Insights</h2>
        <p>Statistical analysis of model performance vs cost and latency</p>
      </div>

      <div className="insights-grid">
        <ScatterPlot
          regression={costRegression}
          title="Cost vs Performance"
          xLabel="Cost Tier"
          yLabel="Score"
          xFormat={formatCost}
        />

        <ScatterPlot
          regression={latencyRegression}
          title="Latency vs Performance"
          xLabel="Total Latency (seconds)"
          yLabel="Score"
          xFormat={formatLatencyX}
        />

        <EnhancedBarChart
          data={valueEfficiency}
          title="Value Efficiency"
          subtitle="Score per cost unit (higher = better value)"
          showProvider
        />

        <EnhancedBarChart
          data={speedEfficiency}
          title="Speed Efficiency"
          subtitle="Score per second (higher = faster results)"
          showProvider
        />
      </div>

      <div className="insights-summary">
        <h3>Key Findings</h3>
        <div className="findings-grid">
          <div className="finding-card">
            <div className="finding-icon">💰</div>
            <div className="finding-content">
              <h4>Cost-Performance</h4>
              <p>
                {costRegression.correlation > 0.3
                  ? "Higher cost models tend to perform better."
                  : costRegression.correlation < -0.3
                    ? "Surprisingly, cheaper models perform better on average."
                    : "Cost tier is not a strong predictor of performance."}
              </p>
              <span className="finding-stat">
                Correlation: {(costRegression.correlation * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="finding-card">
            <div className="finding-icon">⚡</div>
            <div className="finding-content">
              <h4>Speed-Performance</h4>
              <p>
                {latencyRegression.correlation > 0.3
                  ? "Slower models tend to be more accurate."
                  : latencyRegression.correlation < -0.3
                    ? "Faster models tend to perform better."
                    : "Response time does not strongly correlate with accuracy."}
              </p>
              <span className="finding-stat">
                Correlation: {(latencyRegression.correlation * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="finding-card">
            <div className="finding-icon">🏆</div>
            <div className="finding-content">
              <h4>Best Value</h4>
              <p>
                {valueEfficiency[0]?.label || "N/A"} offers the best score-to-cost ratio.
              </p>
              <span className="finding-stat">
                Provider: {valueEfficiency[0]?.provider || "N/A"}
              </span>
            </div>
          </div>

          <div className="finding-card">
            <div className="finding-icon">🚀</div>
            <div className="finding-content">
              <h4>Fastest Accurate</h4>
              <p>
                {speedEfficiency[0]?.label || "N/A"} provides the best speed-to-accuracy ratio.
              </p>
              <span className="finding-stat">
                Provider: {speedEfficiency[0]?.provider || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("leaderboard");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Filter state
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedCostTiers, setSelectedCostTiers] = useState<CostTier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Sort state
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Model comparison state
  const [comparisonModels, setComparisonModels] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/data", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error: ${res.status}`);
        }
        return res.json() as Promise<ApiData>;
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  // Memoized filter values
  const providers = useMemo(
    () => (data ? getUniqueProviders(data.results) : []),
    [data]
  );

  const costTiers = useMemo(
    () => (data ? getUniqueCostTiers(data.results) : []),
    [data]
  );

  // Filtered results
  const filteredResults = useMemo(() => {
    if (!data) return [];

    return data.results.filter((r) => {
      // Search filter
      if (searchQuery.length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesName = r.modelName.toLowerCase().includes(query);
        const matchesProvider = r.provider.toLowerCase().includes(query);
        if (!matchesName && !matchesProvider) {
          return false;
        }
      }
      // Provider filter
      if (
        selectedProviders.length > 0 &&
        !selectedProviders.includes(r.provider)
      ) {
        return false;
      }
      // Cost tier filter
      if (
        selectedCostTiers.length > 0 &&
        (!r.costTier || !selectedCostTiers.includes(r.costTier))
      ) {
        return false;
      }
      return true;
    });
  }, [data, selectedProviders, selectedCostTiers, searchQuery]);

  const selectedResult = useMemo(
    () => filteredResults.find((r) => r.modelId === selectedModel),
    [filteredResults, selectedModel]
  );

  const handleViewChange = useCallback((newView: ViewMode) => {
    setView(newView);
    setSelectedModel(null);
  }, []);

  const handleSortChange = useCallback(
    (option: SortOption) => {
      if (sortBy === option) {
        setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
      } else {
        setSortBy(option);
        setSortDirection("desc");
      }
    },
    [sortBy]
  );

  const handleClearFilters = useCallback(() => {
    setSelectedProviders([]);
    setSelectedCostTiers([]);
    setSearchQuery("");
  }, []);

  const handleToggleComparisonModel = useCallback((modelId: string) => {
    setComparisonModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId]
    );
  }, []);

  if (loading) {
    return (
      <div className="app">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!data || data.results.length === 0) {
    return (
      <div className="app">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon" aria-hidden="true">
              TMG
            </span>
            <div>
              <h1>TMG Bench</h1>
              <span>The Mountain Goats AI Knowledge Benchmark</span>
            </div>
          </div>
          <nav className="nav" aria-label="Main navigation">
            <button
              className={`nav-btn ${view === "leaderboard" ? "active" : ""}`}
              onClick={() => handleViewChange("leaderboard")}
              aria-current={view === "leaderboard" ? "page" : undefined}
            >
              Leaderboard
            </button>
            <button
              className={`nav-btn ${view === "comparison" ? "active" : ""}`}
              onClick={() => handleViewChange("comparison")}
              aria-current={view === "comparison" ? "page" : undefined}
            >
              Comparison
            </button>
            <button
              className={`nav-btn ${view === "analysis" ? "active" : ""}`}
              onClick={() => handleViewChange("analysis")}
              aria-current={view === "analysis" ? "page" : undefined}
            >
              Analysis
            </button>
            <button
              className={`nav-btn ${view === "insights" ? "active" : ""}`}
              onClick={() => handleViewChange("insights")}
              aria-current={view === "insights" ? "page" : undefined}
            >
              Insights
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        <StatsOverview results={filteredResults} />

        {(view === "leaderboard" || view === "comparison") && (
          <div className="controls-bar">
            <FilterControls
              providers={providers}
              costTiers={costTiers}
              selectedProviders={selectedProviders}
              selectedCostTiers={selectedCostTiers}
              searchQuery={searchQuery}
              onProviderChange={setSelectedProviders}
              onCostTierChange={setSelectedCostTiers}
              onSearchChange={setSearchQuery}
              onClearFilters={handleClearFilters}
            />
            {view === "leaderboard" && (
              <SortControls
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
              />
            )}
          </div>
        )}

        {view === "leaderboard" && (
          <>
            <Leaderboard
              results={filteredResults}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              sortBy={sortBy}
              sortDirection={sortDirection}
            />
            {selectedResult && <ModelDetail result={selectedResult} />}
          </>
        )}

        {view === "comparison" && (
          <>
            <MiniMetricsRow results={filteredResults} />
            <QuickStatsRow results={filteredResults} />

            {/* Model Comparison Section */}
            <ModelComparisonSelector
              results={filteredResults}
              selectedModels={comparisonModels}
              onToggleModel={handleToggleComparisonModel}
              maxSelections={4}
            />
            <ModelComparisonView
              results={filteredResults}
              selectedModels={comparisonModels}
            />

            <div className="charts-container dense">
              <RadarChart results={filteredResults} selectedModels={comparisonModels} />
              <SectionCorrelationMatrix results={filteredResults} />
              <AdvancedStatsPanel results={filteredResults} />
              <ConsistencyChart results={filteredResults} />
              <SectionHeatmap results={filteredResults} />
              <PerformanceQuadrant results={filteredResults} />
              <ProviderHeadToHead results={filteredResults} />
              <ComparisonChart results={filteredResults} />
              <ProviderComparison results={filteredResults} />
              <CostTierComparison results={filteredResults} />
              <SectionDifficulty results={filteredResults} />
              <LatencyDistribution results={filteredResults} />
              <ScoreDistribution results={filteredResults} />
              <TopPerformersTable results={filteredResults} />
            </div>
            <CompactModelCards results={filteredResults} />
          </>
        )}

        {view === "analysis" && (
          <>
            <MiniMetricsRow results={filteredResults} />
            <div className="charts-container dense">
              <PerformanceQuadrant results={filteredResults} />
              <SectionDifficulty results={filteredResults} />
              <ProviderHeadToHead results={filteredResults} />
            </div>
            <AnalysisView results={filteredResults} />
          </>
        )}

        {view === "insights" && <InsightsView results={data.results} />}
      </main>
    </div>
  );
}

// Mount the app
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
