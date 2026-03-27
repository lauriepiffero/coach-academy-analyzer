"use client";

import { useState, useRef } from "react";

// Simple markdown to HTML converter (covers what we need for coaching analysis)
function renderMarkdown(text) {
  if (!text) return "";
  let html = text;

  // Escape HTML
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr/>');

  // Tables
  html = html.replace(
    /^\|(.+)\|\s*\n\|[-| :]+\|\s*\n((?:\|.+\|\s*\n?)*)/gm,
    (match, headerRow, bodyRows) => {
      const headers = headerRow.split("|").map(h => h.trim()).filter(Boolean);
      const thCells = headers.map(h => `<th>${h}</th>`).join("");
      const rows = bodyRows.trim().split("\n").map(row => {
        const cells = row.split("|").map(c => c.trim()).filter(Boolean);
        return `<tr>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`;
      }).join("");
      return `<table><thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>`;
    }
  );

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs (lines that aren't already wrapped in tags)
  html = html.replace(/^(?!<[a-z])((?!<\/)[^\n]+)$/gm, (match, content) => {
    if (content.trim() === '') return '';
    return `<p>${content}</p>`;
  });

  // Clean up empty paragraphs and double breaks
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/\n{2,}/g, '\n');

  return html;
}

export default function Home() {
  const [coachName, setCoachName] = useState("");
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const resultsRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setAnalysis("");
    setDone(false);

    if (!transcript.trim() || transcript.trim().length < 100) {
      setError("La transcription est trop courte. Colle le texte complet de la séance.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachName: coachName.trim(),
          transcript: transcript.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de l'analyse.");
        setLoading(false);
        return;
      }

      // Read the stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              setDone(true);
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setError(parsed.error);
              } else if (parsed.text) {
                fullText += parsed.text;
                setAnalysis(fullText);
              }
            } catch {}
          }
        }
      }

      setDone(true);
    } catch (err) {
      setError("Erreur de connexion. Vérifie ta connexion internet et réessaie.");
    }

    setLoading(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(analysis);
  }

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">CA</div>
          <div>
            <div className="header-title">Coach Academy</div>
            <div className="header-subtitle">Analyseur de séances</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container">
        <div className="page-intro">
          <h1>Analyse ta séance de coaching</h1>
          <p>
            Colle la transcription de ta séance ci-dessous. L'IA l'analysera
            selon la grille des 14 critères de la méthode COACH et te donnera
            un feedback détaillé.
          </p>
        </div>

        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="coachName">Nom du coach (optionnel)</label>
              <input
                id="coachName"
                type="text"
                placeholder="Ex : Marie"
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
              />
            </div>
          </div>

          <div className="transcript-area">
            <label htmlFor="transcript">Transcription de la séance</label>
            <textarea
              id="transcript"
              placeholder="Colle ici la transcription complète de ta séance de coaching..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            <div className="char-count">
              {transcript.length.toLocaleString("fr-FR")} caractères
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" />
                Analyse en cours...
              </>
            ) : (
              "Analyser ma séance"
            )}
          </button>
        </form>

        {/* Results */}
        {analysis && (
          <div className="results-section" ref={resultsRef}>
            <div className="results-header">
              <h2>Résultat de l'analyse</h2>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {done && <span className="results-badge">Terminé</span>}
                {done && (
                  <button className="copy-btn" onClick={handleCopy}>
                    Copier le texte
                  </button>
                )}
              </div>
            </div>
            <div
              className="results-card"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis) }}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        Coach Academy — Analyse générée par l'assistant IA.
        <br />
        Cette analyse est un premier feedback structuré, elle peut être vérifiée
        et complétée par une formatrice.
      </footer>
    </>
  );
}
