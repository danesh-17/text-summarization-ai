import { useState } from "react";
import {
  FileText,
  Upload,
  Sparkles,
  Clock3,
  BarChart3,
  Copy,
  Check,
  ArrowRight,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000/api/summarize";

type Result = {
  summary: string;
  original_word_count: number;
  summary_word_count: number;
  compression_percentage: number;
  latency_ms: number;
  model: string;
  key_points?: string[];
};

function App() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [instruction, setInstruction] = useState(
    "Summarize the key ideas clearly and concisely."
  );
  const [summaryLength, setSummaryLength] = useState("Medium");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (selectedFile: File | undefined) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
  };

  const handleSummarize = async () => {
    if (!text.trim() && !file) {
      setError("Upload a document or paste text before generating a summary.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      if (file) {
        formData.append("file", file);
      }

      if (text.trim()) {
        formData.append("text", text);
      }

      formData.append("instruction", instruction);
      formData.append("summary_length", summaryLength);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "The summarization request failed.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the summarization service."
      );
    } finally {
      setLoading(false);
    }
  };

  const copySummary = async () => {
    if (!result?.summary) return;

    await navigator.clipboard.writeText(result.summary);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1800);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={18} />
          </div>

          <div>
            <div className="brand-name">Text Summarization AI</div>
            <div className="brand-subtitle">NLP · Transformers · GenAI</div>
          </div>
        </div>

        <div className="status-pill">
          <span className="status-dot" />
          AI ENGINE ONLINE
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow">
            <Sparkles size={15} />
            INTELLIGENT DOCUMENT SUMMARIZATION
          </div>

          <h1>
            Turn long documents into
            <span> concise insights.</span>
          </h1>

          <p>
            Upload a document or paste text. The application analyzes the
            content and generates a focused summary with measurable output
            metrics.
          </p>
        </section>

        <section className="workspace">
          <div className="panel input-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">01 · INPUT</div>
                <h2>Provide your content</h2>
              </div>

              <FileText size={21} />
            </div>

            <label className="upload-zone">
              <input
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />

              <div className="upload-icon">
                <Upload size={22} />
              </div>

              <strong>
                {file ? file.name : "Drop a document or browse"}
              </strong>

              <span>
                Supports TXT, PDF and DOCX
              </span>
            </label>

            <div className="divider">
              <span>OR</span>
            </div>

            <label className="field-label">Paste text</label>

            <textarea
              className="text-input"
              placeholder="Paste an article, report, research note, meeting transcript, or any other text..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <div className="controls">
              <div className="control-group">
                <label className="field-label">Summary length</label>

                <select
                  value={summaryLength}
                  onChange={(e) => setSummaryLength(e.target.value)}
                >
                  <option>Short</option>
                  <option>Medium</option>
                  <option>Long</option>
                </select>
              </div>

              <div className="control-group instruction-control">
                <label className="field-label">Instruction</label>

                <input
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                />
              </div>
            </div>

            <button
              className="primary-button"
              onClick={handleSummarize}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Generating summary...
                </>
              ) : (
                <>
                  Generate Summary
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {error && <div className="error-box">{error}</div>}
          </div>

          <div className="panel output-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">02 · OUTPUT</div>
                <h2>Generated summary</h2>
              </div>

              {result && (
                <button
                  className="copy-button"
                  onClick={copySummary}
                  title="Copy summary"
                >
                  {copied ? <Check size={17} /> : <Copy size={17} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>

            {!result && !loading && (
              <div className="empty-state">
                <div className="empty-icon">
                  <Sparkles size={26} />
                </div>

                <h3>Your summary will appear here</h3>

                <p>
                  Add content on the left and generate a summary to see the
                  model output, key points, and performance metrics.
                </p>
              </div>
            )}

            {loading && (
              <div className="loading-state">
                <div className="loading-orbit">
                  <Sparkles size={24} />
                </div>

                <h3>Analyzing your content...</h3>

                <p>
                  Extracting context and generating a concise representation.
                </p>
              </div>
            )}

            {result && (
              <>
                <div className="summary-card">
                  <div className="summary-label">AI SUMMARY</div>

                  <p>{result.summary}</p>
                </div>

                {result.key_points && result.key_points.length > 0 && (
                  <div className="key-points">
                    <div className="summary-label">KEY TAKEAWAYS</div>

                    <ul>
                      {result.key_points.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="metrics-grid">
                  <div className="metric-card">
                    <span>Original</span>
                    <strong>
                      {result.original_word_count.toLocaleString()}
                    </strong>
                    <small>words</small>
                  </div>

                  <div className="metric-card">
                    <span>Summary</span>
                    <strong>
                      {result.summary_word_count.toLocaleString()}
                    </strong>
                    <small>words</small>
                  </div>

                  <div className="metric-card">
                    <span>Compression</span>
                    <strong>
                      {result.compression_percentage.toFixed(1)}%
                    </strong>
                    <small>reduction</small>
                  </div>

                  <div className="metric-card">
                    <span>Latency</span>
                    <strong>
                      {result.latency_ms.toFixed(0)}
                    </strong>
                    <small>ms</small>
                  </div>
                </div>

                <div className="model-footer">
                  <div>
                    <span className="model-label">MODEL</span>
                    <strong>{result.model}</strong>
                  </div>

                  <div className="confidence">
                    <BarChart3 size={16} />
                    Deterministic metrics
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="architecture">
          <div className="architecture-heading">
            <div className="panel-kicker">SYSTEM DESIGN</div>
            <h2>Built as an end-to-end AI application.</h2>
          </div>

          <div className="architecture-grid">
            <div className="architecture-card">
              <span>01</span>
              <h3>Document Processing</h3>
              <p>
                Extracts and normalizes text from uploaded documents before
                sending it through the summarization pipeline.
              </p>
            </div>

            <div className="architecture-card">
              <span>02</span>
              <h3>NLP Summarization</h3>
              <p>
                Uses transformer-based language modeling to identify and
                compress the most important information.
              </p>
            </div>

            <div className="architecture-card">
              <span>03</span>
              <h3>Evaluation Layer</h3>
              <p>
                Reports word reduction, compression, latency, and generated
                output so results are measurable.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <span>Text Summarization AI</span>
        <span>Built with React · TypeScript · Python · FastAPI</span>
      </footer>
    </div>
  );
}

export default App;
