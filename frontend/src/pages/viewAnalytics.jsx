import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import "../css/Analytics.css"; // Import the CSS file

const lengthLabels = {
  0: "Very Short",
  1: "Short",
  2: "Medium",
  3: "Long",
};

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#a4de6c",
  "#d0ed57",
  "#ffc658",
];

export default function ViewAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch("http://localhost:5000/analytics");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAnalyticsData(data);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
        setError(
          `Failed to load analytics data: ${err.message}. Please ensure your backend is running and accessible at http://localhost:5000/analytics.`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="status-container">
        <div className="loading-indicator">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-container">
        <div className="error-message">
          <strong>Error!</strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="status-container">
        <div>No analytics data available.</div>
      </div>
    );
  }

  // Prepare data for Pie Charts
  const summaryLengthChartData =
    analyticsData.originalContentStats.lengthDistribution.map((item) => ({
      name: item.label,
      value: item.count,
    }));

  const feedbackChartData = analyticsData.feedbackAnalysis.map((item) => ({
    name: item.rating === null ? "No Feedback" : `Rating ${item.rating} `,
    value: item.count,
  }));

  const inputMediumChartData = analyticsData.inputMediumDistribution.map(
    (item) => ({
      name: item.type,
      value: item.count,
    })
  );

  return (
    <div className="analytics-page">
      <div className="analytics-container">
        <header className="analytics-header">
          <h1>System Analytics</h1>
        </header>

          {/* Total Summaries */}
          <section className="analytics-card card-highlight">
            <h2 className="card-title">Overall Summary Statistics</h2>
            <div className="card-content">
              <p className="metric-value total-summaries-value">
                {analyticsData.totalSummaries}
              </p>
              <p className="metric-label">Total Summaries Generated</p>
            </div>
          </section>
        <div className="analytics-grid">
          

          {/* Original Content Statistics by Length */}
          <section className="analytics-card">
            <h2 className="card-title">Original Content Metrics</h2>
            <div className="card-content metrics-by-length-container">
              {Object.keys(lengthLabels).map((key) => {
                const label = lengthLabels[key];
                const stats = analyticsData.originalContentStatsByLength?.[label];
                if (!stats) return "null"; // Don't render if no data for this category

                return (
                  <div key={label} className="length-category-metrics">
                    <h4 className="length-category-title">{label}</h4>
                    <div className="metric-item">
                      <span className="metric-label">Avg. Word Count:</span>
                      <span className="metric-value">
                        {stats.avgWordCount.toFixed(2)}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Avg. Sentence Count:</span>
                      <span className="metric-value">
                        {stats.avgSentenceCount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          
          {/* Summarized Content Statistics by Length */}
          <section className="analytics-card">
            <h2 className="card-title">Summarized Content Metrics</h2>
            <div className="card-content metrics-by-length-container">
              {Object.keys(lengthLabels).map((key) => {
                const label = lengthLabels[key];
                const stats = analyticsData.summarizedContentStatsByLength?.[label];
                if (!stats) return "null"; // Don't render if no data for this category

                return (
                  <div key={label} className="length-category-metrics">
                    <h4 className="length-category-title">{label}</h4>
                    <div className="metric-item">
                      <span className="metric-label">Avg. Word Count:</span>
                      <span className="metric-value">
                        {stats.avgWordCount.toFixed(2)}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Avg. Sentence Count:</span>
                      <span className="metric-value">
                        {stats.avgSentenceCount.toFixed(2)}
                      </span>
                    </div>
                     <div className="metric-item">
                       <span className="metric-label">Avg. Compression:</span>
                       <span className="metric-value">
                         {(stats.avgCompressionRatio * 100).toFixed(2)}%
                       </span>
                     </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Summary Length Distribution */}
          <section className="analytics-card">
            <h2 className="card-title">Summary Length Distribution</h2>
            <div className="card-content">
              {summaryLengthChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={summaryLengthChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {summaryLengthChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p>No length distribution data available.</p>
              )}
            </div>
          </section>

          {/* Feedback Analysis */}
          <section className="analytics-card">
            <h2 className="card-title">User Feedback Distribution</h2>
            <div className="card-content">
              {feedbackChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={feedbackChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {feedbackChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p>No feedback data available.</p>
              )}
            </div>
          </section>

          {/* Input Medium Distribution */}
          <section className="analytics-card">
            <h2 className="card-title">Input Medium Distribution</h2>
            <div className="card-content">
              {inputMediumChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={inputMediumChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {inputMediumChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p>No input medium data available.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}