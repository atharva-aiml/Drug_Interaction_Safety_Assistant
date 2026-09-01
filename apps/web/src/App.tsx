import { useState } from "react";
import type { AuthResponse } from "@disa/shared-types";
import { AuthForm } from "./components/AuthForm";
import { ChatPage } from "./components/ChatPage";
import { IconCheck } from "./components/icons";

const TOKEN_KEY = "disa_token";
const ROLE_KEY = "disa_role";
const USERNAME_KEY = "disa_username";

const AUTH_FEATURES = [
  "Interaction, allergy and contraindication checks in one conversation",
  "Every clinical answer is grounded, and marked when it isn't",
  "Emergency symptoms are caught by a fixed rule, never guessed by the model",
];

/**
 * Build Plan V2.0.6 — the multi-screen CRUD flow (Patients, Drugs, History,
 * Deleted, Bulk Import) is removed: per
 * `docs/v2-conversational-assistant/03-ux-product-design.md`, "There is
 * exactly one top-level entry point now: SCR-010 (Chat Page)". Their backend
 * routes stay mounted (harmless, authenticated, no screen calls them — see
 * `05-system-architecture.md` §4) in case anything needs them directly; only
 * the UI's reachability changes here.
 */
export function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [role, setRole] = useState<AuthResponse["role"] | null>(
    () => localStorage.getItem(ROLE_KEY) as AuthResponse["role"] | null
  );
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem(USERNAME_KEY));

  function handleAuthenticated(newToken: string, newRole: AuthResponse["role"], newUsername: string) {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(ROLE_KEY, newRole);
    localStorage.setItem(USERNAME_KEY, newUsername);
    setToken(newToken);
    setRole(newRole);
    setUsername(newUsername);
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USERNAME_KEY);
    setToken(null);
    setRole(null);
    setUsername(null);
  }

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-panel-brand">
          <div className="auth-brand">
            <div className="app-brand-mark">DI</div>
            <span style={{ fontWeight: 600, fontSize: "var(--font-size-sm)", lineHeight: 1.3 }}>
              Drug Interaction<br />Safety Assistant
            </span>
          </div>

          <div>
            <h1 className="auth-headline">Know what's risky before you take it.</h1>
            <ul className="auth-feature-list">
              {AUTH_FEATURES.map((feature) => (
                <li key={feature} className="auth-feature-item">
                  <IconCheck size={16} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="auth-footnote">Not a substitute for professional medical advice.</div>
        </div>

        <div className="auth-panel-form">
          <div className="auth-card">
            <AuthForm onAuthenticated={handleAuthenticated} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <ChatPage token={token} username={username ?? ""} role={role ?? "standard"} onLogout={handleLogout} />
    </div>
  );
}
