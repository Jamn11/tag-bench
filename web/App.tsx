import React, { useState, useEffect, useMemo } from "react";
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

// Components
function Loading() {
  return (
    <div className="loading">
      <div className="loading-spinner" />
      <div className="loading-text">Loading benchmark results...</div>
    </div>
  );
}

function StatsOverview({ data }: { data: ApiData }) {
  const stats = useMemo(() => {
    const { results } = data;
    const avgScore =
      results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
    const bestResult = results.reduce<EnhancedBenchmarkResult | null>(
      (best, r) => (!best || r.overallScore > best.overallScore ? r : best),
      null
    );
    const totalQuestions = results[0]?.sections.reduce(
      (sum, s) => sum + s.totalQuestions,
      0
    ) ?? 0;
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
    <div className="stats-grid">
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
    </div>
  );
}

function Leaderboard({
  results,
  selectedModel,
  onSelectModel,
}: {
  results: EnhancedBenchmarkResult[];
  selectedModel: string | null;
  onSelectModel: (modelId: string) => void;
}) {
  const sortedResults = useMemo(
    () => [...results].sort((a, b) => b.overallScore - a.overallScore),
    [results]
  );

  return (
    <div className="leaderboard animate-fade-in">
      <div className="leaderboard-header">
        <div>
          <div className="leaderboard-title">Model Leaderboard</div>
          <div className="leaderboard-subtitle">
            Ranked by overall accuracy
          </div>
        </div>
      </div>
      <div className="leaderboard-list">
        {sortedResults.map((result, index) => {
          const scoreClass = getScoreClass(result.overallScore);
          const isSelected = selectedModel === result.modelId;

          return (
            <div
              key={result.modelId}
              className={`leaderboard-item ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectModel(result.modelId)}
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
              <div className="score-bar-container">
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
    </div>
  );
}

function SectionBreakdown({ sections }: { sections: SectionResult[] }) {
  return (
    <div className="section-grid animate-slide-up">
      {sections.map((section) => {
        const scoreClass = getScoreClass(section.averageScore);
        return (
          <div key={section.section} className="section-card">
            <div className="section-header">
              <div className="section-name">{section.section}</div>
              <div className={`section-score ${scoreClass}`}>
                {formatScore(section.averageScore)}
              </div>
            </div>
            <div className="score-bar-container">
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

function QuestionsList({
  results,
  section,
}: {
  results: QuestionResult[];
  section: string;
}) {
  return (
    <div className="questions-list">
      {results.map((result) => {
        const statusClass = result.correct
          ? "correct"
          : result.score > 0
            ? "partial"
            : "incorrect";
        const scoreClass = getScoreClass(result.score);

        return (
          <div key={result.questionId} className="question-item">
            <div className={`question-status ${statusClass}`} />
            <div className="question-content">
              <div className="question-id">{result.questionId}</div>
              <div className="question-answers">
                <div className="question-answer">
                  <span className="answer-label">Expected:</span>
                  <span className="answer-value correct">
                    {result.expectedAnswer.substring(0, 200)}
                    {result.expectedAnswer.length > 200 ? "..." : ""}
                  </span>
                </div>
                <div className="question-answer">
                  <span className="answer-label">Response:</span>
                  <span
                    className={`answer-value ${result.correct ? "correct" : "incorrect"}`}
                  >
                    {result.modelResponse.substring(0, 200)}
                    {result.modelResponse.length > 200 ? "..." : ""}
                  </span>
                </div>
              </div>
              <div className="question-latency">
                {formatLatency(result.latencyMs)}
                {result.timedOut ? " (timed out)" : ""}
              </div>
            </div>
            <div className={`question-score ${scoreClass}`}>
              {formatScore(result.score)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModelDetail({
  result,
}: {
  result: EnhancedBenchmarkResult;
}) {
  const [activeSection, setActiveSection] = useState(
    result.sections[0]?.section || ""
  );

  const currentSection = result.sections.find(
    (s) => s.section === activeSection
  );

  return (
    <div className="detail-panel animate-slide-up">
      <div className="detail-header">
        <div className="detail-title">
          <div className="detail-name">{result.modelName}</div>
          <div className="detail-meta">
            <span
              className={`provider-badge ${getProviderClass(result.provider)}`}
            >
              {result.provider}
            </span>
            {" | "}
            {new Date(result.timestamp).toLocaleDateString()} | Total:{" "}
            {formatLatency(result.totalLatencyMs)}
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

      <div className="detail-tabs">
        {result.sections.map((section) => (
          <button
            key={section.section}
            className={`detail-tab ${activeSection === section.section ? "active" : ""}`}
            onClick={() => setActiveSection(section.section)}
          >
            {section.section} ({section.correctCount}/{section.totalQuestions})
          </button>
        ))}
      </div>

      <div className="detail-content">
        {currentSection && (
          <QuestionsList
            results={currentSection.results}
            section={currentSection.section}
          />
        )}
      </div>
    </div>
  );
}

function ComparisonChart({ results }: { results: EnhancedBenchmarkResult[] }) {
  const [selectedSection, setSelectedSection] = useState("overall");

  const sortedResults = useMemo(() => {
    if (selectedSection === "overall") {
      return [...results].sort((a, b) => b.overallScore - a.overallScore);
    }

    return [...results].sort((a, b) => {
      const aSection = a.sections.find((s) => s.section === selectedSection);
      const bSection = b.sections.find((s) => s.section === selectedSection);
      return (bSection?.averageScore || 0) - (aSection?.averageScore || 0);
    });
  }, [results, selectedSection]);

  const sections = useMemo(() => {
    const allSections = new Set<string>();
    results.forEach((r) => r.sections.forEach((s) => allSections.add(s.section)));
    return ["overall", ...Array.from(allSections)];
  }, [results]);

  const getScore = (result: EnhancedBenchmarkResult) => {
    if (selectedSection === "overall") {
      return result.overallScore;
    }
    const section = result.sections.find((s) => s.section === selectedSection);
    return section?.averageScore || 0;
  };

  return (
    <div className="chart-card">
      <div className="comparison-header">
        <div className="comparison-title">Score by Section</div>
        <div className="comparison-controls">
          <div className="select-wrapper">
            <select
              value={selectedSection}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedSection(e.target.value)}
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
      <div className="bar-chart">
        {sortedResults.map((result) => {
          const score = getScore(result);
          const scoreClass = getScoreClass(score);
          return (
            <div key={result.modelId} className="bar-row">
              <div className="bar-label" title={result.modelName}>
                {result.modelName}
              </div>
              <div className="bar-track">
                <div
                  className={`bar-fill ${scoreClass}`}
                  style={{
                    width: `${score * 100}%`,
                    background:
                      scoreClass === "excellent"
                        ? "linear-gradient(90deg, #22c55e, #16a34a)"
                        : scoreClass === "good"
                          ? "linear-gradient(90deg, #eab308, #ca8a04)"
                          : "linear-gradient(90deg, #ef4444, #dc2626)",
                  }}
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
      <div className="chart-title">Performance by Provider</div>
      <div className="bar-chart">
        {providerStats.map((stat) => {
          const scoreClass = getScoreClass(stat.bestScore);
          return (
            <div key={stat.provider} className="bar-row">
              <div className="bar-label">
                <span
                  className={`provider-badge ${getProviderClass(stat.provider)}`}
                >
                  {stat.provider}
                </span>
              </div>
              <div className="bar-track">
                <div
                  className={`bar-fill ${scoreClass}`}
                  style={{
                    width: `${stat.bestScore * 100}%`,
                    background:
                      scoreClass === "excellent"
                        ? "linear-gradient(90deg, #22c55e, #16a34a)"
                        : scoreClass === "good"
                          ? "linear-gradient(90deg, #eab308, #ca8a04)"
                          : "linear-gradient(90deg, #ef4444, #dc2626)",
                  }}
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

function App() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("leaderboard");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then((res) => res.json() as Promise<ApiData>)
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const selectedResult = useMemo(
    () => data?.results.find((r) => r.modelId === selectedModel),
    [data, selectedModel]
  );

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
        <div className="loading">
          <div className="empty-icon">!</div>
          <div className="empty-text">Error loading data: {error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="app">
        <div className="loading">
          <div className="empty-icon">?</div>
          <div className="empty-text">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">TMG</span>
            <div>
              <h1>TMG Bench</h1>
              <span>The Mountain Goats AI Knowledge Benchmark</span>
            </div>
          </div>
          <nav className="nav">
            <button
              className={`nav-btn ${view === "leaderboard" ? "active" : ""}`}
              onClick={() => setView("leaderboard")}
            >
              Leaderboard
            </button>
            <button
              className={`nav-btn ${view === "comparison" ? "active" : ""}`}
              onClick={() => setView("comparison")}
            >
              Comparison
            </button>
            <button
              className={`nav-btn ${view === "analysis" ? "active" : ""}`}
              onClick={() => setView("analysis")}
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

        {view === "analysis" && (
          <div className="charts-container">
            {data.results
              .sort((a, b) => b.overallScore - a.overallScore)
              .slice(0, 5)
              .map((result) => (
                <div key={result.modelId} className="chart-card">
                  <div className="chart-title">
                    {result.modelName} - Section Performance
                  </div>
                  <div className="bar-chart">
                    {result.sections.map((section) => {
                      const scoreClass = getScoreClass(section.averageScore);
                      return (
                        <div key={section.section} className="bar-row">
                          <div className="bar-label">{section.section}</div>
                          <div className="bar-track">
                            <div
                              className={`bar-fill ${scoreClass}`}
                              style={{
                                width: `${section.averageScore * 100}%`,
                                background:
                                  scoreClass === "excellent"
                                    ? "linear-gradient(90deg, #22c55e, #16a34a)"
                                    : scoreClass === "good"
                                      ? "linear-gradient(90deg, #eab308, #ca8a04)"
                                      : "linear-gradient(90deg, #ef4444, #dc2626)",
                              }}
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
        )}
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
