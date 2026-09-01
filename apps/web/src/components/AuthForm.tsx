import { FormEvent, useState } from "react";
import type { AuthResponse } from "@disa/shared-types";
import * as api from "../api";
import { ApiError } from "../api";
import { IconAlert } from "./icons";

interface Props {
  onAuthenticated: (token: string, role: AuthResponse["role"], username: string) => void;
}

export function AuthForm({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "register") {
        await api.register({ username, password });
        setMode("login");
        setNotice("Account created — log in below.");
      } else {
        const { token, role } = await api.login({ username, password });
        onAuthenticated(token, role, username);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="auth-form-heading">{mode === "login" ? "Log in" : "Create an account"}</h2>
      <p className="auth-form-subtitle">
        {mode === "login" ? "Access the medication safety graph." : "Standard accounts can check risks; admin access is provisioned separately."}
      </p>
      {error && (
        <div className="error-banner">
          <span className="row gap-2"><IconAlert size={14} /> {error}</span>
        </div>
      )}
      {notice && (
        <div className="empty-state-positive" style={{ marginBottom: "var(--space-3)" }}>{notice}</div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? <span className="spinner" /> : null}
          {mode === "login" ? "Log in" : "Register"}
        </button>
        <button
          type="button"
          className="auth-form-toggle-btn"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
            setNotice(null);
          }}
        >
          {mode === "login" ? (
            <>Need an account? <span className="auth-form-toggle-link">Register</span></>
          ) : (
            <>Have an account? <span className="auth-form-toggle-link">Log in</span></>
          )}
        </button>
      </form>
    </div>
  );
}
