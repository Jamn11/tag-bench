import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import type {
  ApiData,
  EnhancedBenchmarkResult,
  SectionResult,
  QuestionResult,
  ViewMode,
} from "./types";
import {
  getScoreClass,
  formatScore,
  formatLatency,
  getProviderClass,
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

function StatsOverview({ data }: { data: ApiData }) {
  const stats = useMemo(() => {
    const { results } = data;
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
  }, [data]);

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
}: {
  results: EnhancedBenchmarkResult[];
  selectedModel: string | null;
  onSelectModel: (modelId: string | null) => void;
}) {
  const sortedResults = useMemo(
    () => [...results].sort((a, b) => b.overallScore - a.overallScore),
    [results]
  );

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

  return (
    <section
      className="leaderboard animate-fade-in"
      aria-label="Model Leaderboard"
    >
      <div className="leaderboard-header">
        <div>
          <h2 className="leaderboard-title">Model Leaderboard</h2>
          <div className="leaderboard-subtitle">
            Ranked by overall accuracy - Click to view details
          </div>
        </div>
      </div>
      <div className="leaderboard-list" role="list">
        {sortedResults.map((result, index) => {
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
              aria-label={`${result.modelName}, rank ${index + 1}, score ${formatScore(result.overallScore)}`}
            >
              <div className={`rank ${index < 3 ? "top-3" : ""}`}>
                #{index + 1}
              </div>
              <div className="model-info">
                <div className="model-name">{result.modelName}</div>
                <div className="model-provider">
                  <span
                    className={`provider-badge ${getProviderClass(result.provider)}`}
                  >
                    {result.provider}
                  </span>
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
                />
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
              />
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

  // Reset active section when result changes
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

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => getScore(b) - getScore(a));
  }, [results, getScore]);

  const handleSectionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedSection(e.target.value);
    },
    []
  );

  return (
    <div className="chart-card">
      <div className="comparison-header">
        <h3 className="comparison-title">Score by Section</h3>
        <div className="comparison-controls">
          <div className="select-wrapper">
            <label htmlFor="section-select" className="sr-only">
              Select section
            </label>
            <select
              id="section-select"
              value={selectedSection}
              onChange={handleSectionChange}
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
      <div className="bar-chart" role="list" aria-label="Score comparison">
        {sortedResults.map((result) => {
          const score = getScore(result);
          const scoreClass = getScoreClass(score);
          return (
            <div key={result.modelId} className="bar-row" role="listitem">
              <div className="bar-label" title={result.modelName}>
                {result.modelName}
              </div>
              <div
                className="bar-track"
                role="progressbar"
                aria-valuenow={Math.round(score * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`bar-fill ${scoreClass}`}
                  style={{ width: `${score * 100}%` }}
                />
              </div>
              <div className={`bar-value ${scoreClass}`}>
                {formatScore(score)}
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
      { total: number; count: number; best: number }
    >();

    results.forEach((r) => {
      const current = providers.get(r.provider) || {
        total: 0,
        count: 0,
        best: 0,
      };
      current.total += r.overallScore;
      current.count += 1;
      current.best = Math.max(current.best, r.overallScore);
      providers.set(r.provider, current);
    });

    return Array.from(providers.entries())
      .map(([provider, stats]) => ({
        provider,
        avgScore: stats.total / stats.count,
        bestScore: stats.best,
        modelCount: stats.count,
      }))
      .sort((a, b) => b.bestScore - a.bestScore);
  }, [results]);

  return (
    <div className="chart-card">
      <h3 className="chart-title">Performance by Provider</h3>
      <div className="bar-chart" role="list" aria-label="Provider comparison">
        {providerStats.map((stat) => {
          const scoreClass = getScoreClass(stat.bestScore);
          return (
            <div key={stat.provider} className="bar-row" role="listitem">
              <div className="bar-label">
                <span
                  className={`provider-badge ${getProviderClass(stat.provider)}`}
                >
                  {stat.provider}
                </span>
              </div>
              <div
                className="bar-track"
                role="progressbar"
                aria-valuenow={Math.round(stat.bestScore * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`bar-fill ${scoreClass}`}
                  style={{ width: `${stat.bestScore * 100}%` }}
                />
              </div>
              <div className={`bar-value ${scoreClass}`}>
                {formatScore(stat.bestScore)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalysisView({ results }: { results: EnhancedBenchmarkResult[] }) {
  const topResults = useMemo(() => {
    return [...results].sort((a, b) => b.overallScore - a.overallScore).slice(0, 5);
  }, [results]);

  return (
    <div className="charts-container">
      {topResults.map((result) => (
        <div key={result.modelId} className="chart-card">
          <h3 className="chart-title">
            {result.modelName} - Section Performance
          </h3>
          <div className="bar-chart" role="list">
            {result.sections.map((section) => {
              const scoreClass = getScoreClass(section.averageScore);
              return (
                <div key={section.section} className="bar-row" role="listitem">
                  <div className="bar-label">{section.section}</div>
                  <div
                    className="bar-track"
                    role="progressbar"
                    aria-valuenow={Math.round(section.averageScore * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={`bar-fill ${scoreClass}`}
                      style={{ width: `${section.averageScore * 100}%` }}
                    />
                  </div>
                  <div className={`bar-value ${scoreClass}`}>
                    {formatScore(section.averageScore)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("leaderboard");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

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

  const selectedResult = useMemo(
    () => data?.results.find((r) => r.modelId === selectedModel),
    [data, selectedModel]
  );

  const handleViewChange = useCallback((newView: ViewMode) => {
    setView(newView);
    setSelectedModel(null);
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
          </nav>
        </div>
      </header>

      <main className="main">
        <StatsOverview data={data} />

        {view === "leaderboard" && (
          <>
            <Leaderboard
              results={data.results}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
            />
            {selectedResult && <ModelDetail result={selectedResult} />}
          </>
        )}

        {view === "comparison" && (
          <div className="charts-container">
            <ComparisonChart results={data.results} />
            <ProviderComparison results={data.results} />
          </div>
        )}

        {view === "analysis" && <AnalysisView results={data.results} />}
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
