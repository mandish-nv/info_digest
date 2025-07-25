import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

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
      <div>
        <div>Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div>
          <strong>Error!</strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div>
        <div>No analytics data available.</div>
      </div>
    );
  }

  // Prepare data for Summary Length Distribution Pie Chart
  const summaryLengthChartData =
    analyticsData.originalContentStats.lengthDistribution.map((item) => ({
      name: item.label,
      value: item.count,
    }));

  // Prepare data for User Feedback Distribution Pie Chart
  const feedbackChartData = analyticsData.feedbackAnalysis.map((item) => ({
    name:
      item.rating === null
        ? "No Feedback"
        : `Rating ${item.rating} Star${item.rating !== 1 ? "s" : ""}`,
    value: item.count,
  }));

  // Prepare data for Input Medium Distribution Pie Chart
  const inputMediumChartData = analyticsData.inputMediumDistribution.map(
    (item) => ({
      name: item.type,
      value: item.count,
    })
  );

  return (
    <div>
      <div>
        <header>
          <h1>Summary App Analytics</h1>
        </header>

        <div>
          {/* Total Summaries */}
          <section>
            <h2>Overall Summary Statistics</h2>
            <div>
              <p>{analyticsData.totalSummaries}</p>
              <p>Total Summaries Generated</p>
            </div>
          </section>

          {/* Original Content Statistics */}
          <section>
            <h2>Original Content Metrics</h2>
            <div>
              <div>
                <p>Average Original Word Count:</p>
                <p>
                  {analyticsData.originalContentStats.avgWordCount.toFixed(2)}
                </p>
              </div>
              <div>
                <p>Average Original Sentence Count:</p>
                <p>
                  {analyticsData.originalContentStats.avgSentenceCount.toFixed(
                    2
                  )}
                </p>
              </div>
            </div>
            <div>
              <h3>Summary Length Distribution:</h3>
              <div>
                {/* Pie Chart for Summary Length Distribution */}
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
            </div>
          </section>

          {/* Summarized Content Statistics */}
          <section>
            <h2>Summarized Content Metrics</h2>
            <div>
              <div>
                <p>Average Summarized Word Count:</p>
                <p>
                  {analyticsData.summarizedContentStats.avgWordCount.toFixed(2)}
                </p>
              </div>
              <div>
                <p>Average Summarized Sentence Count:</p>
                <p>
                  {analyticsData.summarizedContentStats.avgSentenceCount.toFixed(
                    2
                  )}
                </p>
              </div>
              <div>
                <p>Average Compression Ratio:</p>
                <p>
                  {(
                    analyticsData.summarizedContentStats.avgCompressionRatio *
                    100
                  ).toFixed(2)}
                  %
                </p>
              </div>
            </div>
          </section>

          {/* Feedback Analysis */}
          <section>
            <h2>User Feedback Distribution</h2>
            <div>
              {/* Pie Chart for User Feedback Distribution */}
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
          <section>
            <h2>Input Medium Distribution</h2>
            <div>
              {/* Pie Chart for Input Medium Distribution */}
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
