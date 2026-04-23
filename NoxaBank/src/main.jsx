
/*
Ce fichier est le point d’entrée principal de l’application React.
Il initialise React et affiche le composant App dans l’élément HTML
ayant l’identifiant "root". Le mode StrictMode est utilisé pour
aider à détecter les problèmes potentiels pendant le développement.
*/

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
