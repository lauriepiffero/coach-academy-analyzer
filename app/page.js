"use client";

import { useState, useRef, useCallback } from "react";

// ── Enhanced Markdown to HTML converter ──
function renderMarkdown(text) {
  if (!text) return "";
  let html = text;

  // Escape HTML first
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Headers with anchor-style classes
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');

  // Blockquotes (including multi-line)
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '<br/>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr/>');

  // ── COACH pathway detection ──
  // Pattern: **C** [durée] → **O** [durée] → **A** [durée] → **C** [durée] → **H** [durée]
  html = html.replace(
    /<strong>C<\/strong>\s*\[([^\]]*)\]\s*→\s*<strong>O<\/strong>\s*\[([^\]]*)\]\s*→\s*<strong>A<\/strong>\s*\[([^\]]*)\]\s*→\s*<strong>C<\/strong>\s*\[([^\]]*)\]\s*→\s*<strong>H<\/strong>\s*\[([^\]]*)\]/g,
    (match, cTime, oTime, aTime, c2Time, hTime) => {
      return `<div class="coach-pathway">
        <div class="coach-step coach-c"><span class="coach-letter">C</span><span class="coach-time">${cTime}</span></div>
        <div class="coach-arrow">→</div>
        <div class="coach-step coach-o"><span class="coach-letter">O</span><span class="coach-time">${oTime}</span></div>
        <div class="coach-arrow">→</div>
        <div class="coach-step coach-a"><span class="coach-letter">A</span><span class="coach-time">${aTime}</span></div>
        <div class="coach-arrow">→</div>
        <div class="coach-step coach-c2"><span class="coach-letter">C</span><span class="coach-time">${c2Time}</span></div>
        <div class="coach-arrow">→</div>
        <div class="coach-step coach-h"><span class="coach-letter">H</span><span class="coach-time">${hTime}</span></div>
      </div>`;
    }
  );

  // ── Score badge detection ──
  html = html.replace(
    /##\s*SCORE GLOBAL\s*:\s*(\d+)\/70/g,
    (match, score) => {
      const pct = Math.round((parseInt(score) / 70) * 100);
      let level = 'low';
      if (pct >= 70) level = 'high';
      else if (pct >= 45) level = 'mid';
      return `<div class="score-badge score-${level}">
        <div class="score-number">${score}<span class="score-total">/70</span></div>
        <div class="score-label">Score global</div>
      </div>`;
    }
  );

  // ── Note inline detection (X/5) ──
  html = html.replace(/(\d)\/5/g, '<span class="note-badge note-$1">$1/5</span>');

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
      return `<div class="table-wrapper"><table><thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
  );

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>');
  html = html.replace(/((?:<oli>.*<\/oli>\n?)+)/g, (match) => {
    return '<ol>' + match.replace(/<\/?oli>/g, (tag) => tag.replace('oli', 'li')) + '</ol>';
  });

  // Paragraphs
  html = html.replace(/^(?!<[a-z/])((?!<\/)[^\n]+)$/gm, (match, content) => {
    if (content.trim() === '') return '';
    return `<p>${content}</p>`;
  });

  // Clean up
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/\n{3,}/g, '\n\n');

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
  const resultsCardRef = useRef(null);

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

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

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

  const handlePDF = useCallback(() => {
    const content = resultsCardRef.current;
    if (!content) return;

    const title = coachName ? "Analyse de Coaching — " + coachName : "Analyse de Coaching";
    const styles = [
      "* { margin: 0; padding: 0; box-sizing: border-box; }",
      "body { font-family: 'DM Sans', sans-serif; color: #171A32; padding: 40px; line-height: 1.7; font-size: 11pt; }",
      "h1 { font-family: 'DM Serif Display', serif; font-size: 18pt; color: #171A32; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #FFF096; }",
      "h1:first-child { margin-top: 0; }",
      "h2 { font-family: 'DM Serif Display', serif; font-size: 14pt; color: #171A32; margin: 18px 0 8px; }",
      "h3 { font-size: 11pt; font-weight: 700; color: #2a2e4a; margin: 14px 0 5px; }",
      "p { margin: 5px 0; font-size: 10pt; }",
      "strong { color: #171A32; }",
      "em { color: #8b8fa3; }",
      "blockquote { border-left: 3px solid #FFF096; padding: 6px 12px; margin: 8px 0; background: #fffef5; border-radius: 0 6px 6px 0; font-style: italic; color: #2a2e4a; font-size: 10pt; }",
      "hr { border: none; border-top: 1px solid #e0e0e0; margin: 16px 0; }",
      "table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt; }",
      "thead th { background: #171A32; color: white; padding: 6px 8px; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; }",
      "tbody td { padding: 5px 8px; border-bottom: 1px solid #e8e8e8; }",
      "tbody tr:nth-child(even) { background: #f5f5f2; }",
      "ul, ol { padding-left: 18px; margin: 5px 0; }",
      "li { margin: 3px 0; font-size: 10pt; }",
      "code { background: #f0f0ec; padding: 1px 4px; border-radius: 3px; font-size: 9pt; }",
      ".score-badge { text-align: center; margin: 16px 0; padding: 16px; background: #171A32; border-radius: 12px; color: white; }",
      ".score-number { font-family: 'DM Serif Display', serif; font-size: 36pt; }",
      ".score-total { font-size: 18pt; opacity: 0.6; }",
      ".score-label { font-size: 9pt; text-transform: uppercase; letter-spacing: 2px; opacity: 0.7; margin-top: 2px; }",
      ".coach-pathway { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 16px 0; flex-wrap: wrap; }",
      ".coach-step { width: 80px; padding: 10px 4px; border-radius: 8px; text-align: center; }",
      ".coach-letter { display: block; font-family: 'DM Serif Display', serif; font-size: 18pt; font-weight: 700; }",
      ".coach-time { display: block; font-size: 8pt; margin-top: 2px; }",
      ".coach-c, .coach-c2 { background: #FFF096; color: #171A32; }",
      ".coach-o { background: #cfddeb; color: #171A32; }",
      ".coach-a { background: #d1b39b; color: #171A32; }",
      ".coach-h { background: #171A32; color: white; }",
      ".coach-arrow { font-size: 16pt; color: #8b8fa3; }",
      ".note-badge { font-weight: 700; padding: 1px 5px; border-radius: 4px; font-size: 9pt; }",
      ".note-1, .note-2 { background: #fecaca; color: #991b1b; }",
      ".note-3 { background: #FFF096; color: #171A32; }",
      ".note-4, .note-5 { background: #bbf7d0; color: #166534; }",
      ".footer-note { text-align: center; color: #8b8fa3; font-size: 8pt; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0; }",
      "@media print { body { padding: 20px; } @page { margin: 15mm; } }"
    ].join("\n");

    var htmlDoc = "<!DOCTYPE html><html lang=\"fr\"><head>";
    htmlDoc += "<meta charset=\"utf-8\"/>";
    htmlDoc += "<title>" + title + "</title>";
    htmlDoc += "<link href=\"https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700&family=DM+Serif+Display&display=swap\" rel=\"stylesheet\">";
    htmlDoc += "<style>" + styles + "</style>";
    htmlDoc += "</head><body>";
    htmlDoc += content.innerHTML;
    htmlDoc += "<div class=\"footer-note\">Coach Academy — Analyse générée par l'assistant IA</div>";
    htmlDoc += "</body></html>";

    var printWindow = window.open("", "_blank");
    printWindow.document.write(htmlDoc);
    printWindow.document.close();
    setTimeout(function() { printWindow.print(); }, 500);
  }, [coachName]);

  return (
    <>
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">CA</div>
          <div>
            <div className="header-title">Coach Academy</div>
            <div className="header-subtitle">Analyseur de séances</div>
          </div>
        </div>
      </header>

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

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <>
                <div className="spinner" />
                Analyse en cours... (1-2 min)
              </>
            ) : (
              "Analyser ma séance"
            )}
          </button>
        </form>

        {analysis && (
          <div className="results-section" ref={resultsRef}>
            <div className="results-header">
              <h2>Résultat de l'analyse</h2>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                {done && <span className="results-badge">Terminé</span>}
                {done && (
                  <button className="copy-btn" onClick={handleCopy}>
                    Copier
                  </button>
                )}
                {done && (
                  <button className="copy-btn pdf-btn" onClick={handlePDF}>
                    Télécharger PDF
                  </button>
                )}
              </div>
            </div>
            <div
              ref={resultsCardRef}
              className="results-card"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(analysis) }}
            />
          </div>
        )}
      </main>

      <footer className="footer">
        Coach Academy — Analyse générée par l'assistant IA.
        <br />
        Cette analyse est un premier feedback structuré, elle peut être vérifiée
        et complétée par une formatrice.
      </footer>
    </>
  );
}
