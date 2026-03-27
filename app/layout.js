import "./globals.css";

export const metadata = {
  title: "Coach Academy — Analyseur de séances",
  description: "Analyse automatique de tes séances de coaching selon la méthode COACH",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
