import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Linking,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  createScan,
  getScanStatus,
  getReport,
  Scan,
  Report,
  Issue,
} from "./src/api";

const CATEGORY_ICONS: Record<string, string> = {
  performance: "⚡",
  accessibility: "♿",
  seo: "🔍",
  security: "🔒",
  best_practices: "✅",
  ux: "🎨",
  responsiveness: "📱",
  code_quality: "💻",
  efficiency: "⚡",
  alignment: "🎯",
};

const CATEGORY_LABELS: Record<string, string> = {
  performance: "Performance",
  accessibility: "Accessibility",
  seo: "SEO",
  security: "Security",
  best_practices: "Best Practices",
  ux: "UI/UX Review",
  responsiveness: "Responsiveness",
  code_quality: "Code Quality",
  efficiency: "Efficiency",
  alignment: "Alignment",
};

export default function App() {
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scan, setScan] = useState<Scan | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [expandedIssueIndex, setExpandedIssueIndex] = useState<number | null>(null);

  // Poll scan status until completed/failed
  useEffect(() => {
    if (!scan || scan.status === "completed" || scan.status === "failed") return;

    let intervalId = setInterval(async () => {
      try {
        const updated = await getScanStatus(scan.id);
        setScan(updated);
        
        // Simulating progressive steps
        if (updated.status === "running") {
          setProgressStep((prev) => Math.min(prev + 1, 2));
        }

        if (updated.status === "completed") {
          clearInterval(intervalId);
          setProgressStep(3);
          const finalReport = await getReport(scan.id);
          setReport(finalReport);
          setLoading(false);
        } else if (updated.status === "failed") {
          clearInterval(intervalId);
          setError(updated.error_message || "Scan execution failed");
          setLoading(false);
        }
      } catch (err: any) {
        clearInterval(intervalId);
        setError(err.message || "Connection lost to API");
        setLoading(false);
      }
    }, 2500);

    return () => clearInterval(intervalId);
  }, [scan]);

  async function handleStartScan() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setScan(null);
    setReport(null);
    setProgressStep(1);
    setExpandedIssueIndex(null);
    setActiveCategoryFilter(null);

    try {
      const activeScan = await createScan(trimmed);
      setScan(activeScan);
    } catch (err: any) {
      setError(err.message || "Failed to start audit. Check backend URL.");
      setLoading(false);
    }
  }

  function handleReset() {
    setScan(null);
    setReport(null);
    setUrlInput("");
    setLoading(false);
    setError(null);
  }

  function getScoreColor(s: number) {
    if (s >= 90) return "#34d399";
    if (s >= 75) return "#84cc16";
    if (s >= 60) return "#f59e0b";
    if (s >= 40) return "#f97316";
    return "#f87171";
  }

  function getSeverityColor(sev: string) {
    if (sev === "critical") return "#f87171";
    if (sev === "medium") return "#f59e0b";
    return "#60a5fa";
  }

  // Count issue severities
  const issueCounts = report
    ? {
        critical: report.issues.filter((i) => i.severity === "critical").length,
        medium: report.issues.filter((i) => i.severity === "medium").length,
        minor: report.issues.filter((i) => i.severity === "minor").length,
      }
    : { critical: 0, medium: 0, minor: 0 };

  const filteredIssues = report
    ? report.issues.filter((i) => !activeCategoryFilter || i.category === activeCategoryFilter)
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#05050a" />
      
      {/* ── Landing Page (Initial input screen) ── */}
      {!scan && !report && (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Brand Header */}
          <View style={styles.headerLogoContainer}>
            <LinearGradient
              colors={["#a78bfa", "#3b82f6"]}
              style={styles.logoGradientBox}
            >
              <Text style={{ fontSize: 24 }}>⚖️</Text>
            </LinearGradient>
            <Text style={styles.logoText}>SiteJudge AI</Text>
          </View>

          {/* Hero */}
          <View style={styles.heroContainer}>
            <Text style={styles.heroTitle}>
              Is your website{"\n"}
              <Text style={styles.violetText}>production ready?</Text>
            </Text>
            <Text style={styles.heroSub}>
              SiteJudge AI is a 100% free and open-source production auditor. Analyze deployed URL audits or code repository health with Groq LLM reasoning.
            </Text>
          </View>

          {/* Input Box */}
          <View style={styles.inputCard}>
            <TextInput
              style={styles.textInput}
              placeholder="https://yourwebsite.com or GitHub repo"
              placeholderTextColor="#64748b"
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            
            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.auditButton, !urlInput.trim() && styles.disabledButton]}
              onPress={handleStartScan}
              disabled={!urlInput.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.auditBtnText}>⚡ Audit site</Text>
              )}
            </TouchableOpacity>
            
            <Text style={styles.freeBadge}>
              Free · Open Source · Results in ~60 seconds
            </Text>
          </View>

          {/* Developer Section */}
          <View style={styles.devSectionHeader}>
            <Text style={styles.devSectionTitle}>Meet the Developer</Text>
          </View>

          <View style={styles.devCard}>
            <View style={styles.devMetaRow}>
              <Image
                source={{ uri: "https://github.com/abhisheksinghcodebase.png" }}
                style={styles.devAvatar}
              />
              <View>
                <Text style={styles.devName}>Abhishek Kumar</Text>
                <Text style={styles.devSub}>B.Tech CSE (AI) Student</Text>
              </View>
            </View>
            
            <Text style={styles.devBio}>
              I am Abhishek Kumar, currently pursuing my B.Tech in CSE(AI) branch. I have a high interest in building open-source projects, contributing to public repositories, and developing full-stack AI-driven web systems.
            </Text>

            <View style={styles.devActionRow}>
              <TouchableOpacity
                style={styles.devButtonPrimary}
                onPress={() => Linking.openURL("https://github.com/abhisheksinghcodebase/Site-judge-AI")}
              >
                <Text style={styles.devButtonText}>⭐ Star on GitHub</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButtonGhost}
                onPress={() => Linking.openURL("https://linkedin.com/in/abhisheksinghcode")}
              >
                <Text style={styles.devButtonTextGhost}>💼 LinkedIn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Scanning Loader (Progress Screen) ── */}
      {scan && !report && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#a78bfa" style={{ marginBottom: 24 }} />
          <Text style={styles.loadingTitle}>Auditing Website...</Text>
          
          <View style={styles.progressTimeline}>
            {[
              "Triggering collectors & screenshots",
              "Running Lighthouse, Axe & SEO crawlers",
              "Executing LLaMA 3.3 code synthesis",
            ].map((step, idx) => {
              const isActive = progressStep >= idx + 1;
              return (
                <View key={step} style={styles.timelineRow}>
                  <View style={[styles.timelineDot, isActive && styles.activeDot]} />
                  <Text style={[styles.timelineText, isActive && styles.activeTimelineText]}>
                    {step}
                  </Text>
                </View>
              );
            })}
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{error}</Text>
              <TouchableOpacity style={styles.backButton} onPress={handleReset}>
                <Text style={styles.backButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Report Dashboard (Results screen) ── */}
      {report && (
        <View style={{ flex: 1 }}>
          {/* Header Navbar */}
          <View style={styles.reportNavbar}>
            <TouchableOpacity style={styles.navResetBtn} onPress={handleReset}>
              <Text style={styles.resetArrow}>←</Text>
              <Text style={styles.resetLabel}>New Audit</Text>
            </TouchableOpacity>
            <Text style={styles.navTitle} numberOfLines={1}>
              {scan?.url.replace("https://", "").replace("http://", "")}
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.reportScrollContainer}>
            {/* Top Score Indicator */}
            <View style={styles.scoreDialContainer}>
              <View style={[styles.scoreDialRing, { borderColor: getScoreColor(report.overall_score) }]}>
                <Text style={styles.scoreTextVal}>{report.overall_score}</Text>
                <Text style={styles.scoreTextLimit}>/100</Text>
              </View>
              <Text style={styles.overallScoreLabel}>Overall Readiness Rating</Text>
              
              {report.executive_summary && (
                <Text style={styles.execSummaryText}>{report.executive_summary}</Text>
              )}
            </View>

            {/* Severity Pill Counts */}
            <View style={styles.severityGrid}>
              <View style={[styles.severityBadge, { backgroundColor: "rgba(248,113,113,0.12)", borderColor: "rgba(248,113,113,0.25)" }]}>
                <Text style={[styles.severityCountText, { color: "#f87171" }]}>{issueCounts.critical} Critical</Text>
              </View>
              <View style={[styles.severityBadge, { backgroundColor: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.25)" }]}>
                <Text style={[styles.severityCountText, { color: "#f59e0b" }]}>{issueCounts.medium} Medium</Text>
              </View>
              <View style={[styles.severityBadge, { backgroundColor: "rgba(96,165,250,0.12)", borderColor: "rgba(96,165,250,0.25)" }]}>
                <Text style={[styles.severityCountText, { color: "#60a5fa" }]}>{issueCounts.minor} Minor</Text>
              </View>
            </View>

            {/* Scores List Grid */}
            <Text style={styles.sectionHeaderLabel}>Category Performance</Text>
            <View style={styles.categoryScoresGrid}>
              {Object.keys(report.scores)
                .filter((key) => report.scores[key as keyof CategoryScores] !== null)
                .map((key) => {
                  const scoreVal = report.scores[key as keyof CategoryScores] || 0;
                  const scoreColor = getScoreColor(scoreVal);
                  const isSelected = activeCategoryFilter === key;

                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.scoreCardItem, isSelected && styles.selectedScoreCard]}
                      onPress={() => setActiveCategoryFilter(isSelected ? null : key)}
                    >
                      <View style={styles.scoreCardTitleRow}>
                        <Text style={styles.scoreCardIcon}>{CATEGORY_ICONS[key] || "⚖️"}</Text>
                        <Text style={[styles.scoreCardValue, { color: scoreColor }]}>{scoreVal}</Text>
                      </View>
                      <Text style={styles.scoreCardLabel}>{CATEGORY_LABELS[key] || key}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>

            {/* Issues List Header */}
            <View style={styles.issuesHeaderContainer}>
              <Text style={styles.sectionHeaderLabel}>
                Audited Issues ({filteredIssues.length})
              </Text>
              {activeCategoryFilter && (
                <TouchableOpacity onPress={() => setActiveCategoryFilter(null)}>
                  <Text style={styles.clearFilterLink}>Clear Filter</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Issues List */}
            {filteredIssues.length === 0 ? (
              <View style={styles.emptyIssuesBox}>
                <Text style={styles.emptyIssuesText}>🎉 No issues found for this category!</Text>
              </View>
            ) : (
              filteredIssues.map((issue, idx) => {
                const isExpanded = expandedIssueIndex === idx;
                const severityColor = getSeverityColor(issue.severity);

                return (
                  <View key={idx} style={styles.issueCardItem}>
                    <TouchableOpacity
                      style={styles.issueCardHeaderButton}
                      onPress={() => setExpandedIssueIndex(isExpanded ? null : idx)}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <View style={{ display: "flex", flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                          <View style={[styles.issueBadgeDot, { backgroundColor: severityColor }]} />
                          <Text style={[styles.issueBadgeText, { color: severityColor }]}>
                            {issue.severity.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.issueCardTitle}>{issue.title}</Text>
                      </View>
                      <Text style={styles.expandChevron}>{isExpanded ? "▲" : "▼"}</Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.issueCardDetailBlock}>
                        <Text style={styles.issueHeading}>Description</Text>
                        <Text style={styles.issueTextContent}>{issue.description}</Text>

                        {issue.impact && (
                          <>
                            <Text style={styles.issueHeading}>Impact</Text>
                            <Text style={styles.issueTextContent}>{issue.impact}</Text>
                          </>
                        )}

                        {issue.fix_suggestion && (
                          <>
                            <Text style={styles.issueHeading}>Fix Suggestion</Text>
                            <Text style={styles.issueTextContent}>{issue.fix_suggestion}</Text>
                          </>
                        )}

                        {issue.code_example && (
                          <>
                            <Text style={styles.issueHeading}>Recommended Fix Code</Text>
                            <View style={styles.codeSnippetBlock}>
                              <Text style={styles.codeSnippetText}>{issue.code_example}</Text>
                            </View>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05050a",
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 64,
  },
  headerLogoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    marginBottom: 48,
  },
  logoGradientBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "System",
    fontWeight: "900",
    fontSize: 20,
    color: "#f8fafc",
  },
  heroContainer: {
    marginBottom: 36,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
    lineHeight: 38,
    marginBottom: 16,
  },
  violetText: {
    color: "#a78bfa",
  },
  heroSub: {
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 22,
  },
  inputCard: {
    background: "#0d0d1e",
    backgroundColor: "#0d0d1e",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    color: "#ffffff",
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 16,
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
    marginBottom: 14,
  },
  auditButton: {
    height: 52,
    backgroundColor: "#8b5cf6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  disabledButton: {
    backgroundColor: "rgba(139,92,246,0.4)",
  },
  auditBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  freeBadge: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 12,
  },
  devSectionHeader: {
    marginBottom: 16,
  },
  devSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f8fafc",
  },
  devCard: {
    backgroundColor: "#0d0d1e",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  devMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  devAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "#a78bfa",
  },
  devName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },
  devSub: {
    fontSize: 12,
    color: "#64748b",
  },
  devBio: {
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 22,
    marginBottom: 20,
  },
  devActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  devButtonPrimary: {
    flex: 1,
    height: 40,
    backgroundColor: "#8b5cf6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  devButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
  devButtonGhost: {
    flex: 1,
    height: 40,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  devButtonTextGhost: {
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: 13,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 36,
  },
  progressTimeline: {
    width: "100%",
    gap: 16,
    marginBottom: 32,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  activeDot: {
    backgroundColor: "#34d399",
  },
  timelineText: {
    color: "#64748b",
    fontSize: 14,
  },
  activeTimelineText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  errorBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(248,113,113,0.1)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.2)",
    alignItems: "center",
    width: "100%",
  },
  errorBoxText: {
    color: "#f87171",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  reportNavbar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#05050a",
  },
  navResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 16,
  },
  resetArrow: {
    fontSize: 18,
    color: "#94a3b8",
  },
  resetLabel: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "600",
  },
  navTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "right",
  },
  reportScrollContainer: {
    padding: 20,
    paddingBottom: 80,
  },
  scoreDialContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  scoreDialRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.015)",
  },
  scoreTextVal: {
    fontSize: 36,
    fontWeight: "900",
    color: "#ffffff",
  },
  scoreTextLimit: {
    fontSize: 12,
    color: "#64748b",
  },
  overallScoreLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: 12,
  },
  execSummaryText: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  severityGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginVertical: 18,
  },
  severityBadge: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  severityCountText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sectionHeaderLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 24,
    marginBottom: 14,
  },
  categoryScoresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  scoreCardItem: {
    width: "48%",
    aspectRatio: 1.6,
    backgroundColor: "#0d0d1e",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 12,
    justifyContent: "space-between",
  },
  selectedScoreCard: {
    borderColor: "#8b5cf6",
    backgroundColor: "rgba(139,92,246,0.05)",
  },
  scoreCardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreCardIcon: {
    fontSize: 16,
  },
  scoreCardValue: {
    fontSize: 18,
    fontWeight: "850",
  },
  scoreCardLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
  issuesHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  clearFilterLink: {
    color: "#a78bfa",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyIssuesBox: {
    padding: 32,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  emptyIssuesText: {
    color: "#34d399",
    fontSize: 14,
    fontWeight: "650",
  },
  issueCardItem: {
    backgroundColor: "#0d0d1e",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  issueCardHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  issueBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  issueBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  issueCardTitle: {
    fontSize: 14,
    fontWeight: "750",
    color: "#ffffff",
    lineHeight: 18,
  },
  expandChevron: {
    fontSize: 12,
    color: "#64748b",
  },
  issueCardDetailBlock: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.04)",
  },
  issueHeading: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#64748b",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 4,
  },
  issueTextContent: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 18,
  },
  codeSnippetBlock: {
    backgroundColor: "#000000",
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  codeSnippetText: {
    fontFamily: "System",
    color: "#34d399",
    fontSize: 11.5,
    lineHeight: 16,
  },
});
