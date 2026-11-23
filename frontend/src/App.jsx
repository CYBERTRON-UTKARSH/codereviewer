import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const LANGUAGES = [
  { id: "python", label: "PYTHON" },
  { id: "java", label: "JAVA" },
  { id: "javascript", label: "JAVASCRIPT" },
  { id: "cpp", label: "C++" },
  { id: "go", label: "GO" },
];

export default function App() {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [report, setReport] = useState(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCode(String(ev.target?.result || ""));
      setReport(null);
      setShowSuggestion(false);
      setErrorMsg("");
    };
    reader.readAsText(file);
  };

  const handleReview = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setErrorMsg("");
    setShowSuggestion(false);

    try {
      const res = await fetch(`${API_URL}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP_${res.status}: Audit request failed`);
      }

      const data = await res.json();
      setReport(data);
    } catch (err) {
      setErrorMsg(err.message || "Connection terminated");
    } finally {
      setLoading(false);
    }
  };

  const lineCount = Math.max(1, code.split("\n").length);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Top Terminal Header */}
        <header style={styles.header}>
          <div>
            <div style={styles.promptTag}>TEST YOUR CODE</div>
            <h1 style={styles.title}>[ RAG // CODE REVIEW TERMINAL ]</h1>
          </div>
          <div style={styles.statusPill}>
            <span style={styles.dot} />
            {loading ? "SCANNING..." : "ONLINE"}
          </div>
        </header>

        {/* Controls Bar */}
        <section style={styles.toolbar}>
          <div style={styles.controlGroup}>
            <label style={styles.label} htmlFor="lang-select">
              TARGET_LANG:
            </label>
            <select
              id="lang-select"
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                setReport(null);
              }}
              style={styles.select}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id} style={styles.option}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.uploadBtn}>
              [ UPLOAD_SOURCE ]
              <input
                type="file"
                accept=".py,.java,.js,.cpp,.cc,.cxx,.go,.txt"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>

            <button
              type="button"
              onClick={handleReview}
              disabled={loading || !code.trim()}
              style={{
                ...styles.runBtn,
                opacity: loading || !code.trim() ? 0.5 : 1,
                cursor: loading || !code.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "[ EXECUTING RAG AUDIT... ]" : "[ RUN_AUDIT ]"}
            </button>
          </div>
        </section>

        {/* Source Code Editor with Green Line Numbers */}
        <section style={styles.editorBox}>
          <div style={styles.editorTopBar}>
            <span>BUFFER // {language.toUpperCase()}</span>
            <span>LINES: {lineCount} | BYTES: {new Blob([code]).size}</span>
          </div>
          <div style={styles.editorBody}>
            <div aria-hidden="true" style={styles.gutter}>
              {Array.from({ length: lineCount }, (_, idx) => (
                <div key={idx} style={styles.lineNum}>
                  {String(idx + 1).padStart(3, "0")}
                </div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`// Paste or upload ${language.toUpperCase()} source payload here...`}
              spellCheck={false}
              style={styles.textarea}
            />
          </div>
        </section>

        {/* Error Banner */}
        {errorMsg && (
          <div style={styles.alertError}>
            <strong>[!] RUNTIME_FAULT:</strong> {errorMsg}
          </div>
        )}

        {/* Audit Output */}
        {report && (
          <section style={styles.reportBox}>
            <div style={styles.reportHeader}>
              <div>
                <div style={styles.smallLabel}>OVERALL_INTEGRITY_INDEX</div>
                <div style={styles.bigGreenNum}>{report.overall_percent}%</div>
              </div>

              <div style={styles.verdictBadge}>
                {report.has_errors ? "[ ERRORS_DETECTED ]" : "[ SYNTAX_&_LOGIC_CLEAN ]"}
              </div>
            </div>

            {/* Aspect Percentages in Hacker Green */}
            <div style={styles.aspectsGrid}>
              {Object.entries(report.aspects || {}).map(([aspect, pct]) => {
                const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
                return (
                  <div key={aspect} style={styles.aspectCard}>
                    <div style={styles.aspectTop}>
                      <span style={styles.aspectName}>{aspect.toUpperCase()}</span>
                      <span style={styles.aspectPct}>{clamped}%</span>
                    </div>
                    <div style={styles.barTrack}>
                      <div style={{ ...styles.barFill, width: `${clamped}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Errors */}
            {report.has_errors && report.errors?.length > 0 && (
              <div style={styles.block}>
                <h3 style={styles.blockTitle}>[!] DETECTED_ERRORS</h3>
                <ul style={styles.list}>
                  {report.errors.map((err, idx) => (
                    <li key={idx} style={styles.listItem}>
                      &gt; {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Security Issues */}
            <div style={styles.block}>
              <h3 style={styles.blockTitle}>
                [SEC] SECURITY_VULNERABILITIES ({report.security_issues?.length || 0})
              </h3>
              {report.security_issues?.length > 0 ? (
                <ul style={styles.list}>
                  {report.security_issues.map((item, idx) => (
                    <li key={idx} style={styles.listItem}>
                      &gt; {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={styles.mutedGreen}>&gt; No critical vector anomalies flagged by retrieved rules.</div>
              )}
            </div>

            {/* Suggest Better Code Trigger */}
            <div style={styles.suggestBar}>
              <button
                type="button"
                onClick={() => setShowSuggestion((prev) => !prev)}
                style={styles.suggestBtn}
              >
                {showSuggestion ? "[ HIDE_OPTIMIZED_PAYLOAD ]" : "[ SUGGEST_BETTER_CODE ]"}
              </button>
            </div>

            {showSuggestion && (
              <div style={styles.suggestionPanel}>
                <div style={styles.editorTopBar}>
                  <span>OPTIMIZED_REWRITE // SHORTER &amp; HARDENED</span>
                  <span>STATUS: READY</span>
                </div>
                <pre style={styles.codeBlock}>
                  <code>{report.suggested_code}</code>
                </pre>

                {report.improvement_notes?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={styles.smallLabel}>REFACTOR_DELTA_NOTES:</div>
                    <ul style={styles.list}>
                      {report.improvement_notes.map((note, idx) => (
                        <li key={idx} style={styles.listItem}>
                          + {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

const GREEN = "#00ff66";
const GREEN_BRIGHT = "#39ff14";
const GREEN_DIM = "rgba(0, 255, 102, 0.22)";
const BG_BLACK = "#030704";
const BG_PANEL = "#07100a";
const BG_DEEP = "#040906";

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: BG_BLACK,
    color: GREEN,
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Consolas, monospace',
    padding: "24px 16px",
    boxSizing: "border-box",
  },
  container: {
    maxWidth: "1080px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    border: `1px solid ${GREEN}`,
    backgroundColor: BG_PANEL,
    padding: "16px 20px",
    marginBottom: "16px",
    boxShadow: `0 0 18px ${GREEN_DIM}`,
  },
  promptTag: {
    fontSize: "12px",
    color: "#6ee79c",
    marginBottom: "4px",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    letterSpacing: "1.5px",
    color: GREEN_BRIGHT,
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: `1px solid ${GREEN}`,
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 700,
    backgroundColor: BG_DEEP,
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: GREEN_BRIGHT,
    boxShadow: `0 0 8px ${GREEN_BRIGHT}`,
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    border: `1px solid ${GREEN}`,
    backgroundColor: BG_PANEL,
    padding: "12px 16px",
    marginBottom: "16px",
  },
  controlGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  label: {
    fontSize: "12px",
    fontWeight: 700,
  },
  select: {
    backgroundColor: BG_DEEP,
    color: GREEN_BRIGHT,
    border: `1px solid ${GREEN}`,
    padding: "8px 12px",
    fontFamily: "inherit",
    fontSize: "13px",
    fontWeight: 700,
    outline: "none",
    cursor: "pointer",
  },
  option: {
    backgroundColor: BG_BLACK,
    color: GREEN,
  },
  uploadBtn: {
    border: `1px solid ${GREEN}`,
    backgroundColor: BG_DEEP,
    color: GREEN,
    padding: "8px 14px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  runBtn: {
    border: `1px solid ${GREEN_BRIGHT}`,
    backgroundColor: GREEN,
    color: BG_BLACK,
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 800,
    fontFamily: "inherit",
    letterSpacing: "0.8px",
  },
  editorBox: {
    border: `1px solid ${GREEN}`,
    backgroundColor: BG_DEEP,
    marginBottom: "16px",
  },
  editorTopBar: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    padding: "8px 12px",
    borderBottom: `1px solid ${GREEN_DIM}`,
    backgroundColor: BG_PANEL,
    color: "#7ef9ad",
  },
  editorBody: {
    display: "flex",
    minHeight: "280px",
  },
  gutter: {
    userSelect: "none",
    padding: "12px 10px",
    borderRight: `1px solid ${GREEN_DIM}`,
    backgroundColor: "#030704",
    textAlign: "right",
    fontSize: "13px",
    lineHeight: "1.55",
    color: "#2ea85c",
  },
  lineNum: {
    height: "20.15px",
  },
  textarea: {
    flex: 1,
    backgroundColor: "transparent",
    color: GREEN_BRIGHT,
    border: "none",
    outline: "none",
    padding: "12px 14px",
    fontFamily: "inherit",
    fontSize: "13px",
    lineHeight: "1.55",
    resize: "vertical",
    minHeight: "280px",
  },
  alertError: {
    border: `1px solid ${GREEN_BRIGHT}`,
    backgroundColor: "#09180e",
    color: GREEN_BRIGHT,
    padding: "12px 16px",
    marginBottom: "16px",
    fontSize: "13px",
  },
  reportBox: {
    border: `1px solid ${GREEN}`,
    backgroundColor: BG_PANEL,
    padding: "20px",
    boxShadow: `0 0 20px ${GREEN_DIM}`,
  },
  reportHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    paddingBottom: "16px",
    marginBottom: "18px",
    borderBottom: `1px solid ${GREEN_DIM}`,
  },
  smallLabel: {
    fontSize: "11px",
    letterSpacing: "1px",
    color: "#6ee79c",
    marginBottom: "4px",
  },
  bigGreenNum: {
    fontSize: "34px",
    fontWeight: 800,
    color: GREEN_BRIGHT,
    textShadow: `0 0 12px ${GREEN}`,
  },
  verdictBadge: {
    border: `1px solid ${GREEN}`,
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: 700,
    backgroundColor: BG_DEEP,
  },
  aspectsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  aspectCard: {
    border: `1px solid ${GREEN_DIM}`,
    backgroundColor: BG_DEEP,
    padding: "12px",
  },
  aspectTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "8px",
  },
  aspectName: {
    fontSize: "12px",
    fontWeight: 700,
  },
  aspectPct: {
    fontSize: "20px",
    fontWeight: 800,
    color: GREEN_BRIGHT,
  },
  barTrack: {
    width: "100%",
    height: "6px",
    backgroundColor: "#0b1f12",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: GREEN_BRIGHT,
    boxShadow: `0 0 8px ${GREEN}`,
    transition: "width 0.3s ease",
  },
  block: {
    marginBottom: "18px",
  },
  blockTitle: {
    margin: "0 0 8px 0",
    fontSize: "13px",
    letterSpacing: "0.8px",
    color: GREEN_BRIGHT,
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  listItem: {
    fontSize: "13px",
    lineHeight: 1.6,
    marginBottom: "6px",
    color: GREEN,
  },
  mutedGreen: {
    fontSize: "13px",
    color: "#6ee79c",
  },
  suggestBar: {
    marginTop: "8px",
  },
  suggestBtn: {
    border: `1px solid ${GREEN_BRIGHT}`,
    backgroundColor: BG_DEEP,
    color: GREEN_BRIGHT,
    padding: "10px 16px",
    fontFamily: "inherit",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.8px",
    cursor: "pointer",
  },
  suggestionPanel: {
    marginTop: "14px",
    border: `1px solid ${GREEN}`,
    backgroundColor: BG_DEEP,
  },
  codeBlock: {
    margin: 0,
    padding: "14px",
    overflowX: "auto",
    fontSize: "13px",
    lineHeight: 1.55,
    color: GREEN_BRIGHT,
    fontFamily: "inherit",
  },
};